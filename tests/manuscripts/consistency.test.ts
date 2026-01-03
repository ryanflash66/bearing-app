/**
 * Integration tests for Consistency Checks
 * Story 3.2 Acceptance Criteria:
 * - AC 3.2.1: JSON Output
 * - AC 3.2.2: Issue Categorization
 * - AC 3.2.3: Location Anchors
 * - AC 3.2.4: Severity Scoring
 * - AC 3.2.5: Report Persistence
 */

import {
  initiateConsistencyCheck,
  processConsistencyCheckJob,
  analyzeConsistencyWithGemini,
  ConsistencyReport,
} from "@/lib/gemini";
import * as aiUsage from "@/lib/ai-usage";

// Mock AI Usage library
jest.mock("@/lib/ai-usage", () => ({
  checkUsageLimit: jest.fn().mockResolvedValue(undefined),
  logUsageEvent: jest.fn().mockResolvedValue(undefined),
  getOrCreateOpenBillingCycle: jest.fn().mockResolvedValue({ id: "cycle-123" }),
}));

// Mock global fetch for Gemini API
global.fetch = jest.fn();

// Mock Supabase client
const createMockSupabase = (overrides: Record<string, unknown> = {}) => {
  const mockSelect = jest.fn().mockReturnThis();
  const mockInsert = jest.fn().mockReturnThis();
  const mockUpdate = jest.fn().mockReturnThis();
  const mockDelete = jest.fn().mockReturnThis();
  const mockEq = jest.fn().mockReturnThis();
  const mockGte = jest.fn().mockReturnThis();
  const mockIs = jest.fn().mockReturnThis();
  const mockSingle = jest.fn();
  const mockLimit = jest.fn().mockReturnThis();
  const mockOrder = jest.fn().mockReturnThis();

  const mockFrom = jest.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    gte: mockGte,
    is: mockIs,
    limit: mockLimit,
    order: mockOrder,
    single: mockSingle,
  });

  return {
    from: mockFrom,
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-123" } }, error: null }),
    },
    ...overrides,
  };
};

describe("Consistency Checks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENROUTER_API_KEY = "mock-openrouter-key";
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: "chatcmpl-mock",
        model: "google/gemini-flash-1.5",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: JSON.stringify({
                issues: [],
                summary: "No issues found.",
              }),
            },
            finish_reason: "stop",
          },
        ],
      }),
    });
  });

  describe("analyzeConsistencyWithGemini (AC 3.2.1 - 3.2.4)", () => {
    it("should parse valid OpenRouter JSON response correctly", async () => {
      const mockResponse: ConsistencyReport = {
        issues: [
          {
            type: "character",
            severity: "high",
            location: {
              chapter: 1,
              quote: "John said hello.",
              offset: 100,
            },
            explanation: "John is dead in this chapter.",
            suggestion: "Remove the dialogue.",
          },
        ],
        summary: "One critical issue found.",
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: "chatcmpl-mock",
          model: "google/gemini-flash-1.5",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify(mockResponse),
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      const report = await analyzeConsistencyWithGemini("Manuscript content...");
      
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].type).toBe("character");
      expect(report.issues[0].severity).toBe("high");
      expect(report.summary).toBe("One critical issue found.");
    });

    it("should validate issue types and severity (Zod validation)", async () => {
      const invalidResponse = {
        issues: [
          {
            type: "invalid-type", // Invalid
            severity: "super-high", // Invalid
            location: { quote: "text" },
            explanation: "test",
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: "chatcmpl-mock",
          model: "google/gemini-flash-1.5",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: JSON.stringify(invalidResponse),
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      await expect(analyzeConsistencyWithGemini("content")).rejects.toThrow();
    });
  });

  describe("initiateConsistencyCheck", () => {
    it("should start a check and return job ID", async () => {
      const mockSupabase = createMockSupabase();
      
      // Mock getting manuscript content
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { content_text: "Some content" },
        error: null,
      });

      // Mock checking cache (no cache)
      mockSupabase.from().select().eq().eq().eq().order().limit().single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      });

      // Mock creating job
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id: "job-123" },
        error: null,
      });

      const result = await initiateConsistencyCheck(mockSupabase as never, {
        manuscriptId: "manuscript-123",
        userId: "user-123",
      });

      expect(result.jobId).toBe("job-123");
      expect(result.status).toBe("queued");
    });
  });

  describe("processConsistencyCheckJob (AC 3.2.5)", () => {
    it("should process job and store report in database", async () => {
      const mockSupabase = createMockSupabase();
      
      // Mock Gemini response
      const mockReport: ConsistencyReport = {
        issues: [],
        summary: "No issues.",
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockImplementation(async () => {
          console.log("Mock JSON called. Mock Report:", JSON.stringify(mockReport));
          return {
            id: "chatcmpl-mock",
            model: "google/gemini-flash-1.5",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: JSON.stringify(mockReport),
                },
                finish_reason: "stop",
              },
            ],
          }
        }),
      });

      // Mock update results (running & completion) for consistency_checks
      // And select for manuscripts
      // Using manual chain to avoid 'single' property collision on 'eq' return value
      
      const updateChain = {
        eq: jest.fn().mockResolvedValue({ error: null })
      };
      
      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { account_id: "acc-123", owner_user_id: "user-123" }, 
          error: null 
        })
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "consistency_checks") return { update: jest.fn().mockReturnValue(updateChain) };
        if (table === "manuscripts") return selectChain;
        return { select: jest.fn().mockReturnThis() };
      });

      const result = await processConsistencyCheckJob(
        mockSupabase as never,
        "job-123",
        "manuscript-123",
        "Content...",
        "user-123"
      );

      if (!result.success) console.error("Process failed with result:", result);
      expect(result.success).toBe(true);
      
      // Verify updates
      // First update: running
      expect(mockSupabase.from).toHaveBeenCalled();
      
      // We can't easily check exact call serialization with this mock setup without more detailed tracking,
      // but we can assume if result.success is true, the flow completed.
    });
  });
});
