
import { createClient } from "@/utils/supabase/server";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { getAdminAwareClient } from "@/lib/supabase-admin";

import { headers } from "next/headers";
import ResolveTicketButton from "@/components/support/ResolveTicketButton";
import TicketConversation from "@/components/support/TicketConversation";

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_user_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Validate id parameter
  if (!id || typeof id !== 'string' || id.trim() === '') {
    notFound();
  }
  
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile } = await getOrCreateProfile(supabase, user.id, user.email || "");

  // NUCLEAR FIX: Bypass RLS for Super Admins
  // Use shared helper to get admin-aware client (Standard or Service Role)
  const client = getAdminAwareClient(supabase, profile);

  // Fetch ticket
  const { data: ticket, error: ticketError } = await client
    .from("support_tickets")
    .select("*")
    .eq("id", id)
    .single();

  if (ticketError || !ticket) {
    notFound();
  }

  // Fetch messages
  // (Client is already admin-aware, so reuse it)
  const { data: messages } = await client 
    .from("support_messages")
    .select("*")
    .eq("ticket_id", id)
    .eq("is_internal", false) // Users don't see internal notes
    .order("created_at", { ascending: true }); // Chronological: oldest first

  return (
    <DashboardLayout
      user={{
        email: user.email || "",
        displayName: profile?.display_name,
        role: profile?.role,
      }}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="mb-6">
            <Link href="/dashboard/support" className="text-sm text-indigo-600 hover:text-indigo-500">
                &larr; Back to Tickets
            </Link>
        </div>
        
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-slate-200">
            <h3 className="text-lg font-medium leading-6 text-slate-900">{ticket.subject}</h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Ticket #{ticket.id.slice(0, 8)} • <span className="capitalize">{ticket.status.replace("_", " ")}</span>
            </p>
            <div className="mt-1 max-w-2xl text-sm text-slate-500 flex items-center gap-3">
              <span>Ticket #{ticket.id.slice(0, 8)}</span>
              <span className="hidden sm:inline">•</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                  ticket.status === 'open' ? 'bg-green-100 text-green-800' :
                  ticket.status === 'resolved' ? 'bg-gray-100 text-gray-800' :
                  ticket.status === 'pending_user' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
              }`}>
                  {ticket.status.replace("_", " ")}
              </span>
              
              <div className="ml-auto sm:ml-4">
               {ticket.status !== 'resolved' && (
                  <ResolveTicketButton ticketId={ticket.id} currentStatus={ticket.status} />
               )}
              </div>
            </div>
          </div>
          <TicketConversation
              ticketId={ticket.id}
              initialMessages={(messages || []) as SupportMessage[]}
              currentUserId={profile?.id || ""}
              ticketOwnerId={ticket.user_id}
            />
        </div>
      </div>
    </DashboardLayout>
  );
}
