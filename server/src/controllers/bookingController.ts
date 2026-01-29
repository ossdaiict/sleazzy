import type { Request, Response } from 'express';
import { supabase } from '../supabaseClient';

type EventType = 'co_curricular' | 'open_all' | 'closed_club';

type BookingRequestBody = {
  clubId: string;
  venueId: string;
  eventType: EventType;
  eventName: string;
  startTime: string;
  endTime: string;
  expectedAttendees?: number;
};

const MIN_DAYS_BY_EVENT: Record<EventType, number> = {
  co_curricular: 30,
  open_all: 20,
  closed_club: 1,
};

const isValidDate = (value: string) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const performGroupConflictCheck = async (
  clubId: string,
  startTime: string,
  endTime: string
) => {
  // 1. Get the group_category of the requesting club
  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .select('group_category')
    .eq('id', clubId)
    .single();

  if (clubError || !club) {
    throw new Error('Club not found for conflict check');
  }

  // 2. Check for overlapping bookings from clubs in the same group
  // We need to find if ANY booking exists where:
  // - Status is NOT rejected
  // - Time overlaps: (StartA < EndB) and (EndA > StartB)
  // - Club's group_category matches
  const { data: conflicts, error: conflictError } = await supabase
    .from('bookings')
    .select('id, clubs!inner(group_category)')
    .neq('status', 'rejected')
    .lt('start_time', endTime)
    .gt('end_time', startTime)
    .eq('clubs.group_category', club.group_category);

  if (conflictError) {
    throw new Error(conflictError.message);
  }

  if (conflicts && conflicts.length > 0) {
    return { conflict: true, message: `Conflict: Another club in group '${club.group_category}' has a booking during this time.` };
  }

  return { conflict: false, message: '' };
};

export const createBooking = async (req: Request, res: Response) => {
  const {
    clubId,
    venueId,
    eventType,
    eventName,
    startTime,
    endTime,
    expectedAttendees,
  } = req.body as Partial<BookingRequestBody>;

  if (!clubId || !venueId || !eventType || !eventName || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!Object.keys(MIN_DAYS_BY_EVENT).includes(eventType)) {
    return res.status(400).json({ error: 'Invalid eventType' });
  }

  if (!isValidDate(startTime) || !isValidDate(endTime)) {
    return res.status(400).json({ error: 'Invalid startTime or endTime' });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    return res.status(400).json({ error: 'endTime must be after startTime' });
  }

  const daysGap = (start.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysGap < MIN_DAYS_BY_EVENT[eventType]) {
    return res.status(400).json({
      error: `Booking must be made at least ${MIN_DAYS_BY_EVENT[eventType]} days in advance`,
    });
  }

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id, category, capacity')
    .eq('id', venueId)
    .single();

  if (venueError || !venue) {
    return res.status(404).json({ error: 'Venue not found' });
  }

  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .select('id, group_category')
    .eq('id', clubId)
    .single();

  if (clubError || !club) {
    return res.status(404).json({ error: 'Club not found' });
  }

  // REPLACED RPC CALL WITH TS LOGIC
  try {
    const { conflict, message } = await performGroupConflictCheck(clubId, startTime, endTime);
    if (conflict) {
      return res.status(409).json({ error: message });
    }
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }

  if (
    typeof expectedAttendees === 'number' &&
    typeof venue.capacity === 'number' &&
    expectedAttendees > venue.capacity
  ) {
    return res.status(400).json({
      error: `Expected attendees exceed venue capacity of ${venue.capacity}`,
    });
  }

  let status: 'approved' | 'pending' = 'pending';
  if (venue.category === 'auto_approval') {
    status = 'approved';
  } else if (venue.category === 'needs_approval') {
    status = 'pending';
  } else {
    return res.status(400).json({ error: 'Invalid venue category' });
  }

  const { data: booking, error: insertError } = await supabase
    .from('bookings')
    .insert({
      club_id: clubId,
      venue_id: venueId,
      event_name: eventName,
      start_time: startTime,
      end_time: endTime,
      status,
      user_id: req.user?.id,
      event_type: eventType,
      expected_attendees: expectedAttendees,
    })
    .select('*')
    .single();

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  return res.status(201).json(booking);
};

export const checkConflict = async (req: Request, res: Response) => {
  const { clubId, startTime, endTime } = req.query as {
    clubId: string;
    startTime: string;
    endTime: string;
  };

  if (!clubId || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  try {
    const { conflict, message } = await performGroupConflictCheck(clubId, startTime, endTime);
    return res.json({ hasConflict: conflict, message });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
};
