const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const winston = require("winston");
const { createClient } = require("@supabase/supabase-js");
const http = require("http");
const { Server } = require("socket.io");
const ChatController = require("./controllers/chat.controller");

// Load configuration
const configPath = path.join(__dirname, "../config/config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

// Initialize logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: "partystream-backend" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Initialize Supabase client
const supabase = createClient(config.database.url, config.database.key);

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || config.server.corsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make io available for routes
app.set("io", io);

// Initialize Socket.io event handlers
ChatController.initSocketIO(io);

// Basic middleware
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "PartyStream API is running",
    version: config.app.version,
    timestamp: new Date().toISOString(),
  });
});

// Import routes
// User routes
const userRoutes = require("./routes/user.routes");
app.use("/api/users", userRoutes);

// DJ routes
const djRoutes = require("./routes/dj.routes");
app.use("/api/djs", djRoutes);

// Booking routes
const bookingRoutes = require("./routes/booking.routes");
app.use("/api/bookings", bookingRoutes);

// Stream routes
const streamRoutes = require("./routes/stream.routes");
app.use("/api/streams", streamRoutes);

// Payment routes
const paymentRoutes = require("./routes/payment.routes");
app.use("/api/payments", paymentRoutes);

// Chat routes
const chatRoutes = require("./routes/chat.routes");
app.use("/api/chat", chatRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(
    `${err.status || 500} - ${err.message} - ${req.originalUrl} - ${
      req.method
    } - ${req.ip}`
  );

  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

// Start server
const PORT = process.env.PORT || config.server.port;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${config.server.env} mode`);
  logger.info(`Socket.io initialized for real-time communication`);
});

// Export for testing
module.exports = { app, server, io };
