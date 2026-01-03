
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
    const mockInsertTicket = jest.fn().mockResolvedValue({ data: { id: "ticket-1", user_id: "public-user-1" }, error: null });
    const mockInsertMessage = jest.fn().mockResolvedValue({ error: null });
    
    // Mock Users lookup
    const mockSingleUser = jest.fn().mockResolvedValue({ data: { id: "public-user-1" }, error: null });
    const mockEqUser = jest.fn().mockReturnValue({ single: mockSingleUser });
    const mockSelectUser = jest.fn().mockReturnValue({ eq: mockEqUser });

    const mockFrom = jest.fn().mockImplementation((table) => {
        if (table === "users") return { select: mockSelectUser };
        if (table === "support_tickets") return { insert: mockInsertTicket };
        if (table === "support_messages") return { insert: mockInsertMessage };
        return { insert: jest.fn() };
    });
    
    // Support tickets insert needs to chain select().single()
    mockInsertTicket.mockReturnValue({ 
        select: jest.fn().mockReturnValue({ 
            single: jest.fn().mockResolvedValue({ data: { id: "ticket-1" }, error: null }) // mock return of ticket
        }) 
    });
    
    // Correction: In implementation
    /* 
    .insert(...)
    .select()
    .single();
    */
    // So insert() returns an object with select().
    // Let's redefine mockInsertTicket to handle chaining.
    const mockTicketSelect = jest.fn().mockReturnValue({ 
        single: jest.fn().mockResolvedValue({ data: { id: "ticket-1", user_id: "public-user-1" }, error: null }) 
    });
    
    const mockInsertTicketChain = jest.fn().mockReturnValue({ select: mockTicketSelect });

    const mockFromUpdated = jest.fn().mockImplementation((table) => {
        if (table === "users") return { select: mockSelectUser };
        if (table === "support_tickets") return { insert: mockInsertTicketChain };
        if (table === "support_messages") return { insert: mockInsertMessage };
        return { select: jest.fn() }; // Default
    });

    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "auth-user-123", email: "user@test.com" } },
          error: null,
        }),
      },
      from: mockFromUpdated,
    });

    const req = {
      json: jest.fn().mockResolvedValue({ subject: "Issue", message: "Help me" }),
    } as any;

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("ticket-1");
    // Verify user lookup
    expect(mockFromUpdated).toHaveBeenCalledWith("users");
    expect(mockEqUser).toHaveBeenCalledWith("auth_id", "auth-user-123");
    
    // Verify ticket creation
    expect(mockFromUpdated).toHaveBeenCalledWith("support_tickets");
    expect(mockInsertTicketChain).toHaveBeenCalledWith(expect.objectContaining({
        user_id: "public-user-1",
        subject: "Issue"
    }));
  });

  it("should create an initial message in support_messages", async () => {
    const mockInsertMessage = jest.fn().mockResolvedValue({ error: null });
    
    // Mock Users lookup
    const mockSingleUser = jest.fn().mockResolvedValue({ data: { id: "public-user-1" }, error: null });
    const mockEqUser = jest.fn().mockReturnValue({ single: mockSingleUser });
    const mockSelectUser = jest.fn().mockReturnValue({ eq: mockEqUser });

    // Mock Ticket creation
    const mockTicketSelect = jest.fn().mockReturnValue({ 
        single: jest.fn().mockResolvedValue({ data: { id: "ticket-1", user_id: "public-user-1" }, error: null }) 
    });
    const mockInsertTicketChain = jest.fn().mockReturnValue({ select: mockTicketSelect });

    const mockFrom = jest.fn().mockImplementation((table) => {
        if (table === "users") return { select: mockSelectUser };
        if (table === "support_tickets") return { insert: mockInsertTicketChain };
        if (table === "support_messages") return { insert: mockInsertMessage };
        return { select: jest.fn() };
    });
    
    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "auth-user-123" } },
          error: null,
        }),
      },
      from: mockFrom,
    });

    const req = {
      json: jest.fn().mockResolvedValue({ subject: "Issue", message: "Help me" }),
    } as any;

    await POST(req);
    
    expect(mockFrom).toHaveBeenCalledWith("support_messages");
    expect(mockInsertMessage).toHaveBeenCalledWith(expect.objectContaining({
        ticket_id: "ticket-1",
        message: "Help me",
        sender_user_id: "public-user-1"
    }));
  });
});
