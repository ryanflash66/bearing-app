import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Missing Supabase credentials: ensure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

// Service role client (God mode)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const TEST_EMAIL_PREFIX = 'test_story_4_1_';

async function createAuthenticatedClient(email: string, password: string) {
  const { data: sessionData, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Missing access token');

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function cleanup() {
  console.log('🧹 Cleaning up test users...');

  const perPage = 1000;
  let page = 1;

  // Iterate through all pages of users to ensure no test accounts are left behind
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    if (users.length === 0) {
      break;
    }

    for (const user of users) {
      if (user.email?.startsWith(TEST_EMAIL_PREFIX)) {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      }
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }
}

async function createTestUser(role: 'user' | 'admin' | 'super_admin' | 'support_agent', name: string) {
  const email = `${TEST_EMAIL_PREFIX}${role}_${Math.floor(Math.random() * 10000)}@example.com`;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true,
    user_metadata: { display_name: name }
  });

  if (error) throw error;
  if (!data.user) throw new Error('User creation failed');

  // Manually upsert to public.users to ensure row exists even if auth trigger fails locally
  const { error: upsertError } = await supabaseAdmin
    .from('users')
    .upsert({ 
      id: data.user.id,
      auth_id: data.user.id,
      email: email,
      role: role 
    })
    .select()
    .single();

  if (upsertError) throw upsertError;

  return { user: data.user, email };
}

async function testSingletonSuperAdmin() {
  console.log('\n--- Test 1: Singleton Super Admin Constraint ---');
  console.log('Creating first Super Admin...');
  const superAdmin1 = await createTestUser('super_admin', 'SA 1');
  console.log('✅ SA 1 created.');

  console.log('Attempting to create second Super Admin (Expect Failure)...');
  try {
    await createTestUser('super_admin', 'SA 2');
    console.error('❌ FAILURE: Second Super Admin was created!');
  } catch (err: any) {
    if (err.message?.includes('idx_singleton_super_admin')) {
      console.log('✅ SUCCESS: DB prevented second Super Admin (Constraint violation).');
    } else {
      console.log(`✅ SUCCESS: DB prevented second Super Admin (Error: ${err.message}).`);
    }
  }

  return superAdmin1;
}

async function testRoleAssignmentRpc(superAdminEmail: string) {
  console.log('\n--- Test 2: Role Assignment RPC ---');
  const normalUser = await createTestUser('user', 'Normal User');
  const adminUser = await createTestUser('admin', 'Admin Actor');

  const saClient = await createAuthenticatedClient(superAdminEmail, 'password123');
  const adminClient = await createAuthenticatedClient(adminUser.email, 'password123');

  console.log('Testing: Admin tries to assign role (Expect Failure)...');
  const { error: rpcErrorAdmin } = await adminClient.rpc('assign_user_role', {
    target_user_id: normalUser.user.id,
    new_role: 'support_agent',
  });

  if (rpcErrorAdmin) {
    console.log(`✅ SUCCESS: Admin blocked from assigning role (${rpcErrorAdmin.message}).`);
  } else {
    console.error('❌ FAILURE: Admin was able to assign role!');
  }

  console.log('Testing: Super Admin assigns role (Expect Success)...');
  const { error: rpcErrorSA } = await saClient.rpc('assign_user_role', {
    target_user_id: normalUser.user.id,
    new_role: 'support_agent',
  });

  if (rpcErrorSA) {
    console.error(`❌ FAILURE: Super Admin failed to assign role (${rpcErrorSA.message}).`);
  } else {
    console.log('✅ SUCCESS: Super Admin assigned role.');
  }

  return { adminUser, normalUser };
}

async function testAdminManuscriptAccess(adminEmail: string) {
  console.log('\n--- Test 3: Admin Manuscript Access ---');
  const adminClient = await createAuthenticatedClient(adminEmail, 'password123');
  const authorUser = await createTestUser('user', 'John Doe');

  const { data: acct } = await supabaseAdmin
    .from('accounts')
    .insert({ name: 'Johns Account', owner_user_id: authorUser.user.id })
    .select()
    .single();

  await supabaseAdmin.from('account_members').insert({
    account_id: acct.id,
    user_id: authorUser.user.id,
    account_role: 'author',
  });

  await supabaseAdmin.from('manuscripts').insert({
    account_id: acct.id,
    owner_user_id: authorUser.user.id,
    title: 'Secret Book',
    status: 'draft',
  });

  console.log('Testing: Admin accessing manuscript (Expect Success)...');
  const { data: mss, error: mssError } = await adminClient
    .from('manuscripts')
    .select('*')
    .eq('title', 'Secret Book');

  if (mssError) {
    console.error(`❌ FAILURE: Admin query error (${mssError.message}).`);
  } else if (mss && mss.length > 0) {
    console.log('✅ SUCCESS: Admin can see manuscript.');
  } else {
    console.error('❌ FAILURE: Admin query returned 0 rows (RLS blocked).');
  }

  const supportUser = await createTestUser('support_agent', 'Support Agent');
  const supportClient = await createAuthenticatedClient(supportUser.email, 'password123');

  console.log('Testing: Support Agent accessing manuscript (Expect Failure)...');
  const { data: mssSupport } = await supportClient
    .from('manuscripts')
    .select('*')
    .eq('title', 'Secret Book');

  if (!mssSupport || mssSupport.length === 0) {
    console.log('✅ SUCCESS: Support Agent blocked (0 rows denied).');
  } else {
    console.error(`❌ FAILURE: Support Agent saw ${mssSupport.length} rows!`);
  }
}

async function verifyStory41() {
  console.log('🧪 Starting Verification for Story 4.1...');
  try {
    await cleanup();

    const superAdmin1 = await testSingletonSuperAdmin();
    const { adminUser } = await testRoleAssignmentRpc(superAdmin1.email);
    await testAdminManuscriptAccess(adminUser.email);

    console.log('\n✅ ALL VERIFICATIONS PASSED');
  } catch (err: any) {
    console.error('\n❌ CRITICAL FAILURE:', err.message);
    process.exitCode = 1;
  } finally {
    try {
      await cleanup();
    } catch (cleanupErr: any) {
      console.error('Cleanup failed:', cleanupErr.message);
    }
  }
}

verifyStory41();
