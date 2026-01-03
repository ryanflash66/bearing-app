
import { createClient } from "@/utils/supabase/server";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import ReplyForm from "@/components/support/ReplyForm";
import TicketStatusSelect from "@/components/admin/TicketStatusSelect";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}

export default async function AdminTicketDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile } = await getOrCreateProfile(supabase, user.id, user.email || "");

  // Fetch ticket
  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .select(`
        *,
        user:users(id, email, display_name)
    `)
    .eq("id", params.id)
    .single();

  if (ticketError || !ticket) {
    notFound();
  }

  // Fetch messages
  const { data: messages } = await supabase
    .from("support_messages")
    .select("*")
    .eq("ticket_id", params.id)
    .order("created_at", { ascending: false });

  return (
    <DashboardLayout
      user={{
        email: user.email || "",
        displayName: profile?.display_name,
        role: profile?.role,
      }}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="mb-6 flex items-center justify-between">
            <Link href="/dashboard/admin/support" className="text-sm text-indigo-600 hover:text-indigo-500">
                &larr; Back to Tickets
            </Link>
        </div>
        
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
          
          {/* Reply Form */}
          <div className="px-4 py-5 sm:p-6 bg-slate-50 border-b border-slate-200">
             <h4 className="text-sm font-medium text-slate-900 mb-2">Reply to author</h4>
             <ReplyForm ticketId={ticket.id} />
          </div>

          <div className="px-4 py-5 sm:p-6">
            <ul role="list" className="space-y-8">
              {messages && messages.map((message: any) => {
                 // Determine sender
                 // If sender_user_id === ticket.user.id -> Author
                 // Else -> Support/Admin
                 const isAuthor = message.sender_user_id === ticket.user.id;
                 const isMe = message.sender_user_id === profile?.id; // If I replied
                 
                 return (
                  <li key={message.id} className={`flex ${isMe ? 'justify-end' : ''}`}>
                    <div className={`relative max-w-xl rounded-lg px-4 py-3 shadow-sm ${
                        isMe ? 'bg-indigo-50 text-slate-900' : 
                        isAuthor ? 'bg-white border border-slate-200 text-slate-700' :
                        'bg-amber-50 border border-amber-200 text-amber-800' // Other admins?
                    }`}>
                        <div className="flex items-center justify-between space-x-2 mb-1">
                            <span className="text-xs font-semibold">
                                {isMe ? "You" : isAuthor ? "Author" : "Support"}
                            </span>
                            <span className="text-xs text-slate-400">
                                {formatDate(message.created_at)}
                            </span>
                        </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {message.message}
                      </div>
                      {message.is_internal && (
                          <div className="mt-2 text-xs text-red-500 font-medium border-t border-red-100 pt-1">
                              Internal Note
                          </div>
                      )}
                    </div>
                  </li>
                 );
              })}
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
