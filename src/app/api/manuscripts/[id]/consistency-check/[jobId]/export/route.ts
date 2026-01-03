import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generateConsistencyReportPDF } from "@/lib/export";
import { ConsistencyReport } from "@/lib/gemini";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { id: manuscriptId, jobId } = await params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify manuscript exists and user has access
    // This is technically covered by row-level security policy on consistency_checks usually,
    // but explicit check is good security practice.
    const { data: manuscript, error: manuscriptError } = await supabase
      .from("manuscripts")
      .select("id")
      .eq("id", manuscriptId)
      .is("deleted_at", null)
      .single();

    if (manuscriptError || !manuscript) {
      return NextResponse.json(
        { error: "Manuscript not found" },
        { status: 404 }
      );
    }

    // Fetch the consistency check job
    const { data: job, error: jobError } = await supabase
      .from("consistency_checks")
      .select("report_json")
      .eq("id", jobId)
      .eq("manuscript_id", manuscriptId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (!job.report_json) {
      return NextResponse.json(
        { error: "Report not ready or missing" },
        { status: 404 }
      );
    }

    // Generate PDF
    const report = job.report_json as unknown as ConsistencyReport;
    const buffer = await generateConsistencyReportPDF(report);

    // Return PDF file
    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="consistency-report-${jobId.slice(
          0,
          8
        )}.pdf"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error exporting consistency report PDF:", error);
    return NextResponse.json(
      { error: "Failed to export PDF" },
      { status: 500 }
    );
  }
}
