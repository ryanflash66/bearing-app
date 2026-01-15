import { POST } from "@/app/api/checkout/isbn/route";
import { createClient } from "@/utils/supabase/server";
import { stripe } from "@/lib/stripe";

// Mock Supabase
jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(),
}));

// Mock Stripe
jest.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  },
  SERVICE_PRICES: {
    isbn: 12500,
  },
  SERVICE_METADATA: {
    isbn: {
      name: "ISBN Registration",
      description: "Official ISBN assignment for your book with barcode generation",
    },
  },
}));

// Helper to create mock request
function createMockRequest(options: {
  method?: string;
  body?: object | null;
  headers?: Record<string, string>;
} = {}) {
  const { method = "POST", body = null, headers = {} } = options;
  return {
    method,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] || null,
    },
    json: jest.fn().mockResolvedValue(body || {}),
  } as any;
}

describe("POST /api/checkout/isbn", () => {
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

    const req = createMockRequest();
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Authentication required");
  });

  it("should create a Stripe checkout session and return URL", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      rpc: jest.fn().mockResolvedValue({ data: 5, error: null }), // 5 ISBNs available
    });

    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/pay/cs_test_123",
    });

    const req = createMockRequest({
      headers: { origin: "http://localhost:3000" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.sessionId).toBe("cs_test_123");
    expect(data.url).toBe("https://checkout.stripe.com/pay/cs_test_123");
    expect(data.poolWarning).toBe(false);

    // Verify Stripe was called with correct params
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_types: ["card"],
        mode: "payment",
        metadata: expect.objectContaining({
          user_id: "user-123",
          service_type: "isbn",
        }),
        customer_email: "test@example.com",
      })
    );
  });

  it("should return poolWarning=true when ISBN pool is empty", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      rpc: jest.fn().mockResolvedValue({ data: 0, error: null }), // 0 ISBNs available
    });

    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      id: "cs_test_456",
      url: "https://checkout.stripe.com/pay/cs_test_456",
    });

    const req = createMockRequest({
      headers: { origin: "http://localhost:3000" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.poolWarning).toBe(true);
  });

  it("should include manuscript_id in metadata when provided with valid UUID", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const validManuscriptUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      rpc: jest.fn().mockResolvedValue({ data: 5, error: null }),
    });

    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      id: "cs_test_789",
      url: "https://checkout.stripe.com/pay/cs_test_789",
    });

    const req = createMockRequest({
      body: { manuscriptId: validManuscriptUuid },
      headers: { origin: "http://localhost:3000" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          manuscript_id: validManuscriptUuid,
        }),
      })
    );
  });

  it("should ignore invalid manuscript_id (non-UUID)", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      rpc: jest.fn().mockResolvedValue({ data: 5, error: null }),
    });

    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      id: "cs_test_invalid",
      url: "https://checkout.stripe.com/pay/cs_test_invalid",
    });

    const req = createMockRequest({
      body: { manuscriptId: "not-a-valid-uuid" },
      headers: { origin: "http://localhost:3000" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Should pass empty string for invalid UUID (silently ignored)
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          manuscript_id: "",
        }),
      })
    );
  });

  it("should return 500 if Stripe session creation fails", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      rpc: jest.fn().mockResolvedValue({ data: 5, error: null }),
    });

    (stripe.checkout.sessions.create as jest.Mock).mockRejectedValue(
      new Error("Stripe API error")
    );

    const req = createMockRequest();
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to create checkout session");
  });
});
