/**
 * Account management utilities
 * Story 1.3: Account & Role Management
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface Account {
  id: string;
  name: string;
  owner_user_id: string;
  usage_status: "good_standing" | "flagged" | "upsell_required";
  created_at: string;
}

export interface AccountMember {
  account_id: string;
  user_id: string;
  account_role: "author" | "admin" | "support";
  created_at: string;
}

export interface AccountWithRole extends Account {
  role: "author" | "admin" | "support";
  is_owner: boolean;
}

/**
 * Create a new account with the current user as owner and admin
 */
export async function createAccount(
  supabase: SupabaseClient,
  name: string,
  ownerUserId: string
): Promise<{ account: Account | null; error: string | null }> {
  try {
    // Use RPC to create account and membership atomically
    // This adheres to the "RPC-First" security pattern (Story H.2)
    const { data: accounts, error: rpcError } = await supabase.rpc('create_default_account', {
      p_name: name,
      p_owner_id: ownerUserId
    });

    if (rpcError) {
      console.error("Account creation RPC error:", rpcError);
      return {
        account: null,
        error: "Failed to create account. Please try again.",
      };
    }

    const account = (accounts && accounts.length > 0) ? accounts[0] : null;

    if (!account) {
      return {
        account: null,
        error: "Account creation failed (no data returned).",
      };
    }

    // RPC handles membership creation automatically
    return { account: account as Account, error: null };


  } catch (err) {
    console.error("Account service error:", err);
    return {
      account: null,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get all accounts the current user is a member of
 */
export async function getUserAccounts(
  supabase: SupabaseClient,
  userId: string
): Promise<{ accounts: AccountWithRole[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("account_members")
      .select(
        `
        account_id,
        account_role,
        accounts (
          id,
          name,
          owner_user_id,
          usage_status,
          created_at
        )
      `
      )
      .eq("user_id", userId);

    if (error) {
      console.error("Account fetch error:", error);
      return {
        accounts: [],
        error: "Failed to load accounts. Please try again.",
      };
    }

    const accounts: AccountWithRole[] = (data || []).map((membership) => {
      const account = membership.accounts as unknown as Account;
      return {
        ...account,
        role: membership.account_role as "author" | "admin" | "support",
        is_owner: account.owner_user_id === userId,
      };
    });

    return { accounts, error: null };
  } catch (err) {
    console.error("Account service error:", err);
    return {
      accounts: [],
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get a specific account with membership info
 */
export async function getAccountWithRole(
  supabase: SupabaseClient,
  accountId: string,
  userId: string
): Promise<{ account: AccountWithRole | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("account_members")
      .select(
        `
        account_id,
        account_role,
        accounts (
          id,
          name,
          owner_user_id,
          usage_status,
          created_at
        )
      `
      )
      .eq("account_id", accountId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned - user is not a member
        return {
          account: null,
          error: "You are not a member of this account.",
        };
      }
      console.error("Account fetch error:", error);
      return {
        account: null,
        error: "Failed to load account. Please try again.",
      };
    }

    const account = data.accounts as unknown as Account;
    return {
      account: {
        ...account,
        role: data.account_role as "author" | "admin" | "support",
        is_owner: account.owner_user_id === userId,
      },
      error: null,
    };
  } catch (err) {
    console.error("Account service error:", err);
    return {
      account: null,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Check if a user is a member of an account
 */
export async function isAccountMember(
  supabase: SupabaseClient,
  accountId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("account_members")
      .select("account_id")
      .eq("account_id", accountId)
      .eq("user_id", userId)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * Check if a user is an admin of an account
 */
export async function isAccountAdmin(
  supabase: SupabaseClient,
  accountId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("account_members")
      .select("account_role")
      .eq("account_id", accountId)
      .eq("user_id", userId)
      .single();

    return !error && data?.account_role === "admin";
  } catch {
    return false;
  }
}

/**
 * Get all members of an account (admin/support only)
 */
export async function getAccountMembers(
  supabase: SupabaseClient,
  accountId: string
): Promise<{
  members: Array<{
    user_id: string;
    account_role: string;
    email: string;
    display_name: string | null;
  }>;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from("account_members")
      .select(
        `
        user_id,
        account_role,
        users (
          email,
          display_name
        )
      `
      )
      .eq("account_id", accountId);

    if (error) {
      console.error("Members fetch error:", error);
      return {
        members: [],
        error: "Failed to load account members. Please try again.",
      };
    }

    const members = (data || []).map((m) => {
      const userData = (Array.isArray(m.users) ? m.users[0] : m.users) as {
        email: string;
        display_name: string | null;
      };
      return {
        user_id: m.user_id,
        account_role: m.account_role,
        email: userData?.email,
        display_name: userData?.display_name,
      };
    });

    return { members, error: null };
  } catch (err) {
    console.error("Members service error:", err);
    return {
      members: [],
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Update a member's role (admin only)
 */
export async function updateMemberRole(
  supabase: SupabaseClient,
  accountId: string,
  userId: string,
  newRole: "author" | "admin" | "support"
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from("account_members")
      .update({ account_role: newRole })
      .eq("account_id", accountId)
      .eq("user_id", userId);

    if (error) {
      console.error("Role update error:", error);
      return {
        success: false,
        error: "Failed to update member role. Please try again.",
      };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Role update service error:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get the first account the user is a member of (for simple single-account users)
 */
export async function getFirstUserAccount(
  supabase: SupabaseClient,
  userId: string
): Promise<{ account: Account | null; error: string | null }> {
  try {
    // First, get the internal user ID from auth_id
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", userId)
      .single();

    if (userError || !userData) {
      return { account: null, error: "User profile not found" };
    }

    const { data, error } = await supabase
      .from("account_members")
      .select(
        `
        accounts (
          id,
          name,
          owner_user_id,
          usage_status,
          created_at
        )
      `
      )
      .eq("user_id", userData.id)
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { account: null, error: "No account found" };
      }
      console.error("Account fetch error:", error);
      return { account: null, error: "Failed to load account" };
    }

    const account = (Array.isArray(data.accounts)
      ? data.accounts[0]
      : data.accounts) as unknown as Account;

    return { account, error: null };
  } catch (err) {
    console.error("Account service error:", err);
    return { account: null, error: "An unexpected error occurred" };
  }
}

/**
 * Remove a member from an account (admin only)
 */
export async function removeMember(
  supabase: SupabaseClient,
  accountId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Check if user is the owner - can't remove owner
    const { data: account } = await supabase
      .from("accounts")
      .select("owner_user_id")
      .eq("id", accountId)
      .single();

    if (account?.owner_user_id === userId) {
      return {
        success: false,
        error: "Cannot remove the account owner. Transfer ownership first.",
      };
    }

    const { error } = await supabase
      .from("account_members")
      .delete()
      .eq("account_id", accountId)
      .eq("user_id", userId);

    if (error) {
      console.error("Member removal error:", error);
      return {
        success: false,
        error: "Failed to remove member. Please try again.",
      };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Member removal service error:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

