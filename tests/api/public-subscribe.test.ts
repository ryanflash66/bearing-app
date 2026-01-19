/**
 * @jest-environment node
 */
// Mock Resend
const mockSend = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

describe("POST /api/public/subscribe", () => {
  let POST: any;
  let mockInsert: any;
  let mockSupabase: any;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = "re_123";

    mockInsert = jest.fn().mockReturnThis();
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: jest.fn(() => ({
        insert: mockInsert,
      })),
    };

    // Use doMock to ensure the mock is fresh for the require call
    jest.doMock("@/utils/supabase/server", () => ({
      createClient: jest.fn(async () => mockSupabase),
    }));

    // Dynamic import to ensure mock is set up before route initialization
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const route = require("@/app/api/public/subscribe/route");
    POST = route.POST;
  });

  it("returns 400 if email or manuscriptId is missing", async () => {
    const req = new Request("http://localhost/api/public/subscribe", {
      method: "POST",
      body: JSON.stringify({ email: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    const req = new Request("http://localhost/api/public/subscribe", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email", manuscriptId: "123e4567-e89b-12d3-a456-426614174000" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("inserts into DB and sends email on success", async () => {
    mockInsert.mockResolvedValue({ error: null });
    mockSend.mockResolvedValue({ data: { id: "email-123" }, error: null });

    const req = new Request("http://localhost/api/public/subscribe", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", manuscriptId: "123e4567-e89b-12d3-a456-426614174000" }),
    });
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    expect(mockSupabase.from).toHaveBeenCalledWith("book_signups");
    expect(mockInsert).toHaveBeenCalledWith({
      email: "test@example.com",
      manuscript_id: "123e4567-e89b-12d3-a456-426614174000",
      source: "landing_page",
    });
    expect(mockSend).toHaveBeenCalled();
  });

  it("handles duplicate email (DB constraint)", async () => {
    mockInsert.mockResolvedValue({ error: { code: "23505" } }); // Unique violation

    const req = new Request("http://localhost/api/public/subscribe", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", manuscriptId: "123e4567-e89b-12d3-a456-426614174000" }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409); // Conflict
    expect(data.error).toMatch(/already subscribed/i);
  });

  it("triggers honeypot and fails silently", async () => {
    const req = new Request("http://localhost/api/public/subscribe", {
      method: "POST",
      body: JSON.stringify({
        email: "bot@example.com",
        manuscriptId: "123e4567-e89b-12d3-a456-426614174000",
        _hp: "some-bot-value",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    // Ensure no DB insert or email send was called
    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });
});