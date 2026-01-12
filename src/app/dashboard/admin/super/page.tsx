import { createClient } from "@/utils/supabase/server";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import Link from "next/link";
// ... existing imports
import MaintenanceCallout from "@/components/admin/MaintenanceCallout";
import MaintenanceToggle from "@/components/admin/MaintenanceToggle";
import { isSuperAdmin, getGlobalMetrics, getMaintenanceStatus } from "@/lib/super-admin";
// ... existing imports


export default async function SuperAdminDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile } = await getOrCreateProfile(supabase, user.id, user.email || "");

  const isSuper = await isSuperAdmin(supabase);
  if (!isSuper) {
    redirect("/dashboard");
  }


  // Fetch metrics
  const { metrics, error: metricsError } = await getGlobalMetrics(supabase);
  const maintenanceStatus = await getMaintenanceStatus(supabase);

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

        <MaintenanceCallout enabled={maintenanceStatus.enabled} message={maintenanceStatus.message} />

        {/* Metrics Grid - AC 4.4.1 */}
        {/* ... (rest of the grid code) ... */}
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
            label="AI Error Rate"
            value={`${metrics.aiErrorRate.toFixed(1)}%`}
            highlight={metrics.aiErrorRate > 5}
            subtext="Last 30 days"
          />
          <MetricCard
            label="Open Tickets"
            value={metrics.openTicketCount}
            highlight={metrics.openTicketCount > 10}
            subtext="Awaiting resolution"
          />
        </div>

        <MetricCard label="Total Users" value={metrics.totalUsers} subtext="Global system count" />

        {metricsError && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            Error loading metrics: {metricsError}
          </div>
        )}

        {/* Quick Actions - AC 4.5.2 */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
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
                href="/dashboard/admin/super/users"
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">Global Users (God Mode)</p>
                  <p className="text-sm text-slate-500">
                    View all users, change roles, system-wide overrides
                  </p>
                </div>
                <span className="text-slate-400">→</span>
              </Link>
              <Link
                href="/dashboard/support"
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
          
          <div className="space-y-6">
            <MaintenanceToggle initialEnabled={maintenanceStatus.enabled} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  highlight = false,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-6 ${
        highlight ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p
        className={`mt-2 text-3xl font-semibold ${
          highlight ? "text-red-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
    </div>
  );
}
