import express from 'express';
import {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  assignVehicle,
  unassignVehicle,
  getVehicleStats,
  getActiveVehicles,
  updateVehicleLocation
} from '../controllers/vehicleController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (require authentication)
router.get('/stats', protect, getVehicleStats);
router.get('/active', protect, getActiveVehicles);
router.get('/', protect, getVehicles);
router.get('/:id', protect, getVehicleById);

// Admin-only routes
router.post('/', protect, authorize('admin'), createVehicle);
router.put('/:id', protect, authorize('admin'), updateVehicle);
router.delete('/:id', protect, authorize('admin'), deleteVehicle);
router.post('/assign', protect, authorize('admin'), assignVehicle);
router.post('/unassign/:id', protect, authorize('admin'), unassignVehicle);

// Driver routes
router.put('/:id/location', protect, updateVehicleLocation);

export default router;
