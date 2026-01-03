
import { createClient } from "@/utils/supabase/server";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { formatDate, StatusBadge } from "@/components/support/SupportShared";

export default async function AdminSupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile } = await getOrCreateProfile(supabase, user.id, user.email || "");

  // Fetch tickets with user info
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select(`
        *,
        user:users(email, display_name)
    `)
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
            <h1 className="text-2xl font-bold text-slate-900">Support Tickets</h1>
            <p className="mt-1 text-sm text-slate-500">Manage support requests from authors.</p>
          </div>
        </div>

        <div className="overflow-hidden bg-white shadow sm:rounded-md">
          <ul role="list" className="divide-y divide-slate-200">
            {tickets && tickets.length > 0 ? (
              tickets.map((ticket: any) => (
                <li key={ticket.id}>
                  <Link href={`/dashboard/admin/support/${ticket.id}`} className="block hover:bg-slate-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="truncate">
                            <p className="truncate text-sm font-medium text-indigo-600">{ticket.subject}</p>
                            <p className="mt-1 text-xs text-slate-500">
                                from: <span className="font-medium">{ticket.user?.display_name || ticket.user?.email || "Unknown"}</span>
                            </p>
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
                No tickets found.
              </li>
            )}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
