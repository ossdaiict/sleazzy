import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const ADMIN_EMAIL = 'sbg_convener@dau.ac.in';
const CLUB_EMAIL = 'music_club@dau.ac.in';
const DANCE_EMAIL = 'dance_club@dau.ac.in';

async function getOrCreateUser(email: string, role: string) {
    // 1. Try to create user
    const { data: created, error } = await supabase.auth.admin.createUser({
        email,
        password: 'password123',
        email_confirm: true,
        user_metadata: { role } // Optional, but good for consistency
    });

    if (created && created.user) {
        console.log(`Created Auth User: ${email}`);
        return created.user.id;
    }

    if (error) {
        // If already exists, find it
        // Note: checking error message or listing to find
        // console.log(`User creation error for ${email}: ${error.message}`); 
        // We'll list users to find the ID.
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
            throw new Error(`Could not list users: ${listError.message}`);
        }
        const existing = users.users.find(u => u.email === email);
        if (existing) {
            console.log(`Found existing Auth User: ${email}`);
            return existing.id;
        }
        throw new Error(`Could not create or find user ${email}: ${error.message}`);
    }
    throw new Error('Unexpected state in getOrCreateUser');
}

async function seed() {
    console.log('Seeding data...');

    // 1. Upsert Profiles
    const profiles = [
        { email: ADMIN_EMAIL, full_name: 'SBG Convener', role: 'admin' },
        { email: CLUB_EMAIL, full_name: 'Music Club', role: 'club' },
        { email: DANCE_EMAIL, full_name: 'Dance Club', role: 'club' },
    ];

    for (const p of profiles) {
        try {
            const userId = await getOrCreateUser(p.email, p.role);

            // Upsert profile with correct ID
            const { error } = await supabase.from('profiles').upsert({
                id: userId,
                email: p.email,
                full_name: p.full_name,
                role: p.role
            });

            if (error) console.error('Error upserting profile:', p.email, error.message);
            else console.log(`Upserted profile: ${p.email}`);

        } catch (e: any) {
            console.error(e.message);
        }
    }

    // 2. Upsert Clubs
    // Using 'B' as inferred from types.ts (ClubGroupType = 'A' | 'B' | 'C')
    const clubs = [
        { name: 'Music Club', email: CLUB_EMAIL, group_category: 'B' },
        { name: 'Dance Club', email: DANCE_EMAIL, group_category: 'B' },
    ];

    for (const c of clubs) {
        const { data: existing } = await supabase.from('clubs').select('id').eq('name', c.name).single();

        if (existing) {
            console.log(`Club ${c.name} exists.`);
            const { error } = await supabase.from('clubs').update({ email: c.email }).eq('id', existing.id);
            if (error) console.log(`Could not update email for ${c.name}: ${error.message}`);
        } else {
            const { error } = await supabase.from('clubs').insert(c);
            if (error) {
                console.error(`Error inserting club ${c.name}:`, error.message);
                // Fallback: lowercase 'b' if 'B' fails?
                if (error.message.includes('enum')) {
                    console.log('Retrying with lowercase "b"...');
                    const { error: err2 } = await supabase.from('clubs').insert({ ...c, group_category: 'b' });
                    if (err2) {
                        console.error('Failed again:', err2.message);
                        console.log('Retrying with "group_b"...');
                        const { error: err3 } = await supabase.from('clubs').insert({ ...c, group_category: 'group_b' }); // we tried this before, but just in case
                        if (err3) console.error('Failed again:', err3.message);
                    }
                }
            } else {
                console.log(`Inserted club: ${c.name}`);
            }
        }
    }
}

seed();
