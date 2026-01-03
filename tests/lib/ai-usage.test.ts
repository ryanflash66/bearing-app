import { checkUsageLimit, logUsageEvent, getMonthlyUsageStats, MONTHLY_TOKEN_CAP } from "@/lib/ai-usage";
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

      await logUsageEvent(mockSupabase, accountId, userId, "test_feature", "test_model", 100, 100);

      expect(mockInsert).toHaveBeenCalledWith({
        account_id: accountId,
        user_id: userId,
        cycle_id: cycleId,
        feature: "test_feature",
        model: "test_model",
        tokens_estimated: 100,
        tokens_actual: 100,
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
});
