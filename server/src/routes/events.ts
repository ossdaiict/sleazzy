import express from 'express';
import authMiddleware from '../middleware/auth';
import { createEvent, getEvents, updateEvent, deleteEvent, getPublicEvents } from '../controllers/eventController';

const router = express.Router();

router.get('/public', getPublicEvents);
router.post('/', authMiddleware, createEvent);
router.get('/', authMiddleware, getEvents);
router.put('/:id', authMiddleware, updateEvent);
router.delete('/:id', authMiddleware, deleteEvent);

export default router;
