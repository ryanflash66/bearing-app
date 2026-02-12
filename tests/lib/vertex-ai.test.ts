/**
 * Tests for Vertex AI Client (Story 5.6.1)
 *
 * Task 5.1: SDK initialization with env vars (no file paths)
 * Task 5.2: logUsageEvent metadata merging
 * Task 5.3: Integration test - cache lifecycle
 * Task 5.6: Uses MockVertexClient for CI/CD
 */

// Mock external dependencies
jest.mock("@google-cloud/vertexai", () => {
  const mockGenerateContent = jest.fn().mockResolvedValue({
    response: {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  issues: [
                    {
                      type: "grammar",
                      severity: "low",
                      location: { chapter: null, quote: "test text", offset: 0 },
                      explanation: "Test issue",
                      suggestion: "Fix it",
                      documentPosition: 0,
                    },
                  ],
                  summary: "Test summary",
                }),
              },
            ],
          },
          finishReason: "STOP",
          safetyRatings: [],
        },
      ],
      usageMetadata: {
        promptTokenCount: 5000,
        candidatesTokenCount: 500,
        totalTokenCount: 5500,
        cachedContentTokenCount: 0,
      },
    },
  });

  return {
    VertexAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
        countTokens: jest.fn().mockResolvedValue({ totalTokens: 5000 }),
      }),
    })),
  };
});

jest.mock("google-auth-library", () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getClient: jest.fn().mockResolvedValue({
      getAccessToken: jest.fn().mockResolvedValue({ token: "mock-token" }),
    }),
  })),
}));

// Save original env
const originalEnv = { ...process.env };

describe("Vertex AI Client", () => {
  beforeEach(() => {
    // Reset modules to clear singleton
    jest.resetModules();
    // Set required env vars
    process.env.GOOGLE_PROJECT_ID = "test-project-123";
    process.env.GOOGLE_CLIENT_EMAIL = "test@test-project.iam.gserviceaccount.com";
    process.env.GOOGLE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----";
    process.env.GOOGLE_CLOUD_REGION = "us-central1";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ─── Task 5.1: SDK initialization with env vars ───────────────────────

  describe("getVertexConfig", () => {
    it("returns config from environment variables", () => {
      const { getVertexConfig } = require("@/lib/vertex-ai");
      const config = getVertexConfig();

      expect(config.projectId).toBe("test-project-123");
      expect(config.clientEmail).toBe("test@test-project.iam.gserviceaccount.com");
      expect(config.privateKey).toContain("MOCK_KEY");
      expect(config.location).toBe("us-central1");
    });

    it("uses default region when GOOGLE_CLOUD_REGION is not set", () => {
      delete process.env.GOOGLE_CLOUD_REGION;
      const { getVertexConfig } = require("@/lib/vertex-ai");
      const config = getVertexConfig();

      expect(config.location).toBe("us-central1");
    });

    it("allows region override via GOOGLE_CLOUD_REGION", () => {
      process.env.GOOGLE_CLOUD_REGION = "europe-west1";
      const { getVertexConfig } = require("@/lib/vertex-ai");
      const config = getVertexConfig();

      expect(config.location).toBe("europe-west1");
    });

    it("throws VertexAIServiceError when GOOGLE_PROJECT_ID is missing", () => {
      delete process.env.GOOGLE_PROJECT_ID;
      const { getVertexConfig, VertexAIServiceError } = require("@/lib/vertex-ai");

      expect(() => getVertexConfig()).toThrow(VertexAIServiceError);
      expect(() => getVertexConfig()).toThrow("GOOGLE_PROJECT_ID");
    });

    it("throws VertexAIServiceError when GOOGLE_CLIENT_EMAIL is missing", () => {
      delete process.env.GOOGLE_CLIENT_EMAIL;
      const { getVertexConfig, VertexAIServiceError } = require("@/lib/vertex-ai");

      expect(() => getVertexConfig()).toThrow(VertexAIServiceError);
      expect(() => getVertexConfig()).toThrow("GOOGLE_CLIENT_EMAIL");
    });

    it("throws VertexAIServiceError when GOOGLE_PRIVATE_KEY is missing", () => {
      delete process.env.GOOGLE_PRIVATE_KEY;
      const { getVertexConfig, VertexAIServiceError } = require("@/lib/vertex-ai");

      expect(() => getVertexConfig()).toThrow(VertexAIServiceError);
      expect(() => getVertexConfig()).toThrow("GOOGLE_PRIVATE_KEY");
    });

    it("handles escaped newlines in GOOGLE_PRIVATE_KEY", () => {
      process.env.GOOGLE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nLINE1\\nLINE2\\n-----END PRIVATE KEY-----";
      const { getVertexConfig } = require("@/lib/vertex-ai");
      const config = getVertexConfig();

      expect(config.privateKey).toContain("\nLINE1\n");
      expect(config.privateKey).not.toContain("\\n");
    });
  });

  describe("isVertexAIConfigured", () => {
    it("returns true when all env vars are set", () => {
      const { isVertexAIConfigured } = require("@/lib/vertex-ai");
      expect(isVertexAIConfigured()).toBe(true);
    });

    it("returns false when env vars are missing", () => {
      delete process.env.GOOGLE_PROJECT_ID;
      const { isVertexAIConfigured } = require("@/lib/vertex-ai");
      expect(isVertexAIConfigured()).toBe(false);
    });
  });

  describe("getVertexAIClient", () => {
    it("initializes Vertex AI client with correct project and location", () => {
      const { VertexAI } = require("@google-cloud/vertexai");
      const { getVertexAIClient } = require("@/lib/vertex-ai");

      getVertexAIClient();

      expect(VertexAI).toHaveBeenCalledWith(
        expect.objectContaining({
          project: "test-project-123",
          location: "us-central1",
        })
      );
    });

    it("returns singleton instance on repeated calls", () => {
      const { getVertexAIClient } = require("@/lib/vertex-ai");

      const client1 = getVertexAIClient();
      const client2 = getVertexAIClient();

      expect(client1).toBe(client2);
    });
  });

  describe("countTokens", () => {
    it("calls Vertex AI countTokens API", async () => {
      const { countTokens } = require("@/lib/vertex-ai");
      const tokens = await countTokens("test content");

      expect(tokens).toBe(5000); // from mock
    });

    it("falls back to heuristic estimation on API failure", async () => {
      // Mock failure
      const { getConsistencyModel } = require("@/lib/vertex-ai");
      const model = getConsistencyModel();
      model.countTokens.mockRejectedValueOnce(new Error("API Error"));

      const { countTokens } = require("@/lib/vertex-ai");
      const content = "a".repeat(400); // 100 tokens heuristic
      const tokens = await countTokens(content);

      expect(tokens).toBe(100);
    });
  });

  // ─── VertexAIServiceError ─────────────────────────────────────────────

  describe("VertexAIServiceError", () => {
    it("returns correct user-friendly message for 5xx", () => {
      const { VertexAIServiceError } = require("@/lib/vertex-ai");
      const error = new VertexAIServiceError("Server error", 500);

      expect(error.getUserFriendlyMessage()).toBe(
        "AI Service Temporarily Unavailable - Please try again in a few minutes."
      );
      expect(error.isRetryable).toBe(true);
    });

    it("returns correct user-friendly message for 429", () => {
      const { VertexAIServiceError } = require("@/lib/vertex-ai");
      const error = new VertexAIServiceError("Rate limited", 429);

      expect(error.getUserFriendlyMessage()).toContain("busy");
      expect(error.isRetryable).toBe(true);
    });

    it("marks 4xx as non-retryable", () => {
      const { VertexAIServiceError } = require("@/lib/vertex-ai");
      const error = new VertexAIServiceError("Bad request", 400);

      expect(error.isRetryable).toBe(false);
    });
  });

  // ─── Constants ────────────────────────────────────────────────────────

  describe("Constants", () => {
    it("exports correct model name", () => {
      const { VERTEX_GEMINI_MODEL } = require("@/lib/vertex-ai");
      expect(VERTEX_GEMINI_MODEL).toBe("gemini-2.0-flash");
    });

    it("exports minimum cache token threshold", () => {
      const { MIN_CACHE_TOKENS } = require("@/lib/vertex-ai");
      expect(MIN_CACHE_TOKENS).toBe(33_000);
    });
  });

  // ─── Timeout & Retry Tests (Patch) ───────────────────────────────────

  describe("Timeout handling", () => {
    it("classifies timeout errors as retryable", () => {
      const { VertexAIServiceError } = require("@/lib/vertex-ai");
      const timeoutError = new VertexAIServiceError("Request timed out", 504);

      expect(timeoutError.isRetryable).toBe(true);
      expect(timeoutError.statusCode).toBe(504);
    });

    it("provides user-friendly message for timeout", () => {
      const { VertexAIServiceError } = require("@/lib/vertex-ai");
      const timeoutError = new VertexAIServiceError("Request timed out", 504);

      expect(timeoutError.getUserFriendlyMessage()).toContain("Temporarily Unavailable");
    });
  });

  describe("Retry logic", () => {
    it("marks 429 errors as retryable", () => {
      const { VertexAIServiceError } = require("@/lib/vertex-ai");
      const rateLimitError = new VertexAIServiceError("Rate limited", 429);

      expect(rateLimitError.isRetryable).toBe(true);
    });

    it("marks 5xx errors as retryable", () => {
      const { VertexAIServiceError } = require("@/lib/vertex-ai");
      const serverError = new VertexAIServiceError("Server error", 500);

      expect(serverError.isRetryable).toBe(true);
    });

    it("marks 4xx errors as non-retryable", () => {
      const { VertexAIServiceError } = require("@/lib/vertex-ai");
      const badRequestError = new VertexAIServiceError("Bad request", 400);

      expect(badRequestError.isRetryable).toBe(false);
    });

    it("marks 403 errors as non-retryable", () => {
      const { VertexAIServiceError } = require("@/lib/vertex-ai");
      const forbiddenError = new VertexAIServiceError("Permission denied", 403);

      expect(forbiddenError.isRetryable).toBe(false);
    });
  });
});

// ─── Task 5.2: logUsageEvent metadata merging ───────────────────────────

describe("logUsageEvent with metadata (AC 5.6.1.5)", () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: "cycle-1",
                  account_id: "acc-1",
                  start_date: new Date().toISOString(),
                  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                  status: "open",
                },
                error: null,
              }),
            }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({ error: null }),
      }),
    };
  });

  it("includes metadata in usage event when provided", async () => {
    const { logUsageEvent } = require("@/lib/ai-usage");

    await logUsageEvent(
      mockSupabase,
      "acc-1",
      "user-1",
      "consistency_check",
      "gemini-2.0-flash",
      5000,
      5500,
      1200,
      { cache_creation_tokens: 33000, cache_event: "cache_creation" }
    );

    // Verify insert was called with metadata
    const insertCalls = mockSupabase.from.mock.results
      .filter((r: any) => r.value.insert)
      .map((r: any) => r.value.insert.mock.calls)
      .flat();

    // Find the ai_usage_events insert (not billing_cycles)
    const usageInsert = insertCalls.find(
      (call: any[]) => call?.[0]?.feature === "consistency_check"
    );

    expect(usageInsert).toBeDefined();
    if (usageInsert) {
      expect(usageInsert[0].metadata).toEqual({
        cache_creation_tokens: 33000,
        cache_event: "cache_creation",
      });
    }
  });

  it("omits metadata field when not provided", async () => {
    const { logUsageEvent } = require("@/lib/ai-usage");

    await logUsageEvent(
      mockSupabase,
      "acc-1",
      "user-1",
      "consistency_check",
      "gemini-2.0-flash",
      5000,
      5500,
      1200
    );

    const insertCalls = mockSupabase.from.mock.results
      .filter((r: any) => r.value.insert)
      .map((r: any) => r.value.insert.mock.calls)
      .flat();

    const usageInsert = insertCalls.find(
      (call: any[]) => call?.[0]?.feature === "consistency_check"
    );

    expect(usageInsert).toBeDefined();
    if (usageInsert) {
      expect(usageInsert[0].metadata).toBeUndefined();
    }
  });
});

// ─── Task 5.3: Cache lifecycle integration tests ────────────────────────

describe("MockVertexClient cache lifecycle", () => {
  let MockVertexClientClass: any;

  beforeEach(() => {
    const mod = require("@/lib/mocks/vertex-ai");
    MockVertexClientClass = mod.MockVertexClient;
  });

  it("creates cache, hits cache, expires cache, and re-creates", () => {
    const client = new MockVertexClientClass();

    // 1. Create cache
    const cache = client.createCachedContent(
      "Long manuscript content...",
      "test-manuscript",
      1 // 1 second TTL for fast expiry test
    );
    expect(cache.name).toContain("cachedContents/cache-");
    expect(cache.usageMetadata.totalTokenCount).toBeGreaterThan(0);

    // 2. Hit cache
    const hit = client.getCachedContent(cache.name);
    expect(hit).not.toBeNull();
    expect(hit!.name).toBe(cache.name);

    // 3. Verify cache hit affects generation
    const response = client.generateContent("test", cache.name);
    expect(response.usageMetadata.cachedContentTokenCount).toBeGreaterThan(0);

    // 4. Evict cache
    client.evictCache(cache.name);
    const evicted = client.getCachedContent(cache.name);
    expect(evicted).toBeNull();

    // 5. Generation without cache should have no cached tokens
    const responseAfterEvict = client.generateContent("test", cache.name);
    expect(responseAfterEvict.usageMetadata.cachedContentTokenCount).toBe(0);

    // 6. Re-create cache
    const newCache = client.createCachedContent(
      "Updated manuscript content...",
      "test-manuscript-v2"
    );
    expect(newCache.name).not.toBe(cache.name); // Different cache ID
    expect(client.getActiveCaches().length).toBe(1);
  });

  it("handles failure modes correctly", () => {
    const client = new MockVertexClientClass();

    // Set failure mode
    client.setFail(429, "Rate limited");

    expect(() =>
      client.createCachedContent("content", "test")
    ).toThrow();

    expect(() =>
      client.generateContent("test")
    ).toThrow();

    // Clear failure
    client.clearFail();

    const cache = client.createCachedContent("content", "test");
    expect(cache.name).toBeDefined();
  });

  it("tracks call count", () => {
    const client = new MockVertexClientClass();

    expect(client.getCallCount()).toBe(0);

    client.generateContent("test-1");
    client.generateContent("test-2");

    expect(client.getCallCount()).toBe(2);
  });

  it("resets all state", () => {
    const client = new MockVertexClientClass();

    client.createCachedContent("content", "test");
    client.generateContent("test");
    client.setFail(500, "error");

    client.reset();

    expect(client.getCallCount()).toBe(0);
    expect(client.getTotalCacheCount()).toBe(0);

    // Should not throw after reset
    const response = client.generateContent("test");
    expect(response.candidates).toBeDefined();
  });
});

// ─── Gemini module tests ────────────────────────────────────────────────

describe("gemini.ts refactored functions", () => {
  describe("estimateTokens", () => {
    it("estimates tokens correctly", () => {
      const { estimateTokens } = require("@/lib/gemini");

      // Empty string should return just overhead
      expect(estimateTokens("")).toBe(200);

      // 400 chars ≈ 100 tokens + 200 overhead = 300
      const text = "a".repeat(400);
      expect(estimateTokens(text)).toBe(300);
    });
  });

  describe("computeInputHash", () => {
    it("returns consistent hash for same content", async () => {
      const { computeInputHash } = require("@/lib/gemini");

      const hash1 = await computeInputHash("test content");
      const hash2 = await computeInputHash("test content");

      expect(hash1).toBe(hash2);
    });

    it("returns different hash for different content", async () => {
      const { computeInputHash } = require("@/lib/gemini");

      const hash1 = await computeInputHash("content A");
      const hash2 = await computeInputHash("content B");

      expect(hash1).not.toBe(hash2);
    });

    it("normalizes line endings before hashing", async () => {
      const { computeInputHash } = require("@/lib/gemini");

      const hashUnix = await computeInputHash("line1\nline2");
      const hashWindows = await computeInputHash("line1\r\nline2");

      expect(hashUnix).toBe(hashWindows);
    });
  });

  describe("chunkManuscript", () => {
    it("returns single chunk for small content", () => {
      const { chunkManuscript } = require("@/lib/gemini");

      const chunks = chunkManuscript("Short content");
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe("Short content");
    });

    it("splits large content into multiple chunks", () => {
      const { chunkManuscript } = require("@/lib/gemini");

      // Create content larger than max tokens
      const largeContent = "This is a paragraph. ".repeat(1000);
      const chunks = chunkManuscript(largeContent, 1000);

      expect(chunks.length).toBeGreaterThan(1);
    });
  });

  describe("createConsistencyCheckJob", () => {
    it("uses Vertex AI model name in job record", async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: "job-1" },
            error: null,
          }),
        }),
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          insert: mockInsert,
        }),
      };

      const { createConsistencyCheckJob } = require("@/lib/gemini");

      await createConsistencyCheckJob(
        mockSupabase,
        "manuscript-1",
        "user-1",
        "hash-abc",
        5000
      );

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gemini-2.0-flash", // AC 5.6.1.10: Vertex AI model name
        })
      );
    });
  });
});

// ─── AI Models config ───────────────────────────────────────────────────

describe("ai-models.ts (Task 3.2)", () => {
  it("exports VERTEX_AI_MODELS", () => {
    const { VERTEX_AI_MODELS } = require("@/lib/config/ai-models");

    expect(VERTEX_AI_MODELS.gemini.flash).toBe("gemini-2.0-flash");
    expect(VERTEX_AI_MODELS.gemini.pro).toBe("gemini-1.5-pro-001");
  });

  it("DEFAULT_MODELS.consistency points to Vertex AI model", () => {
    const { DEFAULT_MODELS, VERTEX_AI_MODELS } = require("@/lib/config/ai-models");

    expect(DEFAULT_MODELS.consistency).toBe(VERTEX_AI_MODELS.gemini.flash);
  });

  it("still exports OpenRouter models for Llama", () => {
    const { AI_MODELS } = require("@/lib/config/ai-models");

    expect(AI_MODELS.llama["3.1_8b"]).toBe("meta-llama/llama-3.1-8b-instruct");
  });
});
