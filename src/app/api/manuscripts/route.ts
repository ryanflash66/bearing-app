import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getOrCreateProfile } from "@/lib/profile";
import { getManuscripts } from "@/lib/manuscripts";
import type { ManuscriptsApiResponse, ManuscriptSummary } from "@/types/manuscript";

// Force dynamic to ensure fresh data on each request
export const dynamic = "force-dynamic";

/**
 * GET /api/manuscripts
 * Returns all manuscripts for the authenticated user's account.
 * Used by modals (ISBN, Service Request) when opened from Marketplace context
 * where manuscripts need to be fetched client-side.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", manuscripts: [] },
        { status: 401 }
      );
    }

    // Get or create profile (ensures profile and account exist)
    const { profile, account, error: profileError } = await getOrCreateProfile(
      supabase,
      user.id,
      user.email || ""
    );

    if (profileError || !profile) {
      console.error("[GET /api/manuscripts] Profile error:", profileError);
      return NextResponse.json(
        { error: profileError || "Failed to load profile", manuscripts: [] },
        { status: 500 }
      );
    }

    if (!account) {
      console.error("[GET /api/manuscripts] No account found for profile:", profile.id);
      return NextResponse.json(
        { error: "No account found", manuscripts: [] },
        { status: 500 }
      );
    }

    // Fetch manuscripts for the account
    const { manuscripts, error: manuscriptsError } = await getManuscripts(
      supabase,
      account.id
    );

    if (manuscriptsError) {
      console.error("[GET /api/manuscripts] Manuscripts error:", manuscriptsError);
      return NextResponse.json(
        { error: manuscriptsError, manuscripts: [] },
        { status: 500 }
      );
    }

    // Return manuscripts with minimal data needed for dropdowns
    const safeManuscripts = manuscripts ?? [];
    const manuscriptList: ManuscriptSummary[] = safeManuscripts.map((m) => ({
      id: m.id,
      title: m.title,
      metadata: m.metadata || {},
    }));

    const responseBody: ManuscriptsApiResponse = {
      manuscripts: manuscriptList,
      userDisplayName: profile.display_name || profile.pen_name || profile.email || undefined,
    };

    return NextResponse.json(responseBody);
  } catch (err) {
    console.error("[GET /api/manuscripts] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error", manuscripts: [] },
      { status: 500 }
    );
  }
}
