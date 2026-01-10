import express from 'express';
import {
  getShipments,
  getShipmentById,
  createShipment,
  updateShipment,
  deleteShipment,
  getShipmentStats
} from '../controllers/shipmentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (require authentication)
router.get('/stats', protect, getShipmentStats);
router.get('/', protect, getShipments);
router.get('/:id', protect, getShipmentById);


// Driver routes (drivers can start their assigned trips)
router.put('/:id/start-trip', protect, authorize('driver'), updateShipment);

// Admin-only routes
router.post('/', protect, authorize('admin'), createShipment);
router.put('/:id', protect, authorize('admin'), updateShipment);
router.delete('/:id', protect, authorize('admin'), deleteShipment);

export default router;
