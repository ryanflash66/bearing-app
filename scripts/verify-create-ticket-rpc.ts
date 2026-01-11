
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);


async function verifyCreateTicketRPC() {
  console.log('Verifying create_ticket RPC...');

  let testUserId: string | null = null;

  try {
    // 1. Create a transient test user
    const email = `test_rpc_${Date.now()}@example.com`;
    const password = 'test-password-123';
    
    // Note: We need a public.users row too. App trigger might handle this?
    // Bearing App likely has a trigger on auth.users insert -> public.users insert.
    // If not, we might fail.
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
    });
    
    // If we use service key, use admin.createUser might be better to skip confirm?
    // But signUp with service key might require confirmation.
    // Let's use check existing users or admin.createUser.
    
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (createError) throw new Error(`Create user failed: ${createError.message}`);
    testUserId = userData.user.id;
    console.log(`✅ Created test user: ${testUserId}`);

    // Wait for Trigger to create public.users row?
    // Let's poll for it.
    let publicUserExists = false;
    for(let i=0; i<5; i++) {
        const {data} = await supabase.from('users').select('id').eq('auth_id', testUserId).single();
        if (data) {
            publicUserExists = true; 
            break;
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    
    if (!publicUserExists) {
        // Assume trigger failed or doesn't exist. Manually insert for test?
        // Ideally we expect valid app setup.
        // Let's manually insert to be sure (if allowed).
         await supabase.from('users').insert({
             auth_id: testUserId,
             email: email,
             display_name: 'Test RPC User'
             // role default 'user'
         });
         console.log('⚠️ Manually inserted public.users row (Trigger might be slow or missing)');
    }

    // 2. Sign in as this user to get a session/token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (signInError) throw new Error(`Sign in failed: ${signInError.message}`);
    
    const userClient = createClient(supabaseUrl!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${signInData.session.access_token}` } }
    });

    // 3. Check Priority Column
    const { error: colError } = await supabase
      .from('support_tickets')
      .select('priority')
      .limit(1);

    if (colError) {
        console.log("❌ Priority column check failed:", colError.message);
    } else {
        console.log("✅ Priority column exists.");
    }

    // 4. Call create_ticket
    const { data: ticketId, error: rpcError } = await userClient.rpc('create_ticket', {
        subject: 'Real RPC Test',
        message: 'Testing from valid user',
        priority: 'high'
    });

    if (rpcError) {
        console.log("❌ create_ticket RPC failed:", rpcError.message);
    } else {
        console.log(`✅ create_ticket RPC succeeded. Ticket ID: ${ticketId}`);
        
        // Verify Data
        const { data: ticket } = await supabase.from('support_tickets').select('*').eq('id', ticketId).single();
        console.log("   Ticket Status:", ticket.status); 
        console.log("   Ticket Priority:", ticket.priority);
        
        if (ticket.priority !== 'high') console.log("❌ Priority mismatch!");
    }

  } catch (err: any) {
    console.error("❌ Test Failed:", err.message);
  } finally {
      // Cleanup
      if (testUserId) {
          await supabase.auth.admin.deleteUser(testUserId);
          console.log("🧹 Deleted test user");
      }
  }
}


verifyCreateTicketRPC();
