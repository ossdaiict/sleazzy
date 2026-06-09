import type { Request } from 'express';
import { db } from '../db';

export async function getClubForUser(req: Request) {
  if (!req.user || req.user.role !== 'club') {
    return null;
  }

  const { rows } = await db.query(
    'SELECT id, name, email, group_category FROM clubs WHERE email = $1 LIMIT 1',
    [req.user.email]
  );

  return rows[0] ?? null;
}
