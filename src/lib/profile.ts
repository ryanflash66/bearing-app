import { SupabaseClient } from "@supabase/supabase-js";
import { createAuditLog } from "./auditLog";

export interface UserProfile {
  id: string;
  auth_id: string;
  email: string;
  display_name: string | null;
  pen_name: string | null;
  role: "author" | "admin" | "support";
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
    
    // Try to fetch existing profile
    const { data: existingProfile, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", authId)
      .single();
    
    console.log('[getOrCreateProfile] Profile fetch result:', {
      found: !!existingProfile,
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
      role: "author",
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
    console.error("Profile creation error:", JSON.stringify(profileError, null, 2));
    return {
      profile: null,
      account: null,
      error: "Failed to create profile. Please try again.",
    };
  }

  // Step 2: Create the default account
  const accountName = email.split("@")[0] + "'s Account";
  console.log('[createProfileWithAccount] Step 2: Creating account:', { accountName, ownerId: newProfile.id });
  
  const { data: newAccount, error: accountError } = await supabase
    .from("accounts")
    .insert({
      name: accountName,
      owner_user_id: newProfile.id,
    })
    .select()
    .single();
  
  console.log('[createProfileWithAccount] Account creation result:', {
    success: !!newAccount,
    accountId: newAccount?.id,
    error: accountError?.message,
    errorCode: accountError?.code,
  });

  if (accountError) {
    console.error("Account creation error:", JSON.stringify(accountError, null, 2));
    // Try to clean up the user we created
    await supabase.from("users").delete().eq("id", newProfile.id);
    return {
      profile: null,
      account: null,
      error: "Failed to create account. Please try again.",
    };
  }

  // Step 3: Create the account membership (user as admin of their own account)
  console.log('[createProfileWithAccount] Step 3: Creating account membership:', {
    accountId: newAccount.id,
    userId: newProfile.id,
  });
  
  const { error: memberError } = await supabase
    .from("account_members")
    .insert({
      account_id: newAccount.id,
      user_id: newProfile.id,
      account_role: "admin",
    });
  
  console.log('[createProfileWithAccount] Membership creation result:', {
    success: !memberError,
    error: memberError?.message,
    errorCode: memberError?.code,
  });

  if (memberError) {
    console.error("Membership creation error:", JSON.stringify(memberError, null, 2));
    // Try to clean up
    await supabase.from("accounts").delete().eq("id", newAccount.id);
    await supabase.from("users").delete().eq("id", newProfile.id);
    return {
      profile: null,
      account: null,
      error: "Failed to set up account membership. Please try again.",
    };
  }

  // Step 4: Log the account creation audit event
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
  // Step 1: Create the default account
  const accountName = email.split("@")[0] + "'s Account";
  console.log('[createAccountOnly] Creating account:', { accountName, ownerId: userId });
  
  const { data: newAccount, error: accountError } = await supabase
    .from("accounts")
    .insert({
      name: accountName,
      owner_user_id: userId,
    })
    .select()
    .single();
  
  if (accountError) {
    console.error("Account creation error:", JSON.stringify(accountError, null, 2));
    return {
      account: null,
      error: "Failed to create account. Please try again.",
    };
  }

  // Step 2: Create the account membership
  console.log('[createAccountOnly] Creating account membership:', {
    accountId: newAccount.id,
    userId: userId,
  });
  
  const { error: memberError } = await supabase
    .from("account_members")
    .insert({
      account_id: newAccount.id,
      user_id: userId,
      account_role: "admin",
    });
  
  if (memberError) {
    console.error("Membership creation error:", JSON.stringify(memberError, null, 2));
    // Try to clean up
    await supabase.from("accounts").delete().eq("id", newAccount.id);
    return {
      account: null,
      error: "Failed to set up account membership. Please try again.",
    };
  }

  // Step 3: Log the account creation audit event
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

