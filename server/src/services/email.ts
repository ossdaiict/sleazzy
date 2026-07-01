import emailjs from '@emailjs/nodejs';

const PASSWORD_EMAILJS_SERVICE_ID = process.env.PASSWORD_EMAILJS_SERVICE_ID;
const PASSWORD_EMAILJS_TEMPLATE_ID = process.env.PASSWORD_EMAILJS_TEMPLATE_ID;
const PASSWORD_EMAILJS_PUBLIC_KEY = process.env.PASSWORD_EMAILJS_PUBLIC_KEY;
const PASSWORD_EMAILJS_PRIVATE_KEY = process.env.PASSWORD_EMAILJS_PRIVATE_KEY;
const PASSWORD_MAIL = process.env.PASSWORD_MAIL;

const APPROVAL_EMAILJS_SERVICE_ID = process.env.APPROVAL_EMAILJS_SERVICE_ID;
const APPROVAL_EMAILJS_TEMPLATE_ID = process.env.APPROVAL_EMAILJS_TEMPLATE_ID;
const APPROVAL_EMAILJS_PUBLIC_KEY = process.env.APPROVAL_EMAILJS_PUBLIC_KEY;
const APPROVAL_EMAILJS_PRIVATE_KEY = process.env.APPROVAL_EMAILJS_PRIVATE_KEY;
const APPROVAL_MAIL = process.env.APPROVAL_MAIL;

const REMINDER_EMAILJS_SERVICE_ID = process.env.REMINDER_EMAILJS_SERVICE_ID;
const REMINDER_EMAILJS_TEMPLATE_ID = process.env.REMINDER_EMAILJS_TEMPLATE_ID;
const REMINDER_EMAILJS_PUBLIC_KEY = process.env.REMINDER_EMAILJS_PUBLIC_KEY;
const REMINDER_EMAILJS_PRIVATE_KEY = process.env.REMINDER_EMAILJS_PRIVATE_KEY;
const EVENT_REMINDER_MAIL = process.env.EVENT_REMINDER_MAIL;

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

function isPasswordEmailJsConfigured(): boolean {
  return !!(
    PASSWORD_EMAILJS_SERVICE_ID &&
    PASSWORD_EMAILJS_TEMPLATE_ID &&
    PASSWORD_EMAILJS_PUBLIC_KEY &&
    PASSWORD_EMAILJS_PRIVATE_KEY
  );
}

function isApprovalEmailJsConfigured(): boolean {
  return !!(
    APPROVAL_EMAILJS_SERVICE_ID &&
    APPROVAL_EMAILJS_TEMPLATE_ID &&
    APPROVAL_EMAILJS_PUBLIC_KEY &&
    APPROVAL_EMAILJS_PRIVATE_KEY
  );
}

function isReminderEmailJsConfigured(): boolean {
  return !!(
    REMINDER_EMAILJS_SERVICE_ID &&
    REMINDER_EMAILJS_TEMPLATE_ID &&
    REMINDER_EMAILJS_PUBLIC_KEY &&
    REMINDER_EMAILJS_PRIVATE_KEY
  );
}


/**
 * Send an email to the user with a temporary password when they trigger a forgot password request.
 */
export async function sendPasswordResetEmail(
  email: string,
  tempPassword: string
): Promise<{ sent: boolean; error?: string }> {
  if (!isPasswordEmailJsConfigured()) {
    console.warn('EmailJS not configured; skipping password reset email.');
    return { sent: false };
  }

  const title = 'Password Reset Request';
  const subject = 'Password Reset - SBG Team';
  const message = `Dear User,\n\nWe received a request to reset your password. Your 6-digit verification code is:\n\n${tempPassword}\n\nThis code will expire in 5 minutes. Please use this code to verify your identity and reset your password.\n\nRegards,\nSBG Team`;
  const messageHtml = `
    <p>Dear User,</p>
    <p>We received a request to reset your password. Your 6-digit verification code is:</p>
    <h3 style="background:#f4f4f4; padding:10px; display:inline-block; font-family:monospace; border-radius:4px; margin: 10px 0; letter-spacing: 4px;">${tempPassword}</h3>
    <p><strong>This code will expire in 5 minutes.</strong> Please use this code to verify your identity and reset your password.</p>
    <p>Regards,<br/>SBG Team</p>
  `;

  const templateParams = {
    to_email: email,
    from_email: PASSWORD_MAIL || '',
    title,
    subject,
    message,
    message_html: messageHtml,
    booking_count: '0',
  };

  try {
    await emailjs.send(
      PASSWORD_EMAILJS_SERVICE_ID!,
      PASSWORD_EMAILJS_TEMPLATE_ID!,
      templateParams,
      {
        publicKey: PASSWORD_EMAILJS_PUBLIC_KEY!,
        privateKey: PASSWORD_EMAILJS_PRIVATE_KEY!,
      }
    );
    return { sent: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : JSON.stringify(err, null, 2);
    console.error('Failed to send password reset email:', errorMsg);
    return { sent: false, error: errorMsg };
  }
}

/**
 * Send an email to the club when their booking is approved.
 */
export async function sendBookingApprovedEmailToClub(
  clubEmail: string,
  venueName: string,
  eventName: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<{ sent: boolean; error?: string }> {
  if (!isApprovalEmailJsConfigured()) return { sent: false };

  const title = 'Booking Approved';
  const subject = 'Booking Approved - SBG Team';
  const message = `Your booking for ${eventName} at ${venueName} on ${date} from ${startTime} to ${endTime} has been approved.`;
  const messageHtml = `<p>Your booking for <strong>${eventName}</strong> at <strong>${venueName}</strong> on <strong>${date}</strong> from <strong>${startTime}</strong> to <strong>${endTime}</strong> has been approved.</p>`;

  const templateParams = {
    to_email: clubEmail,
    from_email: APPROVAL_MAIL || '',
    title,
    subject,
    message,
    message_html: messageHtml,
    booking_count: '1',
  };

  try {
    await emailjs.send(APPROVAL_EMAILJS_SERVICE_ID!, APPROVAL_EMAILJS_TEMPLATE_ID!, templateParams, {
      publicKey: APPROVAL_EMAILJS_PUBLIC_KEY!,
      privateKey: APPROVAL_EMAILJS_PRIVATE_KEY!,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: (err as Error).message };
  }
}

export async function sendBookingCancelledEmailToClub(
  clubEmail: string,
  venueName: string,
  eventName: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<{ sent: boolean; error?: string }> {
  if (!isApprovalEmailJsConfigured()) return { sent: false };

  const title = 'Booking Cancelled';
  const subject = 'Booking Cancelled - SBG Team';
  const message = `Your approved booking for ${eventName} at ${venueName} on ${date} from ${startTime} to ${endTime} has been cancelled by the admin.`;
  const messageHtml = `<p>Your approved booking for <strong>${eventName}</strong> at <strong>${venueName}</strong> on <strong>${date}</strong> from <strong>${startTime}</strong> to <strong>${endTime}</strong> has been cancelled by the admin.</p>`;

  const templateParams = {
    to_email: clubEmail,
    from_email: APPROVAL_MAIL || '',
    title,
    subject,
    message,
    message_html: messageHtml,
    booking_count: '1',
  };

  try {
    await emailjs.send(APPROVAL_EMAILJS_SERVICE_ID!, APPROVAL_EMAILJS_TEMPLATE_ID!, templateParams, {
      publicKey: APPROVAL_EMAILJS_PUBLIC_KEY!,
      privateKey: APPROVAL_EMAILJS_PRIVATE_KEY!,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: (err as Error).message };
  }
}

/**
 * Send an event report reminder to the club.
 */
export async function sendEventReportReminderEmail(
  clubEmail: string,
  eventName: string
): Promise<{ sent: boolean; error?: string }> {
  if (!isReminderEmailJsConfigured()) return { sent: false };

  const title = 'Event Report Reminder';
  const subject = 'Event Report Reminder - SBG Team';
  const message = `This is a reminder to submit the event report for your recent event: ${eventName}.`;
  const messageHtml = `<p>This is a reminder to submit the event report for your recent event: <strong>${eventName}</strong>.</p>`;

  const templateParams = {
    to_email: clubEmail,
    from_email: EVENT_REMINDER_MAIL || '',
    title,
    subject,
    message,
    message_html: messageHtml,
    booking_count: '0',
  };

  try {
    await emailjs.send(REMINDER_EMAILJS_SERVICE_ID!, REMINDER_EMAILJS_TEMPLATE_ID!, templateParams, {
      publicKey: REMINDER_EMAILJS_PUBLIC_KEY!,
      privateKey: REMINDER_EMAILJS_PRIVATE_KEY!,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: (err as Error).message };
  }
}

/**
 * Send a bulk booking processed email to the club.
 */
export async function sendBulkBookingProcessedEmail(
  clubEmail: string,
  eventName: string,
  date: string,
  startTime: string,
  endTime: string,
  approvedVenues: string[],
  rejectedVenues: string[]
): Promise<{ sent: boolean; error?: string }> {
  if (!isApprovalEmailJsConfigured()) return { sent: false };

  const title = 'Booking Processed';
  const subject = 'Booking Processed - SBG Team';
  
  let htmlVenues = '';
  if (approvedVenues.length > 0) {
    htmlVenues += `<p><strong>Approved Venues:</strong></p><ul>`;
    approvedVenues.forEach(v => { htmlVenues += `<li style="color: green;">${v}</li>`; });
    htmlVenues += `</ul>`;
  }
  if (rejectedVenues.length > 0) {
    htmlVenues += `<p><strong>Rejected Venues:</strong></p><ul>`;
    rejectedVenues.forEach(v => { htmlVenues += `<li style="color: red;">${v}</li>`; });
    htmlVenues += `</ul>`;
  }

  const message = `Your booking for ${eventName} on ${date} from ${startTime} to ${endTime} has been processed.`;
  const messageHtml = `
    <p>Your booking for <strong>${eventName}</strong> on <strong>${date}</strong> from <strong>${startTime}</strong> to <strong>${endTime}</strong> has been processed by the admin.</p>
    ${htmlVenues}
    <p>Please check your dashboard for more details.</p>
  `;

  const templateParams = {
    to_email: clubEmail,
    from_email: APPROVAL_MAIL || '',
    title,
    subject,
    message,
    message_html: messageHtml,
    booking_count: (approvedVenues.length + rejectedVenues.length).toString(),
  };

  try {
    await emailjs.send(APPROVAL_EMAILJS_SERVICE_ID!, APPROVAL_EMAILJS_TEMPLATE_ID!, templateParams, {
      publicKey: APPROVAL_EMAILJS_PUBLIC_KEY!,
      privateKey: APPROVAL_EMAILJS_PRIVATE_KEY!,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: (err as Error).message };
  }
}
