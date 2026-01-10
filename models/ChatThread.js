import mongoose from "mongoose";

const chatThreadSchema = new mongoose.Schema(
    {
        thread_id: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        title: {
            type: String,
            default: "New Chat",
        },
        messages: [
            {
                role: {
                    type: String,
                    enum: ["user", "ai"],
                    required: true,
                },
                content: {
                    type: String,
                    required: true,
                },
                type: {
                    type: String,
                    enum: ["text", "chart"],
                    default: "text",
                },
                // For chart responses
                chart_data: {
                    chart_type: String, // "pie", "bar", "line"
                    title: String,
                    labels: [String],
                    data: [Number],
                },
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true, // Adds createdAt and updatedAt
    }
);

// Index for efficient queries
chatThreadSchema.index({ user_id: 1, createdAt: -1 });

const ChatThread = mongoose.model("ChatThread", chatThreadSchema);

export default ChatThread;
