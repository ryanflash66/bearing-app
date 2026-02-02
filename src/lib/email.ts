
import { Resend } from 'resend';

const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Cache Resend instance to prevent memory leaks from repeated instantiation
let resendInstance: Resend | null = null;
let lastApiKey: string | null = null;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  // Recreate if key changes (e.g., env refresh / serverless cold start behavior).
  if (!resendInstance || lastApiKey !== apiKey) {
    lastApiKey = apiKey;
    resendInstance = new Resend(apiKey);
  }

  return resendInstance;
}

// Test helper: allow unit tests to reset cached Resend instance.
export function __resetResendForTests() {
  resendInstance = null;
  lastApiKey = null;
}

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
  const resend = getResend();
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

/**
 * AC 5.4.2: Notify user of service fulfillment (ISBN assigned)
 * @returns Result from sendEmail for caller error handling
 */
export async function notifyServiceFulfilled(
    userEmail: string,
    serviceType: string,
    isbn?: string
) {
    const ordersUrl = `${APP_URL}/dashboard/orders`;
    const safeServiceType = escapeHtml(serviceType);

    const isIsbnService = serviceType === 'isbn';
    const subject = isIsbnService
        ? 'Your ISBN is Ready!'
        : `Your ${safeServiceType} Service is Complete`;

    let textBody: string;
    let htmlBody: string;

    if (isIsbnService && isbn) {
        const safeIsbn = escapeHtml(isbn);
        textBody = `Great news! Your ISBN has been assigned.\n\nYour ISBN: ${isbn}\n\nYou can view this anytime in your orders: ${ordersUrl}`;
        htmlBody = `
            <p>Great news! Your ISBN has been assigned.</p>
            <div style="background-color: #f0fdf4; border: 1px solid #86efac; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
                <p style="margin: 0; font-size: 0.875rem; color: #166534;">Your ISBN</p>
                <p style="margin: 0.5rem 0 0; font-size: 1.5rem; font-family: monospace; color: #1f2937;">
                    ${safeIsbn}
                </p>
            </div>
            <p><a href="${ordersUrl}">View in Your Orders</a></p>
        `;
    } else {
        textBody = `Your ${serviceType} service request has been completed!\n\nView your orders: ${ordersUrl}`;
        htmlBody = `
            <p>Your <strong>${safeServiceType}</strong> service request has been completed!</p>
            <p><a href="${ordersUrl}">View Your Orders</a></p>
        `;
    }

    const result = await sendEmail({
        to: userEmail,
        subject,
        text: textBody,
        html: htmlBody,
    });

    if (!result.success) {
        console.error('[NOTIFY_SERVICE_FULFILLED_FAILED]', { userEmail, serviceType, error: result.error });
    }

    return result;
}

/**
 * AC 5.4.3: Notify user of service cancellation/refund
 * @returns Result from sendEmail for caller error handling
 */
export async function notifyServiceCancelled(
    userEmail: string,
    serviceType: string,
    reason: string,
    refundInitiated: boolean
) {
    const ordersUrl = `${APP_URL}/dashboard/orders`;
    const safeServiceType = escapeHtml(serviceType);
    const safeReason = escapeHtml(reason);

    const refundText = refundInitiated
        ? 'A refund has been initiated and should appear in your account within 5-10 business days.'
        : 'Please contact support if you have any questions about this cancellation.';

    const result = await sendEmail({
        to: userEmail,
        subject: `Service Request Cancelled: ${safeServiceType}`,
        text: `Your ${serviceType} service request has been cancelled.\n\nReason: ${reason}\n\n${refundText}\n\nView your orders: ${ordersUrl}`,
        html: `
            <p>Your <strong>${safeServiceType}</strong> service request has been cancelled.</p>
            <div style="background-color: #fef3c7; border: 1px solid #fbbf24; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
                <p style="margin: 0; font-size: 0.875rem; color: #92400e;"><strong>Reason:</strong></p>
                <p style="margin: 0.5rem 0 0; color: #1f2937;">${safeReason}</p>
            </div>
            <p>${refundText}</p>
            <p><a href="${ordersUrl}">View Your Orders</a></p>
        `,
    });

    if (!result.success) {
        console.error('[NOTIFY_SERVICE_CANCELLED_FAILED]', { userEmail, serviceType, error: result.error });
    }

    return result;
}

/**
 * Story 6.3: Notify author when a blog post is suspended by moderation
 */
export async function notifyBlogPostSuspended(
    userEmail: string,
    postTitle: string,
    reason: string
) {
    const dashboardUrl = `${APP_URL}/dashboard/marketing/blog`;
    const safeTitle = escapeHtml(postTitle);
    const safeReason = escapeHtml(reason);

    const result = await sendEmail({
        to: userEmail,
        subject: `Your blog post was suspended: ${safeTitle}`,
        text: `Your blog post "${postTitle}" has been suspended for review.\n\nReason: ${reason}\n\nYou can review your posts here: ${dashboardUrl}`,
        html: `
            <p>Your blog post <strong>"${safeTitle}"</strong> has been suspended for review.</p>
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
                <p style="margin: 0; font-size: 0.875rem; color: #b91c1c;"><strong>Reason:</strong></p>
                <p style="margin: 0.5rem 0 0; color: #1f2937;">${safeReason}</p>
            </div>
            <p><a href="${dashboardUrl}">Review your blog posts in the dashboard</a></p>
        `,
    });

    if (!result.success) {
        console.error('[NOTIFY_BLOG_POST_SUSPENDED_FAILED]', { userEmail, postTitle, error: result.error });
    }

    return result;
}

// Status display configuration for emails
const STATUS_DISPLAY: Record<string, { label: string; color: string; bgColor: string }> = {
    pending: { label: 'Pending', color: '#92400e', bgColor: '#fef3c7' },
    paid: { label: 'Paid - Awaiting Fulfillment', color: '#6b21a8', bgColor: '#f3e8ff' },
    in_progress: { label: 'In Progress', color: '#1d4ed8', bgColor: '#dbeafe' },
    completed: { label: 'Completed', color: '#166534', bgColor: '#dcfce7' },
    cancelled: { label: 'Cancelled', color: '#b91c1c', bgColor: '#fef2f2' },
    failed: { label: 'Failed', color: '#b91c1c', bgColor: '#fef2f2' },
};

// Service type display names for emails
const SERVICE_DISPLAY: Record<string, string> = {
    isbn: 'ISBN Registration',
    cover_design: 'Cover Design',
    editing: 'Editing',
    author_website: 'Author Website',
    marketing: 'Marketing Package',
    social_media: 'Social Media Kit',
    publishing_help: 'Publishing Assistance',
    printing: 'Printing Support',
};

/**
 * AC 8.13.4: Notify user when service request status changes
 * Subject: "Update on your [Service Name] Request"
 * Body includes: Current Status, Link to /dashboard/orders/[id]
 *
 * @returns Result from sendEmail for caller error handling
 */
export async function sendOrderStatusEmail(
    userEmail: string,
    orderId: string,
    serviceType: string,
    newStatus: string,
    additionalInfo?: string
) {
    const orderUrl = `${APP_URL}/dashboard/orders/${orderId}`;
    const serviceName = SERVICE_DISPLAY[serviceType] || serviceType;
    const safeServiceName = escapeHtml(serviceName);
    const statusInfo = STATUS_DISPLAY[newStatus] || { label: newStatus, color: '#374151', bgColor: '#f3f4f6' };
    const safeAdditionalInfo = additionalInfo ? escapeHtml(additionalInfo) : null;

    const subject = `Update on your ${serviceName} Request`;

    const textBody = `Your ${serviceName} request status has been updated.\n\nCurrent Status: ${statusInfo.label}${safeAdditionalInfo ? `\n\nNote: ${additionalInfo}` : ''}\n\nView your order: ${orderUrl}`;

    const htmlBody = `
        <p>Your <strong>${safeServiceName}</strong> request status has been updated.</p>
        <div style="background-color: ${statusInfo.bgColor}; border: 1px solid ${statusInfo.color}20; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">
            <p style="margin: 0; font-size: 0.875rem; color: #6b7280;">Current Status</p>
            <p style="margin: 0.25rem 0 0; font-size: 1.125rem; font-weight: 600; color: ${statusInfo.color};">
                ${statusInfo.label}
            </p>
        </div>
        ${safeAdditionalInfo ? `<p style="color: #6b7280; font-size: 0.875rem;">${safeAdditionalInfo}</p>` : ''}
        <p><a href="${orderUrl}" style="color: #4f46e5; text-decoration: underline;">View Order Details</a></p>
    `;

    const result = await sendEmail({
        to: userEmail,
        subject,
        text: textBody,
        html: htmlBody,
    });

    if (!result.success) {
        console.error('[NOTIFY_ORDER_STATUS_CHANGE_FAILED]', { userEmail, orderId, serviceType, newStatus, error: result.error });
    }

    return result;
}

/**
 * Backwards-compatible alias for existing call sites.
 */
export async function notifyOrderStatusChange(
    userEmail: string,
    orderId: string,
    serviceType: string,
    newStatus: string,
    additionalInfo?: string
) {
    return sendOrderStatusEmail(
        userEmail,
        orderId,
        serviceType,
        newStatus,
        additionalInfo
    );
}
