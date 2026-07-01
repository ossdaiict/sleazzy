import { db } from './src/db';

async function run() {
  await db.query(`ALTER TABLE auth.users ALTER COLUMN reset_otp TYPE VARCHAR(255);`);
  console.log('Altered column reset_otp to VARCHAR(255) successfully');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
