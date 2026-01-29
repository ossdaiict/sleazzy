import express from 'express';
import { supabase } from '../supabaseClient';
import authMiddleware from '../middleware/auth';

const router = express.Router();

const adminOnly = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
};

router.use(authMiddleware, adminOnly);

router.get('/pending', async (_req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, clubs(name), venues(name)')
    .eq('status', 'pending')
    .order('start_time', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data || []);
});

router.get('/bookings', async (_req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, clubs(name), venues(name)')
    .order('start_time', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data || []);
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

  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data);
});


router.get('/stats', async (_req, res) => {
  try {
    const [
      { count: pendingCount, error: pendingError },
      { count: scheduledCount, error: scheduledError },
      { count: clubsCount, error: clubsError },
      { count: rejectedCount, error: rejectedError }
    ] = await Promise.all([
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('clubs').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'rejected')
    ]);

    if (pendingError) throw pendingError;
    if (scheduledError) throw scheduledError;
    if (clubsError) throw clubsError;
    if (rejectedError) throw rejectedError;

    return res.json({
      pending: pendingCount || 0,
      scheduled: scheduledCount || 0,
      conflicts: rejectedCount || 0, // Using rejected as a proxy for now
      activeClubs: clubsCount || 0
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
