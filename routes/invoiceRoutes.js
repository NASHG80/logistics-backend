import express from 'express';
import {
  getAllInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  deleteInvoice,
  getCustomerInvoices,
  markInvoiceAsPaid
} from '../controllers/invoiceController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/invoices
// @desc    Get all invoices (with optional filters)
// @access  Private
router.get('/', getAllInvoices);

// @route   GET /api/invoices/customer/:customerName
// @desc    Get invoices for a specific customer
// @access  Private (Customer)
router.get('/customer/:customerName', getCustomerInvoices);

// @route   POST /api/invoices/:invoiceId/pay
// @desc    Mark invoice as paid (fake payment)
// @access  Private (Customer)
router.post('/:invoiceId/pay', markInvoiceAsPaid);

// @route   GET /api/invoices/:invoiceId
// @desc    Get single invoice by invoiceId
// @access  Private
router.get('/:invoiceId', getInvoiceById);

// @route   PUT /api/invoices/:invoiceId
// @desc    Update invoice status (mark as PAID/PENDING)
// @access  Private (Admin only)
router.put('/:invoiceId', authorize('admin'), updateInvoiceStatus);

// @route   DELETE /api/invoices/:invoiceId
// @desc    Delete invoice
// @access  Private (Admin only)
router.delete('/:invoiceId', authorize('admin'), deleteInvoice);

export default router;
