import Shipment from "../models/Shipment.js";

export const uploadDriverPOD = async (req, res) => {
  try {
    const { shipmentId, receiverName, podImage } = req.body;

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    shipment.pod = {
      uploadedBy: req.user._id,
      receiverName,
      image: podImage,
      uploadedAt: new Date(),
    };

    shipment.status = "AWAITING_CUSTOMER_SIGNATURE";

    await shipment.save();

    // Emit Socket.IO event for real-time status update
    const io = req.app.get('io');
    if (io) {
      io.emit('shipment-status-updated', {
        shipmentId: shipment._id,
        referenceId: shipment.referenceId,
        status: shipment.status
      });
    }

    res.status(200).json({
      success: true,
      message: "POD uploaded. Awaiting customer signature.",
      shipment: {
        _id: shipment._id,
        status: shipment.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
