import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { exportManuscript } from "@/lib/export";
import { ExportSettings, PageSize, FontFace } from "@/lib/export-types";

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

    // Parse formatting settings
    const fontSizeParam = searchParams.get("fontSize");
    const lineHeightParam = searchParams.get("lineHeight");
    const pageSizeParam = searchParams.get("pageSize");
    const fontFaceParam = searchParams.get("fontFace");
    const useHtml = searchParams.get("useHtml") === "true";

    const settings: Partial<ExportSettings> = {};
    if (fontSizeParam) settings.fontSize = parseFloat(fontSizeParam);
    if (lineHeightParam) settings.lineHeight = parseFloat(lineHeightParam);
    if (pageSizeParam) settings.pageSize = pageSizeParam as PageSize;
    if (fontFaceParam) settings.fontFace = fontFaceParam as FontFace;

    // Export manuscript
    // Note: We'll fetch the current manuscript's HTML content from the DB if not provided via body
    // (In a real scenario, we might want to POST the HTML from the editor to export exactly what's seen, 
    // or rely on the same Tiptap -> HTML conversion on the server)
    const result = await exportManuscript(supabase, manuscriptId, {
      format: "pdf",
      versionId,
      settings: settings as ExportSettings,
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

