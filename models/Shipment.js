import mongoose from 'mongoose';
import { generateMockRoute } from '../utils/routeGenerator.js';

const shipmentSchema = new mongoose.Schema({
  // Basic Information
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false  // Optional for backward compatibility with existing shipments
  },
  referenceId: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH'],
    default: 'NORMAL'
  },

  // Route Details
  source: {
    type: String,
    required: [true, 'Source location is required'],
    trim: true
  },
  destination: {
    type: String,
    required: [true, 'Destination location is required'],
    trim: true
  },

  // Schedule
  pickupDate: {
    type: Date
  },
  estimatedPickupTime: {
    type: String,
    trim: true
  },
  eta: {
    type: Date
  },
  actualDeliveryDate: {
    type: Date
  },

  // Shipment Details
  approximateWeight: {
    type: Number, // in kg
    min: 0
  },

  // Status
  status: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'IN_TRANSIT', 'AWAITING_CUSTOMER_SIGNATURE', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  },

  // Pricing
  price: {
    type: Number,
    min: 0,
    default: 0
  },

  //EPOD
  epod: {
    signedBy: {
      type: String,
    },
    signatureImage: {
      type: String, // base64 PNG
    },
    signedAt: {
      type: Date,
    },
    ipAddress: {
      type: String,
    }
  },

  // POD (Proof of Delivery)
  pod: {
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    receiverName: {
      type: String
    },
    image: {
      type: String // base64 image
    },
    uploadedAt: {
      type: Date
    }
  },


  // Assignment
  assignedVehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  },
  assignedVehicleNumber: {
    type: String
  },
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedDriverName: {
    type: String
  },

  // Risk Assessment
  delayRisk: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'LOW'
  },

  // Invoice
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },

  // Timeline
  timeline: [{
    label: String,
    time: Date,
    done: Boolean
  }],

  // Mock Route for Navigation
  mockRoute: {
    type: [[Number]], // Array of [lat, lng] coordinates
    default: []
  },
  routeMetadata: {
    distance: String,
    estimatedWaypoints: Number,
    sourceCoords: [Number],
    destCoords: [Number],
    generatedAt: Date
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Auto-generate shipment ID and mock route
shipmentSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('Shipment').countDocuments();
    this.referenceId = this.referenceId || `SHP${String(count + 1).padStart(3, '0')}`;

    // Initialize timeline
    if (!this.timeline || this.timeline.length === 0) {
      this.timeline = [
        { label: 'Shipment Created', time: new Date(), done: true },
        { label: 'Vehicle Assigned', time: null, done: false },
        { label: 'In Transit', time: null, done: false },
        { label: 'Delivered', time: null, done: false }
      ];
    }

    // Generate mock route if source and destination are provided
    if (this.source && this.destination && (!this.mockRoute || this.mockRoute.length === 0)) {
      try {
        const routeData = generateMockRoute(this.source, this.destination);
        this.mockRoute = routeData.waypoints;
        this.routeMetadata = routeData.metadata;
        console.log(`✅ Generated mock route for ${this.referenceId}: ${this.source} → ${this.destination} (${routeData.waypoints.length} waypoints)`);
      } catch (error) {
        console.error(`❌ Error generating mock route for ${this.referenceId}:`, error);
        // Continue without route - non-critical error
      }
    }
  }
  next();
});

// Update lastUpdated on save
shipmentSchema.pre('save', function (next) {
  this.lastUpdated = new Date();
  next();
});

// Virtual for shipment ID
shipmentSchema.virtual('id').get(function () {
  return this.referenceId || this._id.toString();
});

// Ensure virtuals are included in JSON
shipmentSchema.set('toJSON', { virtuals: true });
shipmentSchema.set('toObject', { virtuals: true });

const Shipment = mongoose.model('Shipment', shipmentSchema);

export default Shipment;
