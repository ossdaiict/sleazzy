import express from 'express';
import { supabase } from '../supabaseClient';
import authMiddleware from '../middleware/auth';
import { createBooking, checkConflict } from '../controllers/bookingController';
import { getSemesterRange, countCoCurricularBookings, CO_CURRICULAR_LIMIT } from '../services/semesterUtils';

const router = express.Router();

router.get('/venues', async (_req, res) => {
  const { data, error } = await supabase.from('venues').select('*');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data || []);
});

router.get('/clubs', async (_req, res) => {
  const { data, error } = await supabase.from('clubs').select('*');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data || []);
});

router.get('/my-bookings', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, clubs(name), venues(name)')
    .eq('user_id', req.user?.id)
    .order('start_time', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data || []);
});

router.get('/bookings/check-conflict', checkConflict);
router.post('/bookings', authMiddleware, createBooking);

router.get('/public-bookings', async (_req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, clubs(name), venues(name)')
    .eq('status', 'approved')
    .gte('end_time', new Date().toISOString()); // Optional: Only show future/ongoing events? Or all? Let's just show approved.

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data || []);
});

// Returns the co-curricular booking count for a club in the current semester
router.get('/bookings/co-curricular-count', authMiddleware, async (req, res) => {
  const clubId = req.query.clubId as string;
  if (!clubId) {
    return res.status(400).json({ error: 'clubId is required' });
  }

  try {
    const { start, end } = getSemesterRange(new Date());
    const count = await countCoCurricularBookings(clubId, start, end);
    return res.json({ count, limit: CO_CURRICULAR_LIMIT });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
