/**
 * @jest-environment node
 */
import { createClient } from "@/utils/supabase/server";
import { GET } from "@/app/api/manuscripts/[id]/service-status/route";
import { NextRequest } from "next/server";

// Mock Supabase Server Client
jest.mock("@/utils/supabase/server", () => ({
  __esModule: true,
  createClient: jest.fn(),
}));

// Mock the service-requests lib
jest.mock("@/lib/service-requests", () => ({
  __esModule: true,
  getActiveServiceRequest: jest.fn(),
  ACTIVE_STATUSES: ["pending", "paid", "in_progress"],
}));

import { getActiveServiceRequest } from "@/lib/service-requests";

describe("Service Status API (/api/manuscripts/[id]/service-status)", () => {
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
      "http://localhost:3000/api/manuscripts/ms-123/service-status"
    );
  };

  // TODO (TEA Review): Consider small ID factory to avoid repeated hardcoded IDs. See _bmad-output/test-review.md
  const createMockContext = (id: string = "ms-123") => ({
    params: Promise.resolve({ id }),
  });

  it("returns 401 if user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const req = createMockRequest();
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Authentication required");
  });

  it("returns 404 if manuscript not found", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116" },
    });

    const req = createMockRequest();
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Manuscript not found");
  });

  it("returns 403 if user does not own the manuscript", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { id: "ms-123", owner_user_id: "owner-456" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: "profile-123", role: "user" }, // Not an admin
        error: null,
      });

    const req = createMockRequest();
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Forbidden");
  });

  it("returns active request and isLocked=true when request exists", async () => {
    const mockRequest = {
      id: "req-456",
      manuscript_id: "ms-123",
      status: "pending",
      service_type: "cover_design",
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { id: "ms-123", owner_user_id: "profile-123" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: "profile-123", role: "user" },
        error: null,
      });
    (getActiveServiceRequest as jest.Mock).mockResolvedValue({
      request: mockRequest,
      error: null,
    });

    const req = createMockRequest();
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.activeRequest).toEqual(mockRequest);
    expect(data.isLocked).toBe(true);
  });

  it("returns null and isLocked=false when no active request", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { id: "ms-123", owner_user_id: "profile-123" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: "profile-123", role: "user" },
        error: null,
      });
    (getActiveServiceRequest as jest.Mock).mockResolvedValue({
      request: null,
      error: null,
    });

    const req = createMockRequest();
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.activeRequest).toBeNull();
    expect(data.isLocked).toBe(false);
  });

  it("allows admin to view service status for any manuscript", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "admin-123" } },
      error: null,
    });
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { id: "ms-123", owner_user_id: "owner-456" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: "admin-999", role: "super_admin" },
        error: null,
      });
    (getActiveServiceRequest as jest.Mock).mockResolvedValue({
      request: null,
      error: null,
    });

    const req = createMockRequest();
    const res = await GET(req, createMockContext());

    expect(res.status).toBe(200);
  });
});
