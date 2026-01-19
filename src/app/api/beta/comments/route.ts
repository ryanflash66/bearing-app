import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkBetaRateLimit } from "@/lib/beta-rate-limit";

interface CommentPayload {
  manuscriptId?: string;
  selectedText?: string;
  commentText?: string;
  authorName?: string;
  type?: string;
  chapterId?: string | null;
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-beta-token");
  if (!token) {
    return NextResponse.json({ error: "Missing beta token" }, { status: 401 });
  }

  const rateLimit = checkBetaRateLimit(token);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let payload: CommentPayload = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { manuscriptId, selectedText, commentText, authorName, type, chapterId } = payload;

  if (!manuscriptId || !selectedText || !commentText || !authorName || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: { headers: { "x-beta-token": token } },
  });

  const { data: tokenRows, error: tokenError } = await supabase.rpc("verify_beta_token", { token });
  const tokenInfo = Array.isArray(tokenRows) ? tokenRows[0] : null;

  if (tokenError || !tokenInfo) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });
  }

  if (tokenInfo.permissions !== "comment") {
    return NextResponse.json({ error: "Token does not allow comments" }, { status: 403 });
  }

  if (tokenInfo.manuscript_id !== manuscriptId) {
    return NextResponse.json({ error: "Token does not match manuscript" }, { status: 403 });
  }

  const { data: comment, error } = await supabase
    .from("beta_comments")
    .insert({
      manuscript_id: manuscriptId,
      chapter_id: chapterId ?? null,
      selected_text: selectedText,
      comment_text: commentText,
      author_name: authorName,
      type,
    })
    .select("id")
    .single();

  if (error || !comment) {
    return NextResponse.json({ error: error?.message || "Failed to submit comment" }, { status: 500 });
  }

  return NextResponse.json(comment, { status: 201 });
}
