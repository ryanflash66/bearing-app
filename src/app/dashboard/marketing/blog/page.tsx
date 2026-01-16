/**
 * Blog Dashboard Page
 * Story 6.1: Blog Management (CMS)
 */

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { getBlogPosts } from "@/lib/blog";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BlogPostList from "@/components/blog/BlogPostList";
import Link from "next/link";

export default async function BlogDashboardPage() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login?returnUrl=/dashboard/marketing/blog");
  }

  // Get user profile and account
  const { profile, account, error: profileError } = await getOrCreateProfile(
    supabase,
    user.id,
    user.email || ""
  );

  if (profileError || !account) {
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
            {profileError ||
              "You need an account to manage blog posts. Please contact support."}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Get blog posts for the account
  const { posts, error: postsError } = await getBlogPosts(supabase, account.id);

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
            <h1 className="text-2xl font-bold text-slate-900">Blog</h1>
            <p className="mt-1 text-sm text-slate-500">
              Create and manage your blog posts to engage with your audience.
            </p>
          </div>
          <Link
            href="/dashboard/marketing/blog/new"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <svg
              className="h-5 w-5 text-slate-500"
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
            New Post
          </Link>
        </div>

        {/* Error display */}
        {postsError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{postsError}</p>
          </div>
        )}

        {/* Blog post list */}
        <BlogPostList initialPosts={posts} />
      </div>
    </DashboardLayout>
  );
}
