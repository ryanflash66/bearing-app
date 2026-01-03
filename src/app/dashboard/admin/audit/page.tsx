import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { getUserAccounts } from "@/lib/account";
import { getAdminAuditLogs } from "@/lib/admin";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AuditLogsList from "@/components/admin/AuditLogsList";
import { AuditAction } from "@/lib/auditLog";

interface SearchParams {
  page?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?returnUrl=/dashboard/admin/audit");
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

  // Get user's account
  const { accounts } = await getUserAccounts(supabase, profile.id);
  const primaryAccount = accounts[0];

  if (!primaryAccount) {
    redirect("/dashboard");
  }

  // Parse pagination and filter params
  const page = parseInt(params.page || "1", 10);
  const action = params.action as AuditAction | undefined;
  const startDate = params.startDate;
  const endDate = params.endDate;
  const pageSize = 20;

  // Get audit logs with pagination and filters
  const { logs, total, error: logsError } = await getAdminAuditLogs(
    supabase,
    primaryAccount.id,
    { page, pageSize, action, startDate, endDate }
  );

  const totalPages = Math.ceil(total / pageSize);

  return (
    <DashboardLayout
      user={{
        email: user.email || "",
        displayName: profile?.display_name,
        role: profile?.role,
      }}
    >
      <div className="space-y-6">
        {/* Page header with breadcrumb */}
        <div>
          <nav className="flex items-center space-x-2 text-sm text-slate-500">
            <a href="/dashboard/admin" className="hover:text-slate-700">
              Admin
            </a>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-slate-900">Audit Logs</span>
          </nav>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Audit Logs</h2>
          <p className="mt-1 text-slate-600">
            View all security events and activity in your account. Total: {total} event{total !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Audit logs list with error handling - AC 1.4.6 */}
        <AuditLogsList
          logs={logs}
          total={total}
          currentPage={page}
          totalPages={totalPages}
          currentAction={action}
          currentStartDate={startDate}
          currentEndDate={endDate}
          error={logsError}
        />
      </div>
    </DashboardLayout>
  );
}

