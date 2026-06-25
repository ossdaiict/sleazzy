import { Request, Response } from 'express';
import { db } from '../db';
import { getClubForUser } from '../utils/clubAuth';

export const getArchivedEvents = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    const isSuperAdmin = userRole === 'super_admin';

    let query = 'SELECT * FROM archived_events';
    let params: any[] = [];

    if (!isSuperAdmin) {
      const club = await getClubForUser(req);
      if (!club) {
        return res.status(404).json({ error: 'Club not found for this account' });
      }
      query += ' WHERE club_id = $1';
      params.push(club.id);
    }

    query += ' ORDER BY archived_at DESC';

    const eventsRes = await db.query(query, params);
    const events = eventsRes.rows;

    if (events.length === 0) {
      return res.json([]);
    }

    const eventIds = events.map(e => e.id);
    const idList = eventIds.map((_, i) => `$${i + 1}`).join(',');

    const bookingsRes = await db.query(`SELECT * FROM archived_bookings WHERE event_id IN (${idList})`, eventIds);
    const reportsRes = await db.query(`SELECT * FROM archived_event_reports WHERE event_id IN (${idList})`, eventIds);

    const result = events.map(event => ({
      ...event,
      bookings: bookingsRes.rows.filter(b => b.event_id === event.id),
      report: reportsRes.rows.find(r => r.event_id === event.id) || null
    }));

    return res.json(result);
  } catch (error: any) {
    console.error('Error fetching archived events:', error);
    return res.status(500).json({ error: 'Failed to fetch archived events' });
  }
};
