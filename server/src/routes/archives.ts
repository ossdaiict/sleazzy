import express from 'express';
import authMiddleware from '../middleware/auth';
import { getArchivedEvents } from '../controllers/archiveController';

const router = express.Router();

router.get('/events', authMiddleware, getArchivedEvents);

export default router;
