import { db } from './src/db';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '010_auth_otp.sql'), 'utf-8');
  await db.query(sql);
  console.log('Migration 010_auth_otp.sql executed successfully');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
