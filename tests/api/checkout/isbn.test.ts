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

function createDuplicateCheckMocks(existingRequest: { id: string } | null) {
  const mockMaybeSingle = jest.fn().mockResolvedValue({
    data: existingRequest,
    error: null,
  });
  const mockIn = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
  const mockEq2 = jest.fn().mockReturnValue({ in: mockIn });
  const mockEq = jest.fn().mockReturnValue({ eq: mockEq2 });
  const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

  return { mockFrom, mockMaybeSingle };
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
    const { mockFrom } = createDuplicateCheckMocks(null);

    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: mockFrom,
      rpc: jest.fn().mockResolvedValue({ data: 5, error: null }), // 5 ISBNs available
    });

    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/pay/cs_test_123",
    });

    const req = createMockRequest({
      headers: { origin: "http://localhost:3000" },
      body: {
        manuscriptId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        metadata: {
          author_name: "Jane Author",
          bisac_code: "FIC000000",
        },
      },
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
    const { mockFrom } = createDuplicateCheckMocks(null);

    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: mockFrom,
      rpc: jest.fn().mockResolvedValue({ data: 0, error: null }), // 0 ISBNs available
    });

    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      id: "cs_test_456",
      url: "https://checkout.stripe.com/pay/cs_test_456",
    });

    const req = createMockRequest({
      headers: { origin: "http://localhost:3000" },
      body: {
        manuscriptId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        metadata: {
          author_name: "Jane Author",
          bisac_code: "FIC000000",
        },
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.poolWarning).toBe(true);
  });

  it("should include manuscript_id in metadata when provided with valid UUID", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const validManuscriptUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const { mockFrom } = createDuplicateCheckMocks(null);

    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: mockFrom,
      rpc: jest.fn().mockResolvedValue({ data: 5, error: null }),
    });

    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      id: "cs_test_789",
      url: "https://checkout.stripe.com/pay/cs_test_789",
    });

    const req = createMockRequest({
      body: {
        manuscriptId: validManuscriptUuid,
        metadata: {
          author_name: "Jane Author",
          bisac_code: "FIC000000",
        },
      },
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

  it("should return 400 for invalid manuscript_id (non-UUID)", async () => {
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

    const req = createMockRequest({
      body: {
        manuscriptId: "not-a-valid-uuid",
        metadata: {
          author_name: "Jane Author",
          bisac_code: "FIC000000",
        },
      },
      headers: { origin: "http://localhost:3000" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid manuscriptId");
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("should return 500 if Stripe session creation fails", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const { mockFrom } = createDuplicateCheckMocks(null);

    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: mockFrom,
      rpc: jest.fn().mockResolvedValue({ data: 5, error: null }),
    });

    (stripe.checkout.sessions.create as jest.Mock).mockRejectedValue(
      new Error("Stripe API error")
    );

    const req = createMockRequest({
      body: {
        manuscriptId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        metadata: {
          author_name: "Jane Author",
          bisac_code: "FIC000000",
        },
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to create checkout session");
  });

  // Story 8.11 - AC 8.11.7: Duplicate active request prevention
  it("should return 409 when manuscript has an active ISBN request", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const validManuscriptUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const existingRequestId = "existing-request-123";

    // Mock Supabase to return an existing active request
    const { mockFrom } = createDuplicateCheckMocks({ id: existingRequestId });

    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: mockFrom,
      rpc: jest.fn().mockResolvedValue({ data: 5, error: null }),
    });

    const req = createMockRequest({
      body: {
        manuscriptId: validManuscriptUuid,
        metadata: {
          author_name: "Jane Author",
          bisac_code: "FIC000000",
        },
      },
      headers: { origin: "http://localhost:3000" },
    });

    const res = await POST(req);
    expect(res.status).toBe(409);

    const data = await res.json();
    expect(data.code).toBe("DUPLICATE_ACTIVE_REQUEST");
    expect(data.existingRequestId).toBe(existingRequestId);

    // Stripe should NOT have been called
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  // Story 8.11 - AC 8.11.3 & 8.11.5: ISBN metadata in Stripe session
  it("should include ISBN metadata (author_name, bisac_code) in Stripe session", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const validManuscriptUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

    // Mock Supabase - no existing request
    const { mockFrom } = createDuplicateCheckMocks(null);

    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: mockFrom,
      rpc: jest.fn().mockResolvedValue({ data: 5, error: null }),
    });

    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      id: "cs_test_metadata",
      url: "https://checkout.stripe.com/pay/cs_test_metadata",
    });

    const req = createMockRequest({
      body: {
        manuscriptId: validManuscriptUuid,
        metadata: {
          author_name: "Jane Author",
          bisac_code: "FIC009000",
        },
      },
      headers: { origin: "http://localhost:3000" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify Stripe was called with ISBN metadata
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          user_id: "user-123",
          manuscript_id: validManuscriptUuid,
          service_type: "isbn",
          isbn_author_name: "Jane Author",
          isbn_bisac_code: "FIC009000",
        }),
      })
    );
  });
});
