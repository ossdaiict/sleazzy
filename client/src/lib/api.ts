import { ApiError, NetworkError } from './errors';

type ApiOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
};

const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || '';
};

const normalizeBaseUrl = (value: string) => value.replace(/\/$/, '');

const getApiBaseUrls = () => {
  const configured = normalizeBaseUrl(getApiBaseUrl());
  const urls: string[] = [];

  if (configured) {
    urls.push(configured);
  }

  if (typeof window !== 'undefined') {
    const sameOrigin = normalizeBaseUrl(window.location.origin);
    if (sameOrigin && !urls.includes(sameOrigin)) {
      urls.push(sameOrigin);
    }
  }

  if (urls.length === 0) {
    urls.push('');
  }

  return urls;
};

const getSupabaseAccessToken = () => {
  if (typeof window === 'undefined') return null;

  const directToken = localStorage.getItem('supabase_access_token');
  if (directToken) return directToken;

  const keys = Object.keys(localStorage);
  const authKey = keys.find((key) => key.endsWith('-auth-token'));
  if (!authKey) return null;

  try {
    const raw = localStorage.getItem(authKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { access_token?: string };
    return parsed.access_token || null;
  } catch {
    return null;
  }
};

export const apiRequest = async <T>(path: string, options: ApiOptions = {}): Promise<T> => {
  const { method = 'GET', body, auth = false, headers = {} } = options;
  const baseUrls = getApiBaseUrls();
  const shouldDebugRegister = path.includes('/api/auth/register');

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (auth) {
    const token = getSupabaseAccessToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response | null = null;
  let lastFetchError: unknown = null;

  for (const [index, baseUrl] of baseUrls.entries()) {
    const isLastBaseUrl = index === baseUrls.length - 1;
    const url = baseUrl ? `${baseUrl}${path}` : path;

    if (shouldDebugRegister) {
      console.info('[apiRequest][register] Attempt', {
        method,
        url,
        attempt: index + 1,
        totalAttempts: baseUrls.length,
      });
    }

    try {
      response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const isProxyStyleBadRequest = response.status === 400 && !contentType.includes('application/json');

      if (shouldDebugRegister) {
        console.info('[apiRequest][register] Response', {
          url,
          status: response.status,
          contentType,
        });
      }

      // If target host returns a proxy/gateway style failure, try the next base URL.
      if (!isLastBaseUrl && (response.status >= 500 || isProxyStyleBadRequest)) {
        if (shouldDebugRegister) {
          console.warn('[apiRequest][register] Falling back to next API base URL', {
            url,
            status: response.status,
            isProxyStyleBadRequest,
          });
        }
        continue;
      }

      break;
    } catch (err) {
      lastFetchError = err;
      if (shouldDebugRegister) {
        console.error('[apiRequest][register] Network error on attempt', {
          url,
          error: err,
        });
      }
      if (isLastBaseUrl) {
        throw new NetworkError(
          err instanceof Error && err.message?.toLowerCase().includes('fetch')
            ? 'Unable to reach the server. Please check your connection.'
            : 'Network error. Please try again.'
        );
      }
    }
  }

  if (!response) {
    if (shouldDebugRegister) {
      console.error('[apiRequest][register] No response from any API base URL', { baseUrls });
    }
    throw new NetworkError(
      lastFetchError instanceof Error && lastFetchError.message?.toLowerCase().includes('fetch')
        ? 'Unable to reach the server. Please check your connection.'
        : 'Network error. Please try again.'
    );
  }

  if (!response.ok) {
    let message = response.statusText;
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errorBody = await response.json().catch(() => ({}));
        message =
          (errorBody as { error?: string; message?: string }).error ??
          (errorBody as { error?: string; message?: string }).message ??
          message;
      } else {
        const text = await response.text().catch(() => '');
        if (text) {
          message = text.length > 200 ? text.slice(0, 200) : text;
        }
      }
    } catch {
      // response.text() could fail; keep statusText
    }
    if (shouldDebugRegister) {
      console.error('[apiRequest][register] API error response', {
        status: response.status,
        message,
      });
    }
    throw new ApiError(message, response.status);
  }

  try {
    return (await response.json()) as Promise<T>;
  } catch {
    throw new ApiError('Invalid response from server.', response.status);
  }
};

export type ApiVenue = {
  id: string;
  name: string;
  category: string;
  capacity?: number | null;
};

export type ApiClub = {
  id: string;
  name: string;
  group_category: string;
};

export type ApiBooking = {
  id: string;
  event_name: string;
  start_time: string;
  end_time: string;
  status: 'approved' | 'pending' | 'rejected';
  club_id: string;
  venue_id: string;
  clubs?: { name?: string | null } | null;
  venues?: { name?: string | null } | null;
  event_type?: string;
  expected_attendees?: number;
  batch_id?: string;
  is_public?: boolean;
};

export const mapBooking = (booking: ApiBooking) => {
  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);

  return {
    id: booking.id,
    eventName: booking.event_name,
    venueId: booking.venue_id,
    venueName: booking.venues?.name || booking.venue_id,
    clubName: booking.clubs?.name || booking.club_id,
    date: start.toISOString(),
    endDate: end.toISOString(),
    startTime: start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    endTime: end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    startTimeISO: booking.start_time,
    endTimeISO: booking.end_time,
    status: booking.status,
    eventType: booking.event_type as any,
    expectedAttendees: booking.expected_attendees,
    batchId: booking.batch_id,
    isPublic: booking.is_public ?? false,
    clubId: booking.club_id,
  };
};

import { Booking, GroupedBooking } from '../types';

/**
 * Groups multiple single-venue bookings into logical multi-venue events.
 * It combines bookings with the same batchId or (eventName, clubName, date, startTime, and eventType).
 * 
 * @param bookings - The array of individual api bookings
 * @param venues - The array of available venues to resolve venue names
 * @returns An array of GroupedBooking where multi-venue requests are consolidated
 */
export const groupBookings = (bookings: Booking[], venues: ApiVenue[] = []): GroupedBooking[] => {
  const grouped = new Map<string, GroupedBooking>();

  const getVenueName = (id: string, booking: Booking) => {
    const venue = venues.find(v => v.id === id);
    if (venue) return venue.name;
    return (booking as any).venueName || id;
  };

  const STATUS_PRIORITY: Record<GroupedBooking['status'], number> = {
    'approved': 4,
    'pending': 3,
    'partial': 2,
    'rejected': 1
  };

  for (const b of bookings) {
    // Group by batchId OR (eventName + clubName + date + startTime + eventType)
    const key = b.batchId || `${b.eventName}-${b.clubName}-${b.date}-${b.startTime}-${b.eventType}`;

    if (grouped.has(key)) {
      const existing = grouped.get(key)!;

      // Find if we already have this venue in this group
      const existingVenueIndex = existing.bookings.findIndex(eb => eb.venueId === b.venueId);

      if (existingVenueIndex !== -1) {
        // Status prioritization: only keep the "best" status for a venue in a group
        const existingStatus = existing.bookings[existingVenueIndex].status;
        if (STATUS_PRIORITY[b.status] > STATUS_PRIORITY[existingStatus]) {
          // Replace the inferior booking entry
          const oldBookingId = existing.bookings[existingVenueIndex].id;
          existing.bookings[existingVenueIndex] = b;
          existing.ids = existing.ids.filter(id => id !== oldBookingId).concat(b.id);
        }
        // If the new one is same or worse priority, we just ignore it for the group display
      } else {
        // New venue for this group
        existing.ids.push(b.id);
        existing.venueIds.push(b.venueId);
        existing.bookings.push(b);
      }

      // Re-calculate display venue names from the unique set of active bookings
      existing.venueName = existing.bookings
        .map(book => getVenueName(book.venueId, book))
        .filter((val, idx, self) => self.indexOf(val) === idx)
        .join(', ');

      // Re-calculate combined status
      const statuses = existing.bookings.map(book => book.status);
      const allApproved = statuses.every(s => s === 'approved');
      const allRejected = statuses.every(s => s === 'rejected');
      const anyPending = statuses.some(s => s === 'pending');

      if (allApproved) {
        existing.status = 'approved';
      } else if (allRejected) {
        existing.status = 'rejected';
      } else if (anyPending) {
        // If there are pending items, the whole group is pending or partial
        existing.status = statuses.every(s => s === 'pending') ? 'pending' : 'partial';
      } else {
        existing.status = 'partial';
      }
    } else {
      grouped.set(key, {
        ...b,
        ids: [b.id],
        venueIds: [b.venueId],
        venueName: getVenueName(b.venueId, b),
        bookings: [b],
        status: b.status,
      });
    }
  }

  return Array.from(grouped.values());
};
