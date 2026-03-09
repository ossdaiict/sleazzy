import type { Request, Response } from 'express';
import { supabase } from '../supabaseClient';
import { sendApprovalNotification } from '../services/email';
import { createBookingPendingNotifications } from '../services/notification';
import { getSemesterRange, countCoCurricularBookings, CO_CURRICULAR_LIMIT } from '../services/semesterUtils';
import { randomUUID } from 'crypto';
import { io } from '../server';

type EventType = 'co_curricular' | 'open_all' | 'closed_club';

type BookingRequestBody = {
  clubId: string;
  venueIds: string[];
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

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const RESTRICTED_START_MINUTES = 8 * 60;
const RESTRICTED_END_MINUTES = 18 * 60;

const violatesRestrictedWeekdayHours = (startUtc: Date, endUtc: Date) => {
  const startIst = new Date(startUtc.getTime() + IST_OFFSET_MS);
  const endIst = new Date(endUtc.getTime() + IST_OFFSET_MS);

  const cursor = new Date(startIst);
  cursor.setHours(0, 0, 0, 0);

  const lastDay = new Date(endIst);
  lastDay.setHours(0, 0, 0, 0);

  while (cursor <= lastDay) {
    const dayOfWeek = cursor.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    if (isWeekday) {
      const dayStart = new Date(cursor);
      const dayEnd = new Date(cursor);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const segmentStart = startIst > dayStart ? startIst : dayStart;
      const segmentEnd = endIst < dayEnd ? endIst : dayEnd;

      if (segmentEnd > segmentStart) {
        const segmentStartMinutes = (segmentStart.getTime() - dayStart.getTime()) / 60000;
        const segmentEndMinutes = (segmentEnd.getTime() - dayStart.getTime()) / 60000;
        const overlapsRestrictedHours =
          segmentStartMinutes < RESTRICTED_END_MINUTES &&
          segmentEndMinutes > RESTRICTED_START_MINUTES;

        if (overlapsRestrictedHours) {
          return true;
        }
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return false;
};

const performVenueConflictCheck = async (
  venueIds: string[],
  startTime: string,
  endTime: string
) => {
  if (!venueIds || venueIds.length === 0) return { conflict: false, message: '' };

  // Check for ANY booking that overlaps with the requested time for ANY of the requested venues
  const { data: conflicts, error } = await supabase
    .from('bookings')
    .select('venue_id, venues(name)')
    .neq('status', 'rejected')
    .in('venue_id', venueIds)
    .lt('start_time', endTime)
    .gt('end_time', startTime);

  if (error) {
    throw new Error(error.message);
  }

  if (conflicts && conflicts.length > 0) {
    // Get unique venue names that have conflicts
    const conflictingVenueNames = [...new Set(conflicts.map((c: any) => c.venues?.name || 'Unknown Venue'))];
    return {
      conflict: true,
      message: `Conflict: The following venues are already booked during this time: ${conflictingVenueNames.join(', ')}`
    };
  }

  return { conflict: false, message: '' };
};

export const createBooking = async (req: Request, res: Response) => {
  const {
    clubId,
    venueIds,
    eventType,
    eventName,
    startTime,
    endTime,
    expectedAttendees,
  } = req.body as Partial<BookingRequestBody & { venueIds: string[] }>;

  if (!clubId || !venueIds || !Array.isArray(venueIds) || venueIds.length === 0 || !eventType || !eventName || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing required fields or invalid venueIds' });
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

  if (violatesRestrictedWeekdayHours(start, end)) {
    return res.status(400).json({
      error: 'On weekdays, bookings are not allowed between 8:00 AM and 6:00 PM (IST).',
    });
  }

  const daysGap = (start.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysGap < MIN_DAYS_BY_EVENT[eventType]) {
    return res.status(400).json({
      error: `Booking must be made at least ${MIN_DAYS_BY_EVENT[eventType]} days in advance`,
    });
  }

  // 1. Validate all venues exist
  const { data: venues, error: venueError } = await supabase
    .from('venues')
    .select('id, category, capacity, name')
    .in('id', venueIds);

  if (venueError || !venues || venues.length !== venueIds.length) {
    return res.status(404).json({ error: 'One or more venues not found' });
  }

  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .select('id, group_category, name')
    .eq('id', clubId)
    .single();

  if (clubError || !club) {
    return res.status(404).json({ error: 'Club not found' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Clubs can only create bookings for themselves. Admins are allowed to create for any club.
  if (req.user.role !== 'admin') {
    const { data: requesterClub, error: requesterClubError } = await supabase
      .from('clubs')
      .select('id')
      .eq('email', req.user.email)
      .single();

    if (requesterClubError || !requesterClub) {
      return res.status(403).json({ error: 'Unable to resolve your club ownership' });
    }

    if (requesterClub.id !== clubId) {
      return res.status(403).json({ error: 'You are not allowed to create bookings for another club' });
    }
  }

  try {

    // 2. Co-curricular limit: max 2 per club per semester
    if (eventType === 'co_curricular') {
      const { start: semStart, end: semEnd } = getSemesterRange(start);
      const count = await countCoCurricularBookings(clubId, semStart, semEnd);
      if (count >= CO_CURRICULAR_LIMIT) {
        return res.status(400).json({
          error: `This club has already booked ${CO_CURRICULAR_LIMIT} co-curricular events this semester. The maximum allowed is ${CO_CURRICULAR_LIMIT}.`,
        });
      }
    }

    // 3. Check Venue Conflicts (Explicit)
    const { conflict: venueConflict, message: venueMessage } = await performVenueConflictCheck(venueIds, startTime, endTime);
    if (venueConflict) {
      return res.status(409).json({ error: venueMessage });
    }

  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }

  // 4. Validate Capacity
  for (const venue of venues) {
    if (
      typeof expectedAttendees === 'number' &&
      typeof venue.capacity === 'number' &&
      expectedAttendees > venue.capacity
    ) {
      return res.status(400).json({
        error: `Expected attendees (${expectedAttendees}) exceed capacity of ${venue.name} (${venue.capacity})`,
      });
    }
  }

  const createdBookings = [];
  const batchId = (req.body as any).batchId || randomUUID();

  for (const venue of venues) {
    let status: 'approved' | 'pending' = 'pending';
    if (venue.category === 'auto_approval') {
      status = 'approved';
    } else if (venue.category === 'needs_approval') {
      status = 'pending';
    }

    const { data: booking, error: insertError } = await supabase
      .from('bookings')
      .insert({
        club_id: clubId,
        venue_id: venue.id,
        event_name: eventName,
        start_time: startTime,
        end_time: endTime,
        status,
        user_id: req.user?.id,
        event_type: eventType,
        expected_attendees: expectedAttendees,
        batch_id: batchId
      })
      .select('*')
      .single();

    if (insertError) {
      console.error(`Failed to book venue ${venue.name}:`, insertError);
      return res.status(500).json({ error: `Failed to book venue ${venue.name}. Partial success may have occurred.` });
    }
    createdBookings.push(booking);
  }

  // Send approval notification email when any booking is pending (venue needs approval)
  const pendingForEmail = createdBookings.filter((b) => b.status === 'pending');
  if (pendingForEmail.length > 0) {
    const formatTime = (iso: string) => new Date(iso).toLocaleString();
    const itemsForEmail = pendingForEmail.map((b) => {
      const venue = venues.find((v) => v.id === b.venue_id);
      return {
        venueName: venue?.name ?? b.venue_id,
        eventName: b.event_name,
        startTime: b.start_time,
        endTime: b.end_time,
        clubName: club?.name,
        eventType: b.event_type,
      };
    });

    const itemsForNotification = pendingForEmail.map((b) => {
      const venue = venues.find((v) => v.id === b.venue_id);
      return {
        venueName: venue?.name ?? b.venue_id,
        eventName: b.event_name,
        startTime: formatTime(b.start_time),
        endTime: formatTime(b.end_time),
        clubName: club?.name,
      };
    });

    const { sent, error } = await sendApprovalNotification(itemsForEmail);
    if (!sent && error) {
      console.error('Approval email failed (bookings still created):', error);
    }

    // Also persist as in-app notifications
    await createBookingPendingNotifications(itemsForNotification);
  }

  // Emit real-time event so admin sees the new booking immediately
  const pendingBookings = createdBookings.filter((b) => b.status === 'pending');
  if (pendingBookings.length > 0) {
    io.to('admin').emit('booking:new', {
      eventName,
      clubName: club.name,
      venueNames: venues.map(v => v.name).join(', '),
      batchId,
      clubId,
    });
  }

  // Also emit for auto-approved bookings so they show up on the club's own dashboard and public calendar instantly
  const approvedBookings = createdBookings.filter((b) => b.status === 'approved');
  if (approvedBookings.length > 0) {
    io.to(`club:${clubId}`).emit('booking:status_changed', {
      bookingId: approvedBookings[0].id,
      status: 'approved',
      eventName,
      clubId,
    });
    io.emit('events:updated');
  }

  return res.status(201).json(createdBookings);
};

export const checkConflict = async (req: Request, res: Response) => {
  const clubId = (req.body.clubId || req.query.clubId) as string;
  const startTime = (req.body.startTime || req.query.startTime) as string;
  const endTime = (req.body.endTime || req.query.endTime) as string;
  const venueIdsInput = req.body.venueIds || req.query.venueIds;

  // Support venueIds from query string if comma separated
  let finalVenueIds: string[] = [];
  if (venueIdsInput) {
    if (Array.isArray(venueIdsInput)) {
      finalVenueIds = venueIdsInput as string[];
    } else if (typeof venueIdsInput === 'string') {
      finalVenueIds = venueIdsInput.split(',');
    }
  }

  if (!clubId || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {


    if (finalVenueIds.length > 0) {
      const { conflict: venueConflict, message: venueMessage } = await performVenueConflictCheck(finalVenueIds, startTime, endTime);
      if (venueConflict) {
        return res.json({ hasConflict: true, message: venueMessage });
      }
    }

    return res.json({ hasConflict: false, message: '' });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
};
export const getBusyVenues = async (req: Request, res: Response) => {
  const startTime = req.query.startTime as string;
  const endTime = req.query.endTime as string;

  console.log('[getBusyVenues] Request:', { startTime, endTime });

  if (!startTime || !endTime) {
    return res.status(400).json({ error: 'startTime and endTime are required' });
  }

  try {
    const { data: conflicts, error } = await supabase
      .from('bookings')
      .select('venue_id')
      .neq('status', 'rejected')
      .lt('start_time', endTime)
      .gt('end_time', startTime);

    if (error) {
      console.error('[getBusyVenues] Supabase Error:', error);
      return res.status(500).json({ error: error.message });
    }

    const busyVenueIds = [...new Set((conflicts || []).map((c: any) => c.venue_id))];
    console.log('[getBusyVenues] Results:', busyVenueIds);
    return res.json(busyVenueIds);
  } catch (err) {
    console.error('[getBusyVenues] Unexpected Error:', err);
    return res.status(500).json({ error: (err as Error).message });
  }
};
