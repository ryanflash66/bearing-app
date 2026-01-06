
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

async function verifyTicketStatusEnum() {
  console.log('Verifying Support Ticket Status Enum...');

  try {
    // 1. Check if 'pending_user' is a valid enum value
    const { error: errorUser } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('status', 'pending_user' as any)
        .limit(1);

    if (errorUser) {
        throw new Error(`pending_user check failed: ${errorUser.message}`);
    }
    console.log("✅ 'pending_user' value accepted.");

    // 2. Check if 'pending_agent' is a valid enum value
    const { error: errorAgent } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('status', 'pending_agent' as any)
        .limit(1);

    if (errorAgent) {
        throw new Error(`pending_agent check failed: ${errorAgent.message}`);
    }
    console.log("✅ 'pending_agent' value accepted.");

    // 3. Confirm 'closed'/others are handled as expected (optional, but good for cleanup verification)
    
    console.log("✅ Verification Complete: Enum supports new granular states.");

  } catch (err: any) {
    console.error("❌ verification Failed:", err.message);
    process.exit(1);
  }
}

verifyTicketStatusEnum();
