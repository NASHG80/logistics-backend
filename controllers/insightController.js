import axios from "axios";
import Insight from "../models/Insight.js";

const PYTHON_AI_SERVICE_URL =
    process.env.PYTHON_AI_SERVICE_URL || "http://localhost:8000";

/**
 * Get AI insights - returns cached insights or generates new ones
 */
export const getInsights = async (req, res) => {
    try {
        const { force } = req.query;
        const forceRegenerate = force === "true";

        console.log(`📊 Insights request - Force: ${forceRegenerate}`);

        // If force=true, always regenerate
        if (forceRegenerate) {
            console.log("🔄 Force regenerate requested");
            return await generateAndSaveInsights(res);
        }

        // Check if we have existing insights in DB
        const existingInsight = await Insight.findOne().sort({ createdAt: -1 });

        if (existingInsight) {
            console.log("✅ Returning cached insights from DB");
            return res.status(200).json({
                success: true,
                insights: existingInsight.data,
                cached: true,
                generatedAt: existingInsight.generatedAt,
            });
        }

        // No existing insights, generate new ones
        console.log("📊 No cached insights found, generating new ones");
        return await generateAndSaveInsights(res);
    } catch (error) {
        console.error("❌ Error in getInsights:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get insights",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

/**
 * Helper function to generate insights from AI service and save to DB
 */
async function generateAndSaveInsights(res) {
    try {
        // Call Python AI service
        console.log("🤖 Calling AI service to generate insights...");
        const response = await axios.post(
            `${PYTHON_AI_SERVICE_URL}/insights`,
            {},
            {
                timeout: 60000, // 60 second timeout for AI generation
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        const insightsData = response.data;
        console.log("✅ AI service returned insights");

        // Save to MongoDB (replace existing or create new)
        // We'll keep only the latest insight
        await Insight.deleteMany({}); // Clear old insights
        const newInsight = new Insight({
            data: insightsData,
            generatedAt: new Date(),
        });
        await newInsight.save();

        console.log("💾 Insights saved to database");

        return res.status(200).json({
            success: true,
            insights: insightsData,
            cached: false,
            generatedAt: newInsight.generatedAt,
        });
    } catch (error) {
        console.error("❌ Error generating insights:", error.message);
        throw error;
    }
}
