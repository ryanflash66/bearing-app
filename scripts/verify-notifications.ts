
import { notifyAdminsNewTicket, notifyUserReply, notifyAdminReply } from '../src/lib/email';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runVerification() {
    console.log('--- STARTING NOTIFICATION VERIFICATION ---');
    
    const testTicketId = 'test-ticket-123';
    const testSubject = 'Need help with Llama integration';
    const testUserEmail = 'author@example.com';
    const testReply = 'I have looked at your issue and it seems there is a mismatch in the API endpoint. Please check your config again. This is a longer snippet to verify that the shortening logic works as expected in the email template.';

    console.log('\n1. Verifying New Ticket Alert (Admin)...');
    await notifyAdminsNewTicket(testTicketId, testSubject, testUserEmail);

    console.log('\n2. Verifying User Reply Notification (User)...');
    await notifyUserReply(testTicketId, testSubject, testUserEmail, testReply);

    console.log('\n3. Verifying Admin Reply Notification (Admin)...');
    await notifyAdminReply(testTicketId, testSubject, testUserEmail);

    console.log('\n--- VERIFICATION FINISHED ---');
}

runVerification().catch(console.error);
