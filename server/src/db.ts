import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is missing from server/.env');
}

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing from server/.env');
}

export const db = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl?.includes('localhost') ? false : { rejectUnauthorized: false },
});
