/**
 * @jest-environment node
 */
import { POST, GET } from "@/app/api/services/request/route";
import { createClient } from "@/utils/supabase/server";

// Mock email notifications
jest.mock("@/lib/email", () => ({
  notifyAdminsNewServiceRequest: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock Supabase
jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(),
}));

// Mock service-requests library
jest.mock("@/lib/service-requests", () => ({
  getActiveServiceRequest: jest.fn().mockResolvedValue({ request: null }),
}));

// Mock marketplace-utils
jest.mock("@/lib/marketplace-utils", () => ({
  getServiceLabel: jest.fn((type: string) => type.replace("_", " ")),
}));

// Mock publication-validation
jest.mock("@/lib/publication-validation", () => ({
  cleanISBN: jest.fn((isbn: string) => isbn?.replace(/[^0-9X]/gi, "")),
  isValidISBN10: jest.fn((isbn: string) => isbn === "0306406152"),
  isValidISBN13: jest.fn((isbn: string) => isbn === "9780306406157"),
}));

describe("POST /api/services/request", () => {
  const createMockSupabase = (role: string = "user") => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "auth-user-123" } },
        error: null,
      }),
    },
    from: jest.fn().mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: "user-1", role, email: "user@example.com" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "manuscripts") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: "ms-123" },
                  error: null,
                }),
              }),
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id: "ms-123" },
                error: null,
              }),
            }),
          }),
        };
      }
      // service_requests table for insert
      return {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: "request-123" },
              error: null,
            }),
          }),
        }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };
    }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should return 401 if not authenticated", async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: "Not authenticated" },
          }),
        },
      };
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const req = {
        json: jest.fn().mockResolvedValue({
          serviceId: "author-website",
          metadata: {},
        }),
      } as any;

      const res = await POST(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Authentication required");
    });
  });

  describe("Service validation", () => {
    it("should return 400 for invalid service ID", async () => {
      const mockSupabase = createMockSupabase();
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const req = {
        json: jest.fn().mockResolvedValue({
          serviceId: "invalid-service",
          metadata: {},
        }),
      } as any;

      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid service ID");
    });

    it("should accept valid author-website service", async () => {
      const mockSupabase = createMockSupabase();
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const req = {
        json: jest.fn().mockResolvedValue({
          serviceId: "author-website",
          metadata: {
            genre_vibe: "romance",
            design_notes: "Modern theme",
          },
        }),
      } as any;

      const res = await POST(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  describe("Metadata validation (AC 8.12.3)", () => {
    it("should require metadata when missing", async () => {
      const mockSupabase = createMockSupabase();
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const req = {
        json: jest.fn().mockResolvedValue({
          serviceId: "author-website",
        }),
      } as any;

      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("metadata");
    });

    it("should validate author-website metadata", async () => {
      const mockSupabase = createMockSupabase();
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const req = {
        json: jest.fn().mockResolvedValue({
          serviceId: "author-website",
          metadata: {
            genre_vibe: "invalid_genre", // Invalid genre
            design_notes: "Test notes",
          },
        }),
      } as any;

      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Author Website");
    });

    it("should validate marketing metadata", async () => {
      const mockSupabase = createMockSupabase();
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const req = {
        json: jest.fn().mockResolvedValue({
          serviceId: "marketing",
          metadata: {
            target_audience: "Test audience",
            budget_range: "500_1000",
            goals: "Increase sales",
          },
        }),
      } as any;

      const res = await POST(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("should reject invalid budget range", async () => {
      const mockSupabase = createMockSupabase();
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const req = {
        json: jest.fn().mockResolvedValue({
          serviceId: "marketing",
          metadata: {
            budget_range: "invalid_range",
          },
        }),
      } as any;

      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Marketing");
    });

    it("should require at least one platform for social-media", async () => {
      const mockSupabase = createMockSupabase();
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const req = {
        json: jest.fn().mockResolvedValue({
          serviceId: "social-media",
          metadata: {
            target_platforms: [], // Empty array
            current_handles: "@test",
          },
        }),
      } as any;

      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("platform");
    });

    it("should accept valid social-media metadata", async () => {
      const mockSupabase = createMockSupabase();
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const req = {
        json: jest.fn().mockResolvedValue({
          serviceId: "social-media",
          metadata: {
            target_platforms: ["instagram", "tiktok"],
            current_handles: "@myauthor",
          },
        }),
      } as any;

      const res = await POST(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("should reject invalid platform in social-media", async () => {
      const mockSupabase = createMockSupabase();
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const req = {
        json: jest.fn().mockResolvedValue({
          serviceId: "social-media",
          metadata: {
            target_platforms: ["invalid_platform"],
          },
        }),
      } as any;

      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });

  describe("Publishing-help validation", () => {
    it("should require manuscriptId for publishing-help", async () => {
      const mockSupabase = createMockSupabase();
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const req = {
        json: jest.fn().mockResolvedValue({
          serviceId: "publishing-help",
          metadata: {
            bisac_codes: ["FIC000000"],
            keywords: ["fantasy"],
          },
        }),
      } as any;

      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Manuscript ID is required");
    });

    it("should require at least one keyword", async () => {
      const mockSupabase = createMockSupabase();
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const req = {
        json: jest.fn().mockResolvedValue({
          serviceId: "publishing-help",
          manuscriptId: "ms-123",
          metadata: {
            bisac_codes: ["FIC000000"],
            keywords: [], // Empty keywords
          },
        }),
      } as any;

      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("keyword");
    });

    it("should require at least one BISAC code", async () => {
      const mockSupabase = createMockSupabase();
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const req = {
        json: jest.fn().mockResolvedValue({
          serviceId: "publishing-help",
          manuscriptId: "ms-123",
          metadata: {
            bisac_codes: [], // Empty BISAC codes
            keywords: ["fantasy"],
          },
        }),
      } as any;

      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("BISAC");
    });
  });

  describe("Duplicate request prevention (AC 8.12.5)", () => {
    it("should return 409 for duplicate active request", async () => {
      const mockSupabase = createMockSupabase();
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      // Mock getActiveServiceRequest to return an existing request
      const { getActiveServiceRequest } = require("@/lib/service-requests");
      (getActiveServiceRequest as jest.Mock).mockResolvedValueOnce({
        request: {
          id: "existing-req-123",
          service_type: "author_website",
        },
      });

      const req = {
        json: jest.fn().mockResolvedValue({
          serviceId: "author-website",
          manuscriptId: "ms-123",
          metadata: {},
        }),
      } as any;

      const res = await POST(req);

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.code).toBe("DUPLICATE_ACTIVE_REQUEST");
      expect(data.existingRequestId).toBe("existing-req-123");
    });
  });

  describe("Successful request creation (AC 8.12.4)", () => {
    it("should create service request successfully", async () => {
      const mockSupabase = createMockSupabase();
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const req = {
        json: jest.fn().mockResolvedValue({
          serviceId: "author-website",
          manuscriptId: "ms-123",
          metadata: {
            genre_vibe: "romance",
            design_notes: "Modern theme",
          },
        }),
      } as any;

      const res = await POST(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.requestId).toBe("request-123");
    });

    it("should return success message with service title", async () => {
      const mockSupabase = createMockSupabase();
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const req = {
        json: jest.fn().mockResolvedValue({
          serviceId: "marketing",
          metadata: {},
        }),
      } as any;

      const res = await POST(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toContain("Marketing");
      expect(data.message).toContain("submitted successfully");
    });
  });
});

describe("GET /api/services/request", () => {
  const createMockSupabase = () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "auth-user-123" } },
        error: null,
      }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: "req-1",
                service_type: "author_website",
                status: "pending",
                manuscripts: { id: "ms-1", title: "My Book" },
              },
            ],
            error: null,
          }),
        }),
      }),
    }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Not authenticated" },
        }),
      },
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    const req = {
      url: "http://localhost/api/services/request",
    } as any;

    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("should return user service requests", async () => {
    const mockSupabase = createMockSupabase();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    const req = {
      url: "http://localhost/api/services/request",
    } as any;

    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveLength(1);
    expect(data.data[0].service_type).toBe("author_website");
  });

  it("should reject requests for other users", async () => {
    const mockSupabase = createMockSupabase();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    const req = {
      url: "http://localhost/api/services/request?user_id=other-user-123",
    } as any;

    const res = await GET(req);

    expect(res.status).toBe(403);
  });
});
