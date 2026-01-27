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
  email: string;
  name: string; // Display name (e.g., "Programming Club" or "SBG Admin")
  role: Role;
  group?: ClubGroupType; // Optional, for clubs
}

export type EventType = 'co-curricular' | 'open-for-all' | 'closed-club';

export type BookingStatus = 'approved' | 'pending' | 'rejected';

export interface Booking {
  id: string;
  eventName: string;
  venueId: string;
  clubName: string;
  date: string; // ISO Date string
  startTime: string;
  endTime: string;
  status: BookingStatus;
}