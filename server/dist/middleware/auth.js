"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabaseClient_1 = require("../supabaseClient");
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || '';
        const mockEmail = req.headers['x-mock-user-email'];
        // Mock Login for Dev/Test
        if (process.env.NODE_ENV !== 'production' && typeof mockEmail === 'string' && mockEmail) {
            const { data: profile, error: profileError } = await supabaseClient_1.supabase
                .from('profiles')
                .select('id, role')
                .eq('email', mockEmail)
                .single();
            if (profileError || !profile) {
                return res
                    .status(401)
                    .json({ error: `Mock user not found for email: ${mockEmail}` });
            }
            req.user = {
                id: profile.id,
                role: profile.role,
            };
            return next();
        }
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice('Bearer '.length)
            : null;
        if (!token) {
            return res.status(401).json({ error: 'Missing authorization token' });
        }
        const { data: userData, error: userError } = await supabaseClient_1.supabase.auth.getUser(token);
        if (userError || !userData?.user) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        const { data: profile, error: profileError } = await supabaseClient_1.supabase
            .from('profiles')
            .select('role')
            .eq('id', userData.user.id)
            .single();
        if (profileError || !profile) {
            return res.status(401).json({ error: 'User role not found' });
        }
        req.user = {
            id: userData.user.id,
            role: profile.role,
        };
        return next();
    }
    catch (err) {
        return res.status(401).json({ error: `Unauthorized: ${err.message}` });
    }
};
exports.default = authMiddleware;
