import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { postId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  if (!body.postId) {
    return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("approve_blog_post", {
    p_post_id: body.postId,
  });

  if (error) {
    const status = error.message?.includes("Admin access required") ? 403 : 400;
    return NextResponse.json({ error: error.message || "Failed to approve post" }, { status });
  }

  const result = data as { success: boolean; error?: string; post_id?: string };
  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Failed to approve post" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, postId: result.post_id });
}
