import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { MARKETPLACE_SERVICES } from "@/lib/marketplace-data";

export const dynamic = "force-dynamic";

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

    // 3. Check for active subscription
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Admins and Support Agents skip subscription check
    const isSpecialRole = ["admin", "support_agent"].includes(profile.role);
    
    // For authors, we check their role which currently acts as their tier indicator
    // In a full implementation, we'd check a separate subscription_tier column
    const isPro = profile.role === "pro" || profile.role === "subscriber";

    if (!isSpecialRole && !isPro) {
      return NextResponse.json(
        { error: "This service requires a Pro subscription" },
        { status: 403 }
      );
    }

    // 4. Create service request
    const { data: serviceRequest, error: insertError } = await supabase
      .from("service_requests")
      .insert({
        user_id: user.id,
        service_type: serviceId,
        status: "pending",
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
