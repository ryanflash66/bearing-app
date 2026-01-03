
export async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  console.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}, Body: ${text}`);
  // TODO: Integrate Resend or SendGrid
  return true;
}

export async function notifyAdminsNewTicket(ticketId: string, subject: string, userEmail: string) {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    await sendEmail({
        to: adminEmail,
        subject: `[Support] New Ticket: ${subject}`,
        text: `User ${userEmail} created a new ticket.\n\nTicket ID: ${ticketId}\nSubject: ${subject}`
    });
}

export async function notifyUserReply(ticketId: string, subject: string, userEmail: string, replyMessage: string) {
    await sendEmail({
        to: userEmail,
        subject: `[Support] Update on Ticket: ${subject}`,
        text: `There is a new reply on your ticket.\n\nMessage:\n${replyMessage}`
    });
}

export async function notifyAdminReply(ticketId: string, subject: string, adminEmail: string) {
     const targetEmail = process.env.ADMIN_EMAIL || "admin@example.com";
     await sendEmail({
        to: targetEmail,
        subject: `[Support] New Reply on Ticket: ${subject}`,
        text: `Admin/User ${adminEmail} replied to ticket ${ticketId}.\n\nView dashboard for details.`
    });
}
