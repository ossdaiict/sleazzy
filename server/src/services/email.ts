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
  eventType?: string;
};

function formatEventTypeLabel(eventType?: string): string {
  if (!eventType) return 'General';
  return eventType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateLabel(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTimeLabel(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

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

  const blocks = items.map((i, index) => {
    const dateLabel = formatDateLabel(i.startTime);
    const startTimeLabel = formatTimeLabel(i.startTime);
    const endTimeLabel = formatTimeLabel(i.endTime);

    return `Request ${index + 1}\nVenue: ${i.venueName}\nDate: ${dateLabel}\nTime: ${startTimeLabel} - ${endTimeLabel}\nEvent: ${i.eventName}${i.clubName ? `\nRequested by: ${i.clubName}` : ''}`;
  });

  const message = `Respected Sir/Madam,\n\nKindly review the following venue booking request(s):\n\n${blocks.join('\n\n')}\n\nPlease review and take action from the admin dashboard.\n\nRegards,\nSleazzy Venue Booking System`;

  const messageHtml = `
    <p>Respected Sir/Madam,</p>
    <p>Kindly review the following venue booking request(s):</p>
    ${items
      .map((i, index) => {
        const dateLabel = formatDateLabel(i.startTime);
        const startTimeLabel = formatTimeLabel(i.startTime);
        const endTimeLabel = formatTimeLabel(i.endTime);
        return `
          <div style="margin-bottom:16px;">
            <p style="margin:0 0 8px 0;"><strong>Request ${index + 1}</strong></p>
            <p style="margin:0;"><strong>Venue:</strong> ${i.venueName}</p>
            <p style="margin:0;"><strong>Date:</strong> ${dateLabel}</p>
            <p style="margin:0;"><strong>Time:</strong> ${startTimeLabel} - ${endTimeLabel}</p>
            <p style="margin:0;"><strong>Event:</strong> ${i.eventName}</p>
            ${i.clubName ? `<p style="margin:0;"><strong>Requested by:</strong> ${i.clubName}</p>` : ''}
          </div>
        `;
      })
      .join('')}
    <p>Please review and take action from the admin dashboard.</p>
    <p>Regards,<br/>Sleazzy Venue Booking System</p>
  `;

  const primaryItem = items[0];
  const title = `[General Event] ${primaryItem.venueName} Booking`;
  const eventTypeLabel = formatEventTypeLabel(primaryItem.eventType);
  const subject =
    items.length === 1
      ? title
      : `[${eventTypeLabel} Event] ${items.length} Venue Bookings`;

  const templateParams = {
    to_email: APPROVAL_NOTIFY_EMAIL,
    title,
    subject,
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
    const message = err instanceof Error ? err.message : JSON.stringify(err, null, 2);
    console.error('Failed to send approval notification email:', message);
    return { sent: false, error: message };
  }
}
