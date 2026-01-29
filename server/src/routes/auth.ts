
import express from 'express';
import { supabase } from '../supabaseClient';
import authMiddleware from '../middleware/auth';

const router = express.Router();

// Public Routes

router.post('/register', async (req, res) => {
    const { email, password, clubName, groupCategory, userId: providedUserId } = req.body;

    if (!email || !clubName || !groupCategory) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!providedUserId && !password) {
        return res.status(400).json({ error: 'Password is required for new accounts' });
    }

    try {
        let userId = providedUserId;

        if (!userId) {
            // 1. Create Auth User (Manual Registration)
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { role: 'club' }
            });

            if (authError) {
                throw authError;
            }

            if (!authData.user) {
                throw new Error('Failed to create user');
            }
            userId = authData.user.id;
        }

        // 2. Create Profile
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                email,
                role: 'club',
                full_name: clubName
            });

        if (profileError) {
            console.error('Profile creation failed:', profileError);
            throw new Error(`Failed to create profile: ${profileError.message}`);
        }

        // 3. Create Club Entry
        // Check if club by email exists to avoid unique constraint violation
        const { data: existingClub } = await supabase
            .from('clubs')
            .select('id')
            .eq('email', email)
            .single();

        if (!existingClub) {
            const { error: clubError } = await supabase
                .from('clubs')
                .insert({
                    name: clubName,
                    email,
                    group_category: groupCategory
                });

            if (clubError) {
                console.error('Club creation failed:', clubError);
                throw new Error(`Failed to create club details: ${clubError.message}`);
            }
        }

        return res.status(201).json({ message: 'Registration successful', userId });

    } catch (err: any) {
        console.error('Registration error:', err);
        return res.status(400).json({ error: err.message });
    }
});

// Protected Routes
router.use(authMiddleware);

router.get('/profile', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // 1. Fetch Profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error('Error fetching profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch profile' });
        }

        let clubData = null;

        // 2. If Club, fetch Club details
        if (profile.role === 'club') {
            const { data: club, error: clubError } = await supabase
                .from('clubs')
                .select('*')
                .eq('email', profile.email)
                .single();

            if (clubError && clubError.code !== 'PGRST116') { // PGRST116 is "Row not found" - might be acceptable if not linked
                console.error('Error fetching club:', clubError);
            }
            clubData = club;
        }

        // 3. Construct Response
        // Match the shape expected by frontend Login.tsx onLogin
        const responseData = {
            id: profile.id,
            email: profile.email,
            name: clubData ? clubData.name : profile.full_name,
            role: profile.role,
            group: clubData ? clubData.group_category : undefined,
        };

        return res.json(responseData);

    } catch (err) {
        console.error('Profile endpoint error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
