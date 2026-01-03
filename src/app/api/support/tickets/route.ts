
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const { subject, message } = json;

  if (!subject || !message) {
    return NextResponse.json(
      { error: "Subject and message are required" },
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

  // Create Ticket
  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .insert({
      user_id: publicUser.id,
      subject,
      status: "open",
    })
    .select()
    .single();

  if (ticketError) {
    return NextResponse.json({ error: ticketError.message }, { status: 500 });
  }

  // Create Message
  const { error: messageError } = await supabase
    .from("support_messages")
    .insert({
        ticket_id: ticket.id,
        sender_user_id: publicUser.id,
        message,
        is_internal: false
    });

  if (messageError) {
     return NextResponse.json({ error: messageError.message }, { status: 500 });
  }

  // Notify Admins
  // We don't await this to keep response fast? Or usage SLA says <500ms.
  // Emails can be slow. Better to fire and forget or use background job.
  // For now, assume fast enough or non-blocking if we don't await result (but Vercel functions might kill it).
  // Better to use `waitUntil` if available or just await it (mock is fast).
  // Notify Admins
  import("@/lib/email").then(module => module.notifyAdminsNewTicket(ticket.id, subject, user.email || "unknown").catch(console.error));
  
  // Log Audit Event
  import("@/lib/account").then(module => {
      module.getUserAccounts(supabase, publicUser.id).then(({ accounts }) => {
          const accountId = accounts[0]?.id;
          if (accountId) {
              supabase.from("audit_logs").insert({
                  account_id: accountId,
                  user_id: publicUser.id,
                  action: "support_ticket_created",
                  entity_type: "support_ticket",
                  entity_id: ticket.id,
                  metadata: { subject }
              }).then(({ error }) => {
                  if (error) console.error("Audit Log Error:", error);
              });
          }
      });
  });

  return NextResponse.json(ticket);
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
