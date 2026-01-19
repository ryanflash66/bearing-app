import { createClient } from "@/utils/supabase/server";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { isAccountAdmin as checkAccountAdmin } from "@/lib/account";
import { isSuperAdmin } from "@/lib/super-admin";
import ModerationDashboard from "@/components/admin/ModerationDashboard";
import { ModerationPost } from "@/lib/moderation";

export default async function AdminModerationPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile, account } = await getOrCreateProfile(supabase, user.id, user.email || "");
  const isSuper = await isSuperAdmin(supabase);
  const isAccountAdmin =
    !!profile && !!account
      ? await checkAccountAdmin(supabase, account.id, profile.id)
      : false;

  // AC: Only Admin or Super Admin can access moderation
  if (!isAccountAdmin && !isSuper) {
    redirect("/dashboard");
  }

  // Fetch posts for moderation using RPC
  let posts: ModerationPost[] = [];
  let fetchError: string | null = null;

  try {
    const { data, error } = await supabase.rpc("get_posts_for_moderation", {
      p_limit: 50,
      p_offset: 0,
    });

    if (error) {
      console.error("Error fetching moderation posts:", error);
      fetchError = error.message;
    } else {
      posts = (data as ModerationPost[]) || [];
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    fetchError = "Failed to load posts";
  }

  const suspendedCount = posts.filter((p) => p.status === "suspended").length;
  const flaggedCount = posts.filter((p) => p.is_flagged).length;
  const publishedCount = posts.filter((p) => p.status === "published").length;
  const uiRole = isSuper ? "super_admin" : isAccountAdmin ? "admin" : profile?.role;

  return (
    <DashboardLayout
      user={{
        email: user.email || "",
        displayName: profile?.display_name,
        role: uiRole,
      }}
    >
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Content Moderation
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review and moderate user-generated blog content.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-500">Total Posts</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {posts.length}
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-600">Flagged</p>
            <p className="mt-1 text-2xl font-semibold text-amber-700">
              {flaggedCount}
            </p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-600">Suspended</p>
            <p className="mt-1 text-2xl font-semibold text-red-700">
              {suspendedCount}
            </p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-600">Published</p>
            <p className="mt-1 text-2xl font-semibold text-green-700">
              {publishedCount}
            </p>
          </div>
        </div>

        {fetchError && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            Error loading posts: {fetchError}
          </div>
        )}

        {/* Moderation Dashboard (Client Component) */}
        <ModerationDashboard initialPosts={posts} />
      </div>
    </DashboardLayout>
  );
}
