import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { MARKETPLACE_SERVICES } from "@/lib/marketplace-data";
import { getActiveServiceRequest } from "@/lib/service-requests";
import { getServiceLabel } from "@/lib/marketplace-utils";
import { cleanISBN, isValidISBN10, isValidISBN13 } from "@/lib/publication-validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
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

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("user_id");

    // Only allow "me" or the authenticated user's id
    if (userIdParam && userIdParam !== "me" && userIdParam !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("service_requests")
      .select("*, manuscripts(id, title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching service requests:", error);
      return NextResponse.json(
        { error: "Failed to fetch service requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("Service request fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

const MARKETING_BUDGET_RANGE_PATTERN = /^(under_\d+|\d+_\d+|\d+_plus|starter|standard|premium|custom)$/;
const AUTHOR_WEBSITE_ALLOWED_GENRES = new Set([
  "romance",
  "fantasy",
  "thriller",
  "mystery",
  "science-fiction",
  "science_fiction",
  "sci-fi",
  "scifi",
  "nonfiction",
  "memoir",
  "self-help",
  "business",
  "children",
  "young-adult",
  "young_adult",
  "historical",
  "horror",
  "poetry",
  "literary",
]);
const SOCIAL_MEDIA_ALLOWED_PLATFORMS = new Set([
  "instagram",
  "tiktok",
  "twitter",
  "facebook",
  "pinterest",
  "threads",
  "youtube",
  "linkedin",
]);

function validateMarketingMetadata(metadata?: {
  target_audience?: string;
  budget_range?: string;
  goals?: string;
} | null): string | null {
  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  const { target_audience, budget_range, goals } = metadata;

  if (typeof target_audience === "string" && target_audience.trim().length === 0) {
    return "Marketing request requires a target audience";
  }

  if (budget_range && !MARKETING_BUDGET_RANGE_PATTERN.test(budget_range)) {
    return "Marketing request has an invalid budget range";
  }

  if (typeof goals === "string" && goals.trim().length === 0) {
    return "Marketing request requires marketing goals";
  }

  return null;
}

function validateAuthorWebsiteMetadata(metadata?: {
  genre_vibe?: string;
  design_notes?: string;
  design_style?: string;
  pages?: string[];
  budget_range?: string;
  details?: string;
} | null): string | null {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "Author Website request metadata is required";
  }

  // Backward compatibility for legacy payloads.
  if (metadata.genre_vibe) {
    const normalizedGenre = metadata.genre_vibe.trim().toLowerCase();
    if (!AUTHOR_WEBSITE_ALLOWED_GENRES.has(normalizedGenre)) {
      return "Author Website request has invalid genre metadata";
    }
  }

  if (!metadata.genre_vibe && !metadata.design_style && !metadata.design_notes && !metadata.details) {
    return "Author Website request metadata is required";
  }

  return null;
}

function validateSocialMediaMetadata(metadata?: {
  platforms?: string[];
  target_platforms?: string[];
} | null): string | null {
  if (!metadata) {
    return "Social Media request requires platform metadata";
  }

  // Backward compatibility for legacy payloads.
  const platforms = metadata.platforms ?? metadata.target_platforms ?? [];

  if (!Array.isArray(platforms) || platforms.length === 0) {
    return "Social Media request requires at least one platform";
  }

  if (platforms.some((platform) => !SOCIAL_MEDIA_ALLOWED_PLATFORMS.has(platform))) {
    return "Social Media request has invalid platform selection";
  }

  return null;
}

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
    const { serviceId, manuscriptId, metadata: clientMetadata } = body;

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
    const isSpecialRole = ["super_admin", "admin", "support_agent"].includes(profile.role);
    
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

    // 4. Check for existing active request on this manuscript (AC 8.20.5)
    if (manuscriptId) {
      const { request: existingRequest } = await getActiveServiceRequest(supabase, manuscriptId);
      if (existingRequest) {
        const existingServiceLabel = getServiceLabel(existingRequest.service_type);
        return NextResponse.json(
          {
            error: `This manuscript already has an active ${existingServiceLabel} request`,
            code: "DUPLICATE_ACTIVE_REQUEST",
            existingRequestId: existingRequest.id,
          },
          { status: 409 }
        );
      }
    }



    // 4b. Validate publishing-help specific metadata (AC 8.6.6, 8.6.7)
    if (serviceId === "publishing-help") {
      // REQUIRE manuscriptId for publishing requests to avoid orphan records
      if (!manuscriptId) {
        return NextResponse.json(
          { error: "Manuscript ID is required for publishing requests" },
          { status: 400 }
        );
      }

      if (clientMetadata) {
        const { keywords, bisac_codes, isbn } = clientMetadata as {
          keywords?: string[];
          bisac_codes?: string[];
          isbn?: string;
        };

        // At least one keyword required
        if (!keywords || keywords.length === 0) {
          return NextResponse.json(
            { error: "At least one keyword is required for publishing requests" },
            { status: 400 }
          );
        }

        // At least one BISAC code required
        if (!bisac_codes || bisac_codes.length === 0) {
          return NextResponse.json(
            { error: "At least one category (BISAC code) is required for publishing requests" },
            { status: 400 }
          );
        }

        // ISBN validation (if provided)
        if (isbn) {
          const cleanedIsbn = cleanISBN(isbn);
          if (cleanedIsbn) {
            const isValid10 = cleanedIsbn.length === 10 && isValidISBN10(cleanedIsbn);
            const isValid13 = cleanedIsbn.length === 13 && isValidISBN13(cleanedIsbn);
            if (!isValid10 && !isValid13) {
              return NextResponse.json(
                { error: "Invalid ISBN format. Must be a valid ISBN-10 or ISBN-13" },
                { status: 400 }
              );
            }
          }
        }
      }
    }

    if (serviceId === "marketing") {
      const marketingError = validateMarketingMetadata(clientMetadata as {
        target_audience?: string;
        budget_range?: string;
        goals?: string;
      } | null);
      if (marketingError) {
        return NextResponse.json(
          { error: marketingError },
          { status: 400 }
        );
      }
    }

    if (serviceId === "author-website") {
      const authorWebsiteError = validateAuthorWebsiteMetadata(clientMetadata as {
        genre_vibe?: string;
        design_notes?: string;
        design_style?: string;
        pages?: string[];
        budget_range?: string;
        details?: string;
      } | null);
      if (authorWebsiteError) {
        return NextResponse.json(
          { error: authorWebsiteError },
          { status: 400 }
        );
      }
    }

    if (serviceId === "social-media") {
      const socialMediaError = validateSocialMediaMetadata(clientMetadata as {
        platforms?: string[];
        target_platforms?: string[];
      } | null);
      if (socialMediaError) {
        return NextResponse.json(
          { error: socialMediaError },
          { status: 400 }
        );
      }
    }

    // 5. Create service request with manuscript_id in the column (not just metadata)
    // Merge client-provided metadata with server-set metadata (AC 8.6.6)
    const serverMetadata = {
      requested_at: new Date().toISOString(),
      service_title: service.title,
    };
    const mergedMetadata = clientMetadata
      ? { ...clientMetadata, ...serverMetadata }
      : serverMetadata;

    const { data: serviceRequest, error: insertError } = await supabase
      .from("service_requests")
      .insert({
        user_id: user.id,
        manuscript_id: manuscriptId || null, // Store in actual column for proper indexing/constraints
        service_type: dbServiceType,
        status: "pending",
        amount_cents: amountCents,
        metadata: mergedMetadata,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating service request:", insertError);

      // Check if it's a unique constraint violation (duplicate active request)
      if (insertError.code === "23505" && insertError.message.includes("idx_service_requests_manuscript_active")) {
        return NextResponse.json(
          {
            error: "This manuscript already has an active service request",
            code: "DUPLICATE_ACTIVE_REQUEST",
          },
          { status: 409 }
        );
      }

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
