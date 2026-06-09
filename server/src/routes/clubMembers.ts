import express from 'express';
import { db } from '../db';
import authMiddleware from '../middleware/auth';
import { getClubForUser } from '../utils/clubAuth';

const router = express.Router();

const clubOnly = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.user?.role !== 'club') {
    return res.status(403).json({ error: 'Only club accounts can manage members' });
  }
  return next();
};

const CORE_MEMBER_EDITABLE_FIELDS = ['full_name', 'roll_number', 'email', 'designation', 'phone'] as const;

router.use(authMiddleware, clubOnly);

/** List all members for the logged-in club */
router.get('/', async (req, res) => {
  try {
    const club = await getClubForUser(req);
    if (!club) {
      return res.status(404).json({ error: 'Club not found for this account' });
    }

    const { rows } = await db.query(
      `SELECT id, club_id, full_name, roll_number, email, designation, phone,
              is_core_member, created_at, updated_at
       FROM club_members
       WHERE club_id = $1
       ORDER BY is_core_member DESC, full_name ASC`,
      [club.id]
    );

    return res.json(rows);
  } catch (err: unknown) {
    console.error('List club members error:', err);
    return res.status(500).json({ error: 'Failed to fetch club members' });
  }
});

/** Update a core member's details (clubs may only edit is_core_member = true) */
router.patch('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const club = await getClubForUser(req);
    if (!club) {
      return res.status(404).json({ error: 'Club not found for this account' });
    }

    const memberRes = await db.query(
      'SELECT * FROM club_members WHERE id = $1 AND club_id = $2',
      [id, club.id]
    );
    const member = memberRes.rows[0];

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (!member.is_core_member) {
      return res.status(403).json({ error: 'Only core member details can be edited' });
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const field of CORE_MEMBER_EDITABLE_FIELDS) {
      if (field in req.body) {
        const value = req.body[field];
        if (field === 'full_name' && (typeof value !== 'string' || !value.trim())) {
          return res.status(400).json({ error: 'Full name is required' });
        }
        updates.push(`${field} = $${paramIndex}`);
        values.push(typeof value === 'string' ? value.trim() : value ?? null);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id, club.id);

    const { rows } = await db.query(
      `UPDATE club_members
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND club_id = $${paramIndex + 1}
       RETURNING id, club_id, full_name, roll_number, email, designation, phone,
                 is_core_member, created_at, updated_at`,
      values
    );

    return res.json(rows[0]);
  } catch (err: unknown) {
    console.error('Update club member error:', err);
    return res.status(500).json({ error: 'Failed to update member' });
  }
});

export default router;
