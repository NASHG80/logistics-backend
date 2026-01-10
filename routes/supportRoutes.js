import express from 'express';
import {
    createSupportTicket,
    getAllSupportTickets,
    getSupportTicketById,
    updateSupportTicketStatus
} from '../controllers/supportController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   POST /api/support
// @desc    Create a new support ticket
// @access  Public (anyone can submit)
router.post('/', createSupportTicket);

// Protected routes (require authentication)
router.use(protect);

// @route   GET /api/support
// @desc    Get all support tickets (with optional filters)
// @access  Private (Admin)
router.get('/', authorize('admin'), getAllSupportTickets);

// @route   GET /api/support/:ticketId
// @desc    Get single support ticket
// @access  Private
router.get('/:ticketId', getSupportTicketById);

// @route   PUT /api/support/:ticketId
// @desc    Update support ticket status
// @access  Private (Admin)
router.put('/:ticketId', authorize('admin'), updateSupportTicketStatus);

export default router;
