/**
 * Centralized Socket.IO event names
 */
export const SOCKET_EVENTS = {
    // Client to Server
    JOIN_ADMIN: 'join:admin',
    JOIN_CLUB: 'join:club',

    // Server to Client
    BOOKING_NEW: 'booking:new',
    BOOKING_STATUS_CHANGED: 'booking:status_changed',
    EVENTS_UPDATED: 'events:updated',
    NOTIFICATIONS_UPDATED: 'notifications:updated',
} as const;
