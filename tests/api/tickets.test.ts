
import { POST } from "@/app/api/support/tickets/route";
import { createClient } from "@/utils/supabase/server";

// Mock Supabase
jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(),
}));

describe("POST /api/support/tickets", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Unauthorized" },
        }),
      },
    });

    const req = {
      json: jest.fn().mockResolvedValue({ subject: "Test", message: "Help" }),
    } as any;

    const res = await POST(req);
    expect(res.status).toBe(401);
  });


  it("should create a ticket and return 200", async () => {
    // Mock RPC
    const mockRpc = jest.fn().mockResolvedValue({ data: "ticket-1", error: null });

    // Mock Fetch Ticket (after creation)
    const mockSingleTicket = jest.fn().mockResolvedValue({ 
      data: { id: "ticket-1", user_id: "public-user-1", subject: "Issue", message: "Help me" }, 
      error: null 
    });
    const mockEqTicket = jest.fn().mockReturnValue({ single: mockSingleTicket });
    const mockSelectTicket = jest.fn().mockReturnValue({ eq: mockEqTicket });

    // Mock Users lookup (for audit log - fires in background but setup needed to avoid crash if awaited)
    const mockSingleUser = jest.fn().mockResolvedValue({ data: { id: "public-user-1" }, error: null });
    const mockEqUser = jest.fn().mockReturnValue({ single: mockSingleUser });
    const mockSelectUser = jest.fn().mockReturnValue({ eq: mockEqUser });

    const mockFrom = jest.fn().mockImplementation((table) => {
        if (table === "support_tickets") return { select: mockSelectTicket };
        if (table === "users") return { select: mockSelectUser };
        return { select: jest.fn(), insert: jest.fn() };
    });

    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "auth-user-123", email: "user@test.com" } },
          error: null,
        }),
      },
      rpc: mockRpc,
      from: mockFrom,
    });

    const req = {
      json: jest.fn().mockResolvedValue({ subject: "Issue", message: "Help me" }),
    } as any;

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    
    // Verify RPC call
    expect(mockRpc).toHaveBeenCalledWith("create_ticket", {
      subject: "Issue",
      message: "Help me",
      priority: "medium"
    });
    
    expect(data.id).toBe("ticket-1");
  });

  it("should handle RPC errors (e.g. rate limit)", async () => {
    const mockRpc = jest.fn().mockResolvedValue({ data: null, error: { message: "Rate limit exceeded" } });

    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "auth-user-123" } },
          error: null,
        }),
      },
      rpc: mockRpc,
    });

    const req = {
      json: jest.fn().mockResolvedValue({ subject: "Spam", message: "Fast" }),
    } as any;

    const res = await POST(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain("Rate limit exceeded");
  });
});
