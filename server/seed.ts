import dotenv from 'dotenv';
import { Client } from 'pg';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt'; // You'll need this to manually hash passwords now

dotenv.config();

const ADMIN_EMAIL = 'sbg_convener@dau.ac.in';
const CLUB_EMAIL = 'music_club@dau.ac.in';
const DANCE_EMAIL = 'dance_club@dau.ac.in';

async function seed() {
    console.log('Connecting to Neon DB...');
    
    // Connect directly using your new Neon connection string
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });
    await client.connect();

    console.log('Seeding data...');

    const profiles = [
        { email: ADMIN_EMAIL, full_name: 'SBG Convener', role: 'admin' },
        { email: CLUB_EMAIL, full_name: 'Music Club', role: 'club' },
        { email: DANCE_EMAIL, full_name: 'Dance Club', role: 'club' },
    ];

    for (const p of profiles) {
        try {
            const hashedPassword = await bcrypt.hash('password123', 10);

            const existing = await client.query(
                'SELECT id FROM auth.users WHERE email = $1',
                [p.email]
            );
            let userId = existing.rows[0]?.id as string | undefined;

            if (!userId) {
                userId = randomUUID();
                await client.query(
                    `INSERT INTO auth.users (id, email, encrypted_password) VALUES ($1, $2, $3)`,
                    [userId, p.email, hashedPassword]
                );
            }

            await client.query(`
                INSERT INTO public.profiles (id, email, full_name, role)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO UPDATE 
                SET email = EXCLUDED.email, 
                    full_name = EXCLUDED.full_name, 
                    role = EXCLUDED.role
            `, [userId, p.email, p.full_name, p.role]);

            console.log(`Upserted user & profile: ${p.email}`);
        } catch (error) {
            console.error(`Error processing ${p.email}:`, error);
        }
    }

    const clubs = [
        { name: 'Music Club', email: CLUB_EMAIL, group_category: 'B' },
        { name: 'Dance Club', email: DANCE_EMAIL, group_category: 'B' },
    ];

    for (const c of clubs) {
        try {
            // Upsert Clubs using standard SQL
            await client.query(`
                INSERT INTO public.clubs (name, email, group_category)
                VALUES ($1, $2, $3)
                ON CONFLICT (name) DO UPDATE 
                SET email = EXCLUDED.email, 
                    group_category = EXCLUDED.group_category;
            `, [c.name, c.email, c.group_category]);

            console.log(`Upserted club: ${c.name}`);
        } catch (error) {
             console.error(`Error processing club ${c.name}:`, error);
        }
    }

    // Seed club members (core + general) for demo clubs
    const memberSeed = [
        {
            clubEmail: CLUB_EMAIL,
            members: [
                { full_name: 'Aarav Sharma', roll_number: '22BCS001', email: 'aarav@student.dau.ac.in', designation: 'President', phone: '9876543210', is_core_member: true },
                { full_name: 'Priya Patel', roll_number: '22BCS042', email: 'priya@student.dau.ac.in', designation: 'Secretary', phone: '9876543211', is_core_member: true },
                { full_name: 'Rohan Mehta', roll_number: '22BCS088', email: 'rohan@student.dau.ac.in', designation: 'Treasurer', phone: '9876543212', is_core_member: true },
                { full_name: 'Sneha Reddy', roll_number: '23BCS015', email: 'sneha@student.dau.ac.in', designation: 'Member', phone: null, is_core_member: false },
            ],
        },
        {
            clubEmail: DANCE_EMAIL,
            members: [
                { full_name: 'Kavya Singh', roll_number: '22BCS010', email: 'kavya@student.dau.ac.in', designation: 'President', phone: '9876543220', is_core_member: true },
                { full_name: 'Arjun Das', roll_number: '22BCS055', email: 'arjun@student.dau.ac.in', designation: 'Vice President', phone: '9876543221', is_core_member: true },
                { full_name: 'Neha Gupta', roll_number: '23BCS022', email: 'neha@student.dau.ac.in', designation: 'Member', phone: null, is_core_member: false },
            ],
        },
    ];

    for (const clubSeed of memberSeed) {
        try {
            const clubRes = await client.query('SELECT id FROM clubs WHERE email = $1', [clubSeed.clubEmail]);
            const clubId = clubRes.rows[0]?.id;
            if (!clubId) {
                console.warn(`Skipping members for unknown club: ${clubSeed.clubEmail}`);
                continue;
            }

            for (const m of clubSeed.members) {
                const exists = await client.query(
                    'SELECT 1 FROM club_members WHERE club_id = $1 AND roll_number = $2',
                    [clubId, m.roll_number]
                );
                if (exists.rows.length > 0) continue;

                await client.query(
                    `INSERT INTO club_members (club_id, full_name, roll_number, email, designation, phone, is_core_member)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [clubId, m.full_name, m.roll_number, m.email, m.designation, m.phone, m.is_core_member]
                );
            }
            console.log(`Seeded members for club: ${clubSeed.clubEmail}`);
        } catch (error) {
            console.error(`Error seeding members for ${clubSeed.clubEmail}:`, error);
        }
    }

    await client.end();
    console.log('Seeding complete!');
}

seed();