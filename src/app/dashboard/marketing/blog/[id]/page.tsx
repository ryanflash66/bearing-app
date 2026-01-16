/**
 * Blog Post Editor Page
 * Story 6.1: Blog Management (CMS)
 */

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { getBlogPost } from "@/lib/blog";
import BlogPostEditor from "@/components/blog/BlogPostEditor";

interface BlogPostPageProps {
  params: Promise<{ id: string }>;
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect(`/login?returnUrl=/dashboard/marketing/blog/${id}`);
  }

  // Get user profile
  const { profile } = await getOrCreateProfile(
    supabase,
    user.id,
    user.email || ""
  );

  // Get the blog post
  const { post, error } = await getBlogPost(supabase, id);

  if (error || !post) {
    return redirect("/dashboard/marketing/blog?error=not_found");
  }

  // Check if post is deleted
  if (post.deleted_at) {
    return redirect("/dashboard/marketing/blog?error=deleted");
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Navigation header */}
      <nav className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <a
          href="/dashboard/marketing/blog"
          className="flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-900"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span>Back to Blog</span>
        </a>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>Logged in as {profile?.display_name || user.email}</span>
        </div>
      </nav>

      {/* Editor */}
      <BlogPostEditor
        postId={post.id}
        initialTitle={post.title}
        initialSlug={post.slug}
        initialContent={post.content_json}
        initialContentText={post.content_text}
        initialStatus={post.status}
        initialUpdatedAt={post.updated_at}
      />
    </div>
  );
}
