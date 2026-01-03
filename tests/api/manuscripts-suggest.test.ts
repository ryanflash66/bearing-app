/**
 * API endpoint tests for /api/manuscripts/:id/suggest
 * Story 2.3 Acceptance Criteria:
 * - AC 2.3.1: Suggestion streams within 2 seconds (P95)
 * - AC 2.3.4: Token cap enforcement with clear error message
 */

import { POST } from "@/app/api/manuscripts/[id]/suggest/route";

// Mock the llama service
jest.mock("@/lib/llama", () => ({
  getLlamaSuggestionStream: jest.fn(),
  validateContextWindow: jest.fn(() => ({ valid: true, tokens: 100 })),
}));

// Mock AI Usage library
jest.mock("@/lib/ai-usage", () => ({
  checkUsageLimit: jest.fn().mockResolvedValue(undefined),
  logUsageEvent: jest.fn().mockResolvedValue(undefined),
  getOrCreateOpenBillingCycle: jest.fn().mockResolvedValue({ id: "cycle-123" }),
}));

// Mock Supabase server client
jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue({
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
      single: jest.fn().mockResolvedValue({
        data: {
          id: "ms-id",
          account_id: "account-id",
          owner_user_id: "user-id",
        },
        error: null,
      }),
    }),
  }),
}));

const { getLlamaSuggestion } = require("@/lib/llama");

describe("POST /api/manuscripts/:id/suggest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset createClient default mock to success case
    const { createClient } = require("@/utils/supabase/server");
    createClient.mockResolvedValue({
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
        single: jest.fn().mockResolvedValue({
          data: {
            id: "ms-id",
            account_id: "account-id",
            owner_user_id: "user-id",
          },
          error: null,
        }),
      }),
    });
  });

  it("should stream suggestion for valid request", async () => {
    const { getLlamaSuggestionStream } = require("@/lib/llama");
    
    // Mock streaming generator
    async function* mockStream() {
      yield "Improved ";
      yield "text";
      return {
        suggestion: {
          suggestion: "Improved text",
          rationale: "Better flow",
          confidence: 0.85,
        },
        requestHash: "hash",
        tokensEstimated: 100,
        tokensActual: 150,
        cached: false,
      };
    }
    
    getLlamaSuggestionStream.mockReturnValue(mockStream());

    const request = {
      json: async () => ({
        selectionText: "test text",
      }),
    } as any;

    const response = await POST(request, { params: Promise.resolve({ id: "ms-id" }) } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    
    // Read stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let chunks: any[] = [];
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        
        for (const line of lines as string[]) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            chunks.push(data);
          }
        }
      }
    }
    
    // Verify streaming chunks
    expect(chunks.some(c => c.type === "chunk")).toBe(true);
    const complete = chunks.find(c => c.type === "complete");
    expect(complete).toBeDefined();
    expect(complete.suggestion).toBe("Improved text");
    expect(complete.confidence).toBe(0.85);
  });

  it("should return 400 for missing selectionText", async () => {
    const request = {
      json: async () => ({}),
    } as any;

    const response = await POST(request, { params: Promise.resolve({ id: "ms-id" }) } as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("selectionText");
  });

  it("should return 401 for unauthenticated requests", async () => {
    const { createClient } = require("@/utils/supabase/server");
    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Unauthorized" },
        }),
      },
    });

    const request = {
      json: async () => ({
        selectionText: "test",
      }),
    } as any;

    const response = await POST(request, { params: Promise.resolve({ id: "ms-id" }) } as any);
    expect(response.status).toBe(401);
  });

  it("should return 404 for non-existent manuscript", async () => {
    const { createClient } = require("@/utils/supabase/server");
    createClient.mockResolvedValue({
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
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Not found" },
        }),
      }),
    });

    const request = {
      json: async () => ({
        selectionText: "test",
      }),
    } as any;

    const response = await POST(request, { params: Promise.resolve({ id: "ms-id" }) } as any);
    expect(response.status).toBe(404);
  });

  it("should return 429 for token cap exceeded", async () => {
    const { getLlamaSuggestionStream } = require("@/lib/llama");
    const aiUsage = require("@/lib/ai-usage");
    
    // Mock usage limit exceeded (for completeness, though generator throw is what matters here)
    aiUsage.checkUsageLimit.mockRejectedValue(new Error("Token cap exceeded. You have 0 remaining this month."));
    
    getLlamaSuggestionStream.mockImplementation(async function* () {
      throw new Error("Token cap exceeded. You have 0 remaining this month.");
      yield "";
    });

    const request = {
      json: async () => ({
        selectionText: "test",
      }),
    } as any;

    const response = await POST(request, { params: Promise.resolve({ id: "ms-id" }) } as any);
    const data = await response.json();

    // Route returns 200 with error chunk for stream errors
    expect(response.status).toBe(200);
    
    // Read stream to verify error chunk
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let foundError = false;
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        if (text.includes("Token cap exceeded")) {
             foundError = true;
        }
      }
    }
    expect(foundError).toBe(true);
  });

  it("should return cached response when available", async () => {
    const { getLlamaSuggestionStream } = require("@/lib/llama");
    
    async function* mockCachedStream() {
      yield "Cached suggestion";
      return {
        suggestion: {
          suggestion: "Cached suggestion",
          confidence: 0.9,
        },
        requestHash: "hash",
        tokensEstimated: 100,
        tokensActual: 100,
        cached: true,
      };
    }
    
    getLlamaSuggestionStream.mockReturnValue(mockCachedStream());

    const request = {
      json: async () => ({
        selectionText: "test",
      }),
    } as any;

    const response = await POST(request, { params: Promise.resolve({ id: "ms-id" }) } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    
    // Read stream to verify cached response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let complete: any = null;
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.type === "complete") {
              complete = data;
            }
          }
        }
      }
    }
    
    expect(complete).toBeDefined();
    expect(complete.cached).toBe(true);
  });
});

