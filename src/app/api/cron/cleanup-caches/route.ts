/**
 * Cron: Cleanup Expired Vertex AI Caches
 *
 * Story 5.6.1, Task 2.5: Delete expired cache rows from DB and Vertex AI.
 * Implements "forget and sweep" to reconcile orphaned caches.
 *
 * Runs on a schedule (e.g., every hour via Vercel Cron).
 * Configured in vercel.json: { "crons": [{ "path": "/api/cron/cleanup-caches", "schedule": "0 * * * *" }] }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getVertexConfig, getVertexAuthToken, isVertexAIConfigured } from "@/lib/vertex-ai";

/**
 * GET /api/cron/cleanup-caches
 * Called by Vercel Cron or manually by admin.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel sends CRON_SECRET header)
    // Default to DENY if CRON_SECRET is not configured
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isVertexAIConfigured()) {
      return NextResponse.json({
        message: "Vertex AI not configured, skipping cache cleanup",
        deleted: 0,
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Find expired cache entries in DB
    const { data: expiredCaches, error: fetchError } = await supabase
      .from("vertex_ai_caches")
      .select("id, cache_id")
      .lt("expires_at", new Date().toISOString());

    if (fetchError) {
      console.error("[Cleanup] Error fetching expired caches:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch expired caches" },
        { status: 500 }
      );
    }

    if (!expiredCaches || expiredCaches.length === 0) {
      return NextResponse.json({
        message: "No expired caches to clean up",
        deleted: 0,
      });
    }

    // 2. Delete from Vertex AI and DB
    const config = getVertexConfig();
    const token = await getVertexAuthToken();

    let deletedCount = 0;
    const errors: string[] = [];

    for (const cache of expiredCaches) {
      try {
        // Delete from Vertex AI
        const deleteEndpoint = `https://${config.location}-aiplatform.googleapis.com/v1/${cache.cache_id}`;
        const deleteResponse = await fetch(deleteEndpoint, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          console.warn(
            `[Cleanup] Failed to delete Vertex cache ${cache.cache_id}: ${deleteResponse.status}`
          );
          errors.push(
            `Vertex delete failed for ${cache.cache_id}: ${deleteResponse.status}`
          );
        }
      } catch (err) {
        // Handle gracefully - the cache may already be gone
        console.warn(
          `[Cleanup] Error deleting Vertex cache ${cache.cache_id}:`,
          err
        );
      }

      // Always delete from DB regardless of Vertex status
      const { error: deleteError } = await supabase
        .from("vertex_ai_caches")
        .delete()
        .eq("id", cache.id);

      if (!deleteError) {
        deletedCount++;
      } else {
        errors.push(`DB delete failed for ${cache.id}: ${deleteError.message}`);
      }
    }

    console.log(
      `[Cleanup] Cleaned up ${deletedCount}/${expiredCaches.length} expired caches`
    );

    return NextResponse.json({
      message: `Cleaned up ${deletedCount} expired caches`,
      deleted: deletedCount,
      total: expiredCaches.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[Cleanup] Unexpected error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
