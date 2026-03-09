import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

import bookingsRoutes from './routes/bookings';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';
import authRoutes from './routes/auth';
import { supabase } from './supabaseClient';

const app = express();
const httpServer = createServer(app);

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3005').split(',').map(s => s.trim());

type SocketUser = {
  id: string;
  email: string;
  role: 'club' | 'admin';
  clubId?: string;
};

const extractTokenFromSocket = (socket: Socket): string | null => {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.trim();
  }

  const authorizationHeader = socket.handshake.headers.authorization;
  if (typeof authorizationHeader === 'string' && authorizationHeader.startsWith('Bearer ')) {
    return authorizationHeader.slice('Bearer '.length).trim();
  }

  return null;
};

export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

io.use(async (socket, next) => {
  const token = extractTokenFromSocket(socket);

  // Allow anonymous connections for public listeners, but restrict privileged room joins.
  if (!token) {
    socket.data.user = null;
    return next();
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      socket.data.user = null;
      return next();
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile || (profile.role !== 'club' && profile.role !== 'admin')) {
      socket.data.user = null;
      return next();
    }

    const socketUser: SocketUser = {
      id: authData.user.id,
      email: profile.email,
      role: profile.role,
    };

    if (socketUser.role === 'club') {
      const { data: club } = await supabase
        .from('clubs')
        .select('id')
        .eq('email', socketUser.email)
        .single();

      if (club?.id) {
        socketUser.clubId = club.id;
      }
    }

    socket.data.user = socketUser;
    return next();
  } catch (error) {
    console.warn('[Socket.io] Failed to initialize socket auth context:', error);
    socket.data.user = null;
    return next();
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Allow clubs to join their own room so they receive targeted notifications
  socket.on('join:club', (clubId: string) => {
    const user = socket.data.user as SocketUser | null;
    if (!user || user.role !== 'club' || !user.clubId || user.clubId !== clubId) {
      socket.emit('socket:error', { message: 'Forbidden club room join' });
      return;
    }

    socket.join(`club:${clubId}`);
    console.log(`[Socket.io] Socket ${socket.id} joined room: club:${clubId}`);
  });

  // Allow admins to join the admin room
  socket.on('join:admin', () => {
    const user = socket.data.user as SocketUser | null;
    if (!user || user.role !== 'admin') {
      socket.emit('socket:error', { message: 'Forbidden admin room join' });
      return;
    }

    socket.join('admin');
    console.log(`[Socket.io] Socket ${socket.id} joined room: admin`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '5mb' }));

// Narrow body-parser style errors that use `type` and `message` fields
function isBodyParserError(err: unknown): err is { type: string; message?: string } {
  return typeof err === 'object' && err !== null && 'type' in err;
}

// Catch body-parser errors (e.g., malformed JSON)
const bodyParserErrorHandler: express.ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in (err as { body?: unknown })) {
    console.error('JSON Parse Error:', err.message);
    return res.status(400).json({ error: 'Invalid JSON payload. Please check the request body.' });
  }

  if (isBodyParserError(err) &&
    (err.type === 'entity.parse.failed' ||
      err.type === 'entity.too.large' ||
      err.type === 'request.size.invalid' ||
      err.type === 'encoding.unsupported')) {

    console.error('Body Parser Error:', err.message);

    let status = 400;
    if (err.type === 'entity.too.large' || err.type === 'request.size.invalid') {
      status = 413;
    } else if (err.type === 'encoding.unsupported') {
      status = 415;
    }

    const responseBody: { error: string; details?: string; type?: string } = {
      error: 'Failed to process request body',
    };

    if (process.env.NODE_ENV !== 'production') {
      responseBody.details = err.message;
      responseBody.type = err.type;
    }

    return res.status(status).json(responseBody);
  }

  next(err);
};

app.use(bodyParserErrorHandler);

app.use((req, _res, next) => {
  req.app.locals.supabase = supabase;
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', bookingsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Serve frontend static files (when client dist is present, e.g. in Docker)
const clientDir = process.env.CLIENT_DIST_DIR || path.join(__dirname, '../../client');
if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

const port = process.env.PORT || 4000;
httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
