/**
 * POST /api/blog/posts/[id]/publish - Publish a blog post
 *
 * Story 6.1: Blog Management (CMS)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { publishBlogPost } from "@/lib/blog";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await publishBlogPost(supabase, postId);

    if (result.error) {
      if (result.moderationHold) {
        return NextResponse.json(
          { error: result.error, moderationHold: true },
          { status: 422 }
        );
      }
      const errorText = result.error.toLowerCase();
      const status = errorText.includes("not found")
        ? 404
        : errorText.includes("moderation") || errorText.includes("flagged")
          ? 422
          : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result.post);
  } catch (error) {
    console.error("Error publishing blog post:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
