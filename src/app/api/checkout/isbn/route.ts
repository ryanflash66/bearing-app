import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { stripe, SERVICE_PRICES, SERVICE_METADATA } from "@/lib/stripe";

export const dynamic = "force-dynamic";

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

    // Parse request body for optional manuscript_id
    let manuscriptId: string | null = null;
    try {
      const body = await request.json();
      const rawManuscriptId = body.manuscriptId;
      // Validate manuscriptId is a valid UUID if provided
      if (rawManuscriptId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(rawManuscriptId)) {
          manuscriptId = rawManuscriptId;
        }
        // Invalid UUIDs are silently ignored (treated as no manuscriptId)
      }
    } catch {
      // Body is optional, continue without it
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
      metadata: {
        user_id: user.id,
        manuscript_id: manuscriptId || "",
        service_type: "isbn",
      },
      customer_email: user.email,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      poolWarning,
    });
  } catch (error) {
    console.error("Checkout session creation error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
