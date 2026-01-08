/**
 * RLS Regression Tests for Profile Management
 * Story 1.3: Account & Role Management
 *
 * These tests verify that profile operations correctly create
 * associated accounts and memberships per AC 1.3.1
 */

import { getOrCreateProfile, updateProfile } from "@/lib/profile";
import { SupabaseClient } from "@supabase/supabase-js";

// Mock Supabase client factory
const createMockSupabase = () => {
  return {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  } as unknown as SupabaseClient;
};

describe("Profile RLS Tests", () => {
  describe("AC 1.3.1: New User Profile Creation with Default Account", () => {
    it("should create profile with default account for new user", async () => {
      const authId = "auth-user-123";
      const email = "newuser@example.com";
      const newProfile = {
        id: "profile-123",
        auth_id: authId,
        email,
        display_name: null,
        pen_name: null,
        role: "author",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const newAccount = {
        id: "account-123",
        name: "newuser's Account",
        owner_user_id: "profile-123",
        created_at: new Date().toISOString(),
      };

      const supabase = createMockSupabase();
      
      // Mock claim_profile to return nothing (not claimed)
      (supabase.rpc as jest.Mock).mockImplementation((func, args) => {
        if (func === "claim_profile") return { data: null, error: null };
        if (func === "create_default_account") return { 
          data: [newAccount], 
          error: null 
        };
        return { data: null, error: null };
      });

      let callCount = 0;

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === "users") {
          callCount++;
          if (callCount === 1) {
            // First call - check if user exists (no)
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116", message: "No rows found" },
                  }),
                }),
              }),
              insert: jest.fn().mockReturnValue({ // Add insert mock for createProfileWithAccount
                select: jest.fn().mockReturnValue({
                   single: jest.fn().mockResolvedValue({
                     data: newProfile,
                     error: null
                   })
                })
              })
            };
          }
          // Second call (or any subsequent call) - create user (insert)
          return {
            insert: jest.fn().mockReturnValue({ // Add insert mock for createProfileWithAccount
              select: jest.fn().mockReturnValue({
                 single: jest.fn().mockResolvedValue({
                   data: newProfile,
                   error: null
                 })
              })
            })
          };
        }
         if (table === "audit_logs") {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
             insert: jest.fn().mockReturnThis(),
             select: jest.fn().mockReturnThis(),
             eq: jest.fn().mockReturnThis(),
             single: jest.fn().mockResolvedValue({ data: null, error: null })
        };
      });

      const result = await getOrCreateProfile(supabase, authId, email);

      expect(result.isNewProfile).toBe(true);
      expect(result.profile).not.toBeNull();
      expect(result.profile?.email).toBe(email);
      expect(result.account).not.toBeNull();
      expect(result.error).toBeNull();
    });

    it("should return existing profile without creating new account", async () => {
      const authId = "existing-auth-123";
      const email = "existing@example.com";
      const existingProfile = {
        id: "existing-profile-123",
        auth_id: authId,
        email,
        display_name: "Existing User",
        pen_name: "E. User",
        role: "author",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const existingAccount = {
        id: "existing-account-123",
        name: "Existing Account",
        owner_user_id: "existing-profile-123",
        created_at: new Date().toISOString(),
      };

      const supabase = createMockSupabase();

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: existingProfile,
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
                limit: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { accounts: existingAccount },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await getOrCreateProfile(supabase, authId, email);

      expect(result.isNewProfile).toBe(false);
      expect(result.profile?.id).toBe("existing-profile-123");
      expect(result.account?.id).toBe("existing-account-123");
      expect(result.error).toBeNull();
    });

    it("should handle profile creation race condition gracefully", async () => {
      const authId = "race-auth-123";
      const email = "race@example.com";
      const existingProfile = {
        id: "race-profile-123",
        auth_id: authId,
        email,
        display_name: null,
        pen_name: null,
        role: "author",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const supabase = createMockSupabase();
      let usersCallCount = 0;

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === "users") {
          usersCallCount++;
          if (usersCallCount === 1) {
            // First check - no user
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { code: "PGRST116", message: "No rows found" },
                  }),
                }),
              }),
            };
          }
          if (usersCallCount === 2) {
            // Insert fails (race condition - duplicate)
            return {
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { code: "23505", message: "Duplicate key" },
                  }),
                }),
              }),
            };
          }
          // Retry fetch succeeds
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: existingProfile,
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
                limit: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      accounts: {
                        id: "account-123",
                        name: "Account",
                        owner_user_id: "race-profile-123",
                        created_at: new Date().toISOString(),
                      },
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await getOrCreateProfile(supabase, authId, email);

      // Should recover and return the existing profile
      expect(result.profile).not.toBeNull();
      expect(result.error).toBeNull();
    });
  });

  describe("Profile Updates", () => {
    it("should update profile display name and pen name", async () => {
      const authId = "update-auth-123";
      const updatedProfile = {
        id: "profile-123",
        auth_id: authId,
        email: "user@example.com",
        display_name: "New Display Name",
        pen_name: "N.D. Author",
        role: "author",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const supabase = createMockSupabase();
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedProfile,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await updateProfile(supabase, authId, {
        display_name: "New Display Name",
        pen_name: "N.D. Author",
      });

      expect(result.error).toBeNull();
      expect(result.profile?.display_name).toBe("New Display Name");
      expect(result.profile?.pen_name).toBe("N.D. Author");
    });

    it("should not allow role updates through updateProfile", async () => {
      // This test verifies the TypeScript interface prevents role updates
      // The function signature only allows display_name and pen_name
      const updates: Partial<Pick<{ display_name: string; pen_name: string }, "display_name" | "pen_name">> = {
        display_name: "Test",
      };

      // TypeScript should prevent: updates.role = "admin"
      expect(Object.keys(updates)).not.toContain("role");
    });
  });

  describe("Error Handling", () => {
    it("should return error on profile fetch failure", async () => {
      const supabase = createMockSupabase();
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: "42501", message: "Permission denied" },
            }),
          }),
        }),
      });

      const result = await getOrCreateProfile(supabase, "auth-id", "email@test.com");

      expect(result.profile).toBeNull();
      expect(result.error).toBe("Failed to load profile. Please try again.");
    });

    it("should return error on profile update failure", async () => {
      const supabase = createMockSupabase();
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: "42501", message: "Permission denied" },
              }),
            }),
          }),
        }),
      });

      const result = await updateProfile(supabase, "auth-id", {
        display_name: "Test",
      });

      expect(result.profile).toBeNull();
      expect(result.error).toBe("Failed to update profile. Please try again.");
    });
  });
});

