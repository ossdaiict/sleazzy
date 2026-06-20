export type Role = 'club' | 'admin';

export type VenueCategory = 'A' | 'B';

export interface Venue {
  id: string;
  name: string;
  category: VenueCategory;
  capacity?: number;
}

export type ClubGroupType = 'A' | 'B' | 'C';

export interface Club {
  name: string;
  group: ClubGroupType;
}

export interface User {
  id?: string;
  email: string;
  name: string; // Display name (e.g., "Programming Club" or "Sleazzy Admin")
  role: Role;
  group?: ClubGroupType; // Optional, for clubs
  clubId?: string;
}

export interface ClubMember {
  id: string;
  club_id: string;
  full_name: string;
  roll_number: string | null;
  email: string | null;
  designation: string | null;
  phone: string | null;
  is_core_member: boolean;
  tenure_start_date: string | null;
  tenure_end_date: string | null;
  tenure_end_reason: string | null;
  promotion_history: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppEvent {
  id: string;
  club_id: string;
  name: string;
  date: string;
  venue: string;
  created_at: string;
  updated_at: string;
}

export type EventType = 'co_curricular' | 'open_all' | 'closed_club';

export type BookingStatus = 'approved' | 'pending' | 'rejected';

export interface Booking {
  id: string;
  eventName: string;
  venueId: string;
  clubName: string;
  date: string; // ISO Date string
  endDate?: string; // ISO Date string
  startTime: string;
  endTime: string;
  status: BookingStatus;
  eventType?: EventType;
  expectedAttendees?: number;
  batchId?: string;
  clubId?: string;
  isPublic: boolean;
  startTimeISO?: string;
  endTimeISO?: string;
  venueName?: string;
  event_id?: string;
}

export interface GroupedBooking extends Omit<Booking, 'id' | 'venueId' | 'status'> {
  ids: string[];
  venueIds: string[];
  venueName: string; // Comma-separated or compound string
  status: BookingStatus | 'partial'; // Support 'partial' for mixed statuses
  bookings: Booking[]; // The original individual items
}