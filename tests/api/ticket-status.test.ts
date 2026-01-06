import { PATCH } from "@/app/api/support/tickets/[id]/status/route";
import { createClient } from "@/utils/supabase/server";

// Mock Supabase
jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(),
}));

describe("PATCH /api/support/tickets/[id]/status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if request body is invalid JSON", async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "auth-user-123" } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: "public-user-1", role: "support_agent" },
              error: null,
            }),
          }),
        }),
      })),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    // Mock request with invalid JSON
    const req = {
      json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
    } as any;

    const params = Promise.resolve({ id: "ticket-1" });
    const res = await PATCH(req, { params });
    
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON in request body");
  });

  it("should return 400 if status field is missing", async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "auth-user-123" } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: "public-user-1", role: "support_agent" },
              error: null,
            }),
          }),
        }),
      })),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    // Mock request with missing status field
    const req = {
      json: jest.fn().mockResolvedValue({}),
    } as any;

    const params = Promise.resolve({ id: "ticket-1" });
    const res = await PATCH(req, { params });
    
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Status field is required");
  });

  it("should return 400 if status field is undefined", async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "auth-user-123" } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: "public-user-1", role: "support_agent" },
              error: null,
            }),
          }),
        }),
      })),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    // Mock request with undefined status field
    const req = {
      json: jest.fn().mockResolvedValue({ status: undefined }),
    } as any;

    const params = Promise.resolve({ id: "ticket-1" });
    const res = await PATCH(req, { params });
    
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Status field is required");
  });

  it("should return 400 if status is invalid", async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "auth-user-123" } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: "public-user-1", role: "support_agent" },
              error: null,
            }),
          }),
        }),
      })),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    // Mock request with invalid status
    const req = {
      json: jest.fn().mockResolvedValue({ status: "invalid_status" }),
    } as any;

    const params = Promise.resolve({ id: "ticket-1" });
    const res = await PATCH(req, { params });
    
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid status");
  });

  it("should successfully update status with valid data", async () => {
    const mockRpc = jest.fn().mockResolvedValue({ error: null });
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "auth-user-123" } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: "public-user-1", role: "support_agent" },
              error: null,
            }),
          }),
        }),
      })),
      rpc: mockRpc,
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    // Mock request with valid status
    const req = {
      json: jest.fn().mockResolvedValue({ status: "resolved" }),
    } as any;

    const params = Promise.resolve({ id: "ticket-1" });
    const res = await PATCH(req, { params });
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.status).toBe("resolved");
    expect(mockRpc).toHaveBeenCalledWith("update_ticket_status", {
      ticket_id: "ticket-1",
      new_status: "resolved",
    });
  });
});
