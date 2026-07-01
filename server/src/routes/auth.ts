import express from 'express';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import authMiddleware from '../middleware/auth';
import { isOfficialCommitteeEmail, OFFICIAL_EMAIL_DOMAIN } from '../constants/officialEmails';
import { sendPasswordResetEmail } from '../services/email';

const router = express.Router();

// Public Routes
router.post('/register', async (req, res) => {
    const { email, password, clubName, groupCategory, organizationType, userId: providedUserId } = req.body;

    if (!email || !clubName || !groupCategory) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!providedUserId && !password) {
        return res.status(400).json({ error: 'Password is required for new accounts' });
    }

    if (!isOfficialCommitteeEmail(email)) {
        return res.status(400).json({
            error: `Club accounts must use an official committee email ending with ${OFFICIAL_EMAIL_DOMAIN}`,
        });
    }

    try {
        let userId = providedUserId;

        if (!userId) {
            // 1. Create Auth User (Manual Registration via SQL)
            // Removed raw_user_meta_data as we store role in profiles now
            userId = randomUUID();
            const hashedPassword = await bcrypt.hash(password, 10);

            await db.query(`
                INSERT INTO auth.users (id, email, encrypted_password)
                VALUES ($1, $2, $3)
            `, [userId, email, hashedPassword]);
        }

        // 2. Create or Update Profile (SQL Upsert)
        await db.query(`
            INSERT INTO profiles (id, email, role, full_name)
            VALUES ($1, $2, 'club', $3)
            ON CONFLICT (id) DO UPDATE 
            SET email = EXCLUDED.email, 
                full_name = EXCLUDED.full_name
        `, [userId, email, clubName]);

        // 3. Create Club Entry if it doesn't exist
        const clubRes = await db.query('SELECT id FROM clubs WHERE email = $1', [email]);
        
        if (clubRes.rows.length === 0) {
            await db.query(`
                INSERT INTO clubs (name, email, group_category, organization_type)
                VALUES ($1, $2, $3, $4)
            `, [clubName, email, groupCategory, organizationType || 'club']);
        }

        return res.status(201).json({ message: 'Registration successful', userId });

    } catch (err: any) {
        console.error('Registration error:', err);
        return res.status(400).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Missing email or password' });
    }

    try {
        const { rows } = await db.query('SELECT id, encrypted_password FROM auth.users WHERE email = $1', [email]);
        const user = rows[0];

        if (!user || !(await bcrypt.compare(password, user.encrypted_password))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('Server configuration error: Missing JWT_SECRET');

        const token = jwt.sign({ sub: user.id }, secret, { expiresIn: '7d' });

        return res.json({ token });
    } catch (err: any) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const { rows } = await db.query('SELECT id FROM auth.users WHERE email = $1', [email]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No account found with this email' });
        }

        const otp = generateOTP();
        const hashedOtp = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        await db.query(
            'UPDATE auth.users SET reset_otp = $1, reset_otp_expires_at = $2 WHERE email = $3', 
            [hashedOtp, expiresAt, email]
        );

        const emailResult = await sendPasswordResetEmail(email, otp);

        if (!emailResult.sent) {
            console.log(`\n======================================================`);
            console.log(`[DEV ONLY] Password Reset Requested`);
            console.log(`Email: ${email}`);
            console.log(`OTP: ${otp}`);
            console.log(`Reason: EmailJS is not configured or failed to send (${emailResult.error || 'not configured'}).`);
            console.log(`======================================================\n`);
        }

        return res.json({ 
            message: 'A 6-digit OTP has been sent to your email address.' 
        });

    } catch (err: any) {
        console.error('Forgot password error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
    }

    try {
        const { rows } = await db.query('SELECT reset_otp, reset_otp_expires_at FROM auth.users WHERE email = $1', [email]);
        const user = rows[0];

        if (!user || !user.reset_otp || !user.reset_otp_expires_at) {
            return res.status(400).json({ error: 'No active password reset request found' });
        }

        if (new Date() > new Date(user.reset_otp_expires_at)) {
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }

        const isMatch = await bcrypt.compare(otp, user.reset_otp);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        return res.json({ message: 'OTP verified successfully' });
    } catch (err: any) {
        console.error('Verify OTP error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    try {
        const { rows } = await db.query('SELECT reset_otp, reset_otp_expires_at FROM auth.users WHERE email = $1', [email]);
        const user = rows[0];

        if (!user || !user.reset_otp || !user.reset_otp_expires_at) {
            return res.status(400).json({ error: 'No active password reset request found' });
        }

        if (new Date() > new Date(user.reset_otp_expires_at)) {
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }

        const isMatch = await bcrypt.compare(otp, user.reset_otp);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await db.query(
            'UPDATE auth.users SET encrypted_password = $1, reset_otp = NULL, reset_otp_expires_at = NULL WHERE email = $2', 
            [hashedPassword, email]
        );

        return res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (err: any) {
        console.error('Reset password error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
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
        let profileRes = await db.query('SELECT * FROM profiles WHERE id = $1', [userId]);
        let profile = profileRes.rows[0];

        // If profile doesn't exist (e.g. first login via legacy OAuth), auto-create it
        if (!profile) {
            // Get user details directly from auth.users table (removed raw_user_meta_data)
            const authUserRes = await db.query('SELECT email FROM auth.users WHERE id = $1', [userId]);
            const authUser = authUserRes.rows[0];
            
            if (!authUser) {
                return res.status(404).json({ error: 'User not found in auth' });
            }

            const email = authUser.email || '';
            const fullName = email.split('@')[0] || 'New Club';

            // Upsert the profile
            await db.query(`
                INSERT INTO profiles (id, email, role, full_name)
                VALUES ($1, $2, 'club', $3)
                ON CONFLICT (id) DO UPDATE 
                SET email = EXCLUDED.email, 
                    full_name = EXCLUDED.full_name
            `, [userId, email, fullName]);

            // Auto-create club entry if not already there
            const existingClub = await db.query('SELECT id FROM clubs WHERE email = $1', [email]);
            
            if (existingClub.rows.length === 0) {
                await db.query(`
                    INSERT INTO clubs (name, email, group_category)
                    VALUES ($1, $2, 'C')
                `, [fullName, email]);
            }

            // Re-fetch the profile
            profileRes = await db.query('SELECT * FROM profiles WHERE id = $1', [userId]);
            profile = profileRes.rows[0];

            if (!profile) {
                return res.status(500).json({ error: 'Profile created but could not be fetched' });
            }
        }

        let clubData = null;

        // 2. If Club, fetch Club details
        if (profile.role === 'club') {
            const clubRes = await db.query('SELECT * FROM clubs WHERE email = $1', [profile.email]);
            clubData = clubRes.rows[0];
        }

        // 3. Construct Response
        const responseData = {
            id: profile.id,
            email: profile.email,
            name: clubData ? clubData.name : profile.full_name,
            role: profile.role,
            group: clubData ? clubData.group_category : undefined,
            clubId: clubData ? clubData.id : undefined,
            logoUrl: clubData ? clubData.logo_url : null,
        };

        return res.json(responseData);

    } catch (err) {
        console.error('Profile endpoint error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/change-password', async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Missing current or new password' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    try {
        const { rows } = await db.query('SELECT encrypted_password FROM auth.users WHERE id = $1', [userId]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.encrypted_password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Incorrect current password' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE auth.users SET encrypted_password = $1 WHERE id = $2', [hashedNewPassword, userId]);

        return res.json({ message: 'Password updated successfully' });
    } catch (err: any) {
        console.error('Change password error:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;