import mongoose from 'mongoose';

const deliveryRequestSchema = new mongoose.Schema({
    // Customer Information
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customerName: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true
    },

    // Request Details
    shipmentDetails: {
        type: String,
        required: [true, 'Shipment details are required'],
        trim: true
    },
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
    pickupDate: {
        type: Date,
        required: [true, 'Pickup date is required']
    },
    estimatedPickupTime: {
        type: String,
        trim: true
    },
    approximateLoad: {
        type: String,
        trim: true
    },
    priceRange: {
        type: String,
        trim: true
    },
    message: {
        type: String,
        trim: true,
        maxlength: 500
    },

    // Request Status
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
    },
    requestId: {
        type: String,
        unique: true
    },

    // Review Information
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: {
        type: Date
    },
    rejectionReason: {
        type: String,
        trim: true
    },

    // Created Shipment (if approved)
    createdShipment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shipment'
    }
}, {
    timestamps: true
});

// Auto-generate request ID
deliveryRequestSchema.pre('save', async function (next) {
    if (this.isNew && !this.requestId) {
        const count = await mongoose.model('DeliveryRequest').countDocuments();
        this.requestId = `REQ${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

// Virtual for request ID
deliveryRequestSchema.virtual('id').get(function () {
    return this.requestId || this._id.toString();
});

// Ensure virtuals are included in JSON
deliveryRequestSchema.set('toJSON', { virtuals: true });
deliveryRequestSchema.set('toObject', { virtuals: true });

const DeliveryRequest = mongoose.model('DeliveryRequest', deliveryRequestSchema);

export default DeliveryRequest;
