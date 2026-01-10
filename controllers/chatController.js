import axios from "axios";
import ChatThread from "../models/ChatThread.js";

const PYTHON_AI_SERVICE_URL =
    process.env.PYTHON_AI_SERVICE_URL || "http://localhost:8000";

/**
 * Send message to AI service and save to database
 */
export const sendMessage = async (req, res) => {
    try {
        const { message, thread_id } = req.body;
        const userId = req.user._id; // From auth middleware

        // Validate input
        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message cannot be empty",
            });
        }

        if (!thread_id) {
            return res.status(400).json({
                success: false,
                message: "Thread ID is required",
            });
        }

        console.log(`📨 Processing message for thread: ${thread_id}`);

        // Find or create chat thread
        let chatThread = await ChatThread.findOne({ thread_id, user_id: userId });

        if (!chatThread) {
            chatThread = new ChatThread({
                thread_id,
                user_id: userId,
                title: message.substring(0, 50), // Use first message as title
                messages: [],
            });
        }

        // Get conversation history for context (last 6 messages)
        const history = chatThread.messages
            .slice(-6)
            .map((msg) => ({
                role: msg.role,
                content: msg.content,
            }));

        // Call Python AI service
        let aiResponse;
        try {
            const response = await axios.post(
                `${PYTHON_AI_SERVICE_URL}/chat`,
                {
                    message,
                    thread_id,
                    history,
                },
                {
                    timeout: 30000, // 30 second timeout
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            aiResponse = response.data;
        } catch (error) {
            console.error("❌ Error calling AI service:", error.message);

            // Return error response
            return res.status(503).json({
                success: false,
                message: "AI service is currently unavailable. Please try again later.",
                error:
                    process.env.NODE_ENV === "development" ? error.message : undefined,
            });
        }

        // Save user message
        chatThread.messages.push({
            role: "user",
            content: message,
            type: "text",
            timestamp: new Date(),
        });

        // Save AI response
        const aiMessage = {
            role: "ai",
            content: aiResponse.type === "text" ? aiResponse.data : (aiResponse.title || "Chart generated"),
            type: aiResponse.type,
            timestamp: new Date(),
        };

        // Add chart data if it's a chart response
        if (aiResponse.type === "chart") {
            aiMessage.chart_data = {
                chart_type: aiResponse.chart_type,
                title: aiResponse.title,
                labels: aiResponse.labels,
                data: aiResponse.data_values,
            };
        }

        chatThread.messages.push(aiMessage);

        // Update title if it's still "New Chat"
        if (chatThread.title === "New Chat" && chatThread.messages.length === 2) {
            chatThread.title = message.substring(0, 50);
        }

        // Save to database
        await chatThread.save();

        console.log(`✅ Message saved to thread: ${thread_id}`);

        // Return AI response
        res.status(200).json({
            success: true,
            response: aiResponse,
            thread_id,
        });
    } catch (error) {
        console.error("❌ Error in sendMessage:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

/**
 * Get chat history for a thread
 */
export const getChatHistory = async (req, res) => {
    try {
        const { thread_id } = req.params;
        const userId = req.user._id;

        const chatThread = await ChatThread.findOne({ thread_id, user_id: userId });

        if (!chatThread) {
            return res.status(404).json({
                success: false,
                message: "Chat thread not found",
            });
        }

        res.status(200).json({
            success: true,
            thread: chatThread,
        });
    } catch (error) {
        console.error("❌ Error in getChatHistory:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

/**
 * Get all chat threads for a user
 */
export const getAllThreads = async (req, res) => {
    try {
        const userId = req.user._id;

        const threads = await ChatThread.find({ user_id: userId })
            .select("thread_id title createdAt updatedAt messages")
            .sort({ updatedAt: -1 })
            .limit(50);

        // Add preview (first user message)
        const threadsWithPreview = threads.map((thread) => ({
            id: thread._id,
            thread_id: thread.thread_id,
            title: thread.title,
            date: thread.updatedAt,
            preview:
                thread.messages.find((m) => m.role === "user")?.content.substring(0, 50) ||
                "No messages",
        }));

        res.status(200).json({
            success: true,
            threads: threadsWithPreview,
        });
    } catch (error) {
        console.error("❌ Error in getAllThreads:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

/**
 * Delete a chat thread
 */
export const deleteThread = async (req, res) => {
    try {
        const { thread_id } = req.params;
        const userId = req.user._id;

        const result = await ChatThread.deleteOne({ thread_id, user_id: userId });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Chat thread not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Chat thread deleted successfully",
        });
    } catch (error) {
        console.error("❌ Error in deleteThread:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
