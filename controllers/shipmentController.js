import Shipment from '../models/Shipment.js';
import { createOrUpdateInvoice } from './invoiceController.js';

// @desc    Get all shipments
// @route   GET /api/shipments
// @access  Private
export const getShipments = async (req, res) => {
  try {
    const { status, delayRisk, search } = req.query;

    // Build filter object
    const filter = {};

    if (status) {
      filter.status = { $in: status.split(',') };
    }

    if (delayRisk) {
      filter.delayRisk = { $in: delayRisk.split(',') };
    }

    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { referenceId: { $regex: search, $options: 'i' } },
        { source: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } },
        { assignedVehicleNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const shipments = await Shipment.find(filter)
      .populate('assignedDriver', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: shipments.length,
      data: shipments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching shipments',
      error: error.message
    });
  }
};

// @desc    Get single shipment by ID
// @route   GET /api/shipments/:id
// @access  Private
export const getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate('assignedDriver', 'name email')
      .populate('createdBy', 'name email')
      .populate('invoice', 'invoiceId');

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: shipment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching shipment',
      error: error.message
    });
  }
};

// @desc    Create new shipment
// @route   POST /api/shipments
// @access  Private (Admin only)
export const createShipment = async (req, res) => {
  try {
    const {
      customerName,
      customerId,
      referenceId,
      priority,
      source,
      destination,
      pickupDate,
      estimatedPickupTime,
      approximateWeight,
      eta,
      status,
      assignedVehicleNumber,
      assignedDriverName,
      delayRisk,
      invoiceAmount,
      autoAssignVehicle // New flag for automatic assignment
    } = req.body;

    // Validate required fields
    if (!customerName || !source || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Please provide customer name, source, and destination'
      });
    }

    let finalVehicleNumber = assignedVehicleNumber;
    let finalDriverName = assignedDriverName;

    // Automatic vehicle assignment if requested
    if (autoAssignVehicle && approximateWeight) {
      try {
        const Vehicle = (await import('../models/Vehicle.js')).default;
        
        // Find first IDLE vehicle with sufficient capacity
        const suitableVehicle = await Vehicle.findOne({
          status: 'IDLE',
          capacity: { $gte: approximateWeight }
        }).sort({ capacity: 1 }); // Sort by capacity ascending to get smallest suitable vehicle

        if (suitableVehicle) {
          finalVehicleNumber = suitableVehicle.vehicleNumber;
          finalDriverName = suitableVehicle.driverName;
          console.log(`🚗 Auto-assigned vehicle ${finalVehicleNumber} (capacity: ${suitableVehicle.capacity}kg) for weight ${approximateWeight}kg`);
        } else {
          console.log(`⚠️ No suitable vehicle found for weight ${approximateWeight}kg`);
        }
      } catch (vehicleError) {
        console.error('Error during automatic vehicle assignment:', vehicleError);
        // Continue with shipment creation even if auto-assignment fails
      }
    }

    const shipment = await Shipment.create({
      customerName,
      customerId,
      referenceId,
      priority: priority || 'NORMAL',
      source,
      destination,
      pickupDate,
      estimatedPickupTime,
      approximateWeight,
      eta,
      status: status || 'PENDING',
      assignedVehicleNumber: finalVehicleNumber,
      assignedDriverName: finalDriverName,
      delayRisk: delayRisk || 'LOW',
      createdBy: req.user._id
    });

    // Update vehicle status if assigned
    if (finalVehicleNumber) {
      try {
        const Vehicle = (await import('../models/Vehicle.js')).default;
        await Vehicle.findOneAndUpdate(
          { vehicleNumber: finalVehicleNumber },
          { 
            status: 'ACTIVE',
            currentShipment: shipment._id,
            currentShipmentId: shipment.referenceId
          }
        );
        console.log(`✅ Vehicle ${finalVehicleNumber} status updated to ACTIVE`);
      } catch (vehicleError) {
        console.error('Error updating vehicle status:', vehicleError);
      }
    }

    // Auto-generate invoice if invoiceAmount is provided
    if (invoiceAmount && invoiceAmount > 0) {
      const invoice = await createOrUpdateInvoice(
        shipment._id,
        customerName,
        invoiceAmount
      );

      // Link invoice to shipment
      shipment.invoice = invoice._id;
      await shipment.save();

      console.log(`💰 Invoice ${invoice.invoiceId} created for shipment ${shipment.referenceId}`);
    }

    res.status(201).json({
      success: true,
      message: 'Shipment created successfully',
      data: shipment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating shipment',
      error: error.message
    });
  }
};

// @desc    Update shipment
// @route   PUT /api/shipments/:id
// @access  Private (Admin only)
export const updateShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    const {
      customerName,
      referenceId,
      priority,
      source,
      destination,
      pickupDate,
      eta,
      status,
      assignedVehicleNumber,
      assignedDriverName,
      delayRisk,
      invoiceAmount // New field for invoice
    } = req.body;

    // Update fields
    if (customerName) shipment.customerName = customerName;
    if (referenceId) shipment.referenceId = referenceId;
    if (priority) shipment.priority = priority;
    if (source) shipment.source = source;
    if (destination) shipment.destination = destination;
    if (pickupDate) shipment.pickupDate = pickupDate;
    if (eta) shipment.eta = eta;
    if (status) {
      shipment.status = status;

      // Update timeline based on status
      if (status === 'IN_TRANSIT' && shipment.timeline[2]) {
        shipment.timeline[2].done = true;
        shipment.timeline[2].time = new Date();
      } else if (status === 'DELIVERED' && shipment.timeline[3]) {
        shipment.timeline[3].done = true;
        shipment.timeline[3].time = new Date();
        shipment.actualDeliveryDate = new Date();
      }
    }
    if (assignedVehicleNumber) {
      shipment.assignedVehicleNumber = assignedVehicleNumber;
      // Update timeline for vehicle assignment
      if (shipment.timeline[1]) {
        shipment.timeline[1].done = true;
        shipment.timeline[1].time = new Date();
      }
    }
    if (assignedDriverName) shipment.assignedDriverName = assignedDriverName;
    if (delayRisk) shipment.delayRisk = delayRisk;

    // Handle invoice creation/update if invoiceAmount is provided
    if (invoiceAmount && invoiceAmount > 0) {
      const invoice = await createOrUpdateInvoice(
        shipment._id,
        shipment.customerName,
        invoiceAmount
      );

      // Link invoice to shipment if not already linked
      if (!shipment.invoice) {
        shipment.invoice = invoice._id;
      }
    }

    await shipment.save();

    // Emit socket event for real-time status update
    if (status && req.app.get('io')) {
      req.app.get('io').emit('shipment-status-updated', {
        shipmentId: shipment._id,
        referenceId: shipment.referenceId,
        status: shipment.status
      });
      console.log(`📢 Emitted status update: ${shipment.referenceId} -> ${shipment.status}`);
    }

    res.status(200).json({
      success: true,
      message: 'Shipment updated successfully',
      data: shipment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating shipment',
      error: error.message
    });
  }
};

// @desc    Delete shipment and related invoice
// @route   DELETE /api/shipments/:id
// @access  Private (Admin only)
export const deleteShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    // Update assigned vehicle status to IDLE if vehicle was assigned
    if (shipment.assignedVehicleNumber) {
      try {
        const Vehicle = (await import('../models/Vehicle.js')).default;
        const vehicle = await Vehicle.findOne({ vehicleNumber: shipment.assignedVehicleNumber });

        if (vehicle) {
          vehicle.status = 'IDLE';
          vehicle.currentShipmentId = null;
          await vehicle.save();
          console.log(`🚗 Vehicle ${shipment.assignedVehicleNumber} status set to IDLE`);
        }
      } catch (vehicleError) {
        console.error('Error updating vehicle status:', vehicleError);
        // Continue with deletion even if vehicle update fails
      }
    }

    // Delete related invoice if exists
    if (shipment.invoice) {
      try {
        const Invoice = (await import('../models/Invoice.js')).default;
        await Invoice.findByIdAndDelete(shipment.invoice);
        console.log(`🗑️ Deleted invoice ${shipment.invoice} for shipment ${shipment.referenceId}`);
      } catch (invoiceError) {
        console.error('Error deleting related invoice:', invoiceError);
        // Continue with shipment deletion even if invoice deletion fails
      }
    }

    // Also try to find and delete invoice by shipmentId reference
    try {
      const Invoice = (await import('../models/Invoice.js')).default;
      const deletedInvoices = await Invoice.deleteMany({ shipmentId: shipment._id });
      if (deletedInvoices.deletedCount > 0) {
        console.log(`🗑️ Deleted ${deletedInvoices.deletedCount} invoice(s) linked to shipment ${shipment.referenceId}`);
      }
    } catch (invoiceError) {
      console.error('Error deleting invoices by shipmentId:', invoiceError);
    }

    await shipment.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Shipment deleted successfully. Vehicle status updated to IDLE.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting shipment',
      error: error.message
    });
  }
};

// @desc    Get shipment statistics
// @route   GET /api/shipments/stats
// @access  Private
export const getShipmentStats = async (req, res) => {
  try {
    const totalShipments = await Shipment.countDocuments();
    const pendingShipments = await Shipment.countDocuments({ status: 'PENDING' });
    const inTransitShipments = await Shipment.countDocuments({ status: 'IN_TRANSIT' });
    const deliveredShipments = await Shipment.countDocuments({ status: 'DELIVERED' });
    const highRiskShipments = await Shipment.countDocuments({ delayRisk: 'HIGH' });

    res.status(200).json({
      success: true,
      data: {
        total: totalShipments,
        pending: pendingShipments,
        inTransit: inTransitShipments,
        delivered: deliveredShipments,
        highRisk: highRiskShipments
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};
