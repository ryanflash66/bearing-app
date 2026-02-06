import { POST } from "@/app/api/webhooks/stripe/route";
import { stripe } from "@/lib/stripe";
import { getServiceSupabaseClient } from "@/lib/supabase-admin";

// Mock Stripe
jest.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
  },
}));

// Mock Supabase admin
jest.mock("@/lib/supabase-admin", () => ({
  getServiceSupabaseClient: jest.fn(),
}));

// Helper to create mock request
function createMockRequest(options: {
  body?: string;
  headers?: Record<string, string>;
} = {}) {
  const { body = "{}", headers = {} } = options;
  return {
    text: jest.fn().mockResolvedValue(body),
    headers: {
      get: (name: string) => headers[name.toLowerCase()] || null,
    },
  } as any;
}

describe("POST /api/webhooks/stripe", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, STRIPE_WEBHOOK_SECRET: "whsec_test123" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return 400 if signature header is missing", async () => {
    const req = createMockRequest();
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing signature");
  });

  it("should return 400 if signature verification fails", async () => {
    (stripe.webhooks.constructEvent as jest.Mock).mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const req = createMockRequest({
      headers: { "stripe-signature": "invalid_sig" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Webhook Error");
  });

  it("should handle checkout.session.completed event and create service request", async () => {
    const mockSession = {
      id: "cs_test_123",
      payment_intent: "pi_test_456",
      amount_total: 12500,
      customer_email: "test@example.com",
      payment_status: "paid",
      metadata: {
        user_id: "user-123",
        manuscript_id: "manuscript-456",
        service_type: "isbn",
      },
    };

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue({
      type: "checkout.session.completed",
      data: { object: mockSession },
    });

    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });

    (getServiceSupabaseClient as jest.Mock).mockReturnValue({
      from: mockFrom,
    });

    const req = createMockRequest({
      headers: { "stripe-signature": "valid_sig" },
      body: JSON.stringify(mockSession),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);

    // Verify insert was called with correct data
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        manuscript_id: "manuscript-456",
        service_type: "isbn",
        status: "pending",
        stripe_session_id: "cs_test_123",
        stripe_payment_intent_id: "pi_test_456",
        amount_cents: 12500,
      })
    );
  });

  it("should skip duplicate events (idempotency)", async () => {
    const mockSession = {
      id: "cs_test_123",
      metadata: {
        user_id: "user-123",
        service_type: "isbn",
      },
    };

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue({
      type: "checkout.session.completed",
      data: { object: mockSession },
    });

    // Return existing request (idempotency check)
    const mockMaybeSingle = jest.fn().mockResolvedValue({
      data: { id: "existing-request-id" },
      error: null,
    });
    const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    const mockInsert = jest.fn();
    const mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });

    (getServiceSupabaseClient as jest.Mock).mockReturnValue({
      from: mockFrom,
    });

    const req = createMockRequest({
      headers: { "stripe-signature": "valid_sig" },
      body: JSON.stringify(mockSession),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Insert should NOT have been called
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("should handle missing metadata gracefully", async () => {
    const mockSession = {
      id: "cs_test_123",
      metadata: {}, // Missing user_id and service_type
    };

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue({
      type: "checkout.session.completed",
      data: { object: mockSession },
    });

    const mockFrom = jest.fn();
    (getServiceSupabaseClient as jest.Mock).mockReturnValue({
      from: mockFrom,
    });

    const req = createMockRequest({
      headers: { "stripe-signature": "valid_sig" },
      body: JSON.stringify(mockSession),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // from() should NOT be called when metadata is missing
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("should handle unrecognized event types gracefully", async () => {
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue({
      type: "customer.subscription.created", // Unhandled event type
      data: { object: {} },
    });

    const req = createMockRequest({
      headers: { "stripe-signature": "valid_sig" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
  });

  it("should return 500 if webhook secret is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const req = createMockRequest({
      headers: { "stripe-signature": "valid_sig" },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Webhook not configured");
  });

  // Story 8.11 - AC 8.11.6: ISBN metadata merge in webhook
  it("should merge ISBN metadata (author_name, bisac_code) into service_requests.metadata", async () => {
    const mockSession = {
      id: "cs_test_isbn_meta",
      payment_intent: "pi_test_isbn",
      amount_total: 12500,
      customer_email: "author@example.com",
      payment_status: "paid",
      metadata: {
        user_id: "user-123",
        manuscript_id: "manuscript-456",
        service_type: "isbn",
        isbn_author_name: "Jane Author",
        isbn_bisac_code: "FIC009000",
      },
    };

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue({
      type: "checkout.session.completed",
      data: { object: mockSession },
    });

    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });

    (getServiceSupabaseClient as jest.Mock).mockReturnValue({
      from: mockFrom,
    });

    const req = createMockRequest({
      headers: { "stripe-signature": "valid_sig" },
      body: JSON.stringify(mockSession),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify insert was called with merged ISBN metadata
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        manuscript_id: "manuscript-456",
        service_type: "isbn",
        status: "pending",
        metadata: expect.objectContaining({
          customer_email: "author@example.com",
          payment_status: "paid",
          author_name: "Jane Author",
          bisac_code: "FIC009000",
        }),
      })
    );
  });

  it("should not include ISBN fields in metadata for non-ISBN service types", async () => {
    const mockSession = {
      id: "cs_test_other",
      payment_intent: "pi_test_other",
      amount_total: 50000,
      customer_email: "user@example.com",
      payment_status: "paid",
      metadata: {
        user_id: "user-123",
        manuscript_id: "manuscript-789",
        service_type: "cover_design", // Non-ISBN service
        isbn_author_name: "Should Be Ignored",
        isbn_bisac_code: "SHOULD_IGNORE",
      },
    };

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue({
      type: "checkout.session.completed",
      data: { object: mockSession },
    });

    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });

    (getServiceSupabaseClient as jest.Mock).mockReturnValue({
      from: mockFrom,
    });

    const req = createMockRequest({
      headers: { "stripe-signature": "valid_sig" },
      body: JSON.stringify(mockSession),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify insert was called without ISBN-specific metadata
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        service_type: "cover_design",
        metadata: expect.not.objectContaining({
          author_name: expect.any(String),
          bisac_code: expect.any(String),
        }),
      })
    );
  });
});
