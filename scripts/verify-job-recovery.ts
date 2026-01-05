
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { recoverStaleJobs } from '../src/lib/jobs/monitor';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Must use Service Role to force insert old timestamp
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runTest() {
    console.log('🚧 Testing Job Resilience...');

    // 1. Setup a "Stale" Job
    try {
        const email = `stale_job_${Date.now()}@test.com`;
        const { data: { user }, error: userError } = await supabase.auth.admin.createUser({
            email, password: 'password123', email_confirm: true
        });
        if(userError) throw userError;
        
        // Sign In
        const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
            email, password: 'password123'
        });
        if(signInError) throw signInError;

        const userClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            global: { headers: { Authorization: `Bearer ${sessionData.session?.access_token}` } }
        });

        // Profile (user client)
        await userClient.from('users').insert({ auth_id: user!.id, email, role: 'author' });
        const { data: profile } = await userClient.from('users').select('id').eq('auth_id', user!.id).single();
        
        // Account (user client)
        const { data: accounts, error: rpcError } = await userClient.rpc('create_default_account', { p_name: 'Stale Test', p_owner_id: profile!.id });
        if(rpcError) { console.error('RPC Error:', rpcError); throw rpcError; }
        if(!accounts || accounts.length === 0) throw new Error('No account returned from RPC');
        const accountId = accounts[0].id;

        // Manuscript (user client)
        const { data: manuscript, error: msError } = await userClient.from('manuscripts').insert({
            title: 'Stale Manuscript',
            account_id: accountId,
            owner_user_id: profile!.id,
            content_text: 'Test content'
        }).select().single();
        if(msError) throw msError;

        // Insert OLD Job
        const oldDate = new Date();
        oldDate.setMinutes(oldDate.getMinutes() - 40); // 40 mins ago
        
        const { data: job, error: jobError } = await supabase.from('consistency_checks').insert({
            manuscript_id: manuscript!.id,
            created_by: profile!.id,
            status: 'running',
            input_hash: 'dummy_hash',
            created_at: oldDate.toISOString()
        }).select().single();

        if(jobError) throw jobError;

        console.log(`Created stale job: ${job!.id} (created_at: ${oldDate.toISOString()})`);

        // 2. Run Recovery
        console.log('Running recovery...');
        const result = await recoverStaleJobs(supabase, 30);
        console.log('Recovery Result:', result);

        // 3. Verify
        const { data: updatedJob } = await supabase.from('consistency_checks').select('*').eq('id', job!.id).single();
        
        if (updatedJob!.status === 'failed' && updatedJob!.error_message.includes('resilience')) {
            console.log('✅ PASS: Job marked as failed correctly.');
        } else {
            console.error('❌ FAIL: Job status not updated.', updatedJob);
        }
        
        // Cleanup
        await supabase.auth.admin.deleteUser(user!.id);
        
    } catch (e) {
        console.error("Test Error:", e);
    }
}

runTest();
