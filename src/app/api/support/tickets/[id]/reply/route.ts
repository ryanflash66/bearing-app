
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  // Get public user id
  const { data: publicUser, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (userError || !publicUser) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }
  
  // Verify ticket access (RLS will handle constraints, but nice to fail fast)
  // We can just try to insert. RLS `Users and Support can send messages` checks ticket ownership.

  // Create Message
  const { data: newMessage, error: messageError } = await supabase
    .from("support_messages")
    .insert({
        ticket_id: params.id,
        sender_user_id: publicUser.id,
        message,
        is_internal: false
    })
    .select()
    .single();

  if (messageError) {
     return NextResponse.json({ error: messageError.message }, { status: 500 });
  }
  
  // Touch ticket updated_at and Fetch logic for notification
  const { data: ticket } = await supabase
    .from("support_tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select("*, user:users(email)")
    .single();

  if (ticket) {
      import("@/lib/email").then(module => {
          const isOwner = ticket.user_id === publicUser.id;
           if (isOwner) {
                module.notifyAdminReply(ticket.id, ticket.subject, user.email || "unknown");
            } else {
                if (ticket.user?.email) {
                    module.notifyUserReply(ticket.id, ticket.subject, ticket.user.email, message);
                }
            }
      }).catch(console.error);
  }

  return NextResponse.json(newMessage);
}
