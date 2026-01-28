/**
 * @jest-environment node
 */
import { createClient } from "@/utils/supabase/server";
import { POST } from "@/app/api/service-requests/[id]/cancel/route";
import { NextRequest } from "next/server";

// Mock Supabase Server Client
jest.mock("@/utils/supabase/server", () => ({
  __esModule: true,
  createClient: jest.fn(),
}));

// Mock the service-requests lib
jest.mock("@/lib/service-requests", () => ({
  __esModule: true,
  cancelServiceRequest: jest.fn(),
}));

import { cancelServiceRequest } from "@/lib/service-requests";

describe("Cancel Request API (/api/service-requests/[id]/cancel)", () => {
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
      single: jest.fn(),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  const createMockRequest = () => {
    return new NextRequest(
      "http://localhost:3000/api/service-requests/req-123/cancel",
      { method: "POST" }
    );
  };

  // TODO (TEA Review): Consider small ID factory to avoid repeated hardcoded IDs. See _bmad-output/test-review.md
  const createMockContext = (id: string = "req-123") => ({
    params: Promise.resolve({ id }),
  });

  it("returns 401 if user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const req = createMockRequest();
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.code).toBe("UNAUTHORIZED");
  });

  it("returns 404 if request not found", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116" },
    });

    const req = createMockRequest();
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.code).toBe("NOT_FOUND");
  });

  it("returns 403 if user does not own the request", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSupabase.single.mockResolvedValue({
      data: { id: "req-123", user_id: "other-user", status: "pending" },
      error: null,
    });

    const req = createMockRequest();
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.code).toBe("FORBIDDEN");
  });

  it("returns 400 if request is not pending", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSupabase.single.mockResolvedValue({
      data: { id: "req-123", user_id: "user-123", status: "paid" },
      error: null,
    });

    const req = createMockRequest();
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe("INVALID_STATUS");
    expect(data.error).toContain("paid");
  });

  it("successfully cancels a pending request", async () => {
    const cancelledRequest = {
      id: "req-123",
      user_id: "user-123",
      status: "cancelled",
      service_type: "cover_design",
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSupabase.single.mockResolvedValue({
      data: { id: "req-123", user_id: "user-123", status: "pending" },
      error: null,
    });
    (cancelServiceRequest as jest.Mock).mockResolvedValue({
      request: cancelledRequest,
      error: null,
    });

    const req = createMockRequest();
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.request).toEqual(cancelledRequest);
  });

  it("returns 500 on internal error from cancelServiceRequest", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSupabase.single.mockResolvedValue({
      data: { id: "req-123", user_id: "user-123", status: "pending" },
      error: null,
    });
    (cancelServiceRequest as jest.Mock).mockResolvedValue({
      request: null,
      error: "Database connection failed",
    });

    const req = createMockRequest();
    const res = await POST(req, createMockContext());

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.code).toBe("INTERNAL_ERROR");
  });
});
