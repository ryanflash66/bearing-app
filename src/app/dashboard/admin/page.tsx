import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { getUserAccounts } from "@/lib/account";
import { getAdminStats } from "@/lib/admin";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";
import { getAccountUsageStats } from "@/lib/usage-admin";
import UserUsageTable from "@/components/admin/UserUsageTable";
import WaiveLimitsButton from "@/components/admin/WaiveLimitsButton";
import JobMonitor from "@/components/admin/JobMonitor";

export default async function AdminPage() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?returnUrl=/dashboard/admin");
  }

  // Get user profile
  const { profile, error: profileError } = await getOrCreateProfile(
    supabase,
    user.id,
    user.email || ""
  );

  if (profileError || !profile) {
    redirect("/dashboard");
  }

  // Redirect Super Admins to the Super Admin Dashboard
  if (profile.role === "super_admin") {
    redirect("/dashboard/admin/super");
  }

  // Get user's account
  const { accounts } = await getUserAccounts(supabase, profile.id);
  const primaryAccount = accounts[0];

  if (!primaryAccount) {
    redirect("/dashboard");
  }

  // Security Check: Ensure user is admin
  if (primaryAccount.role !== "admin") {
    redirect("/dashboard");
  }

  // Get admin stats
  const stats = await getAdminStats(supabase, primaryAccount.id);

  // Get usage stats
  const { stats: usageStats } = await getAccountUsageStats(supabase, primaryAccount.id);

  return (
    <DashboardLayout
      user={{
        email: user.email || "",
        displayName: profile?.display_name,
        role: profile?.role,
      }}
    >
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Admin Panel</h2>
          <p className="mt-1 text-slate-600">
            Manage account members, roles, and view audit logs.
          </p>
        </div>

        {/* Stats cards - AC 1.4.2: Admin sees admin layout with sections */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Members */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Members</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalMembers}</p>
              </div>
            </div>
          </div>

          {/* Admins */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
                <svg
                  className="h-6 w-6 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Admins</p>
                <p className="text-2xl font-bold text-slate-900">{stats.adminCount}</p>
              </div>
            </div>
          </div>

          {/* Authors */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
                <svg
                  className="h-6 w-6 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Authors</p>
                <p className="text-2xl font-bold text-slate-900">{stats.authorCount}</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-100">
                <svg
                  className="h-6 w-6 text-violet-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Events (7d)</p>
                <p className="text-2xl font-bold text-slate-900">{stats.recentAuditCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Stats & Controls - Story 4.2 */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
           <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Usage & Controls</h3>
                <p className="text-sm text-slate-500">Monitor usage and manage access limits.</p>
              </div>
              <WaiveLimitsButton accountId={primaryAccount.id} usageStatus={primaryAccount.usage_status} />
           </div>
           
           <UserUsageTable stats={usageStats} accountId={primaryAccount.id} />
        </div>

        {/* System Health Monitor - Story H.4 */}
        <JobMonitor />

        {/* Quick access sections */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Members Section */}
          <Link
            href="/dashboard/admin/members"
            className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600">
                  Members
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  View and manage account members
                </p>
              </div>
              <svg
                className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>

          {/* Roles Section */}
          <Link
            href="/dashboard/admin/members"
            className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-amber-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-amber-600">
                  Roles
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Manage member roles and permissions
                </p>
              </div>
              <svg
                className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>

          {/* Audit Logs Section */}
          <Link
            href="/dashboard/admin/audit"
            className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-violet-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-violet-600">
                  Audit Logs
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  View security and activity logs
                </p>
              </div>
              <svg
                className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-violet-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>

          {/* Support Section */}
          <Link
            href="/dashboard/admin/support"
            className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-rose-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-rose-600">
                  Support
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Manage support tickets
                </p>
              </div>
              <svg
                className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-rose-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
          </Link>
        </div>

        {/* Account info */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Account Information</h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-slate-500">Account Name</dt>
              <dd className="mt-1 text-sm text-slate-900">{primaryAccount.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Account ID</dt>
              <dd className="mt-1 font-mono text-xs text-slate-600">{primaryAccount.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Your Role</dt>
              <dd className="mt-1">
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  {primaryAccount.role}
                </span>
                {primaryAccount.is_owner && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    Owner
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </DashboardLayout>
  );
}

