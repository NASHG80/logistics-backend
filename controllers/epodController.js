import Shipment from "../models/Shipment.js";

export const submitEPOD = async (req, res) => {
  try {
    const { signatureImage } = req.body;

    if (!signatureImage) {
      return res.status(400).json({ message: "Signature required" });
    }

    const shipment = await Shipment.findById(req.params.shipmentId);
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    if (shipment.epod?.signatureImage) {
      return res.status(400).json({ message: "ePOD already submitted" });
    }

    shipment.epod = {
      signedBy: req.user.name,
      signatureImage,
      signedAt: new Date(),
      ipAddress: req.ip,
    };

    shipment.status = "DELIVERED";

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
      message: "ePOD submitted successfully",
      shipment: {
        _id: shipment._id,
        status: shipment.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
