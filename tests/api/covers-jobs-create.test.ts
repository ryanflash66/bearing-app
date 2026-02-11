/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/manuscripts/[id]/covers/jobs/route";
import { createClient } from "@/utils/supabase/server";
import { checkUsageLimit, logUsageEvent } from "@/lib/ai-usage";

jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/ai-usage", () => ({
  checkUsageLimit: jest.fn(),
  logUsageEvent: jest.fn(),
}));

describe("POST /api/manuscripts/[id]/covers/jobs", () => {
  const params = Promise.resolve({ id: "manu-1" });
  const modalFetch = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MODAL_COVER_URL = "https://modal.example.com/generate";
    process.env.MODAL_API_KEY = "modal-key";
    global.fetch = modalFetch as unknown as typeof fetch;
    modalFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  const buildRequest = (body: Record<string, unknown>) =>
    new NextRequest("http://localhost:3000/api/manuscripts/manu-1/covers/jobs", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });

  it("returns 401 when unauthenticated", async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const response = await POST(buildRequest({}), { params });
    expect(response.status).toBe(401);
  });

  it("returns 409 when an active job already exists", async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "manuscripts") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: "manu-1", owner_user_id: "user-1", account_id: "acc-1" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "ai_usage_events") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockResolvedValue({ count: 0, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "cover_jobs") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  in: jest.fn().mockResolvedValue({ data: [{ id: "job-1" }], error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (checkUsageLimit as jest.Mock).mockResolvedValue(undefined);

    const response = await POST(
      buildRequest({
        genre: "Fantasy",
        mood: "Epic",
        style: "Cinematic",
        description: "Castle in stormy mountains",
      }),
      { params }
    );

    expect(response.status).toBe(409);
  });

  it("creates a job and returns 202 with job id", async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "manuscripts") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: "manu-1",
                    owner_user_id: "user-1",
                    account_id: "acc-1",
                    title: "My Book",
                    metadata: { author_name: "Author" },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "ai_usage_events") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockResolvedValue({ count: 0, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "cover_jobs") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  in: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: "job-22", status: "queued" }, error: null }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (checkUsageLimit as jest.Mock).mockResolvedValue(undefined);
    (logUsageEvent as jest.Mock).mockResolvedValue(undefined);

    const response = await POST(
      buildRequest({
        genre: "Fantasy",
        mood: "Epic",
        style: "Cinematic",
        description: "Castle in stormy mountains",
      }),
      { params }
    );

    const data = await response.json();
    expect(response.status).toBe(202);
    expect(data.job_id).toBe("job-22");
    expect(modalFetch).toHaveBeenCalled();
    expect(logUsageEvent).toHaveBeenCalledWith(
      expect.anything(),
      "acc-1",
      "user-1",
      "cover_generation",
      "imagen-4.0",
      expect.any(Number),
      expect.any(Number),
      expect.any(Number)
    );
  });

  it("uses Modal-provided tokens_actual when logging usage", async () => {
    modalFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ tokens_actual: 150000 }),
    } as Response);

    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "manuscripts") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: "manu-1",
                    owner_user_id: "user-1",
                    account_id: "acc-1",
                    title: "My Book",
                    metadata: { author_name: "Author" },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "ai_usage_events") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockResolvedValue({ count: 0, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "cover_jobs") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  in: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: "job-actual", status: "queued" }, error: null }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (checkUsageLimit as jest.Mock).mockResolvedValue(undefined);
    (logUsageEvent as jest.Mock).mockResolvedValue(undefined);

    const response = await POST(
      buildRequest({
        genre: "Fantasy",
        mood: "Epic",
        style: "Cinematic",
        description: "Castle in stormy mountains",
      }),
      { params }
    );

    expect(response.status).toBe(202);
    expect(logUsageEvent).toHaveBeenCalledTimes(1);
    expect((logUsageEvent as jest.Mock).mock.calls[0]?.[6]).toBe(150000);
  });

  it("does not log usage when modal trigger fails", async () => {
    modalFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "modal worker unavailable",
    } as Response);

    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
      from: jest.fn((table: string) => {
        if (table === "manuscripts") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: "manu-1",
                    owner_user_id: "user-1",
                    account_id: "acc-1",
                    title: "My Book",
                    metadata: { author_name: "Author" },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "ai_usage_events") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockResolvedValue({ count: 0, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "cover_jobs") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  in: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: "job-fail", status: "queued" }, error: null }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (checkUsageLimit as jest.Mock).mockResolvedValue(undefined);
    (logUsageEvent as jest.Mock).mockResolvedValue(undefined);

    const response = await POST(
      buildRequest({
        genre: "Fantasy",
        mood: "Epic",
        style: "Cinematic",
        description: "Castle in stormy mountains",
      }),
      { params }
    );

    expect(response.status).toBe(202);
    expect(logUsageEvent).not.toHaveBeenCalled();
  });
});
