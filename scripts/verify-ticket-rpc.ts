
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
  console.log("🧪 Testing Ticket RPC & RLS...");
  let authorId, supportId;
  let ticketId;

  try {
    // 1. Create Author
    const random = Date.now();
    const authorEmail = `author_${random}@test.com`;
    const { data: userA } = await adminClient.auth.admin.createUser({ email: authorEmail, password: 'password123', email_confirm: true });
    authorId = userA.user!.id;

    const { data: pubA } = await adminClient.from('users').insert({ auth_id: authorId, email: authorEmail, role: 'user', display_name: 'Test Author' }).select().single();
    const publicAuthorId = pubA!.id;
    console.log(`Created Author: ${publicAuthorId}`);

    // Login as Author (Use Anon Client for Auth)
    const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: authLogin, error: loginErr } = await authClient.auth.signInWithPassword({ email: authorEmail, password: 'password123' });
    if (loginErr) throw loginErr;
    
    const authorInternalClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${authLogin.session!.access_token}` } }
    });

    // Author creates a ticket
    const { data: ticket, error: ticError } = await authorInternalClient.from('support_tickets').insert({
        user_id: publicAuthorId,
        subject: 'Help me',
        status: 'open'
    }).select().single();
    
    if (ticError) throw ticError;
    ticketId = ticket!.id;
    console.log(`Created Ticket: ${ticketId}`);

    // 2. Create Support Agent
    const supportEmail = `support_${random}@test.com`;
    // Use adminClient (still service role)
    const { data: userS, error: userSError } = await adminClient.auth.admin.createUser({ email: supportEmail, password: 'password123', email_confirm: true });
    
    if (userSError) {
        console.error("Failed to create Support Agent:", userSError);
        throw userSError;
    }
    supportId = userS.user!.id;

    const { data: pubS, error: pubSError } = await adminClient.from('users').insert({ auth_id: supportId, email: supportEmail, role: 'support_agent', display_name: 'Test Support' }).select().single();
    if (pubSError) throw pubSError;
    const publicSupportId = pubS!.id;
    console.log(`Created Support: ${publicSupportId}`);
    
    // Login as Support
    const { data: suppLogin } = await adminClient.auth.signInWithPassword({ email: supportEmail, password: 'password123' });
    const supportClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${suppLogin.session!.access_token}` } }
    });

    // 3. Test: Support tries to UPDATE ticket directly (Should FAIL)
    console.log("Attempting direct UPDATE as Support...");
    const { error: updateError } = await supportClient
        .from('support_tickets')
        .update({ status: 'closed' })
        .eq('id', ticketId);
    
    // Likely won't return error in PostgREST unless we check return rows, but UPDATE policy missing usually results in 0 rows updated (if check fails/policy missing).
    // If no policy exists for UPDATE, it returns 0 rows updated or 404 (effectively).
    // Usually RLS violation on update creates response with 0 rows.
    
    // Let's verify status didn't change via admin
    const { data: verify1 } = await adminClient.from('support_tickets').select('status').eq('id', ticketId).single();
    if (verify1!.status !== 'open') throw new Error("❌ Direct UPDATE succeeded! (Should have failed)");
    console.log("✅ Direct UPDATE blocked (Status is still open).");

    // 4. Test: Support tries to CLAIM via RPC (Should SUCCEED)
    console.log("Attempting RPC claim_ticket...");
    const { error: rpcError } = await supportClient.rpc('claim_ticket', { ticket_id: ticketId });
    if (rpcError) throw rpcError;

    // Verify
    const { data: verify2 } = await adminClient.from('support_tickets').select('status, assigned_to').eq('id', ticketId).single();
    if (verify2!.status !== 'in_progress' || verify2!.assigned_to !== publicSupportId) {
        throw new Error(`❌ RPC failed to update ticket: ${JSON.stringify(verify2)}`);
    }
    console.log("✅ RPC Claim succeeded.");

    // 5. Test: Support SELECT (View)
    const { data: readData, error: readError } = await supportClient.from('support_tickets').select('*').eq('id', ticketId);
    if (readError) throw readError;
    if (readData.length !== 1) throw new Error("❌ Support failed to view assigned ticket.");
    console.log("✅ Support can view assigned ticket.");

    // 6. Test: Another Support Agent tries to CLAIM already-assigned ticket (Should FAIL)
    console.log("Testing reassignment prevention...");
    const support2Email = `support2_${random}@test.com`;
    const { data: userS2 } = await adminClient.auth.admin.createUser({ email: support2Email, password: 'password123', email_confirm: true });
    const support2AuthId = userS2.user!.id;
    
    const { data: pubS2 } = await adminClient.from('users').insert({ 
      auth_id: support2AuthId, 
      email: support2Email, 
      role: 'support_agent', 
      display_name: 'Test Support 2' 
    }).select().single();
    
    const { data: supp2Login } = await adminClient.auth.signInWithPassword({ email: support2Email, password: 'password123' });
    const support2Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${supp2Login.session!.access_token}` } }
    });
    
    const { error: reassignError } = await support2Client.rpc('claim_ticket', { ticket_id: ticketId });
    if (!reassignError || !reassignError.message.includes('already assigned')) {
        throw new Error(`❌ Reassignment should have failed but got: ${reassignError?.message || 'no error'}`);
    }
    console.log("✅ Reassignment correctly prevented.");
    
    // Cleanup extra support user
    await adminClient.from('users').delete().eq('id', pubS2!.id);
    await adminClient.auth.admin.deleteUser(support2AuthId);

  } catch (err: any) {
    console.error("❌ Test Failed:", err);
    process.exit(1);
  } finally {
      if (authorId) await adminClient.auth.admin.deleteUser(authorId);
      if (supportId) await adminClient.auth.admin.deleteUser(supportId);
  }
}
runTest();
