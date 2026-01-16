/**
 * POST /api/blog/posts - Create new blog post
 * GET /api/blog/posts - List all blog posts for current account
 *
 * Story 6.1: Blog Management (CMS)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createBlogPost, getBlogPosts, generateSlug } from "@/lib/blog";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get public user ID and account
    const { data: publicUser } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!publicUser) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Get user's account
    const { data: membership } = await supabase
      .from("account_members")
      .select("account_id")
      .eq("user_id", publicUser.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No account found" }, { status: 404 });
    }

    // Parse optional body with validation
    let title: string | undefined;
    let slug: string | undefined;

    // Check if there's a body to parse
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON in request body" },
          { status: 400 }
        );
      }

      // Validate body is an object
      if (body !== null && typeof body === "object" && !Array.isArray(body)) {
        const bodyObj = body as Record<string, unknown>;

        // Validate title if provided
        if (bodyObj.title !== undefined) {
          if (typeof bodyObj.title !== "string") {
            return NextResponse.json(
              { error: "title must be a string" },
              { status: 400 }
            );
          }
          title = bodyObj.title;
        }

        // Validate slug if provided
        if (bodyObj.slug !== undefined) {
          if (typeof bodyObj.slug !== "string") {
            return NextResponse.json(
              { error: "slug must be a string" },
              { status: 400 }
            );
          }
          slug = bodyObj.slug;
        }
      }
    }

    const result = await createBlogPost(supabase, {
      account_id: membership.account_id,
      owner_user_id: publicUser.id,
      title,
      slug,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.post, { status: 201 });
  } catch (error) {
    console.error("Error creating blog post:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get public user ID
    const { data: publicUser } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!publicUser) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Get user's account
    const { data: membership } = await supabase
      .from("account_members")
      .select("account_id")
      .eq("user_id", publicUser.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No account found" }, { status: 404 });
    }

    const result = await getBlogPosts(supabase, membership.account_id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.posts);
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
