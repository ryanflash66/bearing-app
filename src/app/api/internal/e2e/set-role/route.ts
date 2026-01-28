import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getServiceSupabaseClient } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

type OkResponse =
  | { ok: true; role: "super_admin"; swappedFrom: string | null; currentSuperAdminAuthId: string | null }
  | { ok: true; role: "user"; restored?: string; currentSuperAdminAuthId: string | null };

type ErrResponse = { ok: false; error: string };

type RoleBody = {
  role?: "super_admin" | "user";
  /**
   * If provided with role="user", restores the previous singleton super admin
   * back to role="super_admin" after demoting the current user.
   */
  restoreSuperAdminAuthId?: string;
};

function jsonErr(error: string, status: number) {
  return NextResponse.json<ErrResponse>({ ok: false, error }, { status });
}

function isUuidLike(value: string) {
  // Auth IDs are UUIDs; keep this lightweight and defensive.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function getCurrentSuperAdminAuthId(service: ReturnType<typeof getServiceSupabaseClient>) {
  const { data, error } = await service.from("users").select("auth_id").eq("role", "super_admin").maybeSingle();
  if (error) return { currentSuperAdminAuthId: null as string | null, error };
  return { currentSuperAdminAuthId: data?.auth_id ?? null, error: null as unknown as null };
}

/**
 * E2E-only helper endpoint.
 *
 * This endpoint is intentionally gated behind `E2E_TEST_MODE=1` so automated
 * tests can safely promote/demote the currently authenticated user.
 */
export async function POST(req: Request) {
  // Defense-in-depth: should never be reachable in production.
  if (process.env.NODE_ENV === "production") {
    return jsonErr("Not found", 404);
  }

  if (process.env.E2E_TEST_MODE !== "1") {
    return jsonErr("Not found", 404);
  }

  const requiredSecret = process.env.E2E_INTERNAL_SECRET;
  if (!requiredSecret) {
    return jsonErr("E2E_INTERNAL_SECRET is missing", 500);
  }

  const providedSecret = req.headers.get("x-e2e-internal-secret");
  if (providedSecret !== requiredSecret) {
    return jsonErr("Unauthorized", 401);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonErr("Unauthorized", 401);
  }

  let body: RoleBody = {};
  try {
    body = (await req.json()) as RoleBody;
  } catch {
    // Allow empty body
  }

  const role: NonNullable<RoleBody["role"]> = body.role ?? "super_admin";

  const service = getServiceSupabaseClient();

  const log = (message: string, extra?: Record<string, unknown>) => {
    // E2E-only logging; safe to keep minimal and non-sensitive.
    // eslint-disable-next-line no-console
    console.log(`[e2e:set-role] ${message}`, {
      authId: user.id,
      ...(extra || {}),
    });
  };

  // If we are restoring the singleton super admin, do it after demoting the current user.
  if (role === "user" && body.restoreSuperAdminAuthId) {
    if (!isUuidLike(body.restoreSuperAdminAuthId)) {
      return jsonErr("restoreSuperAdminAuthId must be a UUID", 400);
    }

    const { data: restoreUser, error: restoreLookupErr } = await service
      .from("users")
      .select("auth_id")
      .eq("auth_id", body.restoreSuperAdminAuthId)
      .maybeSingle();

    if (restoreLookupErr) {
      return jsonErr(restoreLookupErr.message, 500);
    }
    if (!restoreUser) {
      return jsonErr("restoreSuperAdminAuthId not found", 400);
    }

    const { error: demoteErr } = await service
      .from("users")
      .update({ role: "user" })
      .eq("auth_id", user.id);

    if (demoteErr) {
      return jsonErr(demoteErr.message, 500);
    }

    const { error: restoreErr } = await service
      .from("users")
      .update({ role: "super_admin" })
      .eq("auth_id", body.restoreSuperAdminAuthId);

    if (restoreErr) {
      return jsonErr(restoreErr.message, 500);
    }

    const { currentSuperAdminAuthId, error: superErr } = await getCurrentSuperAdminAuthId(service);
    if (superErr) return jsonErr(superErr.message, 500);

    log("restored singleton super_admin", { restored: body.restoreSuperAdminAuthId, currentSuperAdminAuthId });
    return NextResponse.json<OkResponse>(
      { ok: true, role: "user", restored: body.restoreSuperAdminAuthId, currentSuperAdminAuthId },
      { status: 200 }
    );
  }

  // Singleton super admin constraint: swap roles in E2E to avoid violating it.
  if (role === "super_admin") {
    const { data: existingSuperAdmins, error: selectErr } = await service
      .from("users")
      .select("auth_id")
      .eq("role", "super_admin");

    if (selectErr) {
      return jsonErr(selectErr.message, 500);
    }

    const existing = existingSuperAdmins?.[0]?.auth_id;
    const swappedFrom = existing && existing !== user.id ? existing : null;

    if (swappedFrom) {
      const { error: swapErr } = await service
        .from("users")
        .update({ role: "user" })
        .eq("auth_id", swappedFrom);

      if (swapErr) {
        return jsonErr(swapErr.message, 500);
      }
    }

    const { error: promoteErr } = await service
      .from("users")
      .update({ role: "super_admin" })
      .eq("auth_id", user.id);

    if (promoteErr) {
      // Best-effort retry: if a race / stale state caused the singleton constraint,
      // demote any existing super_admin and retry once.
      const { data: currentSupers } = await service
        .from("users")
        .select("auth_id")
        .eq("role", "super_admin");

      const otherSuper = currentSupers?.find((u) => u.auth_id !== user.id)?.auth_id;
      if (otherSuper) {
        const { error: demoteOtherErr } = await service
          .from("users")
          .update({ role: "user" })
          .eq("auth_id", otherSuper);

        if (demoteOtherErr) return jsonErr(demoteOtherErr.message, 500);

        const { error: retryErr } = await service
          .from("users")
          .update({ role: "super_admin" })
          .eq("auth_id", user.id);

        if (!retryErr) {
          const { currentSuperAdminAuthId, error: superErr } = await getCurrentSuperAdminAuthId(service);
          if (superErr) return jsonErr(superErr.message, 500);

          log("promoted via retry", { swappedFrom: otherSuper, currentSuperAdminAuthId });
          return NextResponse.json<OkResponse>(
            { ok: true, role: "super_admin", swappedFrom: otherSuper, currentSuperAdminAuthId },
            { status: 200 }
          );
        }
      }

      return jsonErr(promoteErr.message, 500);
    }

    const { currentSuperAdminAuthId, error: superErr } = await getCurrentSuperAdminAuthId(service);
    if (superErr) return jsonErr(superErr.message, 500);

    log("promoted", { swappedFrom, currentSuperAdminAuthId });
    return NextResponse.json<OkResponse>(
      { ok: true, role: "super_admin", swappedFrom, currentSuperAdminAuthId },
      { status: 200 }
    );
  }

  // Default: set role on current user only
  const { error } = await service
    .from("users")
    .update({ role })
    .eq("auth_id", user.id);

  if (error) {
    return jsonErr(error.message, 500);
  }

  const { currentSuperAdminAuthId, error: superErr } = await getCurrentSuperAdminAuthId(service);
  if (superErr) return jsonErr(superErr.message, 500);

  log("set role user", { currentSuperAdminAuthId });
  return NextResponse.json<OkResponse>({ ok: true, role: "user", currentSuperAdminAuthId }, { status: 200 });
}

