import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';

import bookingsRoutes from './routes/bookings';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';
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
app.use('/api/admin/notifications', notificationRoutes);

// Serve frontend static files (when client dist is present, e.g. in Docker)
const clientDir = process.env.CLIENT_DIST_DIR || path.join(__dirname, '../../client');
if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
