/**
 * Tests for Admin Panel functionality
 * Story 1.4: Basic Admin Panel
 */

import {
  verifyAdminAccess,
  getAccountMembersPaginated,
  updateMemberRoleWithGuardrails,
  removeMemberWithGuardrails,
  getAdminAuditLogs,
  getAdminStats,
} from "@/lib/admin";
import { SupabaseClient } from "@supabase/supabase-js";

// Mock Supabase client
const createMockSupabase = (overrides: Partial<SupabaseClient> = {}): SupabaseClient => {
  const mockFrom = jest.fn();
  
  return {
    from: mockFrom,
    ...overrides,
  } as unknown as SupabaseClient;
};

describe("Admin Library Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("verifyAdminAccess", () => {
    // AC 1.4.1: Non-admin receives denial
    it("returns false for non-admin users", async () => {
      const mockSupabase = createMockSupabase();
      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { account_role: "author" },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await verifyAdminAccess(mockSupabase, "account-1", "user-1");
      expect(result.isAdmin).toBe(false);
      expect(result.error).toBeNull();
    });

    // AC 1.4.2: Admin has access
    it("returns true for admin users", async () => {
      const mockSupabase = createMockSupabase();
      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { account_role: "admin" },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await verifyAdminAccess(mockSupabase, "account-1", "user-1");
      expect(result.isAdmin).toBe(true);
      expect(result.error).toBeNull();
    });

    it("returns error for non-members", async () => {
      const mockSupabase = createMockSupabase();
      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: "PGRST116", message: "No rows found" },
              }),
            }),
          }),
        }),
      });

      const result = await verifyAdminAccess(mockSupabase, "account-1", "user-1");
      expect(result.isAdmin).toBe(false);
      expect(result.error).toBe("Not a member of this account");
    });
  });

  describe("updateMemberRoleWithGuardrails", () => {
    // AC 1.4.5: Cannot demote last admin
    it("blocks demotion of last admin", async () => {
      const mockSupabase = createMockSupabase();
      const mockFrom = mockSupabase.from as jest.Mock;
      
      // Setup: Target user is admin, only 1 admin exists
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (table === "account_members") {
          // First call: get current role
          if (callCount === 1) {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: { account_role: "admin" },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          // Third call: count admins
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  count: 1,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "accounts") {
          // Second call: check owner
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { owner_user_id: "different-user" },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await updateMemberRoleWithGuardrails(mockSupabase, {
        accountId: "account-1",
        targetUserId: "user-1",
        newRole: "author",
        actorUserId: "actor-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot demote the last admin");
    });

    // AC 1.4.5: Cannot change owner's role
    it("blocks changing account owner role", async () => {
      const mockSupabase = createMockSupabase();
      const mockFrom = mockSupabase.from as jest.Mock;
      
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (table === "account_members" && callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { account_role: "admin" },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "accounts") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { owner_user_id: "user-1" }, // Target is owner
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await updateMemberRoleWithGuardrails(mockSupabase, {
        accountId: "account-1",
        targetUserId: "user-1",
        newRole: "author",
        actorUserId: "actor-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot change the account owner's role");
    });

    // AC 1.4.4: Role updates successfully when guardrails pass
    it("allows valid role changes", async () => {
      const mockSupabase = createMockSupabase();
      const mockFrom = mockSupabase.from as jest.Mock;
      
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (table === "account_members") {
          if (callCount === 1) {
            // Get current role
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: { account_role: "author" },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (callCount === 3) {
            // Update role
            return {
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    error: null,
                  }),
                }),
              }),
            };
          }
        }
        if (table === "accounts") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { owner_user_id: "different-user" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "audit_logs") {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      const result = await updateMemberRoleWithGuardrails(mockSupabase, {
        accountId: "account-1",
        targetUserId: "user-1",
        newRole: "admin", // Promoting author to admin
        actorUserId: "actor-1",
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe("removeMemberWithGuardrails", () => {
    // AC 1.4.5: Cannot remove owner
    it("blocks removal of account owner", async () => {
      const mockSupabase = createMockSupabase();
      const mockFrom = mockSupabase.from as jest.Mock;
      
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (table === "account_members" && callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      account_role: "admin",
                      users: { email: "owner@test.com" },
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "accounts") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { owner_user_id: "user-1" }, // Target is owner
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await removeMemberWithGuardrails(mockSupabase, {
        accountId: "account-1",
        targetUserId: "user-1",
        actorUserId: "actor-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot remove the account owner");
    });

    // AC 1.4.5: Cannot remove last admin
    it("blocks removal of last admin", async () => {
      const mockSupabase = createMockSupabase();
      const mockFrom = mockSupabase.from as jest.Mock;
      
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (table === "account_members") {
          if (callCount === 1) {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: {
                        account_role: "admin",
                        users: { email: "admin@test.com" },
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (callCount === 3) {
            // Count admins
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    count: 1,
                    error: null,
                  }),
                }),
              }),
            };
          }
        }
        if (table === "accounts") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { owner_user_id: "different-user" },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await removeMemberWithGuardrails(mockSupabase, {
        accountId: "account-1",
        targetUserId: "user-1",
        actorUserId: "actor-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot remove the last admin");
    });
  });

  describe("getAccountMembersPaginated", () => {
    // AC 1.4.3: Pagination and search
    it("returns paginated members list", async () => {
      const mockSupabase = createMockSupabase();
      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockImplementation((table: string) => {
        if (table === "accounts") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { owner_user_id: "owner-1" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "account_members") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockResolvedValue({
                    data: [
                      {
                        user_id: "user-1",
                        account_id: "account-1",
                        account_role: "admin",
                        created_at: "2024-01-01T00:00:00Z",
                        users: { email: "admin@test.com", display_name: "Admin" },
                      },
                      {
                        user_id: "user-2",
                        account_id: "account-1",
                        account_role: "author",
                        created_at: "2024-01-02T00:00:00Z",
                        users: { email: "author@test.com", display_name: "Author" },
                      },
                    ],
                    error: null,
                    count: 2,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await getAccountMembersPaginated(mockSupabase, "account-1", {
        page: 1,
        pageSize: 20,
      });

      expect(result.error).toBeNull();
      expect(result.members).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.members[0].email).toBe("admin@test.com");
    });
  });

  describe("getAdminAuditLogs", () => {
    // AC 1.4.6: Fetch audit logs with filters
    it("returns filtered audit logs", async () => {
      const mockSupabase = createMockSupabase();
      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: "log-1",
                      account_id: "account-1",
                      user_id: "user-1",
                      action: "role_changed",
                      entity_type: "user",
                      entity_id: "user-2",
                      metadata: { old_role: "author", new_role: "admin" },
                      created_at: "2024-01-01T00:00:00Z",
                      users: { email: "admin@test.com" },
                    },
                  ],
                  error: null,
                  count: 1,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await getAdminAuditLogs(mockSupabase, "account-1", {
        page: 1,
        pageSize: 20,
        action: "role_changed",
      });

      expect(result.error).toBeNull();
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].action).toBe("role_changed");
    });
  });

  describe("getAdminStats", () => {
    it("returns correct member and audit stats", async () => {
      const mockSupabase = createMockSupabase();
      const mockFrom = mockSupabase.from as jest.Mock;
      
      mockFrom.mockImplementation((table: string) => {
        if (table === "account_members") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [
                  { account_role: "admin" },
                  { account_role: "admin" },
                  { account_role: "author" },
                  { account_role: "author" },
                  { account_role: "author" },
                  { account_role: "support" },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === "audit_logs") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({
                  count: 15,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await getAdminStats(mockSupabase, "account-1");

      expect(result.error).toBeNull();
      expect(result.totalMembers).toBe(6);
      expect(result.adminCount).toBe(2);
      expect(result.authorCount).toBe(3);
      expect(result.supportCount).toBe(1);
      expect(result.recentAuditCount).toBe(15);
    });
  });
});

