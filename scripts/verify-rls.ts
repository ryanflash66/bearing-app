
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Admin client for setup/teardown
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

const EMAIL_A = `audit_a_${Date.now()}@example.com`;
const EMAIL_B = `audit_b_${Date.now()}@example.com`;
const PASSWORD = 'password123';

async function runAudit() {
  console.log('🔒 Starting Cross-Account Security Audit...');

  let userA, userB;

  try {
    // 1. Create Test Users
    console.log('Creating test users...');
    const { data: dataA, error: errA } = await adminClient.auth.admin.createUser({
      email: EMAIL_A,
      password: PASSWORD,
      email_confirm: true
    });
    if (errA) throw errA;
    userA = dataA.user;

    const { data: dataB, error: errB } = await adminClient.auth.admin.createUser({
      email: EMAIL_B,
      password: PASSWORD,
      email_confirm: true
    });
    if (errB) throw errB;
    userB = dataB.user;

    console.log(`Created User A: ${userA.id}`);
    console.log(`Created User B: ${userB.id}`);

    // 2. Sign in as users to get limited clients
    const { data: sessionA } = await adminClient.auth.signInWithPassword({
        email: EMAIL_A,
        password: PASSWORD
    });
    const clientA = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${sessionA.session?.access_token}` } }
    });

    const { data: sessionB } = await adminClient.auth.signInWithPassword({
        email: EMAIL_B,
        password: PASSWORD
    });
    const clientB = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${sessionB.session?.access_token}` } }
    });

    // 3. Setup Data for User A
    console.log('Setting up profile and account for User A...');
    
    // Create profile for A (simulating client-side onboarding)
    const { error: profileAError } = await clientA
        .from('users')
        .insert({
            auth_id: userA.id,
            email: EMAIL_A,
            role: 'user'
        });
    if (profileAError) throw profileAError;

    // Fetch the internal user ID for A
    const { data: profileA, error: fetchAError } = await clientA
        .from('users')
        .select('id')
        .eq('auth_id', userA.id)
        .single();
    if (fetchAError) throw fetchAError;
    if (!profileA) throw new Error("Profile A creation failed");

    // Create account for A using RPC
    const { data: accountAData, error: rpcAError } = await clientA.rpc('create_default_account', {
        p_name: 'User A Account',
        p_owner_id: profileA.id
    });
    if (rpcAError) throw rpcAError;
    const accountAId = accountAData[0].id;
    console.log(`User A Account: ${accountAId}`);

    // Setup for User B (needed for consistency check logic later)
    console.log('Setting up profile and account for User B...');
    const { error: profileBError } = await clientB
        .from('users')
        .insert({
            auth_id: userB.id,
            email: EMAIL_B,
            role: 'user'
        });
    if (profileBError) throw profileBError;

    const { data: profileB } = await clientB
        .from('users')
        .select('id')
        .eq('auth_id', userB.id)
        .single();
    if (!profileB) throw new Error("Profile B creation failed");

    const { data: accountBData, error: rpcBError } = await clientB.rpc('create_default_account', {
        p_name: 'User B Account',
        p_owner_id: profileB!.id
    });
    if (rpcBError) throw rpcBError;
    const accountBId = accountBData[0].id;

    // User A creates a manuscript
    const { data: manuscriptA, error: msError } = await clientA
        .from('manuscripts')
        .insert({
            title: 'Secret Manuscript A',
            content_text: 'Confidential content',
            account_id: accountAId,
            owner_user_id: profileA.id
        })
        .select()
        .single();
    
    if(msError) throw msError;
    console.log(`User A created manuscript: ${manuscriptA.id}`);

    // User A creates a suggestion
    const { data: suggestionA, error: sugError } = await clientA
        .from('suggestions')
        .insert({
            manuscript_id: manuscriptA.id,
            request_hash: 'hash123',
            original_text: 'Confidential',
            suggested_text: 'Secret',
            created_by: profileA.id
        })
        .select()
        .single();
    
    if(sugError) throw sugError;
    console.log(`User A created suggestion: ${suggestionA.id}`);



    // 4. Test Leakage: User B tries to read User A's data
    console.log('\n🕵️  Testing Isolation (User B reads User A data)...');

    // Test 1: Manuscripts
    const { data: leakMs, error: leakMsErr } = await clientB
        .from('manuscripts')
        .select('*')
        .eq('id', manuscriptA.id)
        .single();
    
    if (!leakMs && leakMsErr && leakMsErr.code === 'PGRST116') {
        console.log('✅ PASS: User B cannot see Manuscript A (PGRST116: No rows found)');
    } else {
        console.error('❌ FAIL: User B could access Manuscript A or unexpected error:', leakMs, leakMsErr);
    }

    // Test 2: Suggestions
    const { data: leakSug, error: leakSugErr } = await clientB
        .from('suggestions')
        .select('*')
        .eq('id', suggestionA.id)
        .single();
    
    if (!leakSug && leakSugErr && leakSugErr.code === 'PGRST116') {
        console.log('✅ PASS: User B cannot see Suggestion A (PGRST116: No rows found)');
    } else {
        console.error('❌ FAIL: User B could access Suggestion A:', leakSug, leakSugErr);
    }

    // Test 3: Consistency Checks (Direct Insert Check)
    // User B tries to insert a check for User A's manuscript
    const { error: insertLeakErr } = await clientB
        .from('consistency_checks')
        .insert({
            manuscript_id: manuscriptA.id,
            input_hash: 'badhash',
            created_by: profileB.id
        });
    
    // Expect RLS violation (42501) or FK violation if filter hides the ID
    // Actually, on insert, check policy "exists (select 1 from manuscripts where ...)" should fail
    
    // Supabase RLS policies for INSERT with check usually return 42501 or 404-like behavior if the referencing row isn't visible
    if (insertLeakErr && (insertLeakErr.code === '42501' || insertLeakErr.code === '23503')) {
         console.log(`✅ PASS: User B cannot create consistency check for Manuscript A (Error: ${insertLeakErr.code})`);
    } else {
         console.error('❌ FAIL: User B could create consistency check for Manuscript A:', insertLeakErr);
    }

    // Verify Audit Logs
    console.log('\n🕵️  Verifying Audit Logs & Performance Metrics...');
    const { data: logs } = await adminClient
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
    
    console.log(`Found ${logs?.length} recent audit logs.`);

    // 5. Test Admin Access (Simulate Realtime RLS Check)
    console.log('\n👮 Testing Admin Access (Admin reads User A messages)...');
    
    // Create an admin user locally (User C)
    const EMAIL_C = `admin_${Date.now()}@example.com`;
    const { data: dataC, error: errC } = await adminClient.auth.admin.createUser({
      email: EMAIL_C,
      password: PASSWORD,
      email_confirm: true
    });
    if (errC) throw errC;
    const userC = dataC.user;
    
    // Create Admin Profile
    await adminClient.from('users').insert({
        auth_id: userC.id,
        email: EMAIL_C,
        role: 'support_agent' // Explicitly Support Agent
    });

    const { data: sessionC } = await adminClient.auth.signInWithPassword({
        email: EMAIL_C,
        password: PASSWORD
    });
    const clientC = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${sessionC.session?.access_token}` } }
    });

    // Create a support ticket and message as User A
    const { data: ticketA, error: tickErr } = await clientA
        .from('support_tickets')
        .insert({
            user_id: profileA.id,
            subject: 'Help me',
            description: 'I need help',
            priority: 'medium',
            status: 'open'
        })
        .select()
        .single();
    if(tickErr) throw tickErr;

    // We need to use the RPC to insert a message properly to populate denormalized fields
    // But for this test let's simulate a raw RLS check on SELECT
    // Insert message as User A using RPC (which we know works)
    await clientA.rpc('reply_to_ticket', { ticket_id: ticketA.id, content: 'User message' });

    // NOW: Can Admin (Client C) see it?
    const { data: adminMsg, error: adminMsgErr } = await clientC
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketA.id)
        .single();

    if (adminMsg) {
        console.log('✅ PASS: Admin CAN see User A support message');
    } else {
        console.error('❌ FAIL: Admin CANNOT see User A support message:', adminMsgErr);
    }
    
    // Cleanup Admin
    await adminClient.auth.admin.deleteUser(userC.id);



    // Verify Performance Metrics (Story H.3)
    const { data: metrics, error: metricsError } = await adminClient
        .from('ai_usage_events')
        .select('feature, latency_ms, tokens_actual')
        .not('latency_ms', 'is', null) // Check not null
        .order('created_at', { ascending: false })
        .limit(5);

    if (metricsError) {
        console.warn('⚠️  Could not fetch latency metrics (column might be missing):', metricsError.message);
    } else if (metrics && metrics.length > 0) {
        console.log('✅ Performance Metrics captured:');
        console.table(metrics);
    } else {
        console.warn('⚠️  No latency metrics found (or latency was 0/null).');
    }



  } catch (error) {
    console.error('Detailed Audit Error:', error);
  } finally {
    // Teardown
    console.log('\n🧹 Cleaning up...');
    if (userA) await adminClient.auth.admin.deleteUser(userA.id);
    if (userB) await adminClient.auth.admin.deleteUser(userB.id);
  }
}

runAudit();
