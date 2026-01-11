
import { createClient } from "@/utils/supabase/server";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { addDerivedFields, compareTickets } from "@/lib/tickets";
import TicketListItem from "@/components/support/TicketListItem";

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile } = await getOrCreateProfile(supabase, user.id, user.email || "");

  const isAdmin = profile?.role === "admin";
  const isSuperAdmin = profile?.role === "super_admin";
  const isSupportAgent = profile?.role === "support_agent";
  const isAgent = isSuperAdmin || isSupportAgent;

  // Fetch tickets
  const { data: rawTickets } = await supabase
    .from("support_tickets")
    .select("*")
    .order("updated_at", { ascending: false });

  // Use helpers for processing
  const tickets = (rawTickets || [])
    .map(addDerivedFields)
    .sort(compareTickets);

  return (
    <DashboardLayout
      user={{
        email: user.email || "",
        displayName: profile?.display_name,
        role: profile?.role,
      }}
    >
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{isAgent ? "Support Queue" : "Support"}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {isAgent ? "Manage and resolve customer support tickets." : "View your support history or start a new conversation."}
                </p>
            </div>
          <div className="mt-4 sm:mt-0">
            <Link
              href="/dashboard/support/create"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              {isAgent ? "Internal Ticket" : "Contact Support"}
            </Link>
          </div>
        </div>

        <div className="overflow-hidden bg-white shadow sm:rounded-md">
          <ul role="list" className="divide-y divide-slate-200">
            {tickets && tickets.length > 0 ? (
              tickets.map((ticket) => (
                <TicketListItem 
                    key={ticket.id}
                    ticket={ticket}
                    isAgent={!!isAgent}
                    currentUserId={user.id}
                />
              ))
            ) : (
              <li className="px-4 py-8 text-center text-sm text-slate-500">
                {isAgent ? "No tickets in queue." : "No support tickets found."}
              </li>
            )}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
