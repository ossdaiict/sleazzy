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

const MEMBER_EDITABLE_FIELDS = ['full_name', 'roll_number', 'email', 'designation', 'phone', 'tenure_start_date', 'tenure_end_date', 'tenure_end_reason', 'promotion_history'] as const;

/** Get public core members of all clubs */
router.get('/public', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT cm.id, cm.club_id, cm.full_name, cm.designation, cm.phone, cm.email,
              cm.tenure_start_date, cm.tenure_end_date, c.name as club_name,
              c.organization_type
       FROM club_members cm
       JOIN clubs c ON cm.club_id = c.id
       WHERE cm.tenure_end_date IS NULL OR cm.tenure_end_date > CURRENT_DATE
       ORDER BY c.name ASC,
                CASE 
                  WHEN cm.designation = 'Convener' THEN 1
                  WHEN cm.designation = 'Dy. Convener' THEN 2
                  WHEN cm.designation = 'Core' THEN 3
                  ELSE 4
                END ASC,
                cm.full_name ASC`
    );
    return res.json(rows);
  } catch (err: unknown) {
    console.error('List public club members error:', err);
    return res.status(500).json({ error: 'Failed to fetch public core members' });
  }
});

/** List all members (clubs get their own, admins query by clubId) */
router.get('/', authMiddleware, async (req, res) => {
  try {
    let clubId: string | undefined;

    if (req.user?.role === 'admin') {
      clubId = req.query.clubId as string;
      if (!clubId) {
        return res.status(400).json({ error: 'clubId query parameter is required for administrators' });
      }
    } else if (req.user?.role === 'club') {
      const club = await getClubForUser(req);
      if (!club) {
        return res.status(404).json({ error: 'Club not found for this account' });
      }
      clubId = club.id;
    } else {
      return res.status(403).json({ error: 'Access denied: invalid role' });
    }

    const { rows } = await db.query(
      `SELECT id, club_id, full_name, roll_number, email, designation, phone,
              is_core_member, tenure_start_date, tenure_end_date, tenure_end_reason, promotion_history, created_at, updated_at
       FROM club_members
       WHERE club_id = $1
       ORDER BY CASE 
                  WHEN designation = 'Convener' THEN 1
                  WHEN designation = 'Dy. Convener' THEN 2
                  WHEN designation = 'Core' THEN 3
                  ELSE 4
                END ASC,
                full_name ASC`,
      [clubId]
    );

    return res.json(rows);
  } catch (err: unknown) {
    console.error('List club members error:', err);
    return res.status(500).json({ error: 'Failed to fetch club members' });
  }
});

/** Add a new member to the roster (club accounts only) */
router.post('/', authMiddleware, clubOnly, async (req, res) => {
  const { full_name, roll_number, email, designation, phone, tenure_start_date, tenure_end_date, tenure_end_reason } = req.body;

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'Full name is required' });
  }

  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  if (!tenure_start_date || !tenure_start_date.trim()) {
    return res.status(400).json({ error: 'Tenure start date is required' });
  }

  const validDesignation = designation && designation.trim() ? designation.trim() : 'Core';

  try {
    const club = await getClubForUser(req);
    if (!club) {
      return res.status(404).json({ error: 'Club not found for this account' });
    }

    const { rows } = await db.query(
      `INSERT INTO club_members (club_id, full_name, roll_number, email, designation, phone, is_core_member, tenure_start_date, tenure_end_date, tenure_end_reason, promotion_history)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, club_id, full_name, roll_number, email, designation, phone,
                 is_core_member, tenure_start_date, tenure_end_date, tenure_end_reason, promotion_history, created_at, updated_at`,
      [
        club.id,
        full_name.trim(),
        roll_number ? roll_number.trim() : null,
        email ? email.trim() : null,
        validDesignation,
        phone ? phone.trim() : null,
        true, // is_core_member is always true now
        tenure_start_date && tenure_start_date.trim() ? tenure_start_date.trim() : null,
        tenure_end_date && tenure_end_date.trim() ? tenure_end_date.trim() : null,
        tenure_end_reason && tenure_end_reason.trim() ? tenure_end_reason.trim() : null,
        null,
      ]
    );

    return res.status(201).json(rows[0]);
  } catch (err: unknown) {
    console.error('Add club member error:', err);
    return res.status(500).json({ error: 'Failed to add club member' });
  }
});

/** Update any member's details (club accounts only, core or general) */
router.patch('/:id', authMiddleware, clubOnly, async (req, res) => {
  const { id } = req.params;

  try {
    const club = await getClubForUser(req);
    if (!club) {
      return res.status(404).json({ error: 'Club not found for this account' });
    }

    // Verify member exists and belongs to the user's club
    const memberRes = await db.query(
      'SELECT * FROM club_members WHERE id = $1 AND club_id = $2',
      [id, club.id]
    );
    const member = memberRes.rows[0];

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if ('designation' in req.body) {
      const newDesignation = (req.body.designation ?? 'Core').trim();
      const oldDesignation = member.designation || 'Core';
      if (newDesignation !== oldDesignation) {
        const rankMap: Record<string, number> = { 'Convener': 3, 'Dy. Convener': 2, 'Core': 1 };
        const oldRank = rankMap[oldDesignation] ?? 0;
        const newRank = rankMap[newDesignation] ?? 0;
        
        let action = 'Changed';
        if (newRank > oldRank) {
          action = 'Promoted';
        } else if (newRank < oldRank) {
          action = 'Demoted';
        }
        
        const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const entry = `${todayStr}: ${action} from "${oldDesignation}" to "${newDesignation}"`;
        req.body.promotion_history = member.promotion_history 
          ? `${member.promotion_history}\n${entry}` 
          : entry;
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const field of MEMBER_EDITABLE_FIELDS) {
      if (field in req.body) {
        const value = req.body[field];
        if (field === 'full_name' && (typeof value !== 'string' || !value.trim())) {
          return res.status(400).json({ error: 'Full name is required' });
        }
        if (field === 'phone' && (typeof value !== 'string' || !value.trim())) {
          return res.status(400).json({ error: 'Phone number is required' });
        }
        updates.push(`${field} = $${paramIndex}`);
        
        if (field === 'designation') {
          const validDesignation = typeof value === 'string' && value.trim() ? value.trim() : 'Core';
          values.push(validDesignation);
        } else {
          const trimmed = typeof value === 'string' ? value.trim() : value;
          values.push(trimmed === '' ? null : (trimmed ?? null));
        }
        
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add updated_at
    updates.push(`updated_at = NOW()`);
    
    // Add ID and club ID for where clause
    values.push(id, club.id);

    const { rows } = await db.query(
      `UPDATE club_members
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND club_id = $${paramIndex + 1}
       RETURNING id, club_id, full_name, roll_number, email, designation, phone,
                 is_core_member, tenure_start_date, tenure_end_date, tenure_end_reason, promotion_history, created_at, updated_at`,
      values
    );

    return res.json(rows[0]);
  } catch (err: unknown) {
    console.error('Update club member error:', err);
    return res.status(500).json({ error: 'Failed to update member' });
  }
});

/** Delete a member from the roster (club accounts only) */
router.delete('/:id', authMiddleware, clubOnly, async (req, res) => {
  const { id } = req.params;

  try {
    const club = await getClubForUser(req);
    if (!club) {
      return res.status(404).json({ error: 'Club not found for this account' });
    }

    const { rowCount } = await db.query(
      'DELETE FROM club_members WHERE id = $1 AND club_id = $2',
      [id, club.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    return res.json({ success: true, message: 'Member deleted successfully' });
  } catch (err: unknown) {
    console.error('Delete club member error:', err);
    return res.status(500).json({ error: 'Failed to delete member' });
  }
});

export default router;
