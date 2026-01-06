
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/support/tickets
 * RPC-First Refactor: Uses create_ticket RPC instead of direct table manipulation.
 * This ensures rate limiting (max 5 active tickets) is enforced at DB level.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const { subject, message, priority = "medium" } = json;

  if (!subject || !message) {
    return NextResponse.json(
      { error: "Subject and message are required" },
      { status: 400 }
    );
  }

  // RPC-First: Use create_ticket function
  // This handles: rate limiting, ticket creation, initial message creation
  const { data: ticketId, error: rpcError } = await supabase.rpc("create_ticket", {
    subject,
    message,
    priority,
  });

  if (rpcError) {
    // Check for rate limit error
    if (rpcError.message.includes("Rate limit exceeded")) {
      return NextResponse.json({ error: rpcError.message }, { status: 429 });
    }
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  // Fetch the created ticket for response
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  // Fire-and-forget: Notify Admins
  import("@/lib/email")
    .then((module) =>
      module.notifyAdminsNewTicket(ticketId, subject, user.email || "unknown").catch(console.error)
    )
    .catch(console.error);

  // Fire-and-forget: Audit Log
  import("@/lib/account")
    .then(async (module) => {
      const { data: publicUser } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();
      
      if (publicUser) {
        const { accounts } = await module.getUserAccounts(supabase, publicUser.id);
        const accountId = accounts[0]?.id;
        if (accountId) {
          await supabase.from("audit_logs").insert({
            account_id: accountId,
            user_id: publicUser.id,
            action: "support_ticket_created",
            entity_type: "support_ticket",
            entity_id: ticketId,
            metadata: { subject },
          });
        }
      }
    })
    .catch(console.error);

  return NextResponse.json(ticket || { id: ticketId });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch tickets. RLS will filter for us.
  // But we want to include latest message or ordering?
  // Let's just fetch basic list.
  
  const { data: tickets, error } = await supabase
    .from("support_tickets")
    .select(`
        *,
        messages:support_messages(count)
    `)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(tickets);
}
