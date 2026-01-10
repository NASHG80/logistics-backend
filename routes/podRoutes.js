import express from "express";
import { uploadDriverPOD } from "../controllers/podController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/driver-pod", protect, uploadDriverPOD);

export default router;
