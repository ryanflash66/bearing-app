/**
 * Mock Vertex AI Client for Unit Tests
 *
 * Story 5.6.1, Task 3.4: Mock that simulates the full cache lifecycle
 * (hit/miss/expire/evict) for CI/CD without live Vertex AI calls.
 *
 * Task 5.6: Use mocks for CI/CD. Restrict live Vertex calls to manual e2e scripts.
 */

export interface MockCacheEntry {
  name: string;
  displayName: string;
  content: string;
  createTime: string;
  expireTime: string;
  tokenCount: number;
  isEvicted: boolean;
}

export interface MockGenerateContentResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
    finishReason: string;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
    cachedContentTokenCount: number;
  };
}

/**
 * MockVertexClient simulates Vertex AI interactions for testing.
 * Provides controllable behavior for cache hit/miss/expire/evict scenarios.
 */
export class MockVertexClient {
  private caches: Map<string, MockCacheEntry> = new Map();
  private callCount = 0;
  private shouldFail = false;
  private failStatusCode = 500;
  private failMessage = "Mock Vertex AI failure";

  // ─── Cache Lifecycle ──────────────────────────────────────────────────

  /**
   * Simulate creating cached content
   */
  createCachedContent(
    content: string,
    displayName: string,
    ttlSeconds: number = 1800
  ): { name: string; usageMetadata: { totalTokenCount: number } } {
    if (this.shouldFail) {
      throw {
        status: this.failStatusCode,
        message: this.failMessage,
      };
    }

    const name = `projects/mock/locations/us-central1/cachedContents/cache-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tokenCount = Math.ceil(content.length / 4);

    const entry: MockCacheEntry = {
      name,
      displayName,
      content,
      createTime: new Date().toISOString(),
      expireTime: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      tokenCount,
      isEvicted: false,
    };

    this.caches.set(name, entry);

    return {
      name,
      usageMetadata: { totalTokenCount: tokenCount },
    };
  }

  /**
   * Simulate getting cached content (returns null if evicted or expired)
   */
  getCachedContent(
    cacheName: string
  ): MockCacheEntry | null {
    if (this.shouldFail) {
      throw {
        status: this.failStatusCode,
        message: this.failMessage,
      };
    }

    const entry = this.caches.get(cacheName);
    if (!entry) return null;

    // Check if evicted
    if (entry.isEvicted) {
      return null;
    }

    // Check if expired
    if (new Date(entry.expireTime) < new Date()) {
      return null;
    }

    return entry;
  }

  /**
   * Simulate deleting cached content
   */
  deleteCachedContent(cacheName: string): boolean {
    const existed = this.caches.has(cacheName);
    this.caches.delete(cacheName);
    return existed;
  }

  /**
   * Simulate eviction (Vertex may evict caches under pressure)
   */
  evictCache(cacheName: string): void {
    const entry = this.caches.get(cacheName);
    if (entry) {
      entry.isEvicted = true;
    }
  }

  /**
   * Simulate generating content (with or without cache)
   */
  generateContent(
    _content: string,
    cacheName?: string | null
  ): MockGenerateContentResponse {
    if (this.shouldFail) {
      throw {
        status: this.failStatusCode,
        message: this.failMessage,
      };
    }

    this.callCount++;

    const isCacheHit = cacheName ? !!this.getCachedContent(cacheName) : false;
    const promptTokens = isCacheHit ? 200 : 5000;
    const cachedTokens = isCacheHit ? 33000 : 0;

    return {
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
                      location: {
                        chapter: null,
                        quote: "Mock detected issue",
                        offset: 42,
                      },
                      explanation:
                        "This is a mock consistency issue for testing",
                      suggestion: "Fix the mock issue",
                      documentPosition: 42,
                    },
                  ],
                  summary: `Mock analysis complete (call #${this.callCount}, cache: ${isCacheHit ? "hit" : "miss"})`,
                }),
              },
            ],
          },
          finishReason: "STOP",
          safetyRatings: [
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              probability: "NEGLIGIBLE",
            },
          ],
        },
      ],
      usageMetadata: {
        promptTokenCount: promptTokens,
        candidatesTokenCount: 500,
        totalTokenCount: promptTokens + 500,
        cachedContentTokenCount: cachedTokens,
      },
    };
  }

  // ─── Test Helpers ─────────────────────────────────────────────────────

  /** Configure mock to fail on next call */
  setFail(statusCode: number = 500, message: string = "Mock failure"): void {
    this.shouldFail = true;
    this.failStatusCode = statusCode;
    this.failMessage = message;
  }

  /** Reset failure mode */
  clearFail(): void {
    this.shouldFail = false;
  }

  /** Get number of generateContent calls */
  getCallCount(): number {
    return this.callCount;
  }

  /** Get all active (non-evicted, non-expired) caches */
  getActiveCaches(): MockCacheEntry[] {
    return Array.from(this.caches.values()).filter(
      (c) => !c.isEvicted && new Date(c.expireTime) >= new Date()
    );
  }

  /** Get total number of caches (including evicted/expired) */
  getTotalCacheCount(): number {
    return this.caches.size;
  }

  /** Reset all state */
  reset(): void {
    this.caches.clear();
    this.callCount = 0;
    this.shouldFail = false;
  }
}

/**
 * Factory to get a singleton mock client for tests.
 */
let mockInstance: MockVertexClient | null = null;

export function getMockVertexClient(): MockVertexClient {
  if (!mockInstance) {
    mockInstance = new MockVertexClient();
  }
  return mockInstance;
}

export function resetMockVertexClient(): void {
  if (mockInstance) {
    mockInstance.reset();
  }
  mockInstance = null;
}
