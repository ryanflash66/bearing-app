import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { exportManuscript, generateContentDisposition } from "@/lib/export";
import { defaultExportSettings } from "@/lib/export-types";
import type { ExportSettings, FontFace, PageSize } from "@/lib/export-types";

export const runtime = "nodejs";

const PAGE_SIZES: PageSize[] = ["6x9", "5x8", "a4", "a5"];
const FONT_FACES: FontFace[] = ["serif", "sans"];

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

    const partialSettings: Partial<ExportSettings> = {};

    if (fontSizeParam !== null) {
      const fontSize = parseFloat(fontSizeParam);
      if (!Number.isFinite(fontSize)) {
        return NextResponse.json(
          { error: "Invalid fontSize parameter" },
          { status: 400 }
        );
      }
      partialSettings.fontSize = fontSize;
    }

    if (lineHeightParam !== null) {
      const lineHeight = parseFloat(lineHeightParam);
      if (!Number.isFinite(lineHeight)) {
        return NextResponse.json(
          { error: "Invalid lineHeight parameter" },
          { status: 400 }
        );
      }
      partialSettings.lineHeight = lineHeight;
    }

    if (pageSizeParam !== null) {
      if (!PAGE_SIZES.includes(pageSizeParam as PageSize)) {
        return NextResponse.json(
          { error: `Invalid pageSize parameter. Allowed: ${PAGE_SIZES.join(", ")}` },
          { status: 400 }
        );
      }
      partialSettings.pageSize = pageSizeParam as PageSize;
    }

    if (fontFaceParam !== null) {
      if (!FONT_FACES.includes(fontFaceParam as FontFace)) {
        return NextResponse.json(
          { error: `Invalid fontFace parameter. Allowed: ${FONT_FACES.join(", ")}` },
          { status: 400 }
        );
      }
      partialSettings.fontFace = fontFaceParam as FontFace;
    }

    const settings: ExportSettings = {
      ...defaultExportSettings,
      ...partialSettings,
    };

    // ============================================================================
    // E2E_TEST_MODE Optimization
    // ============================================================================
    // When E2E_TEST_MODE=1, we return a minimal PDF stub instead of generating
    // a real PDF using Puppeteer. This is an optimization for E2E tests that
    // validates the download flow, headers, and API integration without the
    // overhead and flakiness of actual PDF generation.
    //
    // LIMITATION: Standard E2E tests do NOT validate actual PDF content generation.
    // 
    // TESTING STRATEGY:
    // 1. Standard E2E tests (with E2E_TEST_MODE=1): Fast, validates download flow
    // 2. Real export tests (without E2E_TEST_MODE): Run locally or in CI nightly
    //    to verify actual PDF generation works correctly
    //
    // To run real export tests locally:
    //   npx playwright test tests/e2e/export.spec.ts --grep @real-export
    //
    // See: tests/e2e/export.spec.ts for test implementation
    // See: .github/workflows/nightly-export-tests.yml for CI configuration
    // ============================================================================
    if (process.env.E2E_TEST_MODE === "1") {
      const minimalPdf = Buffer.from(
        "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n",
        "utf8"
      );

      return new NextResponse(new Uint8Array(minimalPdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": generateContentDisposition("export.pdf"),
          "Content-Length": minimalPdf.length.toString(),
        },
      });
    }

    // Export manuscript
    // Note: We'll fetch the current manuscript's HTML content from the DB if not provided via body
    // (In a real scenario, we might want to POST the HTML from the editor to export exactly what's seen, 
    // or rely on the same Tiptap -> HTML conversion on the server)
    const result = await exportManuscript(supabase, manuscriptId, {
      format: "pdf",
      versionId,
      settings,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Return PDF file with RFC 5987-compliant Content-Disposition header
    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": generateContentDisposition(result.filename),
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

