import express from "express";
import { submitEPOD } from "../controllers/epodController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/:shipmentId", protect, submitEPOD);

export default router;
