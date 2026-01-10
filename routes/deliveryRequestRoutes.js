import express from 'express';
import {
    createRequest,
    getRequests,
    getPendingRequests,
    approveRequest,
    rejectRequest
} from '../controllers/deliveryRequestController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Customer routes
router.post('/', protect, createRequest);
router.get('/', protect, getRequests);

// Admin-only routes
router.get('/pending', protect, authorize('admin'), getPendingRequests);
router.put('/:id/approve', protect, authorize('admin'), approveRequest);
router.put('/:id/reject', protect, authorize('admin'), rejectRequest);

export default router;
