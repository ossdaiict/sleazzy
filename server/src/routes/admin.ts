import express from 'express';
import { supabase } from '../supabaseClient';
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

  // Broadcast to all clients when approved so the public landing page calendar refreshes
  if (status === 'approved') {
    io.emit('events:updated');
  }

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

  // Co-curricular limit check when changing event_type to co_curricular
  if (event_type === 'co_curricular') {
    // Fetch the existing booking to get club_id and start_time
    const { data: existing, error: existErr } = await supabase
      .from('bookings')
      .select('club_id, start_time, event_type')
      .eq('id', id)
      .single();

    if (existErr || !existing) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Only enforce when the type is being changed TO co_curricular (or already is)
    const eventDate = new Date(start_time || existing.start_time);
    const { start: semStart, end: semEnd } = getSemesterRange(eventDate);
    const count = await countCoCurricularBookings(
      existing.club_id, semStart, semEnd, id
    );
    if (count >= CO_CURRICULAR_LIMIT) {
      return res.status(400).json({
        error: `This club has already booked ${CO_CURRICULAR_LIMIT} co-curricular events this semester. The maximum allowed is ${CO_CURRICULAR_LIMIT}.`,
      });
    }
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

  // Emit real-time updates
  io.emit('events:updated');
  io.to(`club:${data.club_id}`).emit('booking:status_changed', {
    bookingId: id,
    status: data.status,
    eventName: data.event_name,
    clubId: data.club_id,
    userId: data.user_id,
  });

  return res.json(data);
});

router.delete('/bookings/:id', async (req, res) => {
  const { id } = req.params;

  // Fetch the booking first so we can notify the club
  const { data: booking } = await supabase
    .from('bookings')
    .select('club_id, event_name')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Emit real-time deletion
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

  // Co-curricular limit check
  if (event_type === 'co_curricular') {
    const eventDate = new Date(start_time);
    const { start: semStart, end: semEnd } = getSemesterRange(eventDate);
    const count = await countCoCurricularBookings(club_id, semStart, semEnd);
    if (count >= CO_CURRICULAR_LIMIT) {
      return res.status(400).json({
        error: `This club has already booked ${CO_CURRICULAR_LIMIT} co-curricular events this semester. The maximum allowed is ${CO_CURRICULAR_LIMIT}.`,
      });
    }
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
    userId: createdBookings[0].user_id,
    metadata: { batchId, venues: venue_ids },
  });

  // Emit real-time events
  io.emit('events:updated');
  io.to(`club:${club_id}`).emit('booking:status_changed', {
    bookingId: createdBookings[0].id,
    status: 'approved',
    eventName: event_name,
    clubId: club_id,
  });

  return res.status(201).json(createdBookings);
});

router.get('/stats', async (_req, res) => {
  try {
    const [
      { count: pendingCount, error: pendingError },
      { count: scheduledCount, error: scheduledError },
      { count: clubsCount, error: clubsError }
    ] = await Promise.all([
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('clubs').select('*', { count: 'exact', head: true })
    ]);

    if (pendingError) throw pendingError;
    if (scheduledError) throw scheduledError;
    if (clubsError) throw clubsError;

    return res.json({
      pending: pendingCount || 0,
      scheduled: scheduledCount || 0,
      conflicts: 0, // Rejected bookings are now considered 'done', not conflicts
      activeClubs: clubsCount || 0
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/clubs', async (_req, res) => {
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data || []);
});

router.patch('/clubs/:id', async (req, res) => {
  const { id } = req.params;
  const { name, group_category } = req.body;

  const updateFields: Record<string, any> = {};
  if (name !== undefined) updateFields.name = name;
  if (group_category !== undefined) updateFields.group_category = group_category;

  if (Object.keys(updateFields).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const { data, error } = await supabase
    .from('clubs')
    .update(updateFields)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data);
});

router.delete('/clubs/:id', async (req, res) => {
  const { id } = req.params;

  // First, verify the club exists
  const { data: club, error: fetchError } = await supabase
    .from('clubs')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !club) {
    return res.status(404).json({ error: 'Club not found' });
  }

  // Delete all bookings for this club
  const { error: bookingsError } = await supabase
    .from('bookings')
    .delete()
    .eq('club_id', id);

  if (bookingsError) {
    return res.status(500).json({ error: 'Failed to delete club bookings: ' + bookingsError.message });
  }

  // Delete the club profile
  const { error: clubError } = await supabase
    .from('clubs')
    .delete()
    .eq('id', id);

  if (clubError) {
    return res.status(500).json({ error: 'Failed to delete club: ' + clubError.message });
  }

  // Also try to delete auth user associated. We can lookup profile by email.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', club.email)
    .single();

  if (profile) {
    // Delete profile
    await supabase.from('profiles').delete().eq('id', profile.id);
    // Delete auth user if possible using service role
    await supabase.auth.admin.deleteUser(profile.id);
  }

  return res.json({ success: true });
});

router.get('/clubs/:id/bookings', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('bookings')
    .select('*, clubs(name), venues(name)')
    .eq('club_id', id)
    .order('start_time', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  return res.json(data || []);
});

export default router;
