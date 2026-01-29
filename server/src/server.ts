import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';

import bookingsRoutes from './routes/bookings';
import adminRoutes from './routes/admin';
import authRoutes from './routes/auth';
import { supabase } from './supabaseClient';

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  req.app.locals.supabase = supabase;
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', bookingsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
