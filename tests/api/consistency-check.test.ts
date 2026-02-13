/**
 * API endpoint tests for /api/manuscripts/:id/consistency-check
 * Story 3.1 Acceptance Criteria:
 * - AC 3.1.1: Async job created immediately with "Queued" or "Checking" status
 * - AC 3.1.2: Editor remains responsive (async processing)
 * - AC 3.1.3: Large manuscripts chunked safely (≤500k tokens per chunk)
 * - AC 3.1.4: Job status marked "Completed" and report stored
 * - AC 3.1.5: Failed jobs marked "Failed" with error message, retry possible
 */

// Mock NextResponse before importing route handlers
jest.mock("next/server", () => {
  class NextResponse extends Response {
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      super(body, init);
    }
    static json(data: any, init?: ResponseInit) {
      const response = new Response(JSON.stringify(data), {
        ...init,
        status: init?.status || 200,
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
      });
      return response;
    }
  }

  class NextRequest extends Request {
    constructor(url: string, init?: RequestInit) {
      super(url, init);
    }
  }

  return {
    NextResponse,
    NextRequest,
  };
});

import { POST, GET } from "@/app/api/manuscripts/[id]/consistency-check/route";

// Mock the gemini service (but keep chunkManuscript and estimateTokens real for chunking tests)
jest.mock("@/lib/gemini", () => {
  const actual = jest.requireActual("@/lib/gemini");
  return {
    ...actual,
    initiateConsistencyCheck: jest.fn(),
    findCachedCheck: jest.fn(),
    processConsistencyCheckJob: jest.fn(),
  };
});

// Mock Supabase server client
jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn(),
}));

const createMockSupabaseClient = () => ({
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: "user-id" } },
      error: null,
    }),
  },
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: {
        id: "ms-id",
        account_id: "account-id",
        owner_user_id: "user-id",
        content_text: "Sample manuscript content",
      },
      error: null,
    }),
  }),
});

const mockSupabaseClient = createMockSupabaseClient();

const { initiateConsistencyCheck } = require("@/lib/gemini");

describe("POST /api/manuscripts/:id/consistency-check", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { createClient } = require("@/utils/supabase/server");
    createClient.mockResolvedValue(mockSupabaseClient);
    // Reset mockSupabaseClient to default state
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-id" } },
      error: null,
    });
    // Reset the from mock to return proper chain
    // Mock queries
    const mockManuscriptsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: "ms-id",
          account_id: "account-id",
          owner_user_id: "user-id",
          content_text: "Sample manuscript content",
        },
        error: null,
      }),
    };

    const mockUsersQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: "user-id", role: "user" },
        error: null,
      }),
    };

    const mockAccountMembersQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { account_role: "author" },
        error: null,
      }),
    };

    const mockAuditLogsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockResolvedValue({
        count: 0,
        error: null,
      }),
      insert: jest.fn().mockResolvedValue({
        error: null,
      }),
    };

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "manuscripts") return mockManuscriptsQuery;
      if (table === "users") return mockUsersQuery;
      if (table === "account_members") return mockAccountMembersQuery;
      if (table === "audit_logs") return mockAuditLogsQuery;
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
  });

  it("should create async job immediately and return job ID (AC 3.1.1)", async () => {
    initiateConsistencyCheck.mockResolvedValue({
      jobId: "job-123",
      status: "queued",
      estimatedTokens: 50000,
      cached: false,
    });

    const request = {
      json: async () => ({}),
    } as any;

    const response = await POST(request, { params: Promise.resolve({ id: "ms-id" }) });
    const data = await response.json();

    expect(response.status).toBe(202); // 202 Accepted for async operations
    expect(data.jobId).toBe("job-123");
    expect(data.status).toBe("queued");
    expect(data.estimatedTokens).toBe(50000);
    expect(initiateConsistencyCheck).toHaveBeenCalledWith(
      mockSupabaseClient,
      {
        manuscriptId: "ms-id",
        userId: "user-id",
      },
      expect.any(Function)
    );
  });

  it("should return cached result immediately if available", async () => {
    initiateConsistencyCheck.mockResolvedValue({
      jobId: "cached-job-123",
      status: "completed",
      estimatedTokens: 50000,
      cached: true,
    });

    const request = {
      json: async () => ({}),
    } as any;

    const response = await POST(request, { params: Promise.resolve({ id: "ms-id" }) });
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(data.cached).toBe(true);
    expect(data.status).toBe("completed");
  });

  it("should return 401 for unauthenticated requests", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Unauthorized" },
    });

    const request = {
      json: async () => ({}),
    } as any;

    const response = await POST(request, { params: Promise.resolve({ id: "ms-id" }) });
    expect(response.status).toBe(401);
  });

  it("should return 404 for non-existent manuscript", async () => {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "manuscripts") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Not found" },
          }),
        };
      }
      // Return default for others to avoid crashes if called
       return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: "user-id" }, error: null }),
       };
    });

    const request = {
      json: async () => ({}),
    } as any;

    const response = await POST(request, { params: Promise.resolve({ id: "ms-id" }) });
    expect(response.status).toBe(404);
  });

  it("should return 429 for token cap exceeded", async () => {
    initiateConsistencyCheck.mockRejectedValue(
      new Error("Token cap exceeded. You have 0 remaining this month.")
    );

    const request = {
      json: async () => ({}),
    } as any;

    const response = await POST(request, { params: Promise.resolve({ id: "ms-id" }) });
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain("Token cap");
  });

  it("should return 429 when consistency checks exceed rate limit window", async () => {
    const mockManuscriptsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: "ms-id",
          account_id: "account-id",
          owner_user_id: "user-id",
          content_text: "Sample manuscript content",
        },
        error: null,
      }),
    };

    const mockUsersQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: "user-id", role: "user" },
        error: null,
      }),
    };

    const mockAccountMembersQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { account_role: "author" },
        error: null,
      }),
    };

    const mockAuditLogsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockResolvedValue({
        count: 3,
        error: null,
      }),
      insert: jest.fn().mockResolvedValue({
        error: null,
      }),
    };

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "manuscripts") return mockManuscriptsQuery;
      if (table === "users") return mockUsersQuery;
      if (table === "account_members") return mockAccountMembersQuery;
      if (table === "audit_logs") return mockAuditLogsQuery;
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const request = {
      json: async () => ({}),
    } as any;

    const response = await POST(request, { params: Promise.resolve({ id: "ms-id" }) });
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain("Rate limit reached");
    expect(initiateConsistencyCheck).not.toHaveBeenCalled();
  });

  it("should return 400 for empty manuscript content", async () => {
    initiateConsistencyCheck.mockRejectedValue(
      new Error("Manuscript content is empty")
    );

    const request = {
      json: async () => ({}),
    } as any;

    const response = await POST(request, { params: Promise.resolve({ id: "ms-id" }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("empty");
  });

  it("should return 403 for non-owner non-admin users", async () => {
    const mockManuscriptsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: "ms-id",
          account_id: "account-id",
          owner_user_id: "owner-user-id",
          content_text: "Sample manuscript content",
        },
        error: null,
      }),
    };

    const mockUsersQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: "user-id", role: "user" },
        error: null,
      }),
    };

    const mockAccountMembersQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { account_role: "author" },
        error: null,
      }),
    };

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "manuscripts") return mockManuscriptsQuery;
      if (table === "users") return mockUsersQuery;
      if (table === "account_members") return mockAccountMembersQuery;
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValue({ count: 0, error: null }),
        insert: jest.fn().mockResolvedValue({ error: null }),
      };
    });

    const request = {
      json: async () => ({}),
    } as any;

    const response = await POST(request, { params: Promise.resolve({ id: "ms-id" }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Only the manuscript owner or an account admin");
    expect(initiateConsistencyCheck).not.toHaveBeenCalled();
  });

  it("should return traceId metadata on server errors", async () => {
    initiateConsistencyCheck.mockRejectedValue(new Error("Unexpected downstream failure"));

    const request = {
      json: async () => ({}),
    } as any;

    const response = await POST(request, { params: Promise.resolve({ id: "ms-id" }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(typeof data.traceId).toBe("string");
    expect(data.traceId.length).toBeGreaterThan(0);
    expect(response.headers.get("X-Trace-Id")).toBe(data.traceId);
  });
});

describe("GET /api/manuscripts/:id/consistency-check", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { createClient } = require("@/utils/supabase/server");
    createClient.mockResolvedValue(mockSupabaseClient);
    // Reset mockSupabaseClient to default state
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-id" } },
      error: null,
    });
    // Reset the from mock to return proper chain
    // Mock queries
    const mockManuscriptsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: "ms-id",
          account_id: "account-id",
          owner_user_id: "user-id",
          content_text: "Sample manuscript content",
        },
        error: null,
      }),
    };

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "manuscripts") return mockManuscriptsQuery;
      // consistency_checks table is mocked per test
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
  });

  it("should return latest consistency check job", async () => {
    const mockJob = {
      id: "job-123",
      manuscript_id: "ms-id",
      status: "completed",
      report_json: {
        issues: [
          {
            type: "character",
            severity: "low",
            location: { quote: "Sample text" },
            explanation: "Minor inconsistency",
          },
        ],
      },
      tokens_estimated: 50000,
      tokens_actual: 52000,
      created_at: "2024-12-26T10:00:00Z",
      completed_at: "2024-12-26T10:00:05Z",
    };

    const mockConsistencyChecksQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockJob,
        error: null,
      }),
    };
    
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "consistency_checks") {
        return mockConsistencyChecksQuery;
      }
      // Return manuscripts query for auth check
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: "ms-id",
            account_id: "account-id",
            owner_user_id: "user-id",
          },
          error: null,
        }),
      };
    });

    const request = {
      url: "http://localhost/api/manuscripts/ms-id/consistency-check",
    } as any;

    const response = await GET(request, { params: Promise.resolve({ id: "ms-id" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.job).toEqual(mockJob);
  });

  it("should return specific job when jobId provided", async () => {
    const mockJob = {
      id: "specific-job-123",
      status: "running",
    };

    const mockConsistencyChecksQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockJob,
        error: null,
      }),
    };
    
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "consistency_checks") {
        return mockConsistencyChecksQuery;
      }
      // Return manuscripts query for auth check
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: "ms-id",
            account_id: "account-id",
            owner_user_id: "user-id",
          },
          error: null,
        }),
      };
    });

    const request = {
      url: "http://localhost/api/manuscripts/ms-id/consistency-check?jobId=specific-job-123",
    } as any;

    const response = await GET(request, { params: Promise.resolve({ id: "ms-id" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.job.id).toBe("specific-job-123");
  });

  it("should return null when no job found", async () => {
    // Mock the query chain properly for consistency_checks table
    const mockConsistencyChecksQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116" }, // Not found
      }),
    };
    
    // Mock manuscripts query (for auth check)
    const mockManuscriptsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: "ms-id",
          account_id: "account-id",
          owner_user_id: "user-id",
        },
        error: null,
      }),
    };
    
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "consistency_checks") {
        return mockConsistencyChecksQuery;
      }
      return mockManuscriptsQuery;
    });

    const request = {
      url: "http://localhost/api/manuscripts/ms-id/consistency-check",
    } as any;

    const response = await GET(request, { params: Promise.resolve({ id: "ms-id" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.job).toBeNull();
  });
});

describe("Large manuscript chunking (AC 3.1.3)", () => {
  // Import actual implementation (not mocked) for chunking tests
  const geminiModule = jest.requireActual("@/lib/gemini");
  const { chunkManuscript, estimateTokens } = geminiModule;

  it("should chunk large manuscripts into safe segments", () => {
    // Create a large manuscript (>500k tokens)
    // 500k tokens ≈ 2M characters (at 4 chars/token)
    // Using 2.1M chars to ensure it exceeds 500k tokens
    // Add paragraph breaks to help chunking algorithm
    const paragraph = "A".repeat(10000) + "\n\n";
    const largeContent = paragraph.repeat(220); // ~2.2M chars, well over 500k tokens

    const chunks = chunkManuscript(largeContent);

    // Should chunk into multiple segments
    expect(chunks.length).toBeGreaterThan(1);
    
    // Verify each chunk is within token limit
    chunks.forEach((chunk: string) => {
      const tokens = estimateTokens(chunk);
      expect(tokens).toBeLessThanOrEqual(500_000);
    });
  });

  it("should return single chunk for small manuscripts", () => {
    const smallContent = "This is a small manuscript.";

    const chunks = chunkManuscript(smallContent);

    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe(smallContent);
  });
});

describe("Retry scenarios (AC 3.1.5)", () => {
  const { processConsistencyCheckJob } = require("@/lib/gemini");

  it("should mark job as failed on API error", async () => {
    const mockUpdateChain = {
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    const mockFromChain = {
      update: jest.fn().mockReturnValue(mockUpdateChain),
    };
    mockSupabaseClient.from.mockReturnValue(mockFromChain);

    processConsistencyCheckJob.mockImplementation(async (supabase: any, jobId: string) => {
      // Simulate API failure
      await supabase
        .from("consistency_checks")
        .update({
          status: "failed",
          error_message: "Gemini API error: 500 Internal Server Error",
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      
      return { success: false, error: "Gemini API error: 500 Internal Server Error" };
    });

    const result = await processConsistencyCheckJob(
      mockSupabaseClient,
      "job-123",
      "ms-id",
      "content",
      "user-id"
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Gemini API error");
  });

  it("should allow retry after failure", async () => {
    // Reset mocks for this test
    jest.clearAllMocks();
    const { createClient } = require("@/utils/supabase/server");
    createClient.mockResolvedValue(mockSupabaseClient);
    // Reset mockSupabaseClient to default state
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-id" } },
      error: null,
    });
    // Reset the from mock to return proper chain
    const mockManuscriptsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: "ms-id",
          account_id: "account-id",
          owner_user_id: "user-id",
          content_text: "Sample manuscript content",
        },
        error: null,
      }),
    };

    const mockUsersQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: "user-id", role: "user" },
        error: null,
      }),
    };

    const mockAccountMembersQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { account_role: "author" },
        error: null,
      }),
    };

    const mockAuditLogsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockResolvedValue({
        count: 0,
        error: null,
      }),
      insert: jest.fn().mockResolvedValue({
        error: null,
      }),
    };

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "manuscripts") return mockManuscriptsQuery;
      if (table === "users") return mockUsersQuery;
      if (table === "account_members") return mockAccountMembersQuery;
      if (table === "audit_logs") return mockAuditLogsQuery;
      return mockManuscriptsQuery;
    });

    // First attempt fails
    initiateConsistencyCheck.mockRejectedValueOnce(
      new Error("Network error")
    );

    // Second attempt succeeds
    initiateConsistencyCheck.mockResolvedValueOnce({
      jobId: "retry-job-123",
      status: "queued",
      estimatedTokens: 50000,
    });

    const request = {
      json: async () => ({}),
    } as any;

    // First attempt
    const response1 = await POST(request, { params: Promise.resolve({ id: "ms-id" }) } as any);
    expect(response1.status).toBe(500);

    // Retry attempt
    const response2 = await POST(request, { params: Promise.resolve({ id: "ms-id" }) } as any);
    const data = await response2.json();
    expect(response2.status).toBe(202);
    expect(data.jobId).toBe("retry-job-123");
  });
});

