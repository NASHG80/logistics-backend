import SupportTicket from '../models/SupportTicket.js';

// Helper function to generate unique ticket ID
const generateTicketId = async () => {
    const count = await SupportTicket.countDocuments();
    return `TKT-${String(count + 1001).padStart(5, '0')}`;
};

// @desc    Create a new support ticket
// @route   POST /api/support
// @access  Public/Private
export const createSupportTicket = async (req, res) => {
    try {
        const { customerName, email, subject, message, priority } = req.body;

        // Validation
        if (!customerName || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Generate ticket ID
        const ticketId = await generateTicketId();

        // Create new ticket
        const ticket = await SupportTicket.create({
            ticketId,
            customerName,
            email,
            subject,
            message,
            priority: priority || 'MEDIUM',
            status: 'OPEN'
        });

        res.status(201).json({
            success: true,
            message: 'Support ticket created successfully',
            data: {
                ticketId: ticket.ticketId,
                customerName: ticket.customerName,
                email: ticket.email,
                subject: ticket.subject,
                status: ticket.status,
                createdAt: ticket.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating support ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating support ticket',
            error: error.message
        });
    }
};

// @desc    Get all support tickets
// @route   GET /api/support
// @access  Private (Admin)
export const getAllSupportTickets = async (req, res) => {
    try {
        const { status, email } = req.query;

        // Build filter
        const filter = {};
        if (status) filter.status = status;
        if (email) filter.email = email;

        const tickets = await SupportTicket.find(filter).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: tickets.length,
            data: tickets
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching support tickets',
            error: error.message
        });
    }
};

// @desc    Get single support ticket by ID
// @route   GET /api/support/:ticketId
// @access  Private
export const getSupportTicketById = async (req, res) => {
    try {
        const { ticketId } = req.params;

        const ticket = await SupportTicket.findOne({ ticketId });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Support ticket not found'
            });
        }

        res.status(200).json({
            success: true,
            data: ticket
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching support ticket',
            error: error.message
        });
    }
};

// @desc    Update support ticket status
// @route   PUT /api/support/:ticketId
// @access  Private (Admin)
export const updateSupportTicketStatus = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status } = req.body;

        const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const ticket = await SupportTicket.findOne({ ticketId });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Support ticket not found'
            });
        }

        ticket.status = status;
        ticket.updatedAt = new Date();
        await ticket.save();

        res.status(200).json({
            success: true,
            message: 'Ticket status updated successfully',
            data: ticket
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating support ticket',
            error: error.message
        });
    }
};
