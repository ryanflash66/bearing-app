import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { stripe, SERVICE_PRICES, SERVICE_METADATA } from "@/lib/stripe";
import { ACTIVE_STATUSES } from "@/lib/service-requests";

export const dynamic = "force-dynamic";

// Request body interface
interface IsbnCheckoutRequest {
  manuscriptId?: string;
  metadata?: {
    author_name?: string;
    bisac_code?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body: IsbnCheckoutRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const manuscriptId = typeof body.manuscriptId === "string" ? body.manuscriptId.trim() : "";
    if (!manuscriptId || !uuidRegex.test(manuscriptId)) {
      return NextResponse.json(
        { error: "Invalid manuscriptId" },
        { status: 400 }
      );
    }

    const authorName = body.metadata?.author_name?.trim() ?? "";
    const bisacCode = body.metadata?.bisac_code?.trim() ?? "";
    if (!authorName || !bisacCode) {
      return NextResponse.json(
        { error: "Author name and category are required" },
        { status: 400 }
      );
    }

    const isbnMetadata = { author_name: authorName, bisac_code: bisacCode };

    // AC 8.11.7: Pre-check for duplicate active request
    // This prevents "pay then fail" by checking BEFORE creating Stripe session
    const { data: existingRequest, error: checkError } = await supabase
      .from("service_requests")
      .select("id")
      .eq("manuscript_id", manuscriptId)
      .eq("service_type", "isbn")
      .in("status", ACTIVE_STATUSES)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking for duplicate request:", checkError);
      // Continue anyway - the DB constraint will catch it if needed
    } else if (existingRequest) {
      return NextResponse.json(
        {
          error: "This manuscript already has an active ISBN request.",
          code: "DUPLICATE_ACTIVE_REQUEST",
          existingRequestId: existingRequest.id,
        },
        { status: 409 }
      );
    }

    // Check ISBN pool availability using the security definer function
    const { data: availableCount, error: poolError } = await supabase.rpc(
      "get_available_isbn_count"
    );

    // If RPC fails or returns null, treat pool as potentially depleted
    let poolWarning = false;
    if (poolError || availableCount === null || availableCount === undefined) {
      console.error("Error checking ISBN pool:", poolError || "availableCount is null/undefined");
      poolWarning = true;
    } else {
      poolWarning = availableCount === 0;
    }

    // Get the base URL for redirects
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Build Stripe metadata - include ISBN request details for webhook to persist
    const stripeMetadata: Record<string, string> = {
      user_id: user.id,
      manuscript_id: manuscriptId || "",
      service_type: "isbn",
    };

    // Add ISBN-specific metadata (stringify for Stripe which only accepts strings)
    if (isbnMetadata.author_name) {
      stripeMetadata.isbn_author_name = isbnMetadata.author_name;
    }
    if (isbnMetadata.bisac_code) {
      stripeMetadata.isbn_bisac_code = isbnMetadata.bisac_code;
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: SERVICE_METADATA.isbn.name,
              description: SERVICE_METADATA.isbn.description,
            },
            unit_amount: SERVICE_PRICES.isbn,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/dashboard/marketplace/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/marketplace?cancelled=true`,
      metadata: stripeMetadata,
      customer_email: user.email,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      poolWarning,
    });
  } catch (error: unknown) {
    // Log detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Check if it's a Stripe error with more details
    const stripeError = error as { type?: string; code?: string; statusCode?: number };

    console.error("Checkout session creation error:", {
      message: errorMessage,
      stack: errorStack,
      stripeKeyConfigured: !!process.env.STRIPE_SECRET_KEY,
      stripeKeyLength: process.env.STRIPE_SECRET_KEY?.length || 0,
      stripeErrorType: stripeError?.type,
      stripeErrorCode: stripeError?.code,
      stripeStatusCode: stripeError?.statusCode,
    });

    // Return more specific error if it's a configuration issue
    if (errorMessage.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 503 }
      );
    }

    // Return Stripe-specific errors
    if (stripeError?.type === "StripeAuthenticationError") {
      return NextResponse.json(
        { error: "Payment system authentication failed" },
        { status: 503 }
      );
    }

    if (stripeError?.type === "StripeInvalidRequestError") {
      return NextResponse.json(
        { error: "Invalid payment request" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
