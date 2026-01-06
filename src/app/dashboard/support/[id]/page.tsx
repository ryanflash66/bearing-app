
import { createClient } from "@/utils/supabase/server";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import ReplyForm from "@/components/support/ReplyForm";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_user_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile } = await getOrCreateProfile(supabase, user.id, user.email || "");

  // NUCLEAR FIX: Bypass RLS for Super Admins
  const isSuper = profile?.role === "super_admin";
  
  let ticketData = null;
  let ticketErrorVal = null;

  if (isSuper) {
      // Use Service Role to bypass RLS entirely
      // This solves the "Phantom Ticket" 404 issue once and for all for Admins
      const { createClient: createServiceClient } = require("@supabase/supabase-js");
      const serviceClient = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data, error } = await serviceClient
        .from("support_tickets")
        .select("*")
        .eq("id", params.id)
        .single();
        
      ticketData = data;
      ticketErrorVal = error;
  } else {
      // Standard RLS fetch for users/others
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", params.id)
        .single();
        
      ticketData = data;
      ticketErrorVal = error;
  }

  if (ticketErrorVal || !ticketData) {
    notFound();
  }
  
  const ticket = ticketData;

  // Fetch messages
  // AC 4.3.4: "Messages are shown in reverse chronological order"
  // Usually for chat, we want oldest first (chronological).
  // "Reverse chronological" implies newest first.
  // If the requirement explicitly says "reverse chronological order", I should follow it.
  // This means newest messages at TOP? Or standard email thread (newest at top).
  // I'll sort by `created_at` DESC.
  
  // Use Service Role for messages too if Super Admin
  const messagesClient = isSuper ? 
    (function(){
      const { createClient: createServiceClient } = require("@supabase/supabase-js");
      return createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    })() : supabase;

  const { data: messages } = await messagesClient
    .from("support_messages")
    .select("*")
    .eq("ticket_id", params.id)
    .eq("is_internal", false) // Users don't see internal notes
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
          </div>
          
          {/* Reply Form */}
          <div className="px-4 py-5 sm:p-6 bg-slate-50 border-b border-slate-200">
             <h4 className="text-sm font-medium text-slate-900 mb-2">Add a reply</h4>
             <ReplyForm ticketId={ticket.id} />
          </div>

          <div className="px-4 py-5 sm:p-6">
            <ul role="list" className="space-y-8">
              {messages && (messages as SupportMessage[]).map((message) => {
                 // Determine if sender is current user or support
                 // We don't have sender details (name) joined yet.
                 // We can infer: if sender_user_id === user's public ID (from profile) -> "You"
                 // Else -> "Support"
                 // Profile ID matches public.users.id
                 const isMe = message.sender_user_id === profile?.id;
                 
                 return (
                  <li key={message.id} className={`flex ${isMe ? 'justify-end' : ''}`}>
                    <div className={`relative max-w-xl rounded-lg px-4 py-3 shadow-sm ${
                        isMe ? 'bg-indigo-50 text-slate-900' : 'bg-white border border-slate-200 text-slate-700'
                    }`}>
                        <div className="flex items-center justify-between space-x-2 mb-1">
                            <span className="text-xs font-semibold">
                                {isMe ? "You" : "Support"}
                            </span>
                            <span className="text-xs text-slate-400">
                                {formatDate(message.created_at)}
                            </span>
                        </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {message.message}
                      </div>
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
