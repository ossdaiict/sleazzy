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

  for (const baseUrl of baseUrls) {
    const url = baseUrl ? `${baseUrl}${path}` : path;
    try {
      response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      // If target host returns a 5xx/invalid gateway style error, try the next base URL.
      if (response.status >= 500 && baseUrl !== baseUrls[baseUrls.length - 1]) {
        continue;
      }

      break;
    } catch (err) {
      lastFetchError = err;
      if (baseUrl === baseUrls[baseUrls.length - 1]) {
        throw new NetworkError(
          err instanceof Error && err.message?.toLowerCase().includes('fetch')
            ? 'Unable to reach the server. Please check your connection.'
            : 'Network error. Please try again.'
        );
      }
    }
  }

  if (!response) {
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
    startTime: start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    endTime: end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    status: booking.status,
    eventType: booking.event_type as any,
    expectedAttendees: booking.expected_attendees,
    batchId: booking.batch_id,
    isPublic: booking.is_public ?? false,
  };
};
