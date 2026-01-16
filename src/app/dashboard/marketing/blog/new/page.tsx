/**
 * Create New Blog Post Page
 * Story 6.1: Blog Management (CMS)
 *
 * Creates a new blog post and redirects to the editor.
 */

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { createBlogPost } from "@/lib/blog";

export default async function NewBlogPostPage() {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login?returnUrl=/dashboard/marketing/blog/new");
  }

  // Get user profile and account
  const { profile, account, error: profileError } = await getOrCreateProfile(
    supabase,
    user.id,
    user.email || ""
  );

  if (profileError || !account || !profile) {
    return redirect("/dashboard/marketing/blog?error=account-required");
  }

  // Create new blog post
  const { post, error: createError } = await createBlogPost(supabase, {
    account_id: account.id,
    owner_user_id: profile.id,
  });

  if (createError || !post) {
    console.error("Error creating blog post:", createError);
    return redirect("/dashboard/marketing/blog?error=create-failed");
  }

  // Redirect to editor
  return redirect(`/dashboard/marketing/blog/${post.id}`);
}
