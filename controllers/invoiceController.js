import Invoice from '../models/Invoice.js';
import Shipment from '../models/Shipment.js';

// Helper function to generate unique invoice ID
const generateInvoiceId = async () => {
  const count = await Invoice.countDocuments();
  return `INV-${String(count + 1001).padStart(4, '0')}`;
};

// @desc    Create or update invoice for a shipment
// @route   Internal function (called from shipmentController)
// @access  Private
export const createOrUpdateInvoice = async (shipmentId, customerName, amount) => {
  try {
    // Check if invoice already exists for this shipment
    const existingInvoice = await Invoice.findOne({ shipmentId });

    if (existingInvoice) {
      // Update existing invoice amount
      existingInvoice.amount = amount;
      existingInvoice.customerName = customerName; // Update customer name too
      await existingInvoice.save();
      console.log(`📝 Updated invoice ${existingInvoice.invoiceId} with new amount: ₹${amount}`);
      return existingInvoice;
    } else {
      // Create new invoice
      const invoiceId = await generateInvoiceId();
      const newInvoice = await Invoice.create({
        invoiceId,
        shipmentId,
        customerName,
        amount,
        status: 'PENDING',
        paymentDate: null
      });
      console.log(`✅ Created new invoice ${invoiceId} for shipment ${shipmentId}`);
      return newInvoice;
    }
  } catch (error) {
    console.error('Error creating/updating invoice:', error);
    throw error;
  }
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
export const getAllInvoices = async (req, res) => {
  try {
    const { status, search } = req.query;

    // Build filter object
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { invoiceId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } }
      ];
    }

    const invoices = await Invoice.find(filter)
      .populate('shipmentId', 'referenceId source destination status')
      .sort({ createdAt: -1 });

    // Format response for frontend table
    const formattedInvoices = invoices.map(invoice => ({
      _id: invoice._id,
      invoiceId: invoice.invoiceId,
      shipmentId: invoice.shipmentId?.referenceId || 'N/A',
      shipmentObjectId: invoice.shipmentId?._id,
      customerName: invoice.customerName,
      amount: invoice.amount,
      status: invoice.status,
      paymentDate: invoice.paymentDate,
      createdAt: invoice.createdAt,
      shipmentDetails: invoice.shipmentId ? {
        source: invoice.shipmentId.source,
        destination: invoice.shipmentId.destination,
        status: invoice.shipmentId.status
      } : null
    }));

    res.status(200).json({
      success: true,
      count: formattedInvoices.length,
      data: formattedInvoices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching invoices',
      error: error.message
    });
  }
};

// @desc    Get single invoice by invoiceId
// @route   GET /api/invoices/:invoiceId
// @access  Private
export const getInvoiceById = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    // Find invoice by invoiceId (not MongoDB _id)
    const invoice = await Invoice.findOne({ invoiceId })
      .populate('shipmentId');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Format response with complete details
    const response = {
      _id: invoice._id,
      invoiceId: invoice.invoiceId,
      customerName: invoice.customerName,
      amount: invoice.amount,
      status: invoice.status,
      paymentDate: invoice.paymentDate,
      createdAt: invoice.createdAt,
      shipment: invoice.shipmentId ? {
        _id: invoice.shipmentId._id,
        referenceId: invoice.shipmentId.referenceId,
        source: invoice.shipmentId.source,
        destination: invoice.shipmentId.destination,
        status: invoice.shipmentId.status,
        pickupDate: invoice.shipmentId.pickupDate,
        eta: invoice.shipmentId.eta,
        assignedVehicleNumber: invoice.shipmentId.assignedVehicleNumber,
        assignedDriverName: invoice.shipmentId.assignedDriverName
      } : null
    };

    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice',
      error: error.message
    });
  }
};

// @desc    Update invoice status (mark as PAID)
// @route   PUT /api/invoices/:invoiceId
// @access  Private (Admin only)
export const updateInvoiceStatus = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['PENDING', 'PAID'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be PENDING or PAID'
      });
    }

    const invoice = await Invoice.findOne({ invoiceId });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    invoice.status = status;

    // Set payment date when marked as PAID
    if (status === 'PAID' && !invoice.paymentDate) {
      invoice.paymentDate = new Date();
    }

    // Clear payment date when marked as PENDING
    if (status === 'PENDING') {
      invoice.paymentDate = null;
    }

    await invoice.save();

    res.status(200).json({
      success: true,
      message: `Invoice ${status === 'PAID' ? 'marked as paid' : 'updated'} successfully`,
      data: invoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating invoice',
      error: error.message
    });
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:invoiceId
// @access  Private (Admin only)
export const deleteInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await Invoice.findOne({ invoiceId });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Remove invoice reference from shipment
    await Shipment.findByIdAndUpdate(invoice.shipmentId, {
      $unset: { invoice: 1 }
    });

    await invoice.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting invoice',
      error: error.message
    });
  }
};

// @desc    Get invoices for a specific customer
// @route   GET /api/invoices/customer/:customerName
// @access  Private (Customer)
export const getCustomerInvoices = async (req, res) => {
  try {
    const { customerName } = req.params;
    const { status } = req.query; // Optional: filter by PENDING or PAID

    // Build filter
    const filter = { customerName };
    if (status) {
      filter.status = status.toUpperCase();
    }

    const invoices = await Invoice.find(filter)
      .populate('shipmentId', 'referenceId source destination status')
      .sort({ createdAt: -1 });

    // Format response
    const formattedInvoices = invoices.map(invoice => ({
      _id: invoice._id,
      invoiceId: invoice.invoiceId,
      shipmentId: invoice.shipmentId?.referenceId || 'N/A',
      amount: invoice.amount,
      status: invoice.status,
      paymentDate: invoice.paymentDate,
      createdAt: invoice.createdAt,
      dueDate: invoice.createdAt, // Using createdAt as due date for now
      shipmentDetails: invoice.shipmentId ? {
        source: invoice.shipmentId.source,
        destination: invoice.shipmentId.destination,
        status: invoice.shipmentId.status
      } : null
    }));

    res.status(200).json({
      success: true,
      count: formattedInvoices.length,
      data: formattedInvoices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching customer invoices',
      error: error.message
    });
  }
};

// @desc    Mark invoice as paid (fake payment completion)
// @route   POST /api/invoices/:invoiceId/pay
// @access  Private (Customer)
export const markInvoiceAsPaid = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await Invoice.findOne({ invoiceId });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Invoice is already paid'
      });
    }

    // Update invoice to paid status
    invoice.status = 'PAID';
    invoice.paymentDate = new Date();
    // Generate fake transaction ID
    invoice.transactionId = `FAKE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Payment completed successfully',
      data: {
        invoiceId: invoice.invoiceId,
        amount: invoice.amount,
        status: invoice.status,
        paymentDate: invoice.paymentDate,
        transactionId: invoice.transactionId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing payment',
      error: error.message
    });
  }
};
