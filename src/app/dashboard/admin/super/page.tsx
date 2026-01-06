import { createClient } from "@/utils/supabase/server";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { isSuperAdmin, getGlobalMetrics } from "@/lib/super-admin";
import Link from "next/link";

function MetricCard({
  label,
  value,
  subtext,
  highlight,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-6 ${
        highlight ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"
      }`}
    >
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-2 text-3xl font-bold text-slate-900">{value}</dd>
      {subtext && <dd className="mt-1 text-xs text-slate-400">{subtext}</dd>}
    </div>
  );
}

/**
 * Super Admin Dashboard
 * AC 4.5.1: Display global metrics
 * AC 4.5.2: Link to user overrides (existing admin/members page)
 */
export default async function SuperAdminDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile } = await getOrCreateProfile(supabase, user.id, user.email || "");

  // Role Guard: Super Admin Only
  const superAdmin = await isSuperAdmin(supabase);
  if (!superAdmin) {
    redirect("/dashboard?error=super_admin_required");
  }

  // Fetch metrics
  const { metrics, error: metricsError } = await getGlobalMetrics(supabase);

  // M3 Fix: Named constant for cost calculation (average $/1000 tokens across models)
  const COST_PER_1K_TOKENS = 0.001;
  const estimatedCost = ((metrics.totalTokenBurn / 1000) * COST_PER_1K_TOKENS).toFixed(2);

  return (
    <DashboardLayout
      user={{
        email: user.email || "",
        displayName: profile?.display_name,
        role: profile?.role,
      }}
    >
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Super Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            System-wide metrics and override controls.
          </p>
        </div>

        {/* Metrics Grid - AC 4.5.1 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Token Burn"
            value={metrics.totalTokenBurn.toLocaleString()}
            subtext={`≈ $${estimatedCost} (last 30 days)`}
          />
          <MetricCard
            label="Active Users"
            value={metrics.activeUserCount}
            subtext="Last 7 days"
          />
          <MetricCard
            label="Open Tickets"
            value={metrics.openTicketCount}
            highlight={metrics.openTicketCount > 10}
          />
          <MetricCard label="Total Users" value={metrics.totalUsers} />
        </div>

        {metricsError && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            Error loading metrics: {metricsError}
          </div>
        )}

        {/* Quick Actions - AC 4.5.2 */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-medium text-slate-900">Quick Actions</h2>
          </div>
          <div className="divide-y divide-slate-100">
            <Link
              href="/dashboard/admin/members"
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-slate-900">User Management</p>
                <p className="text-sm text-slate-500">
                  Manage roles, reset limits, suspend users
                </p>
              </div>
              <span className="text-slate-400">→</span>
            </Link>
            <Link
              href="/dashboard/admin/support"
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-slate-900">Support Queue</p>
                <p className="text-sm text-slate-500">
                  {metrics.openTicketCount} open tickets
                </p>
              </div>
              <span className="text-slate-400">→</span>
            </Link>
            <Link
              href="/dashboard/admin/audit"
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-slate-900">Audit Logs</p>
                <p className="text-sm text-slate-500">
                  View system activity and admin actions
                </p>
              </div>
              <span className="text-slate-400">→</span>
            </Link>
          </div>
        </div>

        {/* Maintenance Mode Notice - Deferred per plan */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">
            <strong>Note:</strong> Maintenance Mode controls are planned for Story 4.5.1.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
