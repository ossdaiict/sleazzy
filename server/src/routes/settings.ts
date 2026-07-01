import express from 'express';
import { db } from '../db';
import authMiddleware from '../middleware/auth';

const router = express.Router();

const adminOnly = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
};

// Get all settings (public or basic auth)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT key, value FROM settings');
    const settings = rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, string>);
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings (Admin only - middleware should be applied where mounted)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const settings = req.body as Record<string, string>;
  
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Invalid settings payload' });
  }

  try {
    await db.query('BEGIN');
    
    for (const [key, value] of Object.entries(settings)) {
      await db.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        [key, value]
      );
    }
    
    await db.query('COMMIT');
    res.json({ success: true });
  } catch (error: any) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

export default router;
