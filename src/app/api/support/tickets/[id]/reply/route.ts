
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/support/tickets/[id]/reply
 * RPC-First Refactor: Uses reply_to_ticket RPC instead of direct table manipulation.
 * This ensures status transitions are handled atomically at DB level.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: ticketId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  // Helper to get account ID for audit logging
  async function getAccountId(userId: string) {
    const { data: member } = await supabase
        .from("account_members")
        .select("account_id")
        .eq("user_id", userId)
        .limit(1)
        .single();
    return member?.account_id;
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const { message } = json;

  if (!message) {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 }
    );
  }

  // RPC-First: Use reply_to_ticket function
  // This handles: message creation, status transitions, updated_at refresh
  const { error: rpcError } = await supabase.rpc("reply_to_ticket", {
    ticket_id: ticketId,
    content: message,
  });

  if (rpcError) {
    console.error("RPC Error in reply_to_ticket:", rpcError);
    if (rpcError.message.includes("Access denied")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (rpcError.message.includes("Ticket not found")) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    if (rpcError.message.includes("Concurrent modification")) {
      return NextResponse.json(
        { error: "Another update was made to this ticket. Please refresh and try again." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: `Internal Error: ${rpcError.message}` }, { status: 500 });
  }

  // Fetch the ticket for notification context
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("*, user:users(email)")
    .eq("id", ticketId)
    .single();

  // Get current user's public ID for ownership check
  const { data: publicUser } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  // Fire-and-forget: Email notifications
  if (ticket && publicUser) {
    import("@/lib/email")
      .then((module) => {
        const isOwner = ticket.user_id === publicUser.id;
        if (isOwner) {
          // User replied -> notify support team
          module.notifyAdminReply(ticket.id, ticket.subject, user.email || "unknown");
        } else {
          // Support replied -> notify user
          if (ticket.user?.email) {
            module.notifyUserReply(ticket.id, ticket.subject, ticket.user.email, message);
          }
        }
      })
      .catch(console.error);
  }



  // Audit Log (Added per Code Review)
  try {
    const accountId = await getAccountId(publicUser?.id || "");
    if (accountId && publicUser) {
        await supabase.from("audit_logs").insert({
            account_id: accountId,
            user_id: publicUser.id,
            action: "support_reply_sent",
            entity_type: "support_message", // Linking to ticket ID as entity ID for easier tracing
            entity_id: ticketId, 
            metadata: { 
                reply_length: message.length 
            },
        });
    }
  } catch (logError) {
    console.error("Failed to write audit log for reply:", logError);
  }

  return NextResponse.json({ success: true, ticketId });
}
