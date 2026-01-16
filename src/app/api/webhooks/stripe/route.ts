import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getServiceSupabaseClient } from "@/lib/supabase-admin";

// Disable body parsing for raw webhook body
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("Missing Stripe signature header");
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "checkout.session.expired":
        await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const supabase = getServiceSupabaseClient();

  const userId = session.metadata?.user_id;
  const manuscriptId = session.metadata?.manuscript_id || null;
  const serviceType = session.metadata?.service_type;

  if (!userId || !serviceType) {
    console.error("Missing required metadata in checkout session:", session.id);
    return;
  }

  // Idempotency check: verify no existing record with this session ID
  const { data: existingRequest, error: checkError } = await supabase
    .from("service_requests")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking for existing request:", checkError);
    throw checkError;
  }

  if (existingRequest) {
    console.log(`Service request already exists for session ${session.id}, skipping`);
    return;
  }

  // Create service request record
  const { error: insertError } = await supabase.from("service_requests").insert({
    user_id: userId,
    manuscript_id: manuscriptId || null,
    service_type: serviceType,
    status: "pending",
    stripe_session_id: session.id,
    stripe_payment_intent_id: 
      typeof session.payment_intent === "string" 
        ? session.payment_intent 
        : session.payment_intent?.id || null,
    amount_cents: session.amount_total || 0,
    metadata: {
      customer_email: session.customer_email,
      payment_status: session.payment_status,
    },
  });

  if (insertError) {
    console.error("Error creating service request:", insertError);
    throw insertError;
  }

  console.log(`Service request created for session ${session.id}, type: ${serviceType}`);
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  // Log expired sessions for analytics/debugging
  console.log(`Checkout session expired: ${session.id}`);

  // Optionally create a failed request record for tracking
  const supabase = getServiceSupabaseClient();

  const userId = session.metadata?.user_id;
  const serviceType = session.metadata?.service_type;

  if (!userId || !serviceType) {
    return;
  }

  // Check if there's already a record (shouldn't be, but check anyway)
  const { data: existingRequest, error: checkError } = await supabase
    .from("service_requests")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking for existing request:", checkError);
    return;
  }

  if (existingRequest) {
    return;
  }

  // Create a failed/expired record for tracking
  const { error: insertError } = await supabase.from("service_requests").insert({
    user_id: userId,
    manuscript_id: session.metadata?.manuscript_id || null,
    service_type: serviceType,
    status: "failed",
    stripe_session_id: session.id,
    amount_cents: session.amount_total || 0,
    metadata: {
      failure_reason: "session_expired",
    },
  });

  if (insertError) {
    console.error("Error creating expired session record:", insertError);
    throw insertError;
  }
}
