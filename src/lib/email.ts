
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Escape HTML special characters to prevent XSS in email templates
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html?: string }) {
  if (!resend) {
    console.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}, Body: ${text}`);
    return { success: true, mock: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
    });

    if (error) {
      console.error('[EMAIL ERROR]', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('[EMAIL EXCEPTION]', err);
    return { success: false, error: err };
  }
}

/**
 * AC 4.6.1: Notify Support Team of new ticket
 * @returns Result from sendEmail for caller error handling
 */
export async function notifyAdminsNewTicket(ticketId: string, subject: string, userEmail: string) {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const ticketUrl = `${APP_URL}/dashboard/admin/support/${ticketId}`;
    
    // Escape user-provided content to prevent XSS
    const safeSubject = escapeHtml(subject);
    const safeUserEmail = escapeHtml(userEmail);
    
    const result = await sendEmail({
        to: adminEmail,
        subject: `[Support] New Ticket: ${subject}`,
        text: `User ${userEmail} created a new ticket.\n\nSubject: ${subject}\n\nView Ticket: ${ticketUrl}`,
        html: `
            <p>User <strong>${safeUserEmail}</strong> created a new ticket.</p>
            <p><strong>Subject:</strong> ${safeSubject}</p>
            <p><a href="${ticketUrl}">View Ticket in Dashboard</a></p>
        `
    });
    
    if (!result.success) {
        console.error('[NOTIFY_ADMIN_NEW_TICKET_FAILED]', { ticketId, error: result.error });
    }
    
    return result;
}

/**
 * AC 4.6.2: Notify User of agent reply
 * @returns Result from sendEmail for caller error handling
 */
export async function notifyUserReply(ticketId: string, subject: string, userEmail: string, replyMessage: string) {
    const ticketUrl = `${APP_URL}/dashboard/support/${ticketId}`;
    const snippet = replyMessage.length > 200 ? replyMessage.substring(0, 197) + '...' : replyMessage;
    
    // Escape user-provided content to prevent XSS
    const safeSubject = escapeHtml(subject);
    const safeSnippet = escapeHtml(snippet);

    const result = await sendEmail({
        to: userEmail,
        subject: `[Support] Update on Ticket: ${subject}`,
        text: `There is a new reply on your ticket.\n\nMessage Snippet:\n"${snippet}"\n\nView Full Conversation: ${ticketUrl}`,
        html: `
            <p>There is a new reply on your ticket: <strong>${safeSubject}</strong></p>
            <blockquote style="border-left: 4px solid #ccc; padding-left: 1rem; color: #555;">
                ${safeSnippet.replace(/\n/g, '<br>')}
            </blockquote>
            <p><a href="${ticketUrl}">View Full Conversation</a></p>
        `
    });
    
    if (!result.success) {
        console.error('[NOTIFY_USER_REPLY_FAILED]', { ticketId, userEmail, error: result.error });
    }
    
    return result;
}

/**
 * Notify Admin of user reply
 * @returns Result from sendEmail for caller error handling
 */
export async function notifyAdminReply(ticketId: string, subject: string, userEmail: string) {
     const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
     const ticketUrl = `${APP_URL}/dashboard/admin/support/${ticketId}`;
     
     // Escape user-provided content to prevent XSS
     const safeSubject = escapeHtml(subject);
     const safeUserEmail = escapeHtml(userEmail);
     
     const result = await sendEmail({
        to: adminEmail,
        subject: `[Support] New Reply on Ticket: ${subject}`,
        text: `The user (${userEmail}) replied to ticket: ${subject}\n\nView Dashboard: ${ticketUrl}`,
        html: `
            <p>The user <strong>${safeUserEmail}</strong> replied to ticket: <strong>${safeSubject}</strong></p>
            <p><a href="${ticketUrl}">View Ticket in Admin Dashboard</a></p>
        `
    });
    
    if (!result.success) {
        console.error('[NOTIFY_ADMIN_REPLY_FAILED]', { ticketId, error: result.error });
    }
    
    return result;
}

