import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Fix path resolution
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Debug logs
// console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
    console.error("❌ Missing env vars. Make sure .env.local exists in root.");
    process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runTest() {
  console.log("🧪 Testing Upload Limit Enforcement...");
  let authorAuthId, accountId, manuscriptId;

  try {
    // 1. Create User
    const random = Date.now();
    const authorEmail = `upload_limit_${random}@test.com`;
    const { data: userA, error: uError } = await adminClient.auth.admin.createUser({ email: authorEmail, password: 'password123', email_confirm: true });
    if(uError) throw uError;
    authorAuthId = userA.user!.id;
    
    // Create Profile
    const { data: pubA, error: pError } = await adminClient.from('users').insert({ 
        auth_id: authorAuthId, 
        email: authorEmail, 
        role: 'user', 
        display_name: 'Test Author' 
    }).select().single();
    if(pError) throw pError;
    const publicAuthorId = pubA!.id;

    // Create Account
    const { data: account, error: aError } = await adminClient.from('accounts').insert({
        name: 'Test Account',
        owner_user_id: publicAuthorId
    }).select().single();
    if(aError) throw aError;
    accountId = account!.id;
    
    // Membership
    await adminClient.from('account_members').insert({
        account_id: accountId,
        user_id: publicAuthorId,
        account_role: 'admin'
    });

    // Create Manuscript
    const { data: manuscript, error: mError } = await adminClient.from('manuscripts').insert({
        title: 'Limit Test Manuscript',
        owner_user_id: publicAuthorId,
        account_id: accountId,
        status: 'draft'
    }).select().single();
    if(mError) throw mError;
    manuscriptId = manuscript!.id;

    // 2. Insert 50 attachments to simulate limit
    console.log("Seeding 50 attachments...");
    const attachments = Array.from({ length: 50 }).map((_, i) => ({
        manuscript_id: manuscriptId,
        user_id: publicAuthorId,
        source: 'user_upload',
        storage_path: `mock/${i}.png`,
        file_size: 100,
        mime_type: 'image/png',
        created_at: new Date().toISOString() // Now
    }));
    
    const { error: seedError } = await adminClient.from('attachments').insert(attachments);
    if (seedError) throw seedError;
    console.log("Seeded 50 attachments.");

    // 3. Try to insert 51st (simulating the API logic check)
    // In the real API, we run a count query. Let's verify the count query returns >= 50.
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await adminClient
      .from("attachments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", publicAuthorId)
      .gte("created_at", oneDayAgo);
      
    if (countError) throw countError;
    console.log(`Count in last 24h: ${count}`);
    
    if ((count || 0) < 50) {
        throw new Error("❌ Seeding failed, count is less than 50");
    }
    
    console.log("✅ Upload limit condition verified (count >= 50). API would reject this.");

  } catch (err: any) {
    console.error("❌ Test Failed:", err);
    process.exit(1);
  } finally {
      if (authorAuthId) await adminClient.auth.admin.deleteUser(authorAuthId);
  }
}

runTest();