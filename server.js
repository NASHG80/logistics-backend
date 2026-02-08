import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import shipmentRoutes from "./routes/shipmentRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import deliveryRequestRoutes from "./routes/deliveryRequestRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import epodRoutes from "./routes/epodRoutes.js";
import podRoutes from "./routes/podRoutes.js";
import insightRoutes from "./routes/insightRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";

/* ================= ENV ================= */
dotenv.config();

/* ================= DB ================= */
connectDB();

/* ================= APP ================= */
const app = express();

/* ================= HTTP SERVER (IMPORTANT) ================= */
const server = http.createServer(app);

/* ================= SOCKET.IO ================= */
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

/* ================= SOCKET EVENTS ================= */
io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  // Join shipment room
  socket.on("join-shipment", (shipmentId) => {
    socket.join(shipmentId);
    console.log(`📦 Joined shipment room: ${shipmentId}`);
  });

  // Receive driver location & broadcast
  socket.on("driver-location", (data) => {
    /*
      data = {
        shipmentId,
        lat,
        lng,
        timestamp,
        vehicleNumber,
        driverName
      }
    */

    if (!data?.shipmentId) return;

    console.log(
      `📍 Driver location: ${data.shipmentId} → ${data.lat}, ${data.lng}`
    );

    // Broadcast to all clients in the shipment room
    io.to(data.shipmentId).emit("location-update", {
      shipmentId: data.shipmentId,
      referenceId: data.shipmentId, // Add referenceId for customer matching
      lat: data.lat,
      lng: data.lng,
      timestamp: data.timestamp,
      vehicleNumber: data.vehicleNumber,
      driverName: data.driverName,
    });

    console.log(`✅ Broadcasted location-update to room: ${data.shipmentId}`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

/* ================= MIDDLEWARE ================= */
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Make io accessible to routes
app.set('io', io);

/* ================= ROUTES ================= */
app.use("/api/auth", authRoutes);
app.use("/api/shipments", shipmentRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/delivery-requests", deliveryRequestRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/epod", epodRoutes);
app.use("/api/pod", podRoutes);
app.use("/api/insights", insightRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/support", supportRoutes);

/* ================= HEALTH ================= */
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
  });
});

/* ================= 404 ================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* ================= ERROR HANDLER ================= */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : undefined,
  });
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
