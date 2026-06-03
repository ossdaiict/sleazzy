import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import express from 'express';
import fs from 'fs';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken'; // Added standard JWT verification

import bookingsRoutes from './routes/bookings';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';
import authRoutes from './routes/auth';

// 1. Swap Supabase for your new Neon DB Pool
import { db } from './db'; 

const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://localhost:3005', 'https://sleazzy.gdgdau.cloud'],
  credentials: true,
}));
app.use(express.json());

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
    // 2. Standard JWT Verification (Replaces supabase.auth.getUser)
    // Make sure you add JWT_SECRET to your backend .env file!
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("Missing JWT_SECRET");
    
    const decoded = jwt.verify(token, secret) as { sub: string };
    const userId = decoded.sub; // 'sub' is the standard JWT field for User ID

    if (!userId) {
      socket.data.user = null;
      return next();
    }

    // 3. Raw SQL Query for Profile (Replaces supabase.from('profiles'))
    const profileResult = await db.query(
      'SELECT role, email FROM profiles WHERE id = $1',
      [userId]
    );

    if (profileResult.rows.length === 0) {
      socket.data.user = null;
      return next();
    }

    const profile = profileResult.rows[0];

    if (profile.role !== 'club' && profile.role !== 'admin') {
      socket.data.user = null;
      return next();
    }

    const socketUser: SocketUser = {
      id: userId,
      email: profile.email,
      role: profile.role,
    };

    // 4. Raw SQL Query for Club (Replaces supabase.from('clubs'))
    if (socketUser.role === 'club') {
      const clubResult = await db.query(
        'SELECT id FROM clubs WHERE email = $1',
        [socketUser.email]
      );

      if (clubResult.rows.length > 0) {
        socketUser.clubId = clubResult.rows[0].id;
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

function isBodyParserError(err: unknown): err is { type: string; message?: string } {
  return typeof err === 'object' && err !== null && 'type' in err;
}

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
  // 5. Provide the new DB pool to Express locals instead of Supabase
  req.app.locals.db = db; 
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', bookingsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Serve frontend static files
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
