import express from 'express';
import { supabase } from '../supabaseClient';
import authMiddleware from '../middleware/auth';

const router = express.Router();

// Admin-only middleware
const adminOnly = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
};

router.use(authMiddleware, adminOnly);

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

    const { data, error } = await query;

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.json(data || []);
});

// Get unread count
router.get('/unread-count', async (_req, res) => {
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.json({ count: count || 0 });
});

// Mark one notification as read
router.patch('/:id/read', async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true });
});

// Mark all notifications as read
router.patch('/read-all', async (_req, res) => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true });
});

export default router;
