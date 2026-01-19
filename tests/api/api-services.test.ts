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
  ],
}));

describe("Service Request API (/api/services/request)", () => {
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
      insert: jest.fn().mockReturnThis(),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

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
      service_type: "cover_design", // DB enum uses underscores
      amount_cents: 0, // Quote-based service
      metadata: expect.objectContaining({
        manuscript_id: "ms-789",
      }),
    }));
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
});
