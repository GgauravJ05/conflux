import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import "dotenv/config";

import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";
import aiRoutes from "./routes/ai.routes.js";

const app = express();
const server = createServer(app);
connectToSocket(server);

const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/conflux";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

app.set("port", PORT);
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        db: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
    });
});

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/ai", aiRoutes);

// Unknown API route
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// Central error handler so a thrown error never leaks a stack trace
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

// listen() reports failures (a port already in use, for example) via an event,
// not a rejected promise, so it needs its own handler.
server.on("error", (e) => {
    if (e.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Set PORT to a free port and retry.`);
    } else {
        console.error("Server error:", e.message);
    }
    process.exit(1);
});

const start = async () => {
    try {
        const connectionDb = await mongoose.connect(MONGO_URI);
        console.log(`MongoDB connected. Host: ${connectionDb.connection.host}`);

        server.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
        });
    } catch (e) {
        console.error("Failed to connect to MongoDB:", e.message);
        process.exit(1);
    }
};

start();
