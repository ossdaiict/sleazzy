"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const bookings_1 = __importDefault(require("./routes/bookings"));
const admin_1 = __importDefault(require("./routes/admin"));
const auth_1 = __importDefault(require("./routes/auth"));
const supabaseClient_1 = require("./supabaseClient");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((req, _res, next) => {
    req.app.locals.supabase = supabaseClient_1.supabase;
    next();
});
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});
app.use('/api', bookings_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/admin', admin_1.default);
const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
