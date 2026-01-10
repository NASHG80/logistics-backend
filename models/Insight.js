import mongoose from "mongoose";

const insightSchema = new mongoose.Schema(
    {
        data: {
            type: Object,
            required: true,
        },
        generatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const Insight = mongoose.model("Insight", insightSchema);

export default Insight;
