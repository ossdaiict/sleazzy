"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabaseClient_1 = require("../supabaseClient");
const auth_1 = __importDefault(require("../middleware/auth"));
const bookingController_1 = require("../controllers/bookingController");
const router = express_1.default.Router();
router.get('/venues', async (_req, res) => {
    const { data, error } = await supabaseClient_1.supabase.from('venues').select('*');
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    return res.json(data || []);
});
router.get('/clubs', async (_req, res) => {
    const { data, error } = await supabaseClient_1.supabase.from('clubs').select('*');
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    return res.json(data || []);
});
router.get('/my-bookings', auth_1.default, async (req, res) => {
    const { data, error } = await supabaseClient_1.supabase
        .from('bookings')
        .select('*, clubs(name), venues(name)')
        .eq('user_id', req.user?.id)
        .order('start_time', { ascending: false });
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    return res.json(data || []);
});
router.get('/bookings/check-conflict', bookingController_1.checkConflict);
router.post('/bookings', auth_1.default, bookingController_1.createBooking);
router.get('/public-bookings', async (_req, res) => {
    const { data, error } = await supabaseClient_1.supabase
        .from('bookings')
        .select('*, clubs(name), venues(name)')
        .eq('status', 'approved')
        .gte('end_time', new Date().toISOString()); // Optional: Only show future/ongoing events? Or all? Let's just show approved.
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    return res.json(data || []);
});
exports.default = router;
