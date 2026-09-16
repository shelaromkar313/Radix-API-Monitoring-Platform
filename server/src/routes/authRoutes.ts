import { Router } from 'express';
import { register, login, googleAuth, getProfile, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);

// Authenticated profile routes
router.get('/profile', protect as any, getProfile as any);
router.put('/profile', protect as any, updateProfile as any);

export default router;

