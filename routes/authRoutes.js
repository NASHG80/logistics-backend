import express from 'express';
import { signup, login, getProfile, logout } from '../controllers/authController.js';
import { getDrivers } from '../controllers/userController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);

// Protected routes
router.get('/profile', verifyToken, getProfile);
router.get('/me', verifyToken, getProfile); // Alias for profile
router.get('/drivers', protect, authorize('admin'), getDrivers);

export default router;
