import { Venue, Club, Booking } from './types';

// --- Venues ---
export const VENUES: Venue[] = [
  // Category A (Auto-Approval)
  { id: 'cep-104', name: 'CEP 104', category: 'A' },
  { id: 'cep-105', name: 'CEP 105', category: 'A' },
  { id: 'cep-106', name: 'CEP 106', category: 'A' },
  { id: 'cep-107', name: 'CEP 107', category: 'A' },
  { id: 'cep-204', name: 'CEP 204', category: 'A' },
  { id: 'cep-205', name: 'CEP 205', category: 'A' },
  { id: 'oat', name: 'OAT (Open Air Theatre)', category: 'A' },
  { id: 'ground', name: 'University Ground', category: 'A' },
  { id: 'cafeteria', name: 'Cafeteria', category: 'A' },
  
  // Category B (Requires Admin Approval)
  { id: 'lt1', name: 'Lecture Theatre 1 (LT1)', category: 'B' },
  { id: 'lt2', name: 'Lecture Theatre 2 (LT2)', category: 'B' },
  { id: 'lt3', name: 'Lecture Theatre 3 (LT3)', category: 'B' },
  { id: 'cep-110', name: 'CEP 110', category: 'B' },
  { id: 'cep-102', name: 'CEP 102', category: 'B' },
  { id: 'cep-108', name: 'CEP 108', category: 'B' },
];

// --- Club Groups ---
export const CLUBS: Club[] = [
  // Group A (Academic/Tech)
  { name: 'AI Club', group: 'A' },
  { name: 'Academic Committee', group: 'A' },
  { name: 'Business Club', group: 'A' },
  { name: 'DCEI', group: 'A' },
  { name: 'Debate Club', group: 'A' },
  { name: 'Developers Student Club', group: 'A' },
  { name: 'Electronics Hobby Club', group: 'A' },
  { name: 'Headrush', group: 'A' },
  { name: 'IEEE SB', group: 'A' },
  { name: 'Microsoft Students Technical Club', group: 'A' },
  { name: 'Muse', group: 'A' },
  { name: 'Programming Club', group: 'A' },
  { name: 'Research Club', group: 'A' },
  { name: 'Student Placement Cell', group: 'A' },
  { name: 'Tech Support Committee', group: 'A' },
  { name: 'Cyber Information and Network Security Club', group: 'A' },

  // Group B (Cultural)
  { name: 'Annual Festival Committee', group: 'B' },
  { name: 'Cafeteria Management Committee', group: 'B' },
  { name: 'Cultural Committee', group: 'B' },
  { name: 'DADC', group: 'B' },
  { name: 'DTG', group: 'B' },
  { name: 'Election Commission', group: 'B' },
  { name: 'Film Club', group: 'B' },
  { name: 'Hostel Management Committee', group: 'B' },
  { name: 'Heritage Club', group: 'B' },
  { name: 'Khelaiya Club', group: 'B' },
  { name: 'Music Club', group: 'B' },
  { name: 'Press Club', group: 'B' },
  { name: 'PMMC', group: 'B' },
  { name: 'Radio Club', group: 'B' },
  { name: 'Sambhav', group: 'B' },

  // Group C (Sports)
  { name: 'Cubing Club', group: 'C' },
  { name: 'Chess Club', group: 'C' },
  { name: 'Sports Committee', group: 'C' },
];

// --- Bookings Data ---
// These will be populated from API calls
export const UPCOMING_EVENTS: Booking[] = [];
export const PENDING_REQUESTS: Booking[] = [];
