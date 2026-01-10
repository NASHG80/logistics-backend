import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
    // Ticket ID (auto-generated)
    ticketId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    // Customer information
    customerName: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },

    // Ticket details
    subject: {
        type: String,
        required: true,
        trim: true
    },

    message: {
        type: String,
        required: true
    },

    // Status: OPEN, IN_PROGRESS, RESOLVED, CLOSED
    status: {
        type: String,
        enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
        default: 'OPEN'
    },

    // Priority: LOW, MEDIUM, HIGH, URGENT
    priority: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
        default: 'MEDIUM'
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
supportTicketSchema.index({ ticketId: 1 });
supportTicketSchema.index({ email: 1 });
supportTicketSchema.index({ status: 1 });

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

export default SupportTicket;
