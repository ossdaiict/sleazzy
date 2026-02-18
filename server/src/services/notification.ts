import { supabase } from '../supabaseClient';

export type NotificationType = 'booking_pending' | 'booking_approved' | 'booking_rejected' | 'booking_deleted' | 'general';

export interface CreateNotificationParams {
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, any>;
}

/**
 * Create a notification record in the database.
 * These are shown in the admin notifications panel.
 */
export async function createNotification(params: CreateNotificationParams) {
    const { type, title, message, metadata } = params;

    const { error } = await supabase
        .from('notifications')
        .insert({
            type,
            title,
            message,
            metadata: metadata || {},
            is_read: false,
        });

    if (error) {
        console.error('Failed to create notification:', error.message);
    }
}

/**
 * Create notifications for pending booking approvals.
 * Called alongside the email notification.
 */
export async function createBookingPendingNotifications(
    items: { venueName: string; eventName: string; startTime: string; endTime: string; clubName?: string }[]
) {
    if (items.length === 0) return;

    const notifications = items.map((item) => ({
        type: 'booking_pending' as NotificationType,
        title: 'New Booking Request',
        message: `"${item.eventName}" at ${item.venueName} by ${item.clubName || 'Unknown'} — ${item.startTime} to ${item.endTime}`,
        metadata: { venue: item.venueName, event: item.eventName, club: item.clubName },
        is_read: false,
    }));

    const { error } = await supabase.from('notifications').insert(notifications);

    if (error) {
        console.error('Failed to create booking pending notifications:', error.message);
    }
}
