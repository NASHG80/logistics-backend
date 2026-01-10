import express from "express";
import {
    sendMessage,
    getChatHistory,
    getAllThreads,
    deleteThread,
} from "../controllers/chatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Send message to AI
router.post("/", sendMessage);

// Get all threads for user
router.get("/threads", getAllThreads);

// Get specific thread history
router.get("/threads/:thread_id", getChatHistory);

// Delete thread
router.delete("/threads/:thread_id", deleteThread);

export default router;
