
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getLlamaSuggestion } from '../src/lib/llama';
import { processConsistencyCheckJob } from '../src/lib/gemini';
import { logUsageEvent } from '../src/lib/ai-usage';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const EMAIL = `perf_test_${Date.now()}@example.com`;
const PASSWORD = 'password123';

async function runPerfTest() {
  console.log('⏱️  Starting Performance Instrumentation Test...');
  let userId;

  try {
    // 1. Setup User & Account
    console.log('Creating test user...');
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true
    });
    if (userError) throw userError;
    userId = userData.user.id;

    // Sign in to get access token
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
        email: EMAIL,
        password: PASSWORD
    });
    if (signInError) throw signInError;

    // Create Authenticated Client
    const userClient = createClient(SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } }
    });

    // Create Profile (using user client)
    const { error: profileError } = await userClient.from('users').insert({ auth_id: userId, email: EMAIL, role: 'author' });
    if (profileError) throw profileError;

    const { data: profile } = await userClient.from('users').select('id').eq('auth_id', userId).single();
    
    // Create Default Account (using user client)
    const { data: accountData, error: accountError } = await userClient.rpc('create_default_account', {
        p_name: 'Perf Test Account',
        p_owner_id: profile.id
    });
    if (accountError) throw accountError;
    const accountId = accountData[0].id;
    console.log(`Created Account: ${accountId}`);

    // Create Manuscript
    const { data: manuscript, error: manuscriptError } = await userClient.from('manuscripts').insert({
        title: 'Perf Test Manuscript',
        content_text: 'The quick brown fox jumps over the lazy dog.',
        account_id: accountId,
        owner_user_id: profile.id
    }).select().single();
    if (manuscriptError) throw manuscriptError;

    // 2. Call Llama Suggestion (Wrapped Function)
    console.log('Calling getLlamaSuggestion...');
    process.env.NODE_ENV = 'test';

    const request = {
        selectionText: 'The fox jumped.',
        instruction: 'Make it more exciting.',
        manuscriptId: manuscript.id
    };

    const startTime = performance.now();
    // Pass userClient to the service function
    await getLlamaSuggestion(userClient, request, profile.id);
    const duration = performance.now() - startTime;
    console.log(`Llama call took ${Math.round(duration)}ms`);

    // 3. Verify Log (using admin client to bypass RLS if needed, or userClient)
    // We want to verify it exists. User client should be able to read own events if RLS works.
    console.log('Verifying Usage Log...');
    
    const { data: events, error: logError } = await userClient
        .from('ai_usage_events')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(1);

    if (logError) throw logError;

    if (events && events.length > 0) {
        const event = events[0];
        console.log('Event found:', {
            feature: event.feature,
            latency_ms: event.latency_ms,
            tokens_actual: event.tokens_actual
        });

        if (event.latency_ms > 0) {
            console.log('✅ PASS: Latency recorded successfully.');
        } else {
            console.error('❌ FAIL: Latency is 0 or null.');
        }
    } else {
        console.error('❌ FAIL: No usage event found.');
    }

  } catch (error) {
    console.error('Test Failed:', error);
  } finally {
    // Cleanup
    if (userId) await supabase.auth.admin.deleteUser(userId);
  }
}

runPerfTest();
