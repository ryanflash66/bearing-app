/**
 * GET /api/blog/posts/[id] - Get single blog post for editing
 * PATCH /api/blog/posts/[id] - Update blog post (autosave support)
 *
 * Story 6.1: Blog Management (CMS)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getBlogPost, updateBlogPost } from "@/lib/blog";

export async function GET(
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

    const result = await getBlogPost(supabase, postId);

    if (result.error) {
      const status = result.error.includes("not found") ? 404 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result.post);
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const body = await request.json();
    const { title, slug, content_json, content_text, excerpt, expectedUpdatedAt } = body;

    // Build update input
    const updateInput: Record<string, unknown> = {};
    if (title !== undefined) updateInput.title = title;
    if (slug !== undefined) updateInput.slug = slug;
    if (content_json !== undefined) updateInput.content_json = content_json;
    if (content_text !== undefined) updateInput.content_text = content_text;
    if (excerpt !== undefined) updateInput.excerpt = excerpt;

    const result = await updateBlogPost(
      supabase,
      postId,
      updateInput,
      expectedUpdatedAt
    );

    if (result.error) {
      if (result.conflictDetected) {
        return NextResponse.json(
          {
            error: result.error,
            conflictDetected: true,
            serverState: result.serverState,
          },
          { status: 409 }
        );
      }
      const status = result.error.includes("not found") ? 404 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result.post);
  } catch (error) {
    console.error("Error updating blog post:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
