import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { getFirstUserAccount } from "@/lib/account";
import { getManuscripts } from "@/lib/manuscripts";
import { getMonthlyUsageStats, getFeatureBreakdown, formatTokenCompact, MONTHLY_TOKEN_CAP } from "@/lib/ai-usage";
import type { FeatureBreakdown } from "@/lib/ai-usage";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Link from "next/link";
import { AiTokenHelp } from "@/components/dashboard/AiTokenHelp";
import { AiTokensDetailsSheet } from "@/components/dashboard/AiTokensDetailsSheet";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!user) {
    const returnUrl = encodeURIComponent("/dashboard");
    const message = authError ? "&message=session_expired" : "";
    return redirect(`/login?returnUrl=${returnUrl}${message}`);
  }

  // Fetch or create user profile
  const { profile, error: profileError, isNewProfile } = await getOrCreateProfile(
    supabase,
    user.id,
    user.email || ""
  );

  // Story 4.5: Super Admins should be on their own dashboard
  if (profile?.role === "super_admin") {
    redirect("/dashboard/admin/super");
  }

  // Fetch ecosystem data (Parallelized)
  let manuscriptCount = 0;
  let totalWordCount = 0;
  let aiUsage = { tokensUsed: 0, checkCount: 0 };
  let aiBreakdown: FeatureBreakdown[] = [];
  let maintenanceStatus = null; // AC 4.5.3 (Server-side optimization)

  const { account } = await getFirstUserAccount(supabase, user.id);

  if (account) {
    // Shared import for maintenance logic
    const { getMaintenanceStatus } = await import("@/lib/super-admin");

    const [manuscriptsResult, usageResult, breakdownResult, maintenanceResult] = await Promise.all([
      getManuscripts(supabase, account.id),
      getMonthlyUsageStats(supabase, account.id),
      getFeatureBreakdown(supabase, account.id),
      getMaintenanceStatus(supabase)
    ]);

    manuscriptCount = manuscriptsResult.manuscripts.length;
    totalWordCount = manuscriptsResult.manuscripts.reduce((sum, m) => sum + (m.word_count || 0), 0);
    aiUsage = usageResult;
    aiBreakdown = breakdownResult;
    maintenanceStatus = maintenanceResult;
  } else {
    // Fallback if no account (edge case), still check maintenance
    const { getMaintenanceStatus } = await import("@/lib/super-admin");
    maintenanceStatus = await getMaintenanceStatus(supabase);
  }

  return (
    <DashboardLayout
      user={{
        email: user.email || "",
        displayName: profile?.display_name,
        role: profile?.role,
      }}
      usageStatus={account?.usage_status}
      initialMaintenanceStatus={maintenanceStatus}
    >
      <div className="space-y-6">
        {/* Error banner for profile fetch issues */}
        {profileError && (
          <ErrorBanner
            message={profileError}
            dismissible={true}
          />
        )}

        {/* Welcome message for new profiles */}
        {isNewProfile && !profileError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Welcome to Bearing!
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  Your author profile has been created. Visit{" "}
                  <a
                    href="/dashboard/settings"
                    className="font-medium underline hover:text-amber-900"
                  >
                    Settings
                  </a>{" "}
                  to customize your display name and pen name.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Page header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}!
          </h2>
          <p className="mt-1 text-slate-600">
            Here&apos;s an overview of your writing activity.
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Manuscripts card */}
          <Link 
            href="/dashboard/manuscripts"
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/50"
          >
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
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Manuscripts</p>
                <p className="text-2xl font-bold text-slate-900">{manuscriptCount}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              {manuscriptCount === 0 
                ? "Start your first manuscript to begin writing."
                : "Click to view and manage your manuscripts."
              }
            </p>
          </Link>

          {/* Words written card */}
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Words Written</p>
                <p className="text-2xl font-bold text-slate-900">{totalWordCount.toLocaleString()}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Your total word count across all manuscripts.
            </p>
          </div>

          {/* AI Usage card */}
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
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-500">AI Tokens</p>
                  <AiTokenHelp />
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {formatTokenCompact(aiUsage.tokensUsed)} <span className="text-base font-normal text-slate-400">/ {formatTokenCompact(MONTHLY_TOKEN_CAP)}</span>
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {aiUsage.checkCount} checks performed this month.
              </p>
              <AiTokensDetailsSheet
                breakdown={aiBreakdown}
                tokensUsed={aiUsage.tokensUsed}
                trigger={
                  <button className="text-sm font-medium text-violet-600 hover:text-violet-700 hover:underline">
                    View details
                  </button>
                }
              />
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/dashboard/manuscripts/new"
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-left transition-colors hover:bg-blue-50 hover:border-blue-200"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-slate-900">New Manuscript</p>
                <p className="text-sm text-slate-500">Start writing now</p>
              </div>
            </Link>

            <button
              disabled
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                <svg
                  className="h-5 w-5 text-violet-600"
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
                <p className="font-medium text-slate-900">Run Check</p>
                <p className="text-sm text-slate-500">Coming soon</p>
              </div>
            </button>

            <Link
              href="/dashboard/support"
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-left transition-colors hover:bg-rose-50 hover:border-rose-200"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100">
                <svg
                  className="h-5 w-5 text-rose-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-slate-900">Support</p>
                <p className="text-sm text-slate-500">Get help from the team</p>
              </div>
            </Link>

            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-left transition-colors hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <svg
                  className="h-5 w-5 text-slate-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-slate-900">Settings</p>
                <p className="text-sm text-slate-500">Manage your profile</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
