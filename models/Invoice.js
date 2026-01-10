import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  // Unique invoice identifier (e.g., INV-1001)
  invoiceId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  // Reference to the shipment
  shipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment',
    required: true
  },

  // Customer name (copied from shipment for quick access)
  customerName: {
    type: String,
    required: true,
    trim: true
  },

  // Invoice amount
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  // Payment status: PENDING or PAID
  status: {
    type: String,
    enum: ['PENDING', 'PAID'],
    default: 'PENDING'
  },

  // Transaction ID for payment tracking (null if not paid)
  transactionId: {
    type: String,
    default: null,
    trim: true
  },

  // Date when payment was received (null if not paid)
  paymentDate: {
    type: Date,
    default: null
  },

  // Auto-managed timestamps
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Index for faster queries
invoiceSchema.index({ invoiceId: 1 });
invoiceSchema.index({ shipmentId: 1 });
invoiceSchema.index({ status: 1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
