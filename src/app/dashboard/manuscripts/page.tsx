import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { getManuscripts } from "@/lib/manuscripts";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ManuscriptListWrapper from "./ManuscriptListWrapper";
import Link from "next/link";

export default async function ManuscriptsPage() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login?returnUrl=/dashboard/manuscripts");
  }

  // Get user profile and account (automatically created if new user)
  const { profile, account, error: profileError } = await getOrCreateProfile(supabase, user.id, user.email || "");

  // Diagnostic logging
  console.log('[Manuscripts Page] Profile lookup result:', {
    userId: user.id,
    email: user.email,
    hasProfile: !!profile,
    profileId: profile?.id,
    hasAccount: !!account,
    accountId: account?.id,
    accountName: account?.name,
    error: profileError,
  });

  if (profileError || !account) {
    console.error('[Manuscripts Page] Account access failed:', {
      profileError,
      hasProfile: !!profile,
      hasAccount: !!account,
    });

    return (
      <DashboardLayout
        user={{
          email: user.email || "",
          displayName: profile?.display_name,
          role: profile?.role,
        }}
      >
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-medium text-red-800">Account Required</h2>
          <p className="mt-2 text-sm text-red-600">
            {profileError || "You need an account to manage manuscripts. Please contact support."}
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-medium text-red-700">Debug Info</summary>
              <pre className="mt-2 overflow-auto rounded bg-red-100 p-2 text-xs">
                {JSON.stringify({ 
                  userId: user.id,
                  email: user.email,
                  hasProfile: !!profile,
                  profileId: profile?.id,
                  hasAccount: !!account,
                  accountId: account?.id,
                  error: profileError 
                }, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Get manuscripts for the account
  const { manuscripts, error: manuscriptsError } = await getManuscripts(
    supabase,
    account.id
  );

  return (
    <DashboardLayout
      user={{
        email: user.email || "",
        displayName: profile?.display_name,
        role: profile?.role,
      }}
      usageStatus={account?.usage_status}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Manuscripts</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your writing projects with automatic saving.
            </p>
          </div>
          <Link
            href="/dashboard/manuscripts/new"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Manuscript
          </Link>
        </div>

        {/* Error display */}
        {manuscriptsError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{manuscriptsError}</p>
          </div>
        )}

        {/* Manuscript list (client component for interactivity) */}
        <ManuscriptListWrapper 
          initialManuscripts={manuscripts} 
          accountId={account.id}
          userId={user.id} 
        />
      </div>
    </DashboardLayout>
  );
}

