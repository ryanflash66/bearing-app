import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { exportManuscript, generateContentDisposition } from "@/lib/export";

export const runtime = "nodejs";

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

    // ============================================================================
    // E2E_TEST_MODE Optimization
    // ============================================================================
    // When E2E_TEST_MODE=1, we return a minimal DOCX stub (just ZIP header) 
    // instead of generating a real DOCX using the docx library. This is an
    // optimization for E2E tests that validates the download flow, headers,
    // and API integration without the overhead of actual DOCX generation.
    //
    // LIMITATION: Standard E2E tests do NOT validate actual DOCX content generation.
    // 
    // TESTING STRATEGY:
    // 1. Standard E2E tests (with E2E_TEST_MODE=1): Fast, validates download flow
    // 2. Real export tests (without E2E_TEST_MODE): Run locally or in CI nightly
    //    to verify actual DOCX generation works correctly
    //
    // To run real export tests locally:
    //   npx playwright test tests/e2e/export.spec.ts --grep @real-export
    //
    // See: tests/e2e/export.spec.ts for test implementation
    // See: .github/workflows/nightly-export-tests.yml for CI configuration
    // ============================================================================
    if (process.env.E2E_TEST_MODE === "1") {
      const minimalDocx = Buffer.from("PK\x03\x04", "binary");
      return new NextResponse(new Uint8Array(minimalDocx), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": generateContentDisposition("export.docx"),
          "Content-Length": minimalDocx.length.toString(),
        },
      });
    }

    // manuscriptId already extracted from params

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
      format: "docx",
      versionId,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Return DOCX file with RFC 5987-compliant Content-Disposition header
    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": generateContentDisposition(result.filename),
        "Content-Length": result.buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error exporting DOCX:", error);
    return NextResponse.json(
      { error: "Failed to export DOCX" },
      { status: 500 }
    );
  }
}

