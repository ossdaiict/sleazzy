import type { Request, Response } from 'express';
// Swap Supabase for your database pool
import { db } from '../db';

import { createBookingPendingNotifications } from '../services/notification';
import { getSemesterRange, countCoCurricularBookings, CO_CURRICULAR_LIMIT } from '../services/semesterUtils';
import { randomUUID } from 'crypto';
import { io } from '../server';
import { checkPendingEventReports } from '../services/eventReportService';

type EventType = 'co_curricular' | 'open_all' | 'closed_club';

type BookingRequestBody = {
  clubId: string;
  venueIds: string[];
  startTime: string;
  endTime: string;
  expectedAttendees?: number;
  event_id: string;
  permissionsLink?: string;
};

const MIN_DAYS_BY_EVENT: Record<EventType, number> = {
  co_curricular: 14,
  open_all: 7,
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
  const { rows: conflicts } = await db.query(`
    SELECT b.venue_id, v.name AS venue_name, c.name AS club_name
    FROM bookings b
    LEFT JOIN venues v ON b.venue_id = v.id
    LEFT JOIN clubs c ON b.club_id = c.id
    WHERE b.status != 'rejected'
      AND b.venue_id = ANY($1::uuid[])
      AND b.start_time < $2
      AND b.end_time > $3
  `, [venueIds, endTime, startTime]);

  if (conflicts.length > 0) {
    // Get unique venue names that have conflicts
    const conflictingVenueNames = [...new Set(conflicts.map((c: any) => `${c.venue_name || 'Unknown Venue'} (by ${c.club_name || 'Unknown Club'})`))];
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
    startTime,
    endTime,
    expectedAttendees,
    event_id,
    permissionsLink,
  } = req.body as Partial<BookingRequestBody & { venueIds: string[] }>;

  if (!clubId || !venueIds || !Array.isArray(venueIds) || venueIds.length === 0 || !startTime || !endTime || !event_id) {
    return res.status(400).json({ error: 'Missing required fields. Event selection is mandatory.' });
  }

  // Fetch event name and type
  const { rows: fetchedEventRows } = await db.query(
    'SELECT name, event_type FROM events WHERE id = $1',
    [event_id]
  );

  if (fetchedEventRows.length === 0) {
    return res.status(404).json({ error: 'Selected event not found.' });
  }

  const eventName = fetchedEventRows[0].name;
  const eventType = fetchedEventRows[0].event_type as EventType;

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

  if (event_id) {
    const { rows: eventRows } = await db.query(
      `SELECT COALESCE(e.end_date, e.date) as dynamic_end_date
       FROM events e
       WHERE e.id = $1`,
      [event_id]
    );
    if (eventRows.length > 0) {
      const eventDate = new Date(eventRows[0].dynamic_end_date);
      eventDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (eventDate < today) {
        return res.status(400).json({ error: 'Cannot create bookings for an event that has already concluded.' });
      }
    }
  }

  let issueFlag: string | null = null;
  if (violatesRestrictedWeekdayHours(start, end)) {
    issueFlag = 'Violates restricted weekday hours (8:00 AM - 6:00 PM IST)';
  }

  const daysGap = (start.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  const requiredDays = MIN_DAYS_BY_EVENT[eventType];
  if (daysGap < requiredDays) {
    const gapMsg = `Short notice booking (${Math.floor(daysGap)} days advance). Requires ${requiredDays} days advance notice.`;
    if (!issueFlag) {
      issueFlag = gapMsg;
    } else {
      issueFlag += ` | ${gapMsg}`;
    }
  }

  try {
    // 1. Validate all venues exist
    const { rows: venues } = await db.query(
      'SELECT id, category, capacity, name FROM venues WHERE id = ANY($1::uuid[])',
      [venueIds]
    );

    if (venues.length !== venueIds.length) {
      return res.status(404).json({ error: 'One or more venues not found' });
    }

    const { rows: clubRows } = await db.query(
      'SELECT id, group_category, name FROM clubs WHERE id = $1',
      [clubId]
    );
    const club = clubRows[0];

    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    // 1.5 Check if the club is blocked due to pending event reports
    const { blocked, message: blockMessage } = await checkPendingEventReports(clubId);
    if (blocked) {
      return res.status(403).json({ error: blockMessage });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Clubs can only create bookings for themselves. Admins are allowed to create for any club.
    if (req.user.role !== 'admin') {
      const { rows: requesterRows } = await db.query(
        'SELECT id FROM clubs WHERE email = $1',
        [req.user.email]
      );
      const requesterClub = requesterRows[0];

      if (!requesterClub) {
        return res.status(403).json({ error: 'Unable to resolve your club ownership' });
      }

      if (requesterClub.id !== clubId) {
        return res.status(403).json({ error: 'You are not allowed to create bookings for another club' });
      }
    }

    // 2. Co-curricular limit: checked during event registration now

    // 3. Check Venue Conflicts (Explicit)
    const { conflict: venueConflict, message: venueMessage } = await performVenueConflictCheck(venueIds, startTime, endTime);
    if (venueConflict) {
      return res.status(409).json({ error: venueMessage });
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
      if (issueFlag) {
        status = 'pending';
      } else if (venue.category === 'auto_approval') {
        status = 'approved';
      } else if (venue.category === 'needs_approval') {
        status = 'pending';
      }

      const { rows: insertRows } = await db.query(`
        INSERT INTO bookings (club_id, venue_id, start_time, end_time, status, user_id, expected_attendees, batch_id, event_id, issue_flag, permissions_link)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        clubId,
        venue.id,
        startTime,
        endTime,
        status,
        req.user?.id || null,
        expectedAttendees || null,
        batchId,
        event_id,
        issueFlag,
        permissionsLink || null
      ]);

      if (insertRows.length === 0) {
        throw new Error(`Failed to insert booking for venue ${venue.name}`);
      }
      
      createdBookings.push(insertRows[0]);
    }

    // Send approval notification email when any booking is pending (venue needs approval)
    const pendingForEmail = createdBookings.filter((b) => b.status === 'pending');
    if (pendingForEmail.length > 0) {
      const formatTime = (iso: string) => new Date(iso).toLocaleString();


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

      const { sendBulkBookingProcessedEmail } = await import('../services/email');
      const clubEmailRows = await db.query('SELECT email FROM clubs WHERE id = $1', [clubId]);
      const clubEmail = clubEmailRows.rows[0]?.email;
      
      if (clubEmail) {
        const approvedVenues = approvedBookings.map((b) => {
          const venue = venues.find((v) => v.id === b.venue_id);
          return venue?.name || 'Venue';
        });
        
        const date = new Date(approvedBookings[0].start_time).toLocaleDateString('en-IN');
        const startStr = new Date(approvedBookings[0].start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const endStr = new Date(approvedBookings[0].end_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        
        await sendBulkBookingProcessedEmail(
          clubEmail,
          eventName,
          date,
          startStr,
          endStr,
          approvedVenues,
          []
        );
      }
    }

    return res.status(201).json(createdBookings);
  } catch (err) {
    console.error('Create booking failed:', err);
    return res.status(500).json({ error: (err as Error).message });
  }
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
    const { rows: conflicts } = await db.query(`
      SELECT DISTINCT venue_id
      FROM bookings
      WHERE status != 'rejected'
        AND start_time < $1
        AND end_time > $2
    `, [endTime, startTime]);

    const busyVenueIds = conflicts.map((c: any) => c.venue_id);
    console.log('[getBusyVenues] Results:', busyVenueIds);
    
    return res.json(busyVenueIds);
  } catch (err) {
    console.error('[getBusyVenues] Unexpected Error:', err);
    return res.status(500).json({ error: (err as Error).message });
  }
};