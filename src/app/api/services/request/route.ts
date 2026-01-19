import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { MARKETPLACE_SERVICES } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";

// Map frontend service IDs (with hyphens) to DB enum values (with underscores)
const SERVICE_ID_TO_DB_ENUM: Record<string, string> = {
  "cover-design": "cover_design",
  "isbn": "isbn",
  "editing": "editing",
  "author-website": "author_website",
  "marketing": "marketing",
  "social-media": "social_media",
  "publishing-help": "publishing_help",
  "printing": "printing",
};

// Default amounts in cents for services (0 = quote-based)
const SERVICE_DEFAULT_AMOUNTS: Record<string, number> = {
  "cover_design": 0,      // Quote-based: $299-$799
  "isbn": 12500,          // Fixed: $125
  "editing": 0,           // Quote-based: per word
  "author_website": 0,    // Quote-based: $500-$1500
  "marketing": 0,         // Quote-based: $499-$1299
  "social_media": 0,      // Quote-based: $199-$399
  "publishing_help": 0,   // Quote-based: $150-$450
  "printing": 0,          // Quote-based
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
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

    // 2. Parse and validate request
    const body = await request.json();
    const { serviceId, manuscriptId } = body;

    const service = MARKETPLACE_SERVICES.find((s) => s.id === serviceId);
    if (!service) {
      return NextResponse.json(
        { error: "Invalid service ID" },
        { status: 400 }
      );
    }

    // Convert frontend service ID to DB enum value
    const dbServiceType = SERVICE_ID_TO_DB_ENUM[serviceId];
    if (!dbServiceType) {
      return NextResponse.json(
        { error: "Unknown service type" },
        { status: 400 }
      );
    }
    
    // Get the amount for this service type
    const amountCents = SERVICE_DEFAULT_AMOUNTS[dbServiceType] ?? 0;

    // 3. Check for active subscription
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("auth_id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile lookup error:", profileError);
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Admins and Support Agents skip subscription check
    // NOTE: Current roles are 'user', 'support_agent', 'super_admin' per app_role enum
    const isSpecialRole = ["super_admin", "support_agent"].includes(profile.role);
    
    // TODO: Implement proper subscription tier check when subscription system is added
    // For now, all authenticated users can request services (they're quote-based anyway)
    // The actual payment happens through Stripe checkout for paid services like ISBN
    const isAuthorizedUser = profile.role === "user" || isSpecialRole;

    if (!isAuthorizedUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // 4. Create service request
    const { data: serviceRequest, error: insertError } = await supabase
      .from("service_requests")
      .insert({
        user_id: user.id,
        service_type: dbServiceType,
        status: "pending",
        amount_cents: amountCents,
        metadata: {
          manuscript_id: manuscriptId || null,
          requested_at: new Date().toISOString(),
          service_title: service.title,
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating service request:", insertError);
      return NextResponse.json(
        { error: "Failed to create service request" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requestId: serviceRequest.id,
      message: `${service.title} request submitted successfully.`,
    });
  } catch (error) {
    console.error("Service request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
