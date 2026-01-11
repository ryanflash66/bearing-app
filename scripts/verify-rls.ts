
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------

async function createTestUserAndClient(
    adminClient: SupabaseClient, 
    emailPrefix: string, 
    role: 'user' | 'support_agent' = 'user'
) {
    const email = `${emailPrefix}_${Date.now()}@example.com`;
    const password = 'password123';

    // Auth user
    const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });
    if (error) throw error;
    const user = data.user;

    // Public profile via service role
    const { error: profileErr } = await adminClient.from('users').insert({
        auth_id: user.id,
        email,
        role,
    });
    if (profileErr) throw profileErr;

    // Single anon client for sign-in and downstream calls
    const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: sessionData, error: signInErr } =
        await anonClient.auth.signInWithPassword({ email, password });
    if (signInErr) throw signInErr;
    if (!sessionData.session) throw new Error('No session created');

    const token = sessionData.session.access_token;
    
    // Optional debug logging (safe)
    if (process.env.AUDIT_DEBUG === 'true') {
        console.log(`Debug: User ${email} signed in. Token prefix: ${token.substring(0, 10)}...`);
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
    });

    return { user, client: userClient };
}

async function createTicketForUser(client: SupabaseClient, profileId: string) {
    const { data, error } = await client
        .from('support_tickets')
        .insert({
            user_id: profileId,
            subject: 'Test Ticket',
            priority: 'medium',
            status: 'open',
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function getAccountIdForOwner(
  client: SupabaseClient,
  ownerUserId: string,
) {
  const { data: accountData, error: accountErr } = await client.rpc(
    'create_default_account',
    { p_name: 'A Corp', p_owner_id: ownerUserId },
  );
  if (accountErr) throw accountErr;

  if (accountData?.length) return accountData[0].id;

  const { data: accountFetch } = await client
    .from('accounts')
    .select('id')
    .eq('owner_user_id', ownerUserId)
    .single();

  if (!accountFetch) throw new Error('Account creation failed or not found');
  return accountFetch.id;
}

// ------------------------------------------------------------------
// TESTS
// ------------------------------------------------------------------

async function testAdminCanReadUserMessages(
  adminClient: SupabaseClient,
  createdUsers: User[],
) {
  console.log('\n👮 Testing Admin Access...');

  const { user: adminUser, client: adminUserClient } =
    await createTestUserAndClient(adminClient, 'admin_check', 'support_agent');
  createdUsers.push(adminUser);

  const { user: endUser, client: endUserClient } =
    await createTestUserAndClient(adminClient, 'user_check', 'user');
  createdUsers.push(endUser);

  // Get User Profile
  const { data: endUserProfile, error: profileErr } = await endUserClient
    .from('users')
    .select('id')
    .eq('auth_id', endUser.id)
    .single();
  if (profileErr || !endUserProfile) throw profileErr ?? new Error('Profile missing');

  // User Creates Ticket
  const ticket = await createTicketForUser(endUserClient, endUserProfile.id);

  // User Sends Message
  const { error: msgErr } = await endUserClient.rpc('reply_to_ticket', {
      ticket_id: ticket.id,
      content: 'Hello Support',
  });
  if (msgErr) throw msgErr;

  // Verify Admin Access
  const { data: adminView, error: adminErr } = await adminUserClient
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .single();

  if (adminView) {
      console.log('✅ PASS: Admin can read user message.');
  } else {
      console.error('❌ FAIL: Admin cannot read message:', adminErr);
      throw new Error('Admin RLS check failed');
  }
}

async function runAudit() {
    console.log('🔒 Starting Cross-Account Security Audit...');
    
    // Clean state tracking
    const createdUsers: User[] = [];

    // Admin client for setup/teardown
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    try {
        // 1. Isolation Test (User A vs User B)
        console.log('\n🕵️  Testing Isolation (User B vs User A)...');
        const setupA = await createTestUserAndClient(adminClient, 'audit_a');
        createdUsers.push(setupA.user);
        const { user: userA, client: clientA } = setupA;

        const setupB = await createTestUserAndClient(adminClient, 'audit_b');
        createdUsers.push(setupB.user);
        const { user: userB, client: clientB } = setupB;

        // User A creates resources
        const { data: profileA } = await clientA.from('users').select('id').eq('auth_id', userA.id).single();
        if (!profileA) throw new Error("Profile A missing");

        const accountId = await getAccountIdForOwner(clientA, profileA.id);
        console.log(`Debug: User A Account ID: ${accountId}`);

         // Manuscript
         const { data: msA, error: msErr } = await clientA.from('manuscripts').insert({
             title: 'Secret MS', 
             content_text: '...', 
             owner_user_id: profileA.id, 
             account_id: accountId
         }).select().single();
         
         if (msErr) {
             console.error("Debug: Manuscript Insert Error:", msErr);
             throw msErr;
         }
         console.log(`User A created Manuscript ${msA.id}`);

         // User B tries to read
         const { data: leak, error: leakErr } = await clientB.from('manuscripts').select('*').eq('id', msA.id).single();
         if (!leak && leakErr?.code === 'PGRST116') {
             console.log('✅ PASS: User B cannot see Manuscript A');
         } else {
             console.error('❌ FAIL: Leak detected', leak);
             process.exit(1);
         }

         // 2. Admin Access Test
         await testAdminCanReadUserMessages(adminClient, createdUsers);
         
         // 3. Performance Metrics
         console.log('\n📊 Checking AI Usage Latency Metrics...');
         const { data: metrics } = await adminClient.from('ai_usage_events').select('feature, latency_ms').limit(5);
         if (metrics) console.table(metrics);

    } catch (err) {
        console.error('Detailed Error:', err);
        process.exit(1);
    } finally {
        console.log('\n🧹 Cleaning up...');
        for (const u of createdUsers) {
            await adminClient.auth.admin.deleteUser(u.id);
        }
    }
}

runAudit().catch(e => {
    console.error("Unhandled Script Error:", e);
    process.exit(1);
});
