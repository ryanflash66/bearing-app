import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Cleanup API for soft-deleted manuscripts
 * AC 2.1.4: Manuscripts are recoverable for 30 days, then permanently deleted
 * 
 * This endpoint should be called by a scheduled job (e.g., Vercel Cron, external scheduler)
 * Protected by API key authentication
 */
export async function POST(request: NextRequest) {
  // Verify API key for scheduled job authentication
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = process.env.CLEANUP_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Use service role client for cleanup (bypasses RLS)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase configuration for cleanup job");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Calculate cutoff date (30 days ago per AC 2.1.4)
  const retentionDays = 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  try {
    // Get manuscripts to be deleted (for logging)
    const { data: toDelete, error: fetchError } = await supabase
      .from("manuscripts")
      .select("id, title, deleted_at, account_id")
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoffDate.toISOString());

    if (fetchError) {
      console.error("Error fetching manuscripts for cleanup:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch manuscripts for cleanup" },
        { status: 500 }
      );
    }

    if (!toDelete || toDelete.length === 0) {
      return NextResponse.json({
        message: "No manuscripts to clean up",
        deletedCount: 0,
      });
    }

    // Log what will be deleted
    console.log(`Cleaning up ${toDelete.length} manuscripts deleted before ${cutoffDate.toISOString()}`);
    for (const m of toDelete) {
      console.log(`  - ${m.id}: "${m.title}" (deleted: ${m.deleted_at})`);
    }

    // Permanently delete the manuscripts
    const { error: deleteError } = await supabase
      .from("manuscripts")
      .delete()
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoffDate.toISOString());

    if (deleteError) {
      console.error("Error deleting manuscripts:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete manuscripts" },
        { status: 500 }
      );
    }

    // Log to audit (if needed for compliance)
    for (const m of toDelete) {
      await supabase.from("audit_logs").insert({
        account_id: m.account_id,
        user_id: null, // System action
        action: "manuscript_purged",
        entity_type: "manuscript",
        entity_id: m.id,
        metadata: {
          title: m.title,
          deleted_at: m.deleted_at,
          purged_at: new Date().toISOString(),
          retention_days: retentionDays,
        },
      });
    }

    return NextResponse.json({
      message: `Successfully cleaned up ${toDelete.length} manuscripts`,
      deletedCount: toDelete.length,
      cutoffDate: cutoffDate.toISOString(),
    });
  } catch (error) {
    console.error("Cleanup job error:", error);
    return NextResponse.json(
      { error: "Cleanup job failed" },
      { status: 500 }
    );
  }
}

// Also support GET for health checks
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "manuscript-cleanup",
    retentionDays: 30,
  });
}

