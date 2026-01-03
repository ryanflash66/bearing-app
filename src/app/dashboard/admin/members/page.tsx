import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { getUserAccounts } from "@/lib/account";
import { getAccountMembersPaginated } from "@/lib/admin";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MembersList from "@/components/admin/MembersList";

interface SearchParams {
  page?: string;
  search?: string;
}

export default async function MembersPage({
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
    redirect("/login?returnUrl=/dashboard/admin/members");
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

  // Parse pagination params
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const pageSize = 20;

  // Get members with pagination - AC 1.4.3: Pagination works for 100+ users
  const { members, total, error: membersError } = await getAccountMembersPaginated(
    supabase,
    primaryAccount.id,
    { page, pageSize, search }
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
            <span className="text-slate-900">Members</span>
          </nav>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Account Members</h2>
          <p className="mt-1 text-slate-600">
            View and manage members in your account. Total: {total} member{total !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Error banner */}
        {membersError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 flex-shrink-0 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800">Error loading members</p>
                <p className="mt-1 text-sm text-red-700">{membersError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Members list component */}
        <MembersList
          members={members}
          total={total}
          currentPage={page}
          totalPages={totalPages}
          currentSearch={search}
          accountId={primaryAccount.id}
          currentUserId={profile.id}
          isOwner={primaryAccount.is_owner}
        />
      </div>
    </DashboardLayout>
  );
}

