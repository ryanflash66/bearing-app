
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client (bypasses RLS)
const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runTest() {
  console.log("🧪 Testing Support Agent Restrictions...");
  
  let authorId: string | undefined, supportId: string | undefined;
  let publicAuthorId: string | undefined, publicSupportId: string | undefined;
  let accountId: string | undefined;
  let manuscriptId: string | undefined;

  try {
    // 1. Create Author
    const authorEmail = `test_author_${Date.now()}@example.com`;
    const { data: authorUser, error: authorError } = await adminClient.auth.admin.createUser({
      email: authorEmail,
      password: 'password123',
      email_confirm: true
    });
    if (authorError) throw authorError;
    authorId = authorUser.user.id;
    console.log(`Created Author: ${authorId}`);

    // Update Author Role via DB (just to be sure, default is user/author)
    // Actually, migration set default 'user'.
    
    // Create Manuscript for Author (using admin client to insert, simulating author creation)
    // We need 'account_id'. Get the account created for the user.
    // The previous architecture implies accounts are created... 
    // If triggers aren't set up to create account, I might need to create it manually.
    // Let's check if 'accounts' has a row for this owner.
    
    // Manually create public user (since triggers might be absent/slow)
    console.log("Creating Public User record...");
    const { data: publicUser, error: pubError } = await adminClient.from('users').insert({
        auth_id: authorId,
        email: authorEmail,
        display_name: 'Test Author',
        role: 'user' // Default to user
    }).select().single();
    
    if (pubError) throw pubError;
    const publicAuthorId = publicUser.id;
    console.log("Created Public Author ID:", publicAuthorId);

    // Check if account already exists (unlikely for new user)
    // ... create account ...
    console.log("Creating Account...");
    const { data: account, error: accError } = await adminClient.from('accounts').insert({
        name: 'Author Account',
        owner_user_id: publicAuthorId
    }).select().single();
    
    if (accError) throw accError;
    accountId = account.id;
    console.log("Using Account:", accountId);

    // Ensure Author is member of the account
    console.log("Adding Author to Account Members...");
    const { error: memberError } = await adminClient.from('account_members').upsert({
        account_id: accountId,
        user_id: publicAuthorId,
        account_role: 'admin' // Owner is admin usually
    });
    if (memberError) throw memberError;

    const { data: manuscript, error: manError } = await adminClient.from('manuscripts').insert({
        account_id: accountId,
        owner_user_id: publicAuthorId,
        title: 'Secret Book',
        content_text: 'Sensitive info'
    }).select().single();
    
    if (manError) throw manError;
    manuscriptId = manuscript.id;
    console.log(`Created Manuscript: ${manuscriptId}`);

    // 2. Create Support Agent
    const supportEmail = `test_support_${Date.now()}@example.com`;
    const { data: supportUser, error: supportError } = await adminClient.auth.admin.createUser({
      email: supportEmail,
      password: 'password123',
      email_confirm: true
    });
    if (supportError) throw supportError;
    supportId = supportUser.user.id;
    console.log(`Created Support Agent: ${supportId}`);
    
    // Manually create public support user
    console.log("Creating Public Support User...");
    const { data: publicSupportUser, error: pubSuppError } = await adminClient.from('users').insert({
        auth_id: supportId,
        email: supportEmail,
        display_name: 'Test Support',
        role: 'support_agent'
    }).select().single();

    if (pubSuppError) throw pubSuppError;
    publicSupportId = publicSupportUser.id;
    console.log("Created Public Support Agent ID:", publicSupportId);
    
    // Validate role is set (implicit from insert)

    // 3. Test Author Access (Positive Control)
    console.log("Testing Author access...");
    const { data: loginDataAuthor, error: loginErrorAuthor } = await adminClient.auth.signInWithPassword({
        email: authorEmail,
        password: 'password123'
    });
    if (loginErrorAuthor) throw loginErrorAuthor;

    const authorClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${loginDataAuthor.session.access_token}` } }
    });

    const { data: readSelf, error: readSelfError } = await authorClient
        .from('manuscripts')
        .select('*')
        .eq('id', manuscriptId)
        .single();

    if (readSelfError) throw new Error(`❌ Author failed to read own manuscript: ${readSelfError.message}`);
    console.log("✅ Author successfully read own manuscript.");

    // 4. Test Support Access (Negative Control)
    // Login as Support Agent
    const { data: loginData, error: loginError } = await adminClient.auth.signInWithPassword({
        email: supportEmail,
        password: 'password123'
    });
    if (loginError) throw loginError;
    
    const supportClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${loginData.session.access_token}` } }
    });

    console.log("Trying to read manuscript as Support Agent...");
    const { data: readData, error: readError } = await supportClient
        .from('manuscripts')
        .select('*')
        .eq('id', manuscriptId);
    
    if (readError) {
        console.log("Received Error (Expected?):", readError.message);
    }
    
    if (readData && readData.length > 0) {
        throw new Error(`❌ FAIL: Support Agent successfully read manuscript: ${JSON.stringify(readData)}`);
    } else {
        console.log("✅ SUCCESS: Support Agent could NOT see the manuscript (0 rows returned).");
    }

  } catch (err: any) {
    console.error("❌ Unexpected Error:", err);
    process.exit(1);
  } finally {
      // Cleanup in correct order: public data first, then auth users
      console.log("Cleaning up test data...");
      try {
        if (manuscriptId) await adminClient.from('manuscripts').delete().eq('id', manuscriptId);
        if (accountId) {
          await adminClient.from('account_members').delete().eq('account_id', accountId);
          await adminClient.from('accounts').delete().eq('id', accountId);
        }
        if (publicAuthorId) await adminClient.from('users').delete().eq('id', publicAuthorId);
        if (publicSupportId) await adminClient.from('users').delete().eq('id', publicSupportId);
        if (authorId) await adminClient.auth.admin.deleteUser(authorId);
        if (supportId) await adminClient.auth.admin.deleteUser(supportId);
        console.log("Cleanup complete.");
      } catch (cleanupErr: any) {
        console.warn("Cleanup warning:", cleanupErr.message);
      }
  }
}

async function getPublicUserId(authId: string) {
    // Retry loop in case trigger is slow
    for(let i=0; i<5; i++) {
        const { data } = await adminClient.from('users').select('id').eq('auth_id', authId).maybeSingle();
        if (data) return data.id;
        await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error(`Public user not found for auth_id: ${authId}`);
}

runTest();
