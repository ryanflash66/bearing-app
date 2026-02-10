import {
  checkUsageLimit,
  logUsageEvent,
  getMonthlyUsageStats,
  getFeatureBreakdown,
  formatTokenCompact,
  FEATURE_LABELS,
  MONTHLY_TOKEN_CAP
} from "@/lib/ai-usage";
import { SupabaseClient } from "@supabase/supabase-js";

// Mock Supabase Client
const mockSupabase = {
  from: jest.fn(),
} as unknown as SupabaseClient;

describe("AI Usage Metering", () => {
  const accountId = "acc-123";
  const userId = "user-123";
  const cycleId = "cycle-123";

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({ // for getOrCreateOpenBillingCycle / checkUsageLimit
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ // status=open
            single: jest.fn().mockResolvedValue({ 
              data: { id: cycleId, end_date: new Date(Date.now() + 100000).toISOString() }, 
              error: null 
            }), // getOrCreateOpenBillingCycle
          }),
          single: jest.fn().mockResolvedValue({ data: { account_id: accountId }, error: null }), // manuscript fetch
        }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: "new-cycle" }, error: null }),
        }),
      }),
      update: jest.fn().mockResolvedValue({ error: null }),
    });
  });

  describe("checkUsageLimit", () => {
    it("allows usage when under cap", async () => {
      // Mock usage query to return low usage
      const mockSelectUsage = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [{ tokens_actual: 1000 }, { tokens_actual: 500 }],
          error: null,
        }),
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table) => {
        if (table === "accounts") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { usage_status: "good_standing" }, error: null }),
              }),
            }),
          };
        }
        if (table === "billing_cycles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: { id: cycleId, end_date: new Date(Date.now() + 100000).toISOString() }, 
                    error: null 
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "ai_usage_events") {
          return { select: mockSelectUsage };
        }
        return { select: jest.fn() };
      });

      await expect(checkUsageLimit(mockSupabase, accountId, 1000)).resolves.not.toThrow();
    });

    it("throws when usage exceeds cap", async () => {
      // Mock usage query to return high usage
      const mockSelectUsage = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [{ tokens_actual: MONTHLY_TOKEN_CAP - 100 }], // Almost full
          error: null,
        }),
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table) => {
        if (table === "accounts") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { usage_status: "good_standing" }, error: null }),
              }),
            }),
          };
        }
        if (table === "billing_cycles") {
           return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: { id: cycleId, end_date: new Date(Date.now() + 100000).toISOString() }, 
                    error: null 
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "ai_usage_events") {
          return { select: mockSelectUsage };
        }
        return { select: jest.fn() };
      });

      await expect(checkUsageLimit(mockSupabase, accountId, 200)).rejects.toThrow(/Monthly AI token limit reached/);
    });
  });

  describe("logUsageEvent", () => {
    it("inserts event into db", async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      
      (mockSupabase.from as jest.Mock).mockImplementation((table) => {
        if (table === "billing_cycles") {
           return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: { id: cycleId, end_date: new Date(Date.now() + 100000).toISOString() }, 
                    error: null 
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "ai_usage_events") {
          return { insert: mockInsert };
        }
        return {};
      });

      await logUsageEvent(mockSupabase, accountId, userId, "test_feature", "test_model", 100, 100, 100);

      expect(mockInsert).toHaveBeenCalledWith({
        account_id: accountId,
        user_id: userId,
        cycle_id: cycleId,
        feature: "test_feature",
        model: "test_model",
        tokens_estimated: 100,
        tokens_actual: 100,
        latency_ms: 100,
      });
    });
  });

  describe("getMonthlyUsageStats", () => {
    it("returns correct sums", async () => {
      const mockSelectUsage = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [
            { tokens_actual: 100, feature: 'consistency_check' },
            { tokens_actual: 200, feature: 'suggestion' },
            { tokens_actual: 50, feature: 'consistency_check' }
          ],
          error: null,
        }),
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table) => {
        if (table === "billing_cycles") {
           return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ 
                    data: { id: cycleId, end_date: new Date(Date.now() + 100000).toISOString() }, 
                    error: null 
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "ai_usage_events") {
          return { select: mockSelectUsage };
        }
        return {};
      });

      const stats = await getMonthlyUsageStats(mockSupabase, accountId);
      expect(stats.tokensUsed).toBe(350);
      expect(stats.checkCount).toBe(2);
    });
  });

  describe("getFeatureBreakdown", () => {
    it("returns per-feature totals with tokens and count", async () => {
      const mockSelectUsage = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [
            { tokens_actual: 100, feature: 'consistency_check' },
            { tokens_actual: 200, feature: 'suggestion' },
            { tokens_actual: 50, feature: 'consistency_check' },
            { tokens_actual: 75, feature: 'suggestion' },
          ],
          error: null,
        }),
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table) => {
        if (table === "billing_cycles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: cycleId, end_date: new Date(Date.now() + 100000).toISOString() },
                    error: null
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "ai_usage_events") {
          return { select: mockSelectUsage };
        }
        return {};
      });

      const breakdown = await getFeatureBreakdown(mockSupabase, accountId);

      expect(breakdown).toEqual([
        { feature: 'consistency_check', label: 'Consistency Checks', tokens: 150, count: 2 },
        { feature: 'suggestion', label: 'AI Suggestions', tokens: 275, count: 2 },
      ]);
    });

    it("returns empty array when no usage events", async () => {
      const mockSelectUsage = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table) => {
        if (table === "billing_cycles") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: cycleId, end_date: new Date(Date.now() + 100000).toISOString() },
                    error: null
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "ai_usage_events") {
          return { select: mockSelectUsage };
        }
        return {};
      });

      const breakdown = await getFeatureBreakdown(mockSupabase, accountId);
      expect(breakdown).toEqual([]);
    });
  });

  describe("formatTokenCompact", () => {
    it("formats thousands with k suffix", () => {
      expect(formatTokenCompact(1000)).toBe("1k");
      expect(formatTokenCompact(5000)).toBe("5k");
      expect(formatTokenCompact(10000)).toBe("10k");
    });

    it("formats millions with k suffix maintaining precision", () => {
      expect(formatTokenCompact(1000000)).toBe("1,000k");
      expect(formatTokenCompact(1500000)).toBe("1,500k");
    });

    it("rounds to nearest thousand", () => {
      expect(formatTokenCompact(1234)).toBe("1k");
      expect(formatTokenCompact(5678)).toBe("6k");
    });

    it("handles zero", () => {
      expect(formatTokenCompact(0)).toBe("0k");
    });

    it("handles small numbers with '< 1k' display", () => {
      expect(formatTokenCompact(500)).toBe("< 1k");
      expect(formatTokenCompact(100)).toBe("< 1k");
      expect(formatTokenCompact(1)).toBe("< 1k");
    });
  });

  describe("FEATURE_LABELS", () => {
    it("has labels for consistency_check", () => {
      expect(FEATURE_LABELS.consistency_check).toBe("Consistency Checks");
    });

    it("has labels for suggestion", () => {
      expect(FEATURE_LABELS.suggestion).toBe("AI Suggestions");
    });

    it("is an object with string keys and values", () => {
      expect(typeof FEATURE_LABELS).toBe("object");
      Object.entries(FEATURE_LABELS).forEach(([key, value]) => {
        expect(typeof key).toBe("string");
        expect(typeof value).toBe("string");
      });
    });
  });
});
