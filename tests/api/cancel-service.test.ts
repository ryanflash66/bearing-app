/**
 * @jest-environment node
 */
import { createClient } from "@/utils/supabase/server";
import { POST } from "@/app/api/service-requests/[id]/cancel/route";
import { NextRequest } from "next/server";
import { cancelServiceRequest } from "@/lib/service-requests";

// Mock Supabase Server Client
jest.mock("@/utils/supabase/server", () => ({
  __esModule: true,
  createClient: jest.fn(),
}));

// Mock service-requests lib
jest.mock("@/lib/service-requests", () => ({
  __esModule: true,
  cancelServiceRequest: jest.fn(),
}));

describe("Cancel Service Request API (/api/service-requests/[id]/cancel)", () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  const createMockRequest = () => {
    return new NextRequest("http://localhost:3000/api/service-requests/req-123/cancel", {
      method: "POST",
    });
  };

  const mockContext = {
    params: Promise.resolve({ id: "req-123" }),
  };

  it("returns 401 if user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const req = createMockRequest();
    const res = await POST(req, mockContext);
    expect(res.status).toBe(401);
  });

  it("returns 404 if request does not exist", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: "user-123" } }, 
      error: null 
    });
    // Request lookup returns null/error
    mockSupabase.single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

    const req = createMockRequest();
    const res = await POST(req, mockContext);
    expect(res.status).toBe(404);
  });

  it("returns 403 if user does not own the request", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: "user-123" } }, 
      error: null 
    });
    // Request exists but belongs to different user
    mockSupabase.single.mockResolvedValue({ 
      data: { id: "req-123", user_id: "other-user", status: "pending" }, 
      error: null 
    });

    const req = createMockRequest();
    const res = await POST(req, mockContext);
    expect(res.status).toBe(403);
  });

  it("returns 400 if request status is not pending", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: "user-123" } }, 
      error: null 
    });
    // Request exists, owned by user, but status is 'in_progress'
    mockSupabase.single.mockResolvedValue({ 
      data: { id: "req-123", user_id: "user-123", status: "in_progress" }, 
      error: null 
    });

    const req = createMockRequest();
    const res = await POST(req, mockContext);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe("INVALID_STATUS");
  });

  it("successfully cancels request", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: "user-123" } }, 
      error: null 
    });
    // Request exists, owned by user, status pending
    mockSupabase.single.mockResolvedValue({ 
      data: { id: "req-123", user_id: "user-123", status: "pending" }, 
      error: null 
    });

    // Mock successful cancellation helper
    (cancelServiceRequest as jest.Mock).mockResolvedValue({
      request: { id: "req-123", status: "cancelled" },
      error: null,
    });

    const req = createMockRequest();
    const res = await POST(req, mockContext);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.request.status).toBe("cancelled");
  });

  it("handles cancellation helper errors (e.g. race condition/permission)", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ 
      data: { user: { id: "user-123" } }, 
      error: null 
    });
    mockSupabase.single.mockResolvedValue({ 
      data: { id: "req-123", user_id: "user-123", status: "pending" }, 
      error: null 
    });

    // Mock cancellation failure
    (cancelServiceRequest as jest.Mock).mockResolvedValue({
      request: null,
      error: "You do not have permission to cancel this request",
    });

    const req = createMockRequest();
    const res = await POST(req, mockContext);
    
    expect(res.status).toBe(403); // Implementation maps permission errors to 403
  });
});
