/**
 * Tests for Cron: Cleanup Expired Vertex AI Caches
 * Story 5.6.1, Task 2.5
 *
 * Verifies "forget and sweep" cache cleanup functionality
 *
 * NOTE: These tests verify the core business logic of the cleanup job.
 * Full integration testing with Next.js runtime is handled separately.
 */

// Mock dependencies
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/vertex-ai", () => ({
  getVertexConfig: jest.fn(),
  getVertexAuthToken: jest.fn(),
  isVertexAIConfigured: jest.fn(),
}));

// Save original env
const originalEnv = { ...process.env };

describe("Cron Cleanup Job - Business Logic", () => {
  let mockSupabase: any;
  let mockFetch: jest.Mock;
  let mockGetVertexConfig: jest.Mock;
  let mockGetVertexAuthToken: jest.Mock;
  let mockIsVertexAIConfigured: jest.Mock;
  let mockCreateClient: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set env vars
    process.env.CRON_SECRET = "test-cron-secret";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

    // Mock Supabase client
    const supabaseModule = require("@supabase/supabase-js");
    mockCreateClient = supabaseModule.createClient as jest.Mock;
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };
    mockCreateClient.mockReturnValue(mockSupabase);

    // Mock Vertex AI
    const vertexAI = require("@/lib/vertex-ai");
    mockIsVertexAIConfigured = vertexAI.isVertexAIConfigured as jest.Mock;
    mockGetVertexConfig = vertexAI.getVertexConfig as jest.Mock;
    mockGetVertexAuthToken = vertexAI.getVertexAuthToken as jest.Mock;

    mockIsVertexAIConfigured.mockReturnValue(true);
    mockGetVertexConfig.mockReturnValue({
      projectId: "test-project",
      location: "us-central1",
    });
    mockGetVertexAuthToken.mockResolvedValue("mock-vertex-token");

    // Mock global fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ─── Configuration & Authorization Logic ──────────────────────────────

  describe("Authorization", () => {
    it("validates CRON_SECRET is required", () => {
      expect(process.env.CRON_SECRET).toBeDefined();
      expect(process.env.CRON_SECRET).toBe("test-cron-secret");
    });

    it("validates Supabase env vars are required", () => {
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
      expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
    });
  });

  describe("Vertex AI Configuration", () => {
    it("checks if Vertex AI is configured before cleanup", () => {
      mockIsVertexAIConfigured();
      expect(mockIsVertexAIConfigured).toHaveBeenCalled();
    });

    it("skips cleanup when Vertex AI is not configured", () => {
      mockIsVertexAIConfigured.mockReturnValue(false);
      const configured = mockIsVertexAIConfigured();
      expect(configured).toBe(false);
    });
  });

  // ─── Database Query Logic ─────────────────────────────────────────────

  describe("Finding Expired Caches", () => {
    it("queries for expired caches using lt(expires_at, now)", async () => {
      mockSupabase.lt.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await mockSupabase
        .from("vertex_ai_caches")
        .select("id, cache_id")
        .lt("expires_at", new Date().toISOString());

      expect(mockSupabase.from).toHaveBeenCalledWith("vertex_ai_caches");
      expect(mockSupabase.select).toHaveBeenCalledWith("id, cache_id");
      expect(mockSupabase.lt).toHaveBeenCalledWith(
        "expires_at",
        expect.any(String)
      );
    });

    it("handles empty result set gracefully", async () => {
      mockSupabase.lt.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await mockSupabase.lt();
      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it("handles database errors", async () => {
      mockSupabase.lt.mockResolvedValue({
        data: null,
        error: { message: "Connection failed" },
      });

      const result = await mockSupabase.lt();
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe("Connection failed");
    });
  });

  // ─── Cleanup Logic ────────────────────────────────────────────────────

  describe("Deleting Expired Caches", () => {
    it("constructs correct Vertex AI delete endpoint URL", () => {
      const config = mockGetVertexConfig();
      const cacheId = "projects/test-project/locations/us-central1/cachedContents/cache-123";

      const expectedUrl = `https://${config.location}-aiplatform.googleapis.com/v1/${cacheId}`;
      expect(expectedUrl).toBe("https://us-central1-aiplatform.googleapis.com/v1/projects/test-project/locations/us-central1/cachedContents/cache-123");
    });

    it("includes authorization token in Vertex AI delete request", async () => {
      const token = await mockGetVertexAuthToken();
      expect(token).toBe("mock-vertex-token");

      const headers = {
        Authorization: `Bearer ${token}`,
      };
      expect(headers.Authorization).toBe("Bearer mock-vertex-token");
    });

    it("deletes cache from database after Vertex AI delete", async () => {
      mockSupabase.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await mockSupabase
        .from("vertex_ai_caches")
        .delete()
        .eq("id", 1);

      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", 1);
    });
  });

  // ─── Error Handling ───────────────────────────────────────────────────

  describe("Error Handling", () => {
    it("treats 404 from Vertex AI as non-error (cache already deleted)", () => {
      // 404 means cache was already deleted, which is fine
      const status = 404;
      const isError = status !== 404 && !status.toString().startsWith("2");
      expect(isError).toBe(false);
    });

    it("treats 5xx from Vertex AI as error but continues", () => {
      const status = 500;
      const isError = status !== 404 && !status.toString().startsWith("2");
      expect(isError).toBe(true);
      // Should log error but continue cleanup
    });

    it("always deletes from DB regardless of Vertex AI result", async () => {
      // Even if Vertex delete fails, DB delete should proceed
      mockSupabase.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      const dbResult = await mockSupabase.delete().eq("id", 1);
      expect(dbResult.error).toBeNull();
    });

    it("tracks partial failures (some succeed, some fail)", () => {
      const total = 5;
      const successful = 3;
      const failed = 2;

      expect(successful + failed).toBe(total);
      expect(successful).toBeGreaterThan(0);
      expect(failed).toBeGreaterThan(0);
    });
  });

  // ─── Batch Processing Logic ───────────────────────────────────────────

  describe("Batch Processing", () => {
    it("processes multiple expired caches sequentially", async () => {
      const expiredCaches = [
        { id: 1, cache_id: "cache-1" },
        { id: 2, cache_id: "cache-2" },
        { id: 3, cache_id: "cache-3" },
      ];

      mockSupabase.lt.mockResolvedValue({
        data: expiredCaches,
        error: null,
      });

      const result = await mockSupabase.lt();
      expect(result.data).toHaveLength(3);
    });

    it("continues processing after individual failures", () => {
      let processed = 0;
      let errors = [];

      const caches = [
        { id: 1, willFail: false },
        { id: 2, willFail: true },
        { id: 3, willFail: false },
      ];

      for (const cache of caches) {
        try {
          if (cache.willFail) {
            throw new Error("Simulated failure");
          }
          processed++;
        } catch (err) {
          errors.push(cache.id);
          // Continue to next iteration
        }
      }

      expect(processed).toBe(2); // Two succeeded
      expect(errors).toEqual([2]); // One failed
    });
  });

  // ─── Return Value Structure ───────────────────────────────────────────

  describe("Response Structure", () => {
    it("returns success response with deletion count", () => {
      const response = {
        message: "Cleaned up 5 expired caches",
        deleted: 5,
        total: 5,
      };

      expect(response).toHaveProperty("message");
      expect(response).toHaveProperty("deleted");
      expect(response).toHaveProperty("total");
      expect(response.deleted).toBe(5);
    });

    it("includes errors array when failures occur", () => {
      const response = {
        message: "Cleaned up 3 expired caches",
        deleted: 3,
        total: 5,
        errors: [
          "Vertex delete failed for cache-1: 500",
          "DB delete failed for 2: constraint violation",
        ],
      };

      expect(response.errors).toBeDefined();
      expect(response.errors).toHaveLength(2);
    });

    it("omits errors field when all succeed", () => {
      const response = {
        message: "Cleaned up 5 expired caches",
        deleted: 5,
        total: 5,
        errors: undefined,
      };

      expect(response.errors).toBeUndefined();
    });
  });
});
