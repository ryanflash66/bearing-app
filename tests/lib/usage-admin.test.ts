
import { getAccountUsageStats } from "@/lib/usage-admin";
import { SupabaseClient } from "@supabase/supabase-js";

describe("usage-admin lib", () => {
    let mockSupabase: any;
    let mockFrom: any;
    let mockSelect: any;
    let mockEq: any;

    beforeEach(() => {
        mockEq = jest.fn();
        mockSelect = jest.fn(() => ({ eq: mockEq }));
        mockFrom = jest.fn(() => ({ select: mockSelect, update: jest.fn(), insert: jest.fn() }));
        
        mockSupabase = {
            from: mockFrom
        };
    });

    it("fetches usage stats successfully", async () => {
        // Mock members response (first call to eq)
        mockEq.mockReturnValueOnce(Promise.resolve({
            data: [{ 
                user_id: "u1", 
                account_role: "author", 
                ai_status: "active",
                member_status: "active",
                users: { email: "u1@example.com", display_name: "U1" }
            }],
            error: null
        }));

        // Mock usage view response (second call to eq)
        mockEq.mockReturnValueOnce(Promise.resolve({
            data: [{
                user_id: "u1",
                total_tokens: 100,
                total_checks: 1,
                last_activity: "2023-01-01"
            }],
            error: null
        }));

        const result = await getAccountUsageStats(mockSupabase as SupabaseClient, "acc1");
        
        expect(mockFrom).toHaveBeenCalledWith("account_members");
        expect(mockFrom).toHaveBeenCalledWith("user_current_usage");
        expect(result.stats).toHaveLength(1);
        expect(result.stats[0].total_tokens).toBe(100);
        expect(result.stats[0].user_id).toBe("u1");
        expect(result.stats[0].member_status).toBe("active");
    });
});
