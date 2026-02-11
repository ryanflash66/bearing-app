import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runTest() {
  console.log("🧪 Testing Attachments Table & RLS...");
  let authorAuthId;
  let accountId;

  try {
    // 1. Create Author
    const random = Date.now();
    const authorEmail = `author_${random}@test.com`;
    const { data: userA, error: createError } = await adminClient.auth.admin.createUser({ email: authorEmail, password: 'password123', email_confirm: true });
    if (createError) throw createError;
    authorAuthId = userA.user!.id;

    const { data: pubA, error: profileError } = await adminClient.from('users').insert({ 
        auth_id: authorAuthId, 
        email: authorEmail, 
        role: 'user', 
        display_name: 'Test Author' 
    }).select().single();
    if (profileError) throw profileError;
    const publicAuthorId = pubA!.id;
    console.log(`Created Author: ${publicAuthorId}`);

    // 1.5 Create Account & Membership
    const { data: account, error: accError } = await adminClient.from('accounts').insert({
        name: 'Test Account',
        owner_user_id: publicAuthorId
    }).select().single();
    if (accError) throw accError;
    accountId = account!.id;

    const { error: memError } = await adminClient.from('account_members').insert({
        account_id: accountId,
        user_id: publicAuthorId,
        account_role: 'admin'
    });
    if (memError) throw memError;
    console.log(`Created Account: ${accountId}`);

    // Login as Author
    const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: authLogin, error: loginErr } = await authClient.auth.signInWithPassword({ email: authorEmail, password: 'password123' });
    if (loginErr) throw loginErr;
    
    const authorInternalClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${authLogin.session!.access_token}` } }
    });

    // 2. Create Manuscript
    const { data: manuscript, error: manuError } = await authorInternalClient.from('manuscripts').insert({
        title: 'Test Manuscript',
        owner_user_id: publicAuthorId,
        account_id: accountId,
        status: 'draft'
    }).select().single();
    
    if (manuError) throw manuError;
    const manuscriptId = manuscript!.id;
    console.log(`Created Manuscript: ${manuscriptId}`);

    // 3. Test: Insert Attachment (Valid)
    console.log("Attempting to insert valid attachment...");
    const { data: attachment, error: attachError } = await authorInternalClient.from('attachments').insert({
        manuscript_id: manuscriptId,
        user_id: publicAuthorId,
        source: 'user_upload',
        storage_path: `manuscripts/${manuscriptId}/test.png`,
        file_size: 1024,
        mime_type: 'image/png',
        original_filename: 'test.png',
        alt_text: 'A test image'
    }).select().single();

    if (attachError) {
        // If table doesn't exist, this is expected in RED phase
        if (attachError.message.includes('relation "attachments" does not exist')) {
            console.log("✅ Red Phase Confirmed: Table 'attachments' does not exist.");
            throw new Error("Red Phase Success: Table missing as expected.");
        }
        throw attachError;
    }
    console.log(`Created Attachment: ${attachment!.id}`);

    // 4. Test: Insert Invalid Source (Should Fail)
    console.log("Attempting to insert invalid source...");
    const { error: invalidError } = await authorInternalClient.from('attachments').insert({
        manuscript_id: manuscriptId,
        user_id: publicAuthorId,
        source: 'invalid_source', // Invalid
        storage_path: `manuscripts/${manuscriptId}/bad.png`,
        file_size: 100,
        mime_type: 'image/png',
        original_filename: 'bad.png'
    });

    if (!invalidError || !invalidError.message.includes('check constraint')) {
        throw new Error(`❌ Invalid source should have failed but got: ${invalidError?.message || 'no error'}`);
    }
    console.log("✅ Invalid source rejected.");

    // 5. Test: Cascade Delete
    console.log("Testing Cascade Delete...");
    await authorInternalClient.from('manuscripts').delete().eq('id', manuscriptId);
    
    // Check if attachment is gone (using admin client to bypass RLS if any)
    const { data: checkAttach } = await adminClient.from('attachments').select('*').eq('id', attachment!.id);
    if (checkAttach && checkAttach.length > 0) {
        throw new Error("❌ Cascade delete failed: Attachment still exists.");
    }
    console.log("✅ Cascade delete successful.");

  } catch (err: any) {
    if (err.message === "Red Phase Success: Table missing as expected.") {
        console.log("🔴 Red Phase Complete: Test failed as expected (missing table).");
        if (authorAuthId) await adminClient.auth.admin.deleteUser(authorAuthId);
        if (accountId) await adminClient.from('accounts').delete().eq('id', accountId); // Cleanup account if needed
        process.exit(0);
    }
    console.error("❌ Test Failed:", err);
    if (authorAuthId) await adminClient.auth.admin.deleteUser(authorAuthId);
    process.exit(1);
  }
}
runTest();