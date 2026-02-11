import express from 'express';
import { authUser, registerUser, getUserProfile, allUsers } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/login', authUser);
router.post('/register', registerUser);
router.route('/profile').get(protect, getUserProfile);
router.route('/').get(protect, allUsers);

export default router;
