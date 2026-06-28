import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

dotenv.config();

const cleanNameForFilename = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const CUSTOM_NAME_MAPPINGS: Record<string, string> = {
  'CMC- Cafeteria Management Committee': 'cafeteria_management_committee.png',
  'Google Developer Groups': 'gdg.png',
  'The Music Club': 'music_club.png',
  'Muse - The Design Club': 'muse.png',
  'Photography & Movie Making Club': 'pmmc.png',
  'Electronics Hobby Club (EHC)': 'ehc.png',
  'IEEE SB DAIICT': 'ieee_sb.png',
  'Khoj Theatres (DTG)': 'dtg.png',
  'The Debating Society': 'debate_club.png',
  'Microsoft Student Technical Club': 'microsoft_students_technical_club.png',
  'Synapse Committee': 'annual_festival_committee.png',
};

async function seedLogos() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  console.log('Fetching clubs from database...');
  const { rows: clubs } = await client.query('SELECT id, name FROM public.clubs');
  console.log(`Found ${clubs.length} clubs in database.`);

  const logosDir = path.join(__dirname, '../client/public/logos');

  if (!fs.existsSync(logosDir)) {
    console.error(`Logos directory not found at: ${logosDir}`);
    await client.end();
    process.exit(1);
  }

  let updatedCount = 0;

  for (const club of clubs) {
    let filename = '';
    
    if (CUSTOM_NAME_MAPPINGS[club.name]) {
      filename = CUSTOM_NAME_MAPPINGS[club.name];
    } else {
      filename = `${cleanNameForFilename(club.name)}.png`;
    }

    const logoPath = path.join(logosDir, filename);

    if (fs.existsSync(logoPath)) {
      console.log(`Found logo for: "${club.name}" (file: ${filename})`);
      try {
        const fileBuffer = fs.readFileSync(logoPath);
        const sizeKb = fileBuffer.length / 1024;
        console.log(`  File size: ${sizeKb.toFixed(1)} KB`);

        const base64Image = fileBuffer.toString('base64');
        const dataUri = `data:image/png;base64,${base64Image}`;

        await client.query('UPDATE public.clubs SET logo_url = $1 WHERE id = $2', [dataUri, club.id]);
        console.log(`  ✓ Successfully updated logo in database.`);
        updatedCount++;
      } catch (err) {
        console.error(`  ✗ Failed to process logo for ${club.name}:`, err);
      }
    } else {
      console.log(`  No local logo found for: "${club.name}" (checked path: ${logoPath})`);
    }
  }

  await client.end();
  console.log(`Seeding complete. Updated ${updatedCount} clubs.`);
}

seedLogos().catch((err) => {
  console.error('Seeding logos failed:', err);
  process.exit(1);
});
