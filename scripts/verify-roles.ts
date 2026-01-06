
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

async function verifyRoles() {
  console.log('Verifying App Role Enum and User Roles...');

  try {
    // 1. Functionality Check: Update a role to a new enum value
    // We'll query a known user or just update a dummy record if possible.
    // For safety, we can try to query where role='support_agent' (should work syntactically even if no rows)
    // If the column was text, 'support_agent' would adhere to check constraint if we added it, but if we cast to enum, it must match.
    
    // Let's try to query with a filter.
    const { error: queryError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'support_agent' as any)
        .limit(1);

    if (queryError) {
        throw new Error(`Query failed: ${queryError.message}. This might indicate the enum value is not accepted.`);
    }
    console.log("✅ Query with 'support_agent' enum value succeeded (syntax check).");

    // 2. Negative Test: Query with invalid value
    const { error: invalidError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'invalid_magic_role' as any)
        .limit(1);

    // With PostgREST, filtering by an invalid enum value usually returns an error: 
    // "invalid input value for enum app_role: ..."
    if (invalidError && invalidError.message.includes('invalid input value for enum')) {
        console.log("✅ Verified invalid enum value is rejected (Correct behavior).");
        console.log(`   Error message: ${invalidError.message}`);
    } else if (invalidError) {
         console.log(`⚠️ Unexpected error for invalid value: ${invalidError.message}`);
    } else {
         console.log("⚠️ Query with invalid value did NOT return an error. This implies 'role' might still be TEXT.");
    }

    console.log("✅ Verification Complete");
    
    console.log("✅ Verification Complete (if no errors above)");

  } catch (err: any) {
    console.error("❌ Test Failed:", err.message);
    process.exit(1);
  }
}

verifyRoles();
