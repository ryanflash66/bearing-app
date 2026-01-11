
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

// Create a FRESH Service Role Client for each major operation to avoid state pollution
// (Helper removed - using direct createClient inside runAudit to ensure fresh instance)

async function createTestUserAndClient(
    adminClient: SupabaseClient, 
    emailPrefix: string, 
    role: 'user' | 'support_agent' = 'user'
) {
    const email = `${emailPrefix}_${Date.now()}@example.com`;
    const password = 'password123';

    // 1. Create Auth User
    const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });
    if (error) throw error;
    const user = data.user;

    // 2. Create Public Profile
    // Use adminClient (Service Role) to bypass RLS for role assignment
    const { error: profileErr } = await adminClient.from('users').insert({
        auth_id: user.id,
        email,
        role
    });
    if (profileErr) throw profileErr;

    // 3. Create Session-based CLIENT for this user
    // We do NOT use adminClient to sign in, as that pollutes the admin client state.
    // Instead, we use signInWithPassword on a fresh anon client OR just use the returned session if we could.
    // Supabase JS 'signInWithPassword' requires a client. 
    // We will create a discrete client for the user.
    
    // To sign in, we need a client. We can use a temporary client.
    const tempClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data: sessionData, error: signInErr } = await tempClient.auth.signInWithPassword({
        email,
        password
    });
    
    if (signInErr) throw signInErr;
    if (!sessionData.session) throw new Error("No session created");

    // 4. Return the user, and a client configured with their token
    console.log(`Debug: User ${email} signed in. Token prefix: ${sessionData.session.access_token.substring(0, 10)}...`);
    
    // Explicitly verify the client thinks it is authenticated
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } }
    });
    
    const { data: authCheck } = await userClient.auth.getUser();
    console.log(`Debug: Client Auth Check for ${email}: ${authCheck.user ? 'Authenticated' : 'Anon'}`);

    return { user, client: userClient };
}

async function createTicketForUser(client: SupabaseClient, userId: string) {
    // Need internal ID, but client likely knows it or we pass it.
    // Assuming profile creation succeeded, we need the internal ID.
    const { data: profile } = await client.from('users').select('id').eq('auth_id', userId).single();
    if (!profile) throw new Error("Profile not found for ticket creation");

    const { data, error } = await client
        .from('support_tickets')
        .insert({
            user_id: profile.id,
            subject: 'Test Ticket',
            priority: 'medium',
            status: 'open',
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ------------------------------------------------------------------
// TESTS
// ------------------------------------------------------------------

async function testAdminCanReadUserMessages(adminClient: SupabaseClient) {
    console.log('\n👮 Testing Admin Access...');
    
    let adminUser, adminUserClient, endUser, endUserClient;

    try {
        // Setup Admin
        const adminSetup = await createTestUserAndClient(adminClient, 'admin_check', 'support_agent');
        adminUser = adminSetup.user;
        adminUserClient = adminSetup.client;

        // Setup User
        const userSetup = await createTestUserAndClient(adminClient, 'user_check', 'user');
        endUser = userSetup.user;
        endUserClient = userSetup.client;

        // User Creates Ticket
        const ticket = await createTicketForUser(endUserClient, endUser.id);
        
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

    } finally {
        if (adminUser) await adminClient.auth.admin.deleteUser(adminUser.id);
        if (endUser) await adminClient.auth.admin.deleteUser(endUser.id);
        // Cascading deletes should handle profiles/tickets
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

        // RPC account
         const { data: accountData, error: accountErr } = await clientA.rpc('create_default_account', { p_name: 'A Corp', p_owner_id: profileA.id });
         if (accountErr) throw accountErr;
         
         let accountId;
         if (accountData && accountData.length > 0) {
             accountId = accountData[0].id;
             console.log(`Debug: User A Account ID from RPC: ${accountId}`);
         } else {
             // Fallback fetch
             const { data: accountFetch } = await clientA
                .from('accounts')
                .select('id')
                .eq('owner_user_id', profileA.id) // Fixed column name
                .single();
                
             if (!accountFetch) throw new Error("Account creation failed or not found");
             accountId = accountFetch.id;
             console.log(`Debug: User A Account ID from Fetch: ${accountId}`);
         }

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
         }

         // 2. Admin Access Test
         await testAdminCanReadUserMessages(adminClient);
         
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
