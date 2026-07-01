import express from 'express';
// 1. Swap Supabase for your new database pool
import { db } from '../db'; 
import authMiddleware from '../middleware/auth';
import { createBooking, checkConflict } from '../controllers/bookingController';
import { getSemesterRange, countCoCurricularBookings, CO_CURRICULAR_LIMIT } from '../services/semesterUtils';

const router = express.Router();

router.get('/venues', async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM venues');
    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/clubs', async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM clubs');
    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/clubs/stats', async (_req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT organization_type, COUNT(*)::int as count
      FROM clubs
      WHERE organization_type != 'other'
      GROUP BY organization_type
    `);
    const stats: Record<string, number> = { 
      club: 0, committee: 0, organisation: 0, 
      total_activities: 0,
      members_club: 0, members_committee: 0, members_organisation: 0
    };
    for (const row of rows) {
      stats[row.organization_type] = row.count;
    }

    const { rows: memberRows } = await db.query(`
      SELECT c.organization_type, COUNT(cm.id)::int as member_count
      FROM club_members cm
      JOIN clubs c ON cm.club_id = c.id
      WHERE c.organization_type != 'other'
      GROUP BY c.organization_type
    `);
    for (const row of memberRows) {
      stats[`members_${row.organization_type}`] = row.member_count;
    }

    const { rows: activityRows } = await db.query(`
      SELECT COUNT(*)::int as count 
      FROM events
      WHERE event_type = 'co_curricular' OR event_type = 'open_all'
    `);
    if (activityRows.length > 0) {
      stats.total_activities = activityRows[0].count;
    }

    return res.json(stats);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/clubs/my-club', authMiddleware, async (req, res) => {
  if (req.user?.role !== 'club') {
    return res.status(403).json({ error: 'Only club accounts can fetch their details' });
  }

  try {
    const { rows } = await db.query(
      'SELECT * FROM clubs WHERE email = $1 LIMIT 1',
      [req.user.email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Club not found for this account' });
    }

    return res.json(rows[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/clubs/my-club', authMiddleware, async (req, res) => {
  if (req.user?.role !== 'club') {
    return res.status(403).json({ error: 'Only club accounts can edit their about section' });
  }

  const { description, key_activities, linkedin_url, instagram_url, youtube_url, website_url, logo_url, member_tag } = req.body;

  try {
    const clubResult = await db.query(
      'SELECT id FROM clubs WHERE email = $1 LIMIT 1',
      [req.user.email]
    );

    if (clubResult.rows.length === 0) {
      return res.status(404).json({ error: 'Club not found for this account' });
    }

    const clubId = clubResult.rows[0].id;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fieldsToUpdate = {
      description,
      key_activities,
      linkedin_url,
      instagram_url,
      youtube_url,
      website_url,
      logo_url,
      member_tag
    };

    for (const [key, value] of Object.entries(fieldsToUpdate)) {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value === '' ? null : value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(clubId);

    const { rows } = await db.query(
      `UPDATE clubs SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return res.json(rows[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/my-bookings', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    //  Find the club associated with this user's email
    const clubResult = await db.query(
      'SELECT id FROM clubs WHERE email = $1 LIMIT 1',
      [req.user.email]
    );

    const queryStr = `
      SELECT b.*, 
             e.name AS event_name,
             e.event_type,
             json_build_object('name', c.name) AS clubs,
             json_build_object('name', v.name) AS venues
      FROM bookings b
      LEFT JOIN clubs c ON b.club_id = c.id
      LEFT JOIN venues v ON b.venue_id = v.id
      LEFT JOIN events e ON b.event_id = e.id
      WHERE $1 = $2
      ORDER BY b.start_time DESC
    `;

    if (clubResult.rows.length === 0) {
      // Fallback: fetch by user_id if no club account found
      const { rows } = await db.query(
        queryStr.replace('$1 = $2', 'b.user_id = $1'),
        [req.user.id]
      );
      return res.json(rows);
    }

    // Fetch all bookings for this club
    const club = clubResult.rows[0];
    const { rows } = await db.query(
      queryStr.replace('$1 = $2', 'b.club_id = $1'), 
      [club.id]
    );
    
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/my-bookings/:id', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;

  try {
    const clubResult = await db.query(
      'SELECT id FROM clubs WHERE email = $1 LIMIT 1',
      [req.user.email]
    );

    if (clubResult.rows.length === 0) {
      return res.status(404).json({ error: 'Club not found for this account' });
    }

    const clubId = clubResult.rows[0].id;

    const checkRes = await db.query('SELECT * FROM bookings WHERE id = $1 AND club_id = $2', [id, clubId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or not owned by you' });
    }
    
    // Optionally: only allow deleting if it's pending, or let them cancel approved ones too.
    // The prompt just says "functionality of deleting events and bookings must be provided".
    await db.query('DELETE FROM bookings WHERE id = $1 AND club_id = $2', [id, clubId]);

    return res.json({ success: true, message: 'Booking deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting booking:', err);
    return res.status(500).json({ error: 'Failed to delete booking' });
  }
});

router.get('/bookings/check-conflict', checkConflict);

import { getBusyVenues } from '../controllers/bookingController';
router.get('/busy-venues', getBusyVenues);

router.post('/bookings', authMiddleware, createBooking);

router.get('/public-bookings', async (_req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT b.*, 
             e.name AS event_name,
             e.event_type,
             json_build_object('name', c.name) AS clubs,
             json_build_object('name', v.name) AS venues
      FROM bookings b
      LEFT JOIN clubs c ON b.club_id = c.id
      LEFT JOIN venues v ON b.venue_id = v.id
      LEFT JOIN events e ON b.event_id = e.id
      WHERE b.status = 'approved'
        AND b.end_time >= NOW()
        AND e.event_type IS DISTINCT FROM 'closed_club'
      ORDER BY b.start_time ASC
    `);
    
    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/campus-bookings', authMiddleware, async (_req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT b.*, 
             e.name AS event_name,
             e.event_type,
             json_build_object('name', c.name) AS clubs,
             json_build_object('name', v.name) AS venues
      FROM bookings b
      LEFT JOIN clubs c ON b.club_id = c.id
      LEFT JOIN venues v ON b.venue_id = v.id
      LEFT JOIN events e ON b.event_id = e.id
      WHERE b.status = 'approved' AND b.end_time >= NOW()
      ORDER BY b.start_time ASC
    `);

    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Returns the co-curricular booking count for a club in the current semester
router.get('/bookings/co-curricular-count', authMiddleware, async (req, res) => {
  let clubId = req.query.clubId as string;
  
  if (!clubId && req.user) {
    const { rows } = await db.query('SELECT id FROM clubs WHERE email = $1', [req.user.email]);
    if (rows.length > 0) {
      clubId = rows[0].id;
    }
  }

  if (!clubId) {
    return res.status(400).json({ error: 'clubId is required or user must be associated with a club' });
  }

  try {
    const { start, end } = getSemesterRange(new Date());
    const count = await countCoCurricularBookings(clubId, start, end);
    return res.json({ count, limit: CO_CURRICULAR_LIMIT });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
