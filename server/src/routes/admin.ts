import express from 'express';
import { supabase } from '../supabaseClient';
import authMiddleware from '../middleware/auth';
import { createNotification } from '../services/notification';

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

  // Create a notification for the status change
  await createNotification({
    type: status === 'approved' ? 'booking_approved' : 'booking_rejected',
    title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: `"${data.event_name}" has been ${status}.`,
    metadata: { bookingId: id, status },
  });

  return res.json(data);
});

router.patch('/bookings/:id/visibility', async (req, res) => {
  const { id } = req.params;
  const { is_public } = req.body as { is_public?: boolean };

  if (typeof is_public !== 'boolean') {
    return res.status(400).json({ error: 'is_public must be a boolean' });
  }

  const { data, error } = await supabase
    .from('bookings')
    .update({ is_public })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data);
});

router.put('/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const {
    event_name,
    venue_id,
    start_time,
    end_time,
    event_type,
    expected_attendees,
    status,
    is_public,
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

  const { data, error } = await supabase
    .from('bookings')
    .update(updateFields)
    .eq('id', id)
    .select('*, clubs(name), venues(name)')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data);
});

router.delete('/bookings/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ success: true });
});

// Admin: create a booking directly (auto-approved, no advance-day restriction)
router.post('/bookings', async (req, res) => {
  const {
    club_id,
    venue_ids,
    event_name,
    start_time,
    end_time,
    event_type,
    expected_attendees,
    is_public,
  } = req.body;

  if (!club_id || !event_name || !start_time || !end_time || !venue_ids || !Array.isArray(venue_ids) || venue_ids.length === 0) {
    return res.status(400).json({ error: 'Missing required fields (club_id, venue_ids, event_name, start_time, end_time)' });
  }

  const { randomUUID } = await import('crypto');
  const batchId = randomUUID();
  const createdBookings = [];

  for (const venueId of venue_ids) {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        club_id,
        venue_id: venueId,
        event_name,
        start_time,
        end_time,
        event_type: event_type || null,
        expected_attendees: expected_attendees || null,
        is_public: is_public ?? false,
        status: 'approved',
        batch_id: batchId,
      })
      .select('*, clubs(name), venues(name)')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    createdBookings.push(data);
  }

  // Create notification
  await createNotification({
    type: 'booking_approved',
    title: 'Event Created by Admin',
    message: `"${event_name}" has been created and auto-approved.`,
    metadata: { batchId, venues: venue_ids },
  });

  return res.status(201).json(createdBookings);
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
