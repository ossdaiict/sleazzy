import express from 'express';
import { supabase } from '../supabaseClient';
import authMiddleware from '../middleware/auth';

const router = express.Router();

router.use(authMiddleware);

// Get all notifications (newest first), with optional ?unread_only=true
router.get('/', async (req, res) => {
    const unreadOnly = req.query.unread_only === 'true';

    let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (unreadOnly) {
        query = query.eq('is_read', false);
    }

    // Admins see all notifications (especially pending ones)
    // Clubs only see their own (approval/rejection)
    if (req.user?.role === 'club') {
        query = query.eq('user_id', req.user.id);
    } else if (req.user?.role === 'admin') {
        // Admins see everything, but mainly ones where user_id is null (admin-targeted)
        // or they can see all for monitoring. Let's show all for admins.
    }

    const { data, error } = await query;

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.json(data || []);
});

// Get unread count
router.get('/unread-count', async (req, res) => {
    let query = supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

    if (req.user?.role === 'club') {
        query = query.eq('user_id', req.user.id);
    }

    const { count, error } = await query;

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.json({ count: count || 0 });
});

// Mark one notification as read
router.patch('/:id/read', async (req, res) => {
    const { id } = req.params;

    let query = supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

    if (req.user?.role === 'club') {
        query = query.eq('user_id', req.user.id);
    }

    const { error } = await query;

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true });
});

// Mark all notifications as read
router.patch('/read-all', async (req, res) => {
    let query = supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

    if (req.user?.role === 'club') {
        query = query.eq('user_id', req.user.id);
    }

    const { error } = await query;

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true });
});

export default router;
