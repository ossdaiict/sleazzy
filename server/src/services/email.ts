import emailjs from '@emailjs/nodejs';

const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;
const APPROVAL_NOTIFY_EMAIL = process.env.APPROVAL_NOTIFY_EMAIL;

export type PendingBookingItem = {
  venueName: string;
  eventName: string;
  startTime: string;
  endTime: string;
  clubName?: string;
};

function isEmailJsConfigured(): boolean {
  return !!(
    EMAILJS_SERVICE_ID &&
    EMAILJS_TEMPLATE_ID &&
    EMAILJS_PUBLIC_KEY &&
    EMAILJS_PRIVATE_KEY &&
    APPROVAL_NOTIFY_EMAIL
  );
}

/**
 * Send an email to the approval recipient when one or more venue bookings need approval.
 * Uses EmailJS. Does nothing if EmailJS or APPROVAL_NOTIFY_EMAIL is not set.
 */
export async function sendApprovalNotification(
  items: PendingBookingItem[]
): Promise<{ sent: boolean; error?: string }> {
  if (!isEmailJsConfigured()) {
    console.warn(
      'EmailJS or APPROVAL_NOTIFY_EMAIL not configured; skipping approval notification email.'
    );
    return { sent: false };
  }

  if (items.length === 0) return { sent: false };

  const list = items
    .map(
      (i) =>
        `• ${i.venueName}: "${i.eventName}" — ${i.startTime} to ${i.endTime}${i.clubName ? ` (${i.clubName})` : ''}`
    )
    .join('\n');

  const message = `The following venue booking(s) require your approval:\n\n${list}\n\nPlease review them in the admin dashboard.`;

  const messageHtml = `
    <p>The following venue booking(s) require your approval:</p>
    <ul>${items.map((i) => `<li><strong>${i.venueName}</strong>: "${i.eventName}" — ${i.startTime} to ${i.endTime}${i.clubName ? ` (${i.clubName})` : ''}</li>`).join('')}</ul>
    <p>Please review them in the admin dashboard.</p>
  `;

  const templateParams = {
    to_email: APPROVAL_NOTIFY_EMAIL,
    subject: `[Sleazzy] ${items.length} venue booking(s) need approval`,
    message,
    message_html: messageHtml,
    booking_count: String(items.length),
  };

  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID!,
      EMAILJS_TEMPLATE_ID!,
      templateParams,
      {
        publicKey: EMAILJS_PUBLIC_KEY!,
        privateKey: EMAILJS_PRIVATE_KEY!,
      }
    );
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Failed to send approval notification email:', message);
    return { sent: false, error: message };
  }
}
