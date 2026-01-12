
import { createClient } from "@/utils/supabase/server";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import TicketStatusSelect from "@/components/admin/TicketStatusSelect";
import UserSnapshotPanel from "@/components/admin/UserSnapshotPanel";
import { getAdminAwareClient } from "@/lib/supabase-admin";
import TicketConversation from "@/components/support/TicketConversation";

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
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
    .select(`
        *,
        user:users!support_tickets_user_id_fkey(id, email, display_name)
    `)
    .eq("id", id)
    .single();

  if (ticketError || !ticket) {
    // Log failure for debugging
    console.error("Admin Ticket Fetch Error:", ticketError);
    notFound();
  }

  // Fetch messages
  // (Client is already admin-aware, so reuse it)
  const { data: messages } = await client
    .from("support_messages")
    .select("*")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true }); // Chat order for TicketConversation

  return (
    <DashboardLayout
      user={{
        email: user.email || "",
        displayName: profile?.display_name,
        role: profile?.role,
      }}
    >
      <div className="mb-6">
        <Link href="/dashboard/admin/support" className="text-sm text-indigo-600 hover:text-indigo-500">
          &larr; Back to Tickets
        </Link>
      </div>
      
      {/* AC 4.4.1: Grid layout with conversation left, snapshot right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Ticket Thread */}
        <div className="lg:col-span-2 space-y-6">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex justify-between items-start">
            <div>
                <h3 className="text-lg font-medium leading-6 text-slate-900">{ticket.subject}</h3>
                <div className="mt-1 max-w-2xl text-sm text-slate-500">
                    <p>
                        Ticket #{ticket.id.slice(0, 8)}
                    </p>
                    <p className="mt-1">
                        Author: <span className="font-medium text-slate-900">{ticket.user?.display_name || ticket.user?.email}</span>
                        <span className="mx-2">•</span>
                        {ticket.user?.email}
                    </p>
                </div>
            </div>
            <div>
               <TicketStatusSelect ticketId={ticket.id} currentStatus={ticket.status} />
            </div>
          </div>
          
          <TicketConversation
            ticketId={ticket.id}
            initialMessages={messages || []}
            currentUserId={profile?.id || ""}
            ticketOwnerId={ticket.user_id}
            isAdmin={true}
          />
        </div>
        </div>
        
        {/* Right Sidebar - User Snapshot (AC 4.4.1) */}
        {/* Use ticket.user.id which we know exists from the query */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <UserSnapshotPanel userId={ticket.user.id} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

