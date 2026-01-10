import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: [true, 'Vehicle number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  driverName: {
    type: String,
    trim: true
  },
  driverContact: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['IDLE', 'ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE'],
    default: 'IDLE'
  },
  currentShipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment'
  },
  currentShipmentId: {
    type: String
  },
  lastLocation: {
    type: String,
    trim: true
  },
  currentLocation: {
    lat: {
      type: Number,
      default: null
    },
    lng: {
      type: Number,
      default: null
    },
    lastUpdated: {
      type: Date,
      default: null
    }
  },
  maintenanceRequired: {
    type: Boolean,
    default: false
  },
  maintenanceNotes: {
    type: String
  },
  vehicleType: {
    type: String,
    enum: ['TRUCK', 'VAN', 'BIKE', 'OTHER'],
    default: 'TRUCK'
  },
  capacity: {
    type: Number, // in kg
    default: 1000
  },
  fuelType: {
    type: String,
    enum: ['DIESEL', 'PETROL', 'CNG', 'ELECTRIC'],
    default: 'DIESEL'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Auto-generate vehicle ID
vehicleSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Update status based on current shipment
    if (this.currentShipment) {
      this.status = 'ACTIVE';
    }
  }
  next();
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;
