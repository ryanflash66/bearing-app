import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { createAuditLog } from "./auditLog";

export interface UserProfile {
  id: string;
  auth_id: string;
  email: string;
  display_name: string | null;
  pen_name: string | null;
  // NOTE: This maps to the `users.role` database enum (public.app_role).
  // "user" represents the normal author account; elevated roles are separate.
  role: Database["public"]["Enums"]["app_role"];
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
  usage_status?: "good_standing" | "flagged" | "upsell_required";
  consecutive_overage_months?: number;
}

export interface ProfileResult {
  profile: UserProfile | null;
  account: Account | null;
  error: string | null;
  isNewProfile: boolean;
}

/**
 * Fetch or create user profile with default account
 * If profile doesn't exist, creates:
 * - A users row linked to auth.users via auth_id
 * - A default account for the user (MVP: one account per user)
 * - An account_members entry making the user an admin of their account
 * Per Story 1.3 AC 1.3.1: user belongs to exactly one default account
 */
export async function getOrCreateProfile(
  supabase: SupabaseClient,
  authId: string,
  email: string
): Promise<ProfileResult> {
  try {
    console.log('[getOrCreateProfile] Starting lookup for authId:', authId);
    
    // Use RPC to check for and claim any orphaned profile (bypassing RLS)
    const { data: claimedProfile, error: claimError } = await supabase.rpc('claim_profile', {
      p_auth_id: authId,
      p_email: email
    });

    if (claimError) {
      console.error('[getOrCreateProfile] RPC claim error:', claimError);
    }

    // Try to fetch existing profile (standard path)
    // Note: If claim_profile worked, this will now return the profile because auth_id matches
    const { data: existingProfile, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", authId)
      .single();
    
    console.log('[getOrCreateProfile] Profile fetch result:', {
      found: !!existingProfile,
      claimed: !!claimedProfile && claimedProfile.length > 0,
      profileId: existingProfile?.id,
      fetchError: fetchError?.message,
      errorCode: fetchError?.code,
    });



    if (existingProfile) {
      console.log('[getOrCreateProfile] Existing profile found, fetching account...');
      
      // Also fetch the user's account
      const { data: accountData, error: accountFetchError } = await supabase
        .from("account_members")
        .select(
          `
          accounts (
            id,
            name,
            owner_user_id,
            created_at
          )
        `
        )
        .eq("user_id", existingProfile.id)
        .limit(1)
        .single();

      const account = (Array.isArray(accountData?.accounts)
        ? accountData?.accounts[0]
        : accountData?.accounts) as Account | null;
      
      console.log('[getOrCreateProfile] Account fetch result:', {
        found: !!account,
        accountId: account?.id,
        accountName: account?.name,
        fetchError: accountFetchError?.message,
      });

      // If profile exists but no account is found, create a default account
      if (!account) {
        console.log('[getOrCreateProfile] Profile found but no account exists. Creating default account...');
        const { account: newAccount, error: createError } = await createAccountOnly(
          supabase,
          existingProfile.id,
          existingProfile.email
        );

        if (createError) {
          return {
            profile: existingProfile as UserProfile,
            account: null,
            error: createError,
            isNewProfile: false,
          };
        }

        return {
          profile: existingProfile as UserProfile,
          account: newAccount,
          error: null,
          isNewProfile: false,
        };
      }

      return {
        profile: existingProfile as UserProfile,
        account,
        error: null,
        isNewProfile: false,
      };
    }

    // If no profile and error is not "no rows found", it's a real error
    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Profile fetch error:", JSON.stringify(fetchError, null, 2));
      return {
        profile: null,
        account: null,
        error: "Failed to load profile. Please try again.",
        isNewProfile: false,
      };
    }

    // Create new profile with default account
    // This is done in a transaction-like manner
    console.log('[getOrCreateProfile] No existing profile, creating new profile and account...');
    
    const { profile, account, error } = await createProfileWithAccount(
      supabase,
      authId,
      email
    );
    
    console.log('[getOrCreateProfile] Profile creation result:', {
      created: !!profile,
      profileId: profile?.id,
      hasAccount: !!account,
      accountId: account?.id,
      error,
    });

    if (error) {
      // Race condition check - try fetching again
      const { data: retryProfile } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authId)
        .single();

      if (retryProfile) {
        const { data: accountData } = await supabase
          .from("account_members")
          .select(
            `
            accounts (
              id,
              name,
              owner_user_id,
              created_at
            )
          `
          )
          .eq("user_id", retryProfile.id)
          .limit(1)
          .single();

        const account = (Array.isArray(accountData?.accounts)
          ? accountData?.accounts[0]
          : accountData?.accounts) as Account | null;

        return {
          profile: retryProfile as UserProfile,
          account,
          error: null,
          isNewProfile: false,
        };
      }

      return {
        profile: null,
        account: null,
        error,
        isNewProfile: false,
      };
    }

    return {
      profile,
      account,
      error: null,
      isNewProfile: true,
    };
  } catch (err) {
    console.error("Profile service error:", err);
    return {
      profile: null,
      account: null,
      error: "An unexpected error occurred. Please try again.",
      isNewProfile: false,
    };
  }
}

/**
 * Internal helper to create profile, account, and membership atomically
 */
async function createProfileWithAccount(
  supabase: SupabaseClient,
  authId: string,
  email: string
): Promise<{
  profile: UserProfile | null;
  account: Account | null;
  error: string | null;
}> {
  console.log('[createProfileWithAccount] Step 1: Creating user profile for:', { authId, email });
  
  // Step 1: Create the user profile
  const { data: newProfile, error: profileError } = await supabase
    .from("users")
    .insert({
      auth_id: authId,
      email: email,
      // Default app role for normal users (authors)
      role: "user",
    })
    .select()
    .single();
  
  console.log('[createProfileWithAccount] Profile creation result:', {
    success: !!newProfile,
    profileId: newProfile?.id,
    error: profileError?.message,
    errorCode: profileError?.code,
  });

  if (profileError) {
    // If multiple requests race to create the same profile, we can hit a unique
    // constraint violation on auth_id. In that case, fetch the existing row and
    // continue (idempotent profile creation).
    const code = (profileError as unknown as { code?: string }).code;
    if (code === "23505") {
      const { data: existingProfile } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authId)
        .single();

      if (existingProfile) {
        // Best-effort: also ensure there is an account, matching the normal flow.
        const { data: accountData } = await supabase
          .from("account_members")
          .select(
            `
            accounts (
              id,
              name,
              owner_user_id,
              created_at
            )
          `
          )
          .eq("user_id", existingProfile.id)
          .limit(1)
          .single();

        const account = (Array.isArray(accountData?.accounts)
          ? accountData?.accounts[0]
          : accountData?.accounts) as Account | null;

        if (account) {
          return {
            profile: existingProfile as UserProfile,
            account,
            error: null,
          };
        }

        const { account: newAccount, error: createError } = await createAccountOnly(
          supabase,
          existingProfile.id,
          existingProfile.email
        );

        return {
          profile: existingProfile as UserProfile,
          account: newAccount,
          error: createError,
        };
      }
    }

    console.error("Profile creation error:", JSON.stringify(profileError, null, 2));
    return {
      profile: null,
      account: null,
      error: "Failed to create profile. Please try again.",
    };
  }

  // Step 2: Create the default account using Secure RPC
  // This bypasses RLS issues and ensures atomicity (account + membership created together)
  const accountName = email.split("@")[0] + "'s Account";
  console.log('[createProfileWithAccount] Step 2: Creating account via RPC:', { accountName, ownerId: newProfile.id });
  
  const { data: newAccounts, error: rpcError } = await supabase.rpc('create_default_account', {
    p_name: accountName,
    p_owner_id: newProfile.id
  });

  if (rpcError) {
    console.error("Account creation RPC error:", JSON.stringify(rpcError, null, 2));
    // Try to clean up user
    await supabase.from("users").delete().eq("id", newProfile.id);
    return {
      profile: null,
      account: null,
      error: "Failed to create account. Please try again.",
    };
  }

  // RPC returns an array (SETOF), take the first one
  const newAccount = (newAccounts && newAccounts.length > 0) ? newAccounts[0] : null;

  if (!newAccount) {
    console.error("Account creation RPC returned no data");
     // Try to clean up user
    await supabase.from("users").delete().eq("id", newProfile.id);
    return {
      profile: null,
      account: null,
      error: "Account creation failed (no data returned).",
    };
  }
  
  console.log('[createProfileWithAccount] RPC success:', { accountId: newAccount.id });

  // Step 3: Log the account creation audit event
  await createAuditLog(supabase, {
    accountId: newAccount.id,
    userId: newProfile.id,
    action: "account_created",
    entityType: "account",
    entityId: newAccount.id,
    metadata: {
      account_name: accountName,
      is_default_account: true,
    },
  });

  return {
    profile: newProfile as UserProfile,
    account: newAccount as Account,
    error: null,
  };
}

/**
 * Internal helper to create only an account and membership for an existing user
 */
async function createAccountOnly(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<{
  account: Account | null;
  error: string | null;
}> {
  // Step 1: Create the default account using Secure RPC
  // This bypasses RLS issues and ensures atomicity (account + membership created together)
  const accountName = email.split("@")[0] + "'s Account";
  console.log('[createAccountOnly] Creating account via RPC:', { accountName, ownerId: userId });
  
  const { data: newAccounts, error: rpcError } = await supabase.rpc('create_default_account', {
    p_name: accountName,
    p_owner_id: userId
  });

  if (rpcError) {
    console.error("Account creation RPC error:", JSON.stringify(rpcError, null, 2));
    return {
      account: null,
      error: "Failed to create account. Please try again.",
    };
  }

  // RPC returns an array (SETOF), take the first one
  const newAccount = (newAccounts && newAccounts.length > 0) ? newAccounts[0] : null;

  if (!newAccount) {
    console.error("Account creation RPC returned no data");
    return {
      account: null,
      error: "Account creation failed (no data returned).",
    };
  }
  
  console.log('[createAccountOnly] RPC success:', { accountId: newAccount.id });

  // Step 2: Log the audit event (we do this outside the RPC for now as audit logging is less critical)
  await createAuditLog(supabase, {
    accountId: newAccount.id,
    userId: userId,
    action: "account_created",
    entityType: "account",
    entityId: newAccount.id,
    metadata: {
      account_name: accountName,
      is_default_account: true,
    },
  });

  return {
    account: newAccount as Account,
    error: null,
  };
}

/**
 * Update user profile
 */
export async function updateProfile(
  supabase: SupabaseClient,
  authId: string,
  updates: Partial<Pick<UserProfile, "display_name" | "pen_name">>
): Promise<{ profile: UserProfile | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("users")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("auth_id", authId)
      .select()
      .single();

    if (error) {
      console.error("Profile update error:", error);
      return {
        profile: null,
        error: "Failed to update profile. Please try again.",
      };
    }

    return {
      profile: data as UserProfile,
      error: null,
    };
  } catch (err) {
    console.error("Profile update service error:", err);
    return {
      profile: null,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get user profile by user ID (internal)
 */
export async function getProfileById(
  supabase: SupabaseClient,
  userId: string
): Promise<{ profile: UserProfile | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Profile fetch error:", error);
      return {
        profile: null,
        error: "Failed to load profile.",
      };
    }

    return {
      profile: data as UserProfile,
      error: null,
    };
  } catch (err) {
    console.error("Profile service error:", err);
    return {
      profile: null,
      error: "An unexpected error occurred.",
    };
  }
}

