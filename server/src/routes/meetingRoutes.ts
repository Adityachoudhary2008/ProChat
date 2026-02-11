import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { createMeeting, getMeeting } from '../controllers/meetingController';

const router = express.Router();

router.route('/').post(protect, createMeeting);
router.route('/:meetingId').get(protect, getMeeting);

export default router;
