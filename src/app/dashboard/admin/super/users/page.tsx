import { createClient } from "@/utils/supabase/server";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { isSuperAdmin } from "@/lib/super-admin";
import { getGlobalUsers } from "@/lib/super-admin-users";
import GlobalUsersTable from "@/components/admin/super/GlobalUsersTable";

export default async function GlobalUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  const search = typeof resolvedSearchParams.search === "string" ? resolvedSearchParams.search : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile } = await getOrCreateProfile(supabase, user.id, user.email || "");

  // Role Guard: Super Admin Only
  if (!(await isSuperAdmin(supabase))) {
    redirect("/dashboard?error=super_admin_required");
  }

  // Fetch Users
  const { users, total, error } = await getGlobalUsers(supabase, {
    page,
    pageSize: 20,
    search,
  });

  const totalPages = Math.ceil(total / 20);

  return (
    <DashboardLayout
      user={{
        email: user.email || "",
        displayName: profile?.display_name,
        role: profile?.role,
      }}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Global User Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            System Override: Manage all users across the platform.
          </p>
        </div>

        {error && (
            // If the error confirms RLS failure, we can hint at the migration
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            Error loading users: {error}. (Ensure 'super_admin_god_mode' migration is applied)
          </div>
        )}

        <GlobalUsersTable
          users={users}
          total={total}
          currentPage={page}
          totalPages={totalPages}
          currentSearch={search}
          currentUserId={user.id}
        />
      </div>
    </DashboardLayout>
  );
}
