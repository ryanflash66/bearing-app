import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { exportManuscript } from "@/lib/export";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: manuscriptId } = await params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get optional version parameter from query string
    const searchParams = request.nextUrl.searchParams;
    const versionParam = searchParams.get("version");
    const versionId =
      versionParam !== null ? parseInt(versionParam, 10) : undefined;

    if (versionParam !== null && isNaN(versionId!)) {
      return NextResponse.json(
        { error: "Invalid version parameter" },
        { status: 400 }
      );
    }

    // Export manuscript
    const result = await exportManuscript(supabase, manuscriptId, {
      format: "pdf",
      versionId,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Return PDF file
    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Length": result.buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error exporting PDF:", error);
    return NextResponse.json(
      { error: "Failed to export PDF" },
      { status: 500 }
    );
  }
}

