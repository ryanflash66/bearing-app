
import { createClient } from "@/utils/supabase/server";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { formatDate, StatusBadge } from "@/components/support/SupportShared";

// AC 4.4.2: Stale threshold = 48 hours
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000;

/**
 * Determines if a ticket is stale based on AC 4.4.2 criteria.
 * A ticket is stale if status is 'pending_agent' and updated_at exceeds 48h.
 */
function isStaleTicket(ticket: { status: string; updated_at: string }): boolean {
  if (ticket.status !== "pending_agent") return false;
  const updatedAt = new Date(ticket.updated_at).getTime();
  const now = Date.now();
  return now - updatedAt > STALE_THRESHOLD_MS;
}

export default async function AdminSupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // CONSOLIDATION: Redirect to the unified Agent Dashboard
  redirect("/dashboard/support");
  
  // Unreachable code kept for reference until safe to delete
  /*
  const { profile } = await getOrCreateProfile(supabase, user.id, user.email || "");

  // Fetch tickets with user info
  // AC 4.4.2: Sort by priority (desc), then by updated_at (asc = oldest first)
  const { data: rawTickets } = await supabase
    .from("support_tickets")
    .select(`
        *,
        user:users(email, display_name)
    `)
    .order("priority", { ascending: false })
    .order("updated_at", { ascending: true });

  // Apply stale detection to each ticket
  const tickets = (rawTickets || []).map((ticket: any) => ({
    ...ticket,
    isStale: isStaleTicket(ticket),
  }));
  */

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
            <h1 className="text-2xl font-bold text-slate-900">Support Tickets</h1>
            <p className="mt-1 text-sm text-slate-500">Manage support requests from authors.</p>
          </div>
        </div>

        <div className="overflow-hidden bg-white shadow sm:rounded-md">
          <ul role="list" className="divide-y divide-slate-200">
            {tickets && tickets.length > 0 ? (
              tickets.map((ticket: any) => (
                <li 
                  key={ticket.id}
                  className={ticket.isStale ? "border-l-4 border-red-500 bg-red-50" : ""}
                >
                  <Link href={`/dashboard/admin/support/${ticket.id}`} className="block hover:bg-slate-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-indigo-600">{ticket.subject}</p>
                            {ticket.isStale && (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                Stale
                              </span>
                            )}
                          </div>
                            <p className="mt-1 text-xs text-slate-500">
                                from: <span className="font-medium">{ticket.user?.display_name || ticket.user?.email || "Unknown"}</span>
                            </p>
                        </div>
                        <div className="ml-2 flex flex-shrink-0 gap-2">
                          {ticket.priority && ticket.priority !== "medium" && (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              ticket.priority === "high" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"
                            }`}>
                              {ticket.priority}
                            </span>
                          )}
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
                No tickets found.
              </li>
            )}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
