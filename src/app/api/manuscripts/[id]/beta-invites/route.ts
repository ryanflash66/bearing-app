import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";

interface InviteRouteParams {
  params: Promise<{ id: string }>;
}

const DEFAULT_INVITE_DAYS = 30;

function isValidPermission(value: unknown): value is "read" | "comment" {
  return value === "read" || value === "comment";
}

export async function GET(_request: NextRequest, { params }: InviteRouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: publicUser, error: publicUserError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (publicUserError || !publicUser) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("beta_access_tokens")
    .select("id, token, permissions, expires_at, manuscript_id")
    .eq("manuscript_id", id)
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest, { params }: InviteRouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: publicUser, error: publicUserError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (publicUserError || !publicUser) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  let payload: { permissions?: string; expiresAt?: string } = {};
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      payload = await request.json();
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const permissions = isValidPermission(payload.permissions) ? payload.permissions : "read";

  let expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DEFAULT_INVITE_DAYS);
  if (payload.expiresAt) {
    const parsedDate = new Date(payload.expiresAt);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid expiresAt value" }, { status: 400 });
    }
    expiresAt = parsedDate;
  }

  const token = crypto.randomBytes(24).toString("hex");

  const { data: invite, error } = await supabase
    .from("beta_access_tokens")
    .insert({
      manuscript_id: id,
      token,
      expires_at: expiresAt.toISOString(),
      permissions,
      created_by: publicUser.id,
    })
    .select("id, token, permissions, expires_at")
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: error?.message || "Failed to create invite" }, { status: 500 });
  }

  return NextResponse.json(invite, { status: 201 });
}
