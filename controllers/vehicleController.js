import Vehicle from '../models/Vehicle.js';
import Shipment from '../models/Shipment.js';

// @desc    Get all vehicles
// @route   GET /api/vehicles
// @access  Private
export const getVehicles = async (req, res) => {
  try {
    const { status, search } = req.query;

    const filter = {};

    if (status) {
      filter.status = { $in: status.split(',') };
    }

    if (search) {
      filter.$or = [
        { vehicleNumber: { $regex: search, $options: 'i' } },
        { driverName: { $regex: search, $options: 'i' } },
        { lastLocation: { $regex: search, $options: 'i' } }
      ];
    }

    const vehicles = await Vehicle.find(filter)
      .populate('currentShipment', 'referenceId customerName source destination')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching vehicles',
      error: error.message
    });
  }
};

// @desc    Get single vehicle
// @route   GET /api/vehicles/:id
// @access  Private
export const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('currentShipment')
      .populate('createdBy', 'name email');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching vehicle',
      error: error.message
    });
  }
};

// @desc    Create vehicle
// @route   POST /api/vehicles
// @access  Private (Admin only)
export const createVehicle = async (req, res) => {
  try {
    const {
      vehicleNumber,
      driverName,
      driverContact,
      status,
      lastLocation,
      vehicleType,
      capacity,
      fuelType
    } = req.body;

    if (!vehicleNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide vehicle number'
      });
    }

    // Check if vehicle already exists
    const existingVehicle = await Vehicle.findOne({ vehicleNumber: vehicleNumber.toUpperCase() });
    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle with this number already exists'
      });
    }

    const vehicle = await Vehicle.create({
      vehicleNumber: vehicleNumber.toUpperCase(),
      driverName: driverName || req.user.name,
      driverContact,
      status: status || 'IDLE',
      lastLocation,
      vehicleType: vehicleType || 'TRUCK',
      capacity: capacity || 1000,
      fuelType: fuelType || 'DIESEL',
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating vehicle',
      error: error.message
    });
  }
};

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
// @access  Private (Admin only)
export const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const {
      vehicleNumber,
      driverName,
      driverContact,
      status,
      lastLocation,
      maintenanceRequired,
      maintenanceNotes,
      vehicleType,
      capacity
    } = req.body;

    if (vehicleNumber) vehicle.vehicleNumber = vehicleNumber.toUpperCase();
    if (driverName !== undefined) vehicle.driverName = driverName;
    if (driverContact !== undefined) vehicle.driverContact = driverContact;
    if (status) vehicle.status = status;
    if (lastLocation) vehicle.lastLocation = lastLocation;
    if (maintenanceRequired !== undefined) vehicle.maintenanceRequired = maintenanceRequired;
    if (maintenanceNotes !== undefined) vehicle.maintenanceNotes = maintenanceNotes;
    if (vehicleType) vehicle.vehicleType = vehicleType;
    if (capacity) vehicle.capacity = capacity;

    await vehicle.save();

    res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully',
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating vehicle',
      error: error.message
    });
  }
};

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private (Admin only)
export const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check if vehicle is assigned to a shipment
    if (vehicle.currentShipment) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete vehicle that is assigned to a shipment'
      });
    }

    await vehicle.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting vehicle',
      error: error.message
    });
  }
};

// @desc    Assign vehicle to shipment
// @route   POST /api/vehicles/assign
// @access  Private (Admin only)
export const assignVehicle = async (req, res) => {
  try {
    const { vehicleId, shipmentId } = req.body;

    if (!vehicleId || !shipmentId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both vehicle ID and shipment ID'
      });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    const shipment = await Shipment.findById(shipmentId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    // Check if vehicle is already assigned
    if (vehicle.currentShipment && vehicle.status === 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Vehicle is already assigned to another shipment'
      });
    }

    // Check if shipment already has a vehicle assigned (reassignment case)
    if (shipment.assignedVehicle) {
      // Find the previous vehicle
      const previousVehicle = await Vehicle.findById(shipment.assignedVehicle);

      if (previousVehicle) {
        // Unassign the previous vehicle
        previousVehicle.currentShipment = null;
        previousVehicle.currentShipmentId = null;
        previousVehicle.status = 'IDLE';
        await previousVehicle.save();
      }
    }

    // Update vehicle
    vehicle.currentShipment = shipmentId;
    vehicle.currentShipmentId = shipment.referenceId;
    vehicle.status = 'ACTIVE';
    await vehicle.save();

    // Update shipment
    shipment.assignedVehicle = vehicleId;
    shipment.assignedVehicleNumber = vehicle.vehicleNumber;
    shipment.assignedDriverName = vehicle.driverName;

    // Update timeline
    if (shipment.timeline && shipment.timeline[1]) {
      shipment.timeline[1].done = true;
      shipment.timeline[1].time = new Date();
    }

    await shipment.save();

    res.status(200).json({
      success: true,
      message: 'Vehicle assigned successfully',
      data: {
        vehicle,
        shipment
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error assigning vehicle',
      error: error.message
    });
  }
};

// @desc    Unassign vehicle from shipment
// @route   POST /api/vehicles/unassign/:id
// @access  Private (Admin only)
export const unassignVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const shipmentId = vehicle.currentShipment;

    // Update vehicle
    vehicle.currentShipment = null;
    vehicle.currentShipmentId = null;
    vehicle.status = 'IDLE';
    await vehicle.save();

    // Update shipment if exists
    if (shipmentId) {
      const shipment = await Shipment.findById(shipmentId);
      if (shipment) {
        shipment.assignedVehicle = null;
        shipment.assignedVehicleNumber = null;
        shipment.assignedDriverName = null;
        await shipment.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle unassigned successfully',
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error unassigning vehicle',
      error: error.message
    });
  }
};

// @desc    Get vehicle statistics
// @route   GET /api/vehicles/stats
// @access  Private
export const getVehicleStats = async (req, res) => {
  try {
    const totalVehicles = await Vehicle.countDocuments();
    const activeVehicles = await Vehicle.countDocuments({ status: 'ACTIVE' });
    const idleVehicles = await Vehicle.countDocuments({ status: 'IDLE' });
    const maintenanceVehicles = await Vehicle.countDocuments({ maintenanceRequired: true });

    res.status(200).json({
      success: true,
      data: {
        total: totalVehicles,
        active: activeVehicles,
        idle: idleVehicles,
        maintenance: maintenanceVehicles
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

// @desc    Get active vehicles for live tracking
// @route   GET /api/vehicles/active
// @access  Private
export const getActiveVehicles = async (req, res) => {
  try {
    // First, get all vehicles with current shipments
    const vehicles = await Vehicle.find({
      currentShipment: { $ne: null }
    })
      .populate({
        path: 'currentShipment',
        select: 'referenceId customerName customerId source destination status pickupDate eta delayRisk assignedDriverName mockRoute'
      })
      .populate('createdBy', 'name email')
      .sort({ 'currentLocation.lastUpdated': -1 });

    // Filter out vehicles with DELIVERED shipments
    let activeVehicles = vehicles.filter(vehicle => {
      const shipment = vehicle.currentShipment;
      if (!shipment) return false;
      
      // Only include PENDING and IN_TRANSIT shipments
      return shipment.status === 'PENDING' || shipment.status === 'IN_TRANSIT';
    });

    // Filter by customer if user is a customer
    let filteredVehicles = activeVehicles;
    if (req.user.role === 'customer') {
      const userId = req.user._id.toString();
      filteredVehicles = activeVehicles.filter(vehicle => {
        const shipment = vehicle.currentShipment;
        if (!shipment) return false;

        // Match by customerId or customerName
        const matchesCustomerId = shipment.customerId &&
          (shipment.customerId.toString() === userId || shipment.customerId._id?.toString() === userId);
        const matchesCustomerName = !shipment.customerId &&
          shipment.customerName === req.user.name;

        return matchesCustomerId || matchesCustomerName;
      });

      console.log(`🔍 Customer ${req.user.name} has ${filteredVehicles.length} active vehicles`);
    }

    // Transform data for frontend
    const trackingData = filteredVehicles.map(vehicle => ({
      vehicleId: vehicle._id,
      vehicleNumber: vehicle.vehicleNumber,
      shipmentId: vehicle.currentShipment?.referenceId || null,
      shipmentRoute: vehicle.currentShipment?.mockRoute || null, // Add route for polyline display
      driver: {
        id: vehicle.createdBy?._id,
        name: vehicle.currentShipment?.assignedDriverName || vehicle.driverName || 'Unknown'
      },
      location: {
        lat: vehicle.currentLocation?.lat || 20.5937, // Default to India center
        lng: vehicle.currentLocation?.lng || 78.9629,
        city: vehicle.lastLocation || 'Unknown',
        lastUpdated: vehicle.currentLocation?.lastUpdated
          ? getTimeAgo(vehicle.currentLocation.lastUpdated)
          : 'Never'
      },
      eta: {
        expectedAt: vehicle.currentShipment?.eta
          ? new Date(vehicle.currentShipment.eta).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
          : '—',
        delayMinutes: 0
      },
      status: getVehicleStatus(vehicle.currentShipment),
      alerts: {
        delay: vehicle.currentShipment?.delayRisk === 'HIGH',
        routeDeviation: false,
        unauthorizedStop: false
      },
      shipmentDetails: {
        source: vehicle.currentShipment?.source,
        destination: vehicle.currentShipment?.destination,
        customerName: vehicle.currentShipment?.customerName,
        status: vehicle.currentShipment?.status
      }
    }));

    res.status(200).json({
      success: true,
      count: trackingData.length,
      data: trackingData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching active vehicles',
      error: error.message
    });
  }
};

// @desc    Update vehicle location
// @route   PUT /api/vehicles/:id/location
// @access  Private
export const updateVehicleLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude and longitude'
      });
    }

    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Update location
    vehicle.currentLocation = {
      lat,
      lng,
      lastUpdated: new Date()
    };

    await vehicle.save();

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating location',
      error: error.message
    });
  }
};

// Helper function to get time ago string
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  if (seconds < 60) return `${seconds} secs ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

// Helper function to determine vehicle status based on shipment
function getVehicleStatus(shipment) {
  if (!shipment) return 'PENDING';

  // If shipment is in transit, show IN_TRANSIT
  if (shipment.status === 'IN_TRANSIT') return 'IN_TRANSIT';

  // If shipment is pending, show PENDING
  if (shipment.status === 'PENDING') return 'PENDING';

  // If shipment is delivered, show DELIVERED
  if (shipment.status === 'DELIVERED') return 'DELIVERED';

  // Default to PENDING for any other status
  return 'PENDING';
}
