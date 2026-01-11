// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing credentials');

const supabase = createClient(supabaseUrl, supabaseServiceKey);


async function verifyActions() {
    console.log("Verifying Action RPCs...");

    let testUserId: string | null = null;
    try {
        // Setup User
        const email = `test_action_${Date.now()}@example.com`;
        const password = 'test-password-123';
        const { data: userData, error: createError } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
        if (createError) throw createError;
        testUserId = userData.user.id;
        console.log(`✅ Created test user: ${testUserId}`);
        
        // Wait for public.user
        let publicUserExists = false;
        for(let i=0; i<5; i++) {
            const {data} = await supabase.from('users').select('id').eq('auth_id', testUserId).single();
            if (data) { publicUserExists = true; break; }
            await new Promise(r => setTimeout(r, 1000));
        }
        
        if (!publicUserExists) {
             await supabase.from('users').insert({
                 auth_id: testUserId,
                 email: email,
                 display_name: 'Test Action User'
             });
             console.log("⚠️ Manually inserted public.users row");
        }

        // Sign In
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            global: { headers: { Authorization: `Bearer ${signInData.session.access_token}` } }
        });

        // 1. Create Ticket
        const { data: ticketId, error: createTicketError } = await userClient.rpc('create_ticket', {
            subject: 'Action Test',
            message: 'Init',
            priority: 'low'
        });
        if (createTicketError) throw new Error(`Create failed: ${createTicketError.message}`);
        console.log(`✅ Ticket Created: ${ticketId}`);

        // 2. Reply as User
        const { error: replyError } = await userClient.rpc('reply_to_ticket', {
            ticket_id: ticketId,
            content: 'User Reply'
        });
        
        if (replyError) {
             console.log(`❌ reply_to_ticket failed: ${replyError.message}`);
        } else {
             console.log("✅ reply_to_ticket succeeded");
             // Check status
             const { data: ticket } = await supabase.from('support_tickets').select('status').eq('id', ticketId).single();
             if (ticket && ticket.status === 'pending_agent') {
                 console.log("✅ Status updated to pending_agent");
             } else {
                 console.log(`❌ Status mismatch: ${ticket?.status ?? 'null'}`);
             }
        }

        // 3. Try Update Status (User resolving own ticket -> Should Succeed)
        const { error: resolveError } = await userClient.rpc('update_ticket_status', {
            ticket_id: ticketId,
            new_status: 'resolved'
        });

        if (resolveError) {
             console.log(`❌ User resolving ticket failed: ${resolveError.message}`);
        } else {
             console.log("✅ User resolved ticket successfully (AC 4.2.4)");
        }

        // 4. Try Update Status (User setting arbitrary status -> Should Fail)
        const { error: maliciousUpdateError } = await userClient.rpc('update_ticket_status', {
            ticket_id: ticketId,
            new_status: 'open' // Re-opening or changing to other statuses might be restricted or logic dependent, but let's test a restricted one if any? 
            // Actually AC doesn't explicitly forbid re-opening, but typically users "Reply" to re-open.
            // But let's assume we want to block them from ignoring the state machine arbitrarily.
            // Our RPC logic: ELSIF ticket_owner_id = current_user_pk AND new_status = 'resolved' THEN Allowed. ELSE Denied.
            // So 'open' should be denied.
        });
        
        if (maliciousUpdateError && maliciousUpdateError.message.includes('Access denied')) {
            console.log("✅ User arbitrary status change blocked (Expected)");
        } else {
            console.log(`❌ User arbitrary status change unexpected result: ${maliciousUpdateError ? maliciousUpdateError.message : 'Succeeded (Should fail)'}`);
        }

    } catch (err: any) {
         console.error("❌ Test Failed:", err.message);
    } finally {
        if (testUserId) await supabase.auth.admin.deleteUser(testUserId);
    }
}

verifyActions();
