import express from 'express';
import { authUser, registerUser, getUserProfile, updateProfile, allUsers, getSettings, updateSettings } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/login', authUser);
router.post('/register', registerUser);
router.route('/profile').get(protect, getUserProfile).put(protect, updateProfile);
router.route('/settings').get(protect, getSettings).put(protect, updateSettings);
router.route('/').get(protect, allUsers);

export default router;
