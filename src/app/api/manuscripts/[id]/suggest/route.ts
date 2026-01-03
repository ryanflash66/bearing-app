import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getLlamaSuggestionStream, validateContextWindow } from "@/lib/llama";

/**
 * POST /api/manuscripts/:id/suggest
 * Request AI suggestion for selected text in a manuscript
 * 
 * Body: {
 *   selectionText: string;
 *   instruction?: string;
 * }
 * 
 * Returns: {
 *   suggestion: string;
 *   rationale?: string;
 *   confidence: number;
 *   cached: boolean;
 *   tokensEstimated: number;
 *   tokensActual: number;
 * }
 */
export async function POST(
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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { selectionText, instruction } = body;

    if (!selectionText || typeof selectionText !== "string") {
      return NextResponse.json(
        { error: "selectionText is required" },
        { status: 400 }
      );
    }

    // Validate context window before processing
    const validation = validateContextWindow(selectionText, instruction);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Verify manuscript exists and user has access
    const { data: manuscript, error: manuscriptError } = await supabase
      .from("manuscripts")
      .select("id, account_id, owner_user_id")
      .eq("id", manuscriptId)
      .is("deleted_at", null)
      .single();

    if (manuscriptError || !manuscript) {
      return NextResponse.json(
        { error: "Manuscript not found" },
        { status: 404 }
      );
    }

    // Stream Llama suggestion using Server-Sent Events (SSE)
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          let fullSuggestion = "";
          let finalResult: any = null;

          // Stream suggestion chunks
          const suggestionStream = getLlamaSuggestionStream(
            supabase,
            {
              selectionText,
              instruction,
              manuscriptId,
            },
            user.id
          );

          // Iterate through chunks
          let streamResult = await suggestionStream.next();
          while (!streamResult.done) {
            const chunk = streamResult.value;
            if (typeof chunk === "string") {
              fullSuggestion += chunk;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "chunk", text: chunk })}\n\n`)
              );
            }
            streamResult = await suggestionStream.next();
          }
          finalResult = streamResult.value;

          // Send final result
          if (finalResult) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "complete",
                  suggestion: finalResult.suggestion.suggestion || fullSuggestion,
                  rationale: finalResult.suggestion.rationale,
                  confidence: finalResult.suggestion.confidence,
                  cached: finalResult.cached,
                  tokensEstimated: finalResult.tokensEstimated,
                  tokensActual: finalResult.tokensActual,
                })}\n\n`
              )
            );
          } else {
            // Fallback if no final result (shouldn't happen)
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  error: "Streaming response incomplete",
                })}\n\n`
              )
            );
          }

          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: error instanceof Error ? error.message : "Internal server error",
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error getting Llama suggestion:", error);
    
    // Handle token cap errors specifically
    if (error instanceof Error && error.message.includes("monthly")) {
      return NextResponse.json(
        { error: error.message },
        { status: 429 } // Too Many Requests
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

