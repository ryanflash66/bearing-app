import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { notifyBlogPostSuspended } from "@/lib/email";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { postId?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  const postId = body.postId;
  const reason = body.reason || "Content policy violation";

  if (!postId) {
    return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("suspend_blog_post", {
    p_post_id: postId,
    p_reason: reason,
  });

  if (error) {
    const status = error.message?.includes("Admin access required") ? 403 : 400;
    return NextResponse.json({ error: error.message || "Failed to suspend post" }, { status });
  }

  const result = data as {
    success: boolean;
    error?: string;
    post_id?: string;
    author_email?: string;
    title?: string;
  };

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Failed to suspend post" },
      { status: 400 }
    );
  }

  let emailSent = false;
  if (result.author_email) {
    const emailResult = await notifyBlogPostSuspended(
      result.author_email,
      result.title || "Your blog post",
      reason
    );
    emailSent = !!emailResult.success;
  }

  return NextResponse.json({
    success: true,
    postId: result.post_id,
    authorEmail: result.author_email || null,
    title: result.title || null,
    emailSent,
  });
}
