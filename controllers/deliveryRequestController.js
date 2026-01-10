import DeliveryRequest from '../models/DeliveryRequest.js';
import Shipment from '../models/Shipment.js';

// @desc    Create new delivery request
// @route   POST /api/delivery-requests
// @access  Private (Customer)
export const createRequest = async (req, res) => {
    try {
        const { 
            shipmentDetails, 
            source, 
            destination, 
            pickupDate, 
            estimatedPickupTime,
            approximateLoad,
            priceRange,
            message, 
            customerName, 
            customerId, 
            customerEmail 
        } = req.body;

        // Validate required fields
        if (!shipmentDetails || !source || !destination || !pickupDate) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: shipment details, source, destination, and pickup date'
            });
        }

        const deliveryRequest = await DeliveryRequest.create({
            customerId: customerId || req.user._id,
            customerName: customerName || req.user.name,
            customerEmail: customerEmail || req.user.email,
            shipmentDetails,
            source,
            destination,
            pickupDate,
            estimatedPickupTime,
            approximateLoad,
            priceRange,
            message: message || ''
        });

        // Emit socket event to notify admins
        if (req.app.get('io')) {
            req.app.get('io').emit('delivery-request-created', {
                requestId: deliveryRequest.requestId,
                customerName: deliveryRequest.customerName,
                source: deliveryRequest.source,
                destination: deliveryRequest.destination,
                createdAt: deliveryRequest.createdAt
            });
        }

        res.status(201).json({
            success: true,
            message: 'Delivery request submitted successfully',
            data: deliveryRequest
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating delivery request',
            error: error.message
        });
    }
};

// @desc    Get all delivery requests
// @route   GET /api/delivery-requests
// @access  Private
export const getRequests = async (req, res) => {
    try {
        const filter = {};

        // If user is customer, only show their requests
        if (req.user.role === 'customer') {
            filter.customerId = req.user._id;
        }

        // Filter by status if provided
        if (req.query.status) {
            filter.status = req.query.status;
        }

        const requests = await DeliveryRequest.find(filter)
            .populate('reviewedBy', 'name email')
            .populate('createdShipment', 'referenceId status')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching delivery requests',
            error: error.message
        });
    }
};

// @desc    Get pending delivery requests
// @route   GET /api/delivery-requests/pending
// @access  Private (Admin only)
export const getPendingRequests = async (req, res) => {
    try {
        const requests = await DeliveryRequest.find({ status: 'PENDING' })
            .populate('customerId', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching pending requests',
            error: error.message
        });
    }
};

// @desc    Approve delivery request (without creating shipment - admin will create manually)
// @route   PUT /api/delivery-requests/:id/approve
// @access  Private (Admin only)
export const approveRequest = async (req, res) => {
    try {
        const request = await DeliveryRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Delivery request not found'
            });
        }

        if (request.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Request has already been reviewed'
            });
        }

        // Update request status to approved (shipment will be created separately via form)
        request.status = 'APPROVED';
        request.reviewedBy = req.user._id;
        request.reviewedAt = new Date();
        await request.save();

        // Emit socket event to notify customer
        if (req.app.get('io')) {
            req.app.get('io').emit('delivery-request-updated', {
                requestId: request.requestId,
                customerId: request.customerId.toString(),
                status: 'APPROVED'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Request approved successfully',
            data: request
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error approving request',
            error: error.message
        });
    }
};

// @desc    Reject delivery request
// @route   PUT /api/delivery-requests/:id/reject
// @access  Private (Admin only)
export const rejectRequest = async (req, res) => {
    try {
        const request = await DeliveryRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Delivery request not found'
            });
        }

        if (request.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Request has already been reviewed'
            });
        }

        // Update request status
        request.status = 'REJECTED';
        request.reviewedBy = req.user._id;
        request.reviewedAt = new Date();
        request.rejectionReason = req.body.reason || 'No reason provided';
        await request.save();

        // Emit socket event to notify customer
        if (req.app.get('io')) {
            req.app.get('io').emit('delivery-request-updated', {
                requestId: request.requestId,
                customerId: request.customerId.toString(),
                status: 'REJECTED',
                reason: request.rejectionReason
            });
        }

        res.status(200).json({
            success: true,
            message: 'Request rejected successfully',
            data: request
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error rejecting request',
            error: error.message
        });
    }
};
