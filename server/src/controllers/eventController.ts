import { Request, Response } from 'express';
import { db } from '../db';
import { getClubForUser } from '../utils/clubAuth';
import { checkPendingEventReports } from '../services/eventReportService';
import { getSemesterRange, countCoCurricularBookings, CO_CURRICULAR_LIMIT } from '../services/semesterUtils';

export const createEvent = async (req: Request, res: Response) => {
  const { name, date, venue, end_date, event_type } = req.body;

  if (!name || !date) {
    return res.status(400).json({ error: 'Name and date are required' });
  }

  // Security: Validate event_type enum
  const validEventTypes = ['open_all', 'co_curricular', 'closed_club'];
  const finalEventType = event_type || 'open_all';
  if (!validEventTypes.includes(finalEventType)) {
    return res.status(400).json({ error: 'Invalid event type' });
  }

  const isAdmin = req.user?.role === 'admin';

  if (!isAdmin) {
    type EventType = 'co_curricular' | 'open_all' | 'closed_club';
    const MIN_DAYS_BY_EVENT: Record<EventType, number> = {
      co_curricular: 14,
      open_all: 7,
      closed_club: 1,
    };

    const eventStartDate = new Date(date);
    const daysGap = (eventStartDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    
    if (daysGap < MIN_DAYS_BY_EVENT[finalEventType as EventType]) {
      return res.status(400).json({
        error: `Event registration must be made at least ${MIN_DAYS_BY_EVENT[finalEventType as EventType]} days in advance.`,
      });
    }
  }

  try {
    let clubId: string;

    if (isAdmin && req.body.club_id) {
      // Allow admin to create events on behalf of a specific club
      clubId = req.body.club_id;
    } else {
      const club = await getClubForUser(req);
      if (!club) {
        return res.status(404).json({ error: 'Club not found for this account' });
      }
      clubId = club.id;
    }

    // Check if the club is blocked due to pending event reports
    const { blocked, message: blockMessage } = await checkPendingEventReports(clubId);
    if (blocked && !isAdmin) {
      return res.status(403).json({ error: blockMessage });
    }

    if (!isAdmin && finalEventType === 'co_curricular') {
      const start = new Date(date);
      const { start: semStart, end: semEnd } = getSemesterRange(start);
      // We check existing events for this club that are co-curricular in the same semester.
      // Alternatively, the limit could be on events, not bookings. The user said "cocurricular event registration limit must be check".
      // Let's use the existing countCoCurricularBookings, which counts bookings, or just query events directly.
      // `countCoCurricularBookings` in `semesterUtils` actually counts events or bookings?
      // Wait, let's just use the existing function:
      const count = await countCoCurricularBookings(clubId, semStart, semEnd);
      if (count >= CO_CURRICULAR_LIMIT) {
        return res.status(400).json({
          error: `This club has already registered ${CO_CURRICULAR_LIMIT} co-curricular events this semester. The maximum allowed is ${CO_CURRICULAR_LIMIT}.`,
        });
      }
    }

    const { rows } = await db.query(
      `INSERT INTO events (club_id, name, date, venue, end_date, event_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [clubId, name, date, venue || null, end_date || null, finalEventType]
    );

    return res.status(201).json(rows[0]);
  } catch (error: any) {
    console.error('Error creating event:', error);
    return res.status(500).json({ error: 'Failed to create event' });
  }
};

export const getEvents = async (req: Request, res: Response) => {
  try {
    const club = await getClubForUser(req);
    if (!club) {
      return res.status(404).json({ error: 'Club not found for this account' });
    }

    const { rows } = await db.query(
      `SELECT e.*, COALESCE(MAX(b.end_time), e.end_date, e.date) as dynamic_end_date
       FROM events e
       LEFT JOIN bookings b ON e.id = b.event_id AND b.status != 'rejected'
       WHERE e.club_id = $1 AND e.status != 'cancelled'
       GROUP BY e.id
       ORDER BY e.date DESC, e.created_at DESC`,
      [club.id]
    );

    return res.json(rows);
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, date, end_date, venue, event_type } = req.body;

  try {
    const club = await getClubForUser(req);
    if (!club) {
      return res.status(404).json({ error: 'Club not found for this account' });
    }

    const checkRes = await db.query('SELECT club_id FROM events WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (checkRes.rows[0].club_id !== club.id) {
      return res.status(403).json({ error: 'You do not have permission to edit this event' });
    }

    const updateFields: Record<string, any> = {};
    if (name !== undefined) updateFields.name = name;
    if (date !== undefined) updateFields.date = date;
    if (end_date !== undefined) updateFields.end_date = end_date;
    if (venue !== undefined) updateFields.venue = venue;
    if (event_type !== undefined) updateFields.event_type = event_type;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    const keys = Object.keys(updateFields);
    const setString = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = Object.values(updateFields);
    values.push(id);

    const { rows } = await db.query(
      `UPDATE events SET ${setString} WHERE id = $${values.length} RETURNING *`,
      values
    );

    return res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating event:', error);
    return res.status(500).json({ error: 'Failed to update event' });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const club = await getClubForUser(req);
    if (!club) {
      return res.status(404).json({ error: 'Club not found for this account' });
    }

    const checkRes = await db.query('SELECT club_id FROM events WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (checkRes.rows[0].club_id !== club.id) {
      return res.status(403).json({ error: 'You do not have permission to delete this event' });
    }

    await db.query('BEGIN');

    // 1. Archive event
    await db.query(`
      INSERT INTO archived_events (id, club_id, name, date, end_date, venue, event_type, status, report_exempt, created_at, updated_at)
      SELECT id, club_id, name, date, end_date, venue, event_type, status, report_exempt, created_at, updated_at
      FROM events WHERE id = $1
    `, [id]);

    // 2. Archive bookings
    await db.query(`
      INSERT INTO archived_bookings (id, club_id, venue_id, start_time, end_time, status, user_id, event_name, event_type, expected_attendees, batch_id, event_id, created_at, updated_at)
      SELECT id, club_id, venue_id, start_time, end_time, status, user_id, event_name, event_type, expected_attendees, batch_id, event_id, created_at, updated_at
      FROM bookings WHERE event_id = $1
    `, [id]);

    // 3. Archive event reports
    await db.query(`
      INSERT INTO archived_event_reports (id, club_id, event_id, level, level_description, report_doc_link, participants_sheet_link, photos_drive_link, awards_doc_link, created_at, updated_at)
      SELECT id, club_id, event_id, level, level_description, report_doc_link, participants_sheet_link, photos_drive_link, awards_doc_link, created_at, updated_at
      FROM event_reports WHERE event_id = $1
    `, [id]);

    // 4. Delete from active tables (cascading might handle some, but explicit is safer)
    await db.query('DELETE FROM event_reports WHERE event_id = $1', [id]);
    await db.query('DELETE FROM bookings WHERE event_id = $1', [id]);
    await db.query('DELETE FROM events WHERE id = $1', [id]);

    await db.query('COMMIT');

    return res.json({ success: true, message: 'Event and associated data deleted and archived successfully' });
  } catch (error: any) {
    await db.query('ROLLBACK');
    console.error('Error deleting event:', error);
    return res.status(500).json({ error: 'Failed to delete event' });
  }
};

export const getPublicEvents = async (_req: Request, res: Response) => {
  try {
    const { rows } = await db.query(`
      SELECT e.*, 
             json_build_object('name', c.name) AS clubs
      FROM events e
      LEFT JOIN clubs c ON e.club_id = c.id
      WHERE e.event_type IN ('open_all', 'co_curricular')
        AND e.end_date >= NOW()
      ORDER BY e.date ASC
    `);

    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
