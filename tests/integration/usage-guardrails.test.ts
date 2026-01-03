/**
 * @jest-environment node
 */
import { createClient } from "@supabase/supabase-js";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { getOrCreateOpenBillingCycle, logUsageEvent, checkUsageLimit, MONTHLY_TOKEN_CAP } from "@/lib/ai-usage";
import { createAccount } from "@/lib/account";
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Mock Supabase Setup (or use real test DB env if available)
// For integration, we prefer real DB calls if we have a test environment.
// Assuming process.env.NEXT_PUBLIC_SUPABASE_URL is available via jest.setup.js or .env.test.local

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// We need a Service Role client to create users/accounts directly without auth flow
// Use SUPABASE_SERVICE_ROLE_KEY if available, else fail gracefully or mock
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey; 
const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

describe("Usage Guardrails Integration (Story 4.1)", () => {
  let testUserId: string;
  let testAccountId: string;

  beforeAll(async () => {
    // 1. Create a Test User (Simulated)
    // In real integration, we'd use admin auth.signUp or similar.
    // For this test, we might just insert directly if we have access, or assume a user exists.
    // Let's create a dummy user ID for the FK constraints if they exist.
    // If strict FKs are on public.users, we need a real user.
    
    // Fallback: Use a known test user from previous setup or skip user creation if rls disabled for service role
    // Assuming simple RLS bypass for service role
    
    // Actually, account creation needs a real user ID usually.
    // Let's rely on a UUID that we insert into public.users if possible, or use the existing "ryanflash166" user for safety? No, that's brittle.
    
    // Let's just generate a UUID and hope our test DB allows inserts or mocking.
    // Given the constraints, let's focus on the *logic* of the PL/pgSQL function.
    
    const { data: user, error: userError } = await adminSupabase.auth.admin.createUser({
      email: `test_guardrails_${Date.now()}@example.com`,
      password: "password123",
      email_confirm: true
    });
    
    if (userError || !user.user) {
        throw new Error("Failed to create test user: " + userError?.message);
    }
    testUserId = user.user.id;

    // Create a public profile for FKs
    await adminSupabase.from("users").insert({ id: testUserId, auth_id: testUserId, email: user.user.email, display_name: "Test User" });

    // 2. Create Test Account
    const { account, error } = await createAccount(adminSupabase, "Guardrails Test Account", testUserId);
    if (error || !account) throw new Error("Failed to create test account");
    testAccountId = account.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testAccountId) {
        await adminSupabase.from("ai_usage_events").delete().eq("account_id", testAccountId);
        await adminSupabase.from("billing_cycles").delete().eq("account_id", testAccountId);
        await adminSupabase.from("account_members").delete().eq("account_id", testAccountId);
        await adminSupabase.from("accounts").delete().eq("id", testAccountId);
    }
    if (testUserId) {
        await adminSupabase.from("users").delete().eq("id", testUserId);
        await adminSupabase.auth.admin.deleteUser(testUserId);
    }
  });

  it("should start in good_standing", async () => {
    const { data: account } = await adminSupabase.from("accounts").select("*").eq("id", testAccountId).single();
    expect(account.usage_status).toBe("good_standing");
    expect(account.consecutive_overage_months).toBe(0);
  });

  it("should flag account after first month of overage", async () => {
    // 1. Log heavy usage
    const cycle = await getOrCreateOpenBillingCycle(adminSupabase, testAccountId);
    
    // Insert failing usage (11M tokens)
    await adminSupabase.from("ai_usage_events").insert({
        account_id: testAccountId,
        user_id: testUserId,
        cycle_id: cycle.id,
        feature: "test_bulk",
        model: "test_model",
        tokens_estimated: 11_000_000,
        tokens_actual: 11_000_000
    });

    // 2. Trigger Cycle Rollover (Postgres function)
    const { data: result, error } = await adminSupabase.rpc("process_billing_cycle", { target_account_id: testAccountId });
    
    expect(error).toBeNull();
    expect(result.new_account_status).toBe("flagged");

    // 3. Verify DB state
    const { data: account } = await adminSupabase.from("accounts").select("*").eq("id", testAccountId).single();
    expect(account.usage_status).toBe("flagged");
    expect(account.consecutive_overage_months).toBe(1);
  });

  it("should trigger upsell_required after second consecutive month of overage", async () => {
    // 1. New cycle started automatically by previous test step
    const cycle = await getOrCreateOpenBillingCycle(adminSupabase, testAccountId);

    // 2. Log heavy usage again
     await adminSupabase.from("ai_usage_events").insert({
        account_id: testAccountId,
        user_id: testUserId,
        cycle_id: cycle.id,
        feature: "test_bulk_2",
        model: "test_model",
        tokens_estimated: 11_000_000,
        tokens_actual: 11_000_000
    });

    // 3. Trigger Rollover
    const { data: result, error } = await adminSupabase.rpc("process_billing_cycle", { target_account_id: testAccountId });

    expect(error).toBeNull();
    expect(result.new_account_status).toBe("upsell_required");

    // 4. Verify DB State
    const { data: account } = await adminSupabase.from("accounts").select("*").eq("id", testAccountId).single();
    expect(account.usage_status).toBe("upsell_required");
    expect(account.consecutive_overage_months).toBe(2);
  });

  it("should block usage when status is upsell_required", async () => {
    // Expect checkUsageLimit to throw
    await expect(checkUsageLimit(adminSupabase, testAccountId, 100))
        .rejects
        .toThrow("Please upgrade to Pro");
  });

  it("should reset to good_standing if usage drops in third month", async () => {
     // 1. Current status is upsell_required. New cycle open.
     // 2. Don't log any usage (0 < 10M)
     
     // 3. Trigger Rollover
    const { data: result, error } = await adminSupabase.rpc("process_billing_cycle", { target_account_id: testAccountId });
    
    expect(error).toBeNull();
    expect(result.new_account_status).toBe("good_standing");
     
     // 4. Verify DB
    const { data: account } = await adminSupabase.from("accounts").select("*").eq("id", testAccountId).single();
    expect(account.usage_status).toBe("good_standing");
    expect(account.consecutive_overage_months).toBe(0);
  });

});
