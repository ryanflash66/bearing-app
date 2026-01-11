
import { createClient } from "@/utils/supabase/server";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { formatDate, StatusBadge } from "@/components/support/SupportShared";

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
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("*")
    .order("updated_at", { ascending: false });

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
                <li key={ticket.id}>
                  <Link href={`/dashboard/support/${ticket.id}`} className="block hover:bg-slate-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-indigo-600">{ticket.subject}</p>
                          {isAgent && (
                             <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                               {ticket.user_id === user.id ? "Me" : "User"}
                             </span>
                          )}
                        </div>
                        <div className="ml-2 flex flex-shrink-0">
                          <StatusBadge status={ticket.status} />
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-slate-500">
                             Ticket #{ticket.id.slice(0, 8)}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-slate-500 sm:mt-0">
                          <p>
                            Last updated on <time dateTime={ticket.updated_at}>{formatDate(ticket.updated_at)}</time>
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
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
