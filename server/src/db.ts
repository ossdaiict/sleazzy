import * as dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: '/home/param/sleazzy/server/.env'});

const databaseUrl = process.env.DATABASE_URL;

console.log("DB password is : ", process.env.DB_PASSWORD ? "Found!" : "Still Undefined");

// We use a Pool here instead of a Client. 
// A Pool manages multiple connections automatically, which is required 
// for an Express server handling simultaneous incoming API requests.

export const db = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
  ssl: { rejectUnauthorized: false}
});
