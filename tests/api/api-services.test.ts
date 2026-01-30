/**
 * @jest-environment node
 */
import { createClient } from "@/utils/supabase/server";
import { POST } from "@/app/api/services/request/route";
import { NextRequest } from "next/server";

// Mock Supabase Server Client
jest.mock("@/utils/supabase/server", () => ({
  __esModule: true,
  createClient: jest.fn(),
}));

// Mock Marketplace Data - use valid service IDs that match the DB enum mapping
jest.mock("@/lib/marketplace-data", () => ({
  __esModule: true,
  MARKETPLACE_SERVICES: [
    { id: "cover-design", title: "Cover Design" },
    { id: "isbn", title: "ISBN Registration" },
    { id: "publishing-help", title: "Publishing Help" },
    { id: "author-website", title: "Author Website" },
    { id: "marketing", title: "Marketing Package" },
    { id: "social-media", title: "Social Media Launch" },
    { id: "unknown-service", title: "Unknown Service" },
  ],
}));

// Mock service-requests lib for duplicate check
jest.mock("@/lib/service-requests", () => ({
  __esModule: true,
  getActiveServiceRequest: jest.fn(),
  hasActiveServiceRequest: jest.fn().mockResolvedValue(false),
}));

import { getActiveServiceRequest } from "@/lib/service-requests";

// Mock marketplace-utils
jest.mock("@/lib/marketplace-utils", () => ({
  __esModule: true,
  getServiceLabel: jest.fn().mockReturnValue("Cover Design"),
}));

describe("Service Request API (/api/services/request)", () => {
  // TODO (TEA Review): Add Story 8.20 test IDs + @p0/@p1 markers in describe/it for traceability. See _bmad-output/test-review.md
  // TODO (TEA Review): Add Given-When-Then comments to clarify intent. See _bmad-output/test-review.md
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // TODO (TEA Review): Extract shared Supabase mock helper to reduce duplication. See _bmad-output/test-review.md
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    // Default: no active request exists
    (getActiveServiceRequest as jest.Mock).mockResolvedValue({ request: null, error: null });
  });

  // TODO (TEA Review): Consider request/data factories to avoid repeated hardcoded IDs. See _bmad-output/test-review.md
  const createMockRequest = (body: any) => {
    return new NextRequest("http://localhost:3000/api/services/request", {
      method: "POST",
      body: JSON.stringify(body),
    });
  };

  it("returns 401 if user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const req = createMockRequest({ serviceId: "cover-design" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid service ID", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: "user-123" } }, 
      error: null 
    });
    const req = createMockRequest({ serviceId: "invalid-id" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown service type (not in DB enum mapping)", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: "user-123" } }, 
      error: null 
    });
    mockSupabase.single.mockResolvedValue({ 
      data: { role: "user" }, 
      error: null 
    });

    // Use a service ID that exists in MARKETPLACE_SERVICES mock but not in the DB enum mapping
    const req = createMockRequest({ serviceId: "unknown-service" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("successfully creates request for regular users", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: "user-123" } }, 
      error: null 
    });
    mockSupabase.single
      .mockResolvedValueOnce({ data: { role: "user" }, error: null }) // Profile check
      .mockResolvedValueOnce({ data: { id: "req-456" }, error: null }); // Insert result

    const req = createMockRequest({ serviceId: "cover-design", manuscriptId: "ms-789" });
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.requestId).toBe("req-456");
    
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "user-123",
      manuscript_id: "ms-789", // Now stored in column, not just metadata
      service_type: "cover_design", // DB enum uses underscores
      amount_cents: 0, // Quote-based service
    }));
  });

  describe("Additional service type mappings", () => {
    const serviceCases = [
      { serviceId: "author-website", dbType: "author_website" },
      { serviceId: "marketing", dbType: "marketing" },
      { serviceId: "social-media", dbType: "social_media" },
    ];

    it.each(serviceCases)(
      "maps $serviceId to $dbType and creates request",
      async ({ serviceId, dbType }) => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null
        });
        mockSupabase.single
          .mockResolvedValueOnce({ data: { role: "user" }, error: null })
          .mockResolvedValueOnce({ data: { id: "req-789" }, error: null });

        const req = createMockRequest({ serviceId });
        const res = await POST(req);

        expect(res.status).toBe(200);
        expect(mockSupabase.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            service_type: dbType,
            amount_cents: 0,
          })
        );
      }
    );
  });

  it("successfully creates request for super_admins without subscription check", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "admin-123" } },
      error: null
    });
    mockSupabase.single
      .mockResolvedValueOnce({ data: { role: "super_admin" }, error: null })
      .mockResolvedValueOnce({ data: { id: "req-999" }, error: null });

    const req = createMockRequest({ serviceId: "isbn" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      service_type: "isbn",
      amount_cents: 12500, // Fixed price for ISBN
    }));
  });

  it("returns 409 when manuscript already has an active request (API-level check)", async () => {
    const existingRequest = {
      id: "existing-req-123",
      manuscript_id: "ms-789",
      status: "pending",
      service_type: "cover_design",
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null
    });
    mockSupabase.single.mockResolvedValueOnce({
      data: { role: "user" },
      error: null
    });
    (getActiveServiceRequest as jest.Mock).mockResolvedValue({
      request: existingRequest,
      error: null
    });

    const req = createMockRequest({ serviceId: "cover-design", manuscriptId: "ms-789" });
    const res = await POST(req);

    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.code).toBe("DUPLICATE_ACTIVE_REQUEST");
    expect(data.existingRequestId).toBe("existing-req-123");
    expect(data.error).toContain("already has an active");
  });

  it("returns 409 when database unique constraint is violated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null
    });
    mockSupabase.single
      .mockResolvedValueOnce({ data: { role: "user" }, error: null }) // Profile check
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: "23505",
          message: "duplicate key value violates unique constraint \"idx_service_requests_manuscript_active\""
        }
      }); // Insert fails with constraint violation

    const req = createMockRequest({ serviceId: "cover-design", manuscriptId: "ms-789" });
    const res = await POST(req);

    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.code).toBe("DUPLICATE_ACTIVE_REQUEST");
  });

  // Story 8.6: Publishing-help metadata validation tests
  describe("Publishing-help metadata validation (AC 8.6.6)", () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null
      });
      mockSupabase.single.mockResolvedValueOnce({
        data: { role: "user" },
        error: null
      });
    });

    it("returns 400 when publishing-help request has no keywords", async () => {
      const req = createMockRequest({
        serviceId: "publishing-help",
        manuscriptId: "ms-789",
        metadata: {
          bisac_codes: ["FIC000000"],
          keywords: [], // Empty keywords
        },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("keyword");
    });

    it("returns 400 when publishing-help request has no BISAC codes", async () => {
      const req = createMockRequest({
        serviceId: "publishing-help",
        manuscriptId: "ms-789",
        metadata: {
          bisac_codes: [], // Empty categories
          keywords: ["fantasy", "adventure"],
        },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("category");
    });

    it("returns 400 when publishing-help request has invalid ISBN", async () => {
      const req = createMockRequest({
        serviceId: "publishing-help",
        manuscriptId: "ms-789",
        metadata: {
          bisac_codes: ["FIC000000"],
          keywords: ["fantasy"],
          isbn: "123-invalid-isbn",
        },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("ISBN");
    });

    it("successfully creates publishing-help request with valid metadata", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: "req-publish-123" },
        error: null
      });

      const req = createMockRequest({
        serviceId: "publishing-help",
        manuscriptId: "ms-789",
        metadata: {
          bisac_codes: ["FIC009000", "FIC002000"],
          keywords: ["fantasy", "adventure", "epic"],
          isbn: "978-0-06-112008-4", // Valid ISBN-13
          education_level: "general",
        },
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // Verify metadata is merged with server metadata
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          service_type: "publishing_help",
          metadata: expect.objectContaining({
            bisac_codes: ["FIC009000", "FIC002000"],
            keywords: ["fantasy", "adventure", "epic"],
            requested_at: expect.any(String),
            service_title: "Publishing Help",
          }),
        })
      );
    });

    it("accepts valid ISBN-10 in publishing-help request", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: "req-publish-456" },
        error: null
      });

      const req = createMockRequest({
        serviceId: "publishing-help",
        manuscriptId: "ms-789",
        metadata: {
          bisac_codes: ["FIC000000"],
          keywords: ["fiction"],
          isbn: "0-13-110362-8", // Valid ISBN-10 (K&R C Programming)
        },
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });

    it("allows publishing-help request without ISBN (optional field)", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: "req-publish-789" },
        error: null
      });

      const req = createMockRequest({
        serviceId: "publishing-help",
        manuscriptId: "ms-789",
        metadata: {
          bisac_codes: ["FIC000000"],
          keywords: ["fiction"],
          // No ISBN provided
        },
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });
  });
});
