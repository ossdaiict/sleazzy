import express from 'express';
// Swap Supabase for your database pool
import { db } from '../db';
import authMiddleware from '../middleware/auth';
import { createNotification } from '../services/notification';
import { getSemesterRange, countCoCurricularBookings, CO_CURRICULAR_LIMIT } from '../services/semesterUtils';
import { io } from '../server';

const router = express.Router();

const adminOnly = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
};

router.use(authMiddleware, adminOnly);

// Reusable base query to fake the Supabase nested object structure
const baseBookingQuery = `
  SELECT b.*, 
         json_build_object('name', c.name) AS clubs,
         json_build_object('name', v.name) AS venues
  FROM bookings b
  LEFT JOIN clubs c ON b.club_id = c.id
  LEFT JOIN venues v ON b.venue_id = v.id
`;

router.get('/pending', async (_req, res) => {
  try {
    const { rows } = await db.query(`
      ${baseBookingQuery}
      WHERE b.status = 'pending'
      ORDER BY b.start_time ASC
    `);
    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/bookings', async (_req, res) => {
  try {
    const { rows } = await db.query(`
      ${baseBookingQuery}
      ORDER BY b.start_time DESC
    `);
    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/bookings/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, adminNote } = req.body as {
    status?: 'approved' | 'rejected';
    adminNote?: string;
  };

  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const { rows } = await db.query(`
      UPDATE bookings SET status = $1 
      WHERE id = $2 
      RETURNING *
    `, [status, id]);

    if (rows.length === 0) throw new Error('Booking not found');
    const data = rows[0];

    // Create a notification for the status change
    await createNotification({
      type: status === 'approved' ? 'booking_approved' : 'booking_rejected',
      title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `"${data.event_name}" has been ${status}.`,
      userId: data.user_id,
      metadata: { bookingId: id, status },
    });

    // Emit real-time event to the specific club room
    io.to(`club:${data.club_id}`).emit('booking:status_changed', {
      bookingId: id,
      status,
      eventName: data.event_name,
      clubId: data.club_id,
    });

    if (status === 'approved') {
      io.emit('events:updated');
    }

    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/bookings/:id/visibility', async (req, res) => {
  const { id } = req.params;
  const { is_public } = req.body as { is_public?: boolean };

  if (typeof is_public !== 'boolean') {
    return res.status(400).json({ error: 'is_public must be a boolean' });
  }

  try {
    const { rows } = await db.query(`
      UPDATE bookings SET is_public = $1 
      WHERE id = $2 
      RETURNING *
    `, [is_public, id]);

    if (rows.length === 0) throw new Error('Booking not found');
    
    return res.json(rows[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const {
    event_name, venue_id, start_time, end_time,
    event_type, expected_attendees, status, is_public,
  } = req.body;

  const updateFields: Record<string, any> = {};
  if (event_name !== undefined) updateFields.event_name = event_name;
  if (venue_id !== undefined) updateFields.venue_id = venue_id;
  if (start_time !== undefined) updateFields.start_time = start_time;
  if (end_time !== undefined) updateFields.end_time = end_time;
  if (event_type !== undefined) updateFields.event_type = event_type;
  if (expected_attendees !== undefined) updateFields.expected_attendees = expected_attendees;
  if (status !== undefined) updateFields.status = status;
  if (is_public !== undefined) updateFields.is_public = is_public;

  if (Object.keys(updateFields).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  try {
    // Co-curricular limit check
    if (event_type === 'co_curricular') {
      const existRes = await db.query('SELECT club_id, start_time, event_type FROM bookings WHERE id = $1', [id]);
      if (existRes.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
      
      const existing = existRes.rows[0];
      const eventDate = new Date(start_time || existing.start_time);
      const { start: semStart, end: semEnd } = getSemesterRange(eventDate);
      const count = await countCoCurricularBookings(existing.club_id, semStart, semEnd, id);
      
      if (count >= CO_CURRICULAR_LIMIT) {
        return res.status(400).json({ error: `This club has already booked ${CO_CURRICULAR_LIMIT} co-curricular events.` });
      }
    }

    // Dynamically build the SQL SET string (e.g. "event_name = $1, status = $2")
    const keys = Object.keys(updateFields);
    const setString = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = Object.values(updateFields);
    values.push(id); // Push ID as the final parameter for the WHERE clause

    // We use a CTE (WITH clause) to perform the update and then immediately join the club/venue names
    const { rows } = await db.query(`
      WITH updated AS (
        UPDATE bookings SET ${setString} WHERE id = $${values.length} RETURNING *
      )
      SELECT u.*, 
             json_build_object('name', c.name) AS clubs,
             json_build_object('name', v.name) AS venues
      FROM updated u
      LEFT JOIN clubs c ON u.club_id = c.id
      LEFT JOIN venues v ON u.venue_id = v.id
    `, values);

    if (rows.length === 0) throw new Error('Update failed');
    const data = rows[0];

    io.emit('events:updated');
    io.to(`club:${data.club_id}`).emit('booking:status_changed', {
      bookingId: id,
      status: data.status,
      eventName: data.event_name,
      clubId: data.club_id,
      userId: data.user_id,
    });

    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/bookings/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const fetchRes = await db.query('SELECT club_id, event_name FROM bookings WHERE id = $1', [id]);
    const booking = fetchRes.rows[0];

    await db.query('DELETE FROM bookings WHERE id = $1', [id]);

    io.emit('events:updated');
    if (booking) {
      io.to(`club:${booking.club_id}`).emit('booking:status_changed', {
        bookingId: id,
        status: 'deleted' as any,
        eventName: booking.event_name,
        clubId: booking.club_id,
      });
    }

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/bookings', async (req, res) => {
  const { club_id, venue_ids, event_name, start_time, end_time, event_type, expected_attendees, is_public } = req.body;

  if (!club_id || !event_name || !start_time || !end_time || !venue_ids || !Array.isArray(venue_ids) || venue_ids.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    if (event_type === 'co_curricular') {
      const eventDate = new Date(start_time);
      const { start: semStart, end: semEnd } = getSemesterRange(eventDate);
      const count = await countCoCurricularBookings(club_id, semStart, semEnd);
      if (count >= CO_CURRICULAR_LIMIT) {
        return res.status(400).json({ error: `Limit of ${CO_CURRICULAR_LIMIT} co-curricular events reached.` });
      }
    }

    const { randomUUID } = await import('crypto');
    const batchId = randomUUID();
    const createdBookings = [];

    // Loop through venue_ids and insert bookings
    for (const venueId of venue_ids) {
      const { rows } = await db.query(`
        WITH inserted AS (
          INSERT INTO bookings (club_id, venue_id, event_name, start_time, end_time, event_type, expected_attendees, is_public, status, batch_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', $9)
          RETURNING *
        )
        SELECT i.*, 
               json_build_object('name', c.name) AS clubs,
               json_build_object('name', v.name) AS venues
        FROM inserted i
        LEFT JOIN clubs c ON i.club_id = c.id
        LEFT JOIN venues v ON i.venue_id = v.id
      `, [club_id, venueId, event_name, start_time, end_time, event_type || null, expected_attendees || 0, is_public ?? false, batchId]);
      
      createdBookings.push(rows[0]);
    }

    await createNotification({
      type: 'booking_approved',
      title: 'Event Created by Admin',
      message: `"${event_name}" has been created and auto-approved.`,
      userId: createdBookings[0].user_id,
      metadata: { batchId, venues: venue_ids },
    });

    io.emit('events:updated');
    io.to(`club:${club_id}`).emit('booking:status_changed', {
      bookingId: createdBookings[0].id,
      status: 'approved',
      eventName: event_name,
      clubId: club_id,
    });

    return res.status(201).json(createdBookings);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    // Run all count queries simultaneously using Promise.all
    const [pendingRes, scheduledRes, clubsRes] = await Promise.all([
      db.query("SELECT COUNT(*) FROM bookings WHERE status = 'pending'"),
      db.query("SELECT COUNT(*) FROM bookings WHERE status = 'approved'"),
      db.query("SELECT COUNT(*) FROM clubs")
    ]);

    return res.json({
      pending: parseInt(pendingRes.rows[0].count, 10) || 0,
      scheduled: parseInt(scheduledRes.rows[0].count, 10) || 0,
      conflicts: 0, 
      activeClubs: parseInt(clubsRes.rows[0].count, 10) || 0
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/clubs', async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM clubs ORDER BY name ASC');
    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/clubs/:id', async (req, res) => {
  const { id } = req.params;
  const { name, group_category } = req.body;

  const updateFields: Record<string, any> = {};
  if (name !== undefined) updateFields.name = name;
  if (group_category !== undefined) updateFields.group_category = group_category;

  if (Object.keys(updateFields).length === 0) return res.status(400).json({ error: 'No fields to update' });

  try {
    const keys = Object.keys(updateFields);
    const setString = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = Object.values(updateFields);
    values.push(id);

    const { rows } = await db.query(`UPDATE clubs SET ${setString} WHERE id = $${values.length} RETURNING *`, values);
    
    if (rows.length === 0) throw new Error('Club not found');
    return res.json(rows[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/clubs/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const clubRes = await db.query('SELECT * FROM clubs WHERE id = $1', [id]);
    const club = clubRes.rows[0];
    if (!club) return res.status(404).json({ error: 'Club not found' });

    // Enforce proper deletion order to respect Foreign Key constraints
    await db.query('DELETE FROM bookings WHERE club_id = $1', [id]);
    await db.query('DELETE FROM clubs WHERE id = $1', [id]);

    const profileRes = await db.query('SELECT id FROM profiles WHERE email = $1', [club.email]);
    if (profileRes.rows.length > 0) {
      const profileId = profileRes.rows[0].id;
      await db.query('DELETE FROM profiles WHERE id = $1', [profileId]);
      
      // Delete from auth.users (Replaces supabase.auth.admin.deleteUser)
      await db.query('DELETE FROM auth.users WHERE id = $1', [profileId]);
    }

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/clubs/:id/bookings', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query(`
      ${baseBookingQuery}
      WHERE b.club_id = $1
      ORDER BY b.start_time DESC
    `, [id]);
    
    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/club-members/all', async (_req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT cm.id, cm.club_id, cm.full_name, cm.roll_number, cm.email, cm.designation, cm.phone,
             cm.tenure_start_date, cm.tenure_end_date, cm.tenure_end_reason, cm.promotion_history, c.name as club_name
      FROM club_members cm
      JOIN clubs c ON cm.club_id = c.id
      ORDER BY c.name ASC,
               CASE 
                 WHEN cm.designation = 'Convenor' THEN 1
                 WHEN cm.designation = 'Dy. Convener' THEN 2
                 WHEN cm.designation = 'Core' THEN 3
                 ELSE 4
               END ASC,
               cm.full_name ASC
    `);
    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;