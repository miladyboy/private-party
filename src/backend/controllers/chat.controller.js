const Chat = require("../models/Chat");
const Booking = require("../models/Booking");
const DjProfile = require("../models/DjProfile");
const User = require("../models/User");
const { logger } = require("../utils/database");
const jwt = require("jsonwebtoken");

/**
 * Chat Controller - Handlers for chat-related API endpoints
 */
const ChatController = {
  /**
   * Get chat messages for a booking
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  getChatMessages: async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { limit = 50, before } = req.query;

      logger.info(`Getting chat messages for booking: ${bookingId}`);

      // Get booking to check authorization
      const booking = await Booking.getById(bookingId);

      if (!booking) {
        logger.warn(`Booking not found: ${bookingId}`);
        return res.status(404).json({
          status: "error",
          message: "Booking not found",
        });
      }

      // Check if user is authorized to view chat for this booking
      const isHost = booking.host_id === req.user.id;
      let isDj = false;

      if (req.user.role === "dj") {
        const djProfile = await DjProfile.getByUserId(req.user.id);
        isDj = djProfile && djProfile.id === booking.dj_profile_id;
      }

      if (req.user.role !== "admin" && !isHost && !isDj) {
        logger.warn(
          `User ${req.user.id} not authorized to view chat for booking ${bookingId}`
        );
        return res.status(403).json({
          status: "error",
          message: "Not authorized to view chat for this booking",
        });
      }

      // Get chat messages
      const messages = await Chat.getByBookingId(
        bookingId,
        parseInt(limit),
        before
      );

      // Fetch user details for each message
      const messagesWithUserDetails = await Promise.all(
        messages.map(async (message) => {
          const user = await User.getById(message.user_id);
          return {
            ...message,
            user: {
              id: user.id,
              username: user.username,
              name: user.name,
              role: user.role,
              avatar_url: user.avatar_url,
            },
          };
        })
      );

      res.status(200).json({
        status: "success",
        data: {
          messages: messagesWithUserDetails,
        },
      });
    } catch (error) {
      logger.error(`Get chat messages error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to get chat messages",
        error: error.message,
      });
    }
  },

  /**
   * Create a new chat message (REST API fallback)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  createChatMessage: async (req, res) => {
    try {
      const { booking_id, content } = req.body;

      if (!booking_id || !content) {
        return res.status(400).json({
          status: "error",
          message: "Booking ID and message content are required",
        });
      }

      logger.info(`Creating chat message for booking: ${booking_id}`);

      // Get booking to check authorization
      const booking = await Booking.getById(booking_id);

      if (!booking) {
        logger.warn(`Booking not found: ${booking_id}`);
        return res.status(404).json({
          status: "error",
          message: "Booking not found",
        });
      }

      // Check if user is authorized to send messages for this booking
      const isHost = booking.host_id === req.user.id;
      let isDj = false;

      if (req.user.role === "dj") {
        const djProfile = await DjProfile.getByUserId(req.user.id);
        isDj = djProfile && djProfile.id === booking.dj_profile_id;
      }

      if (req.user.role !== "admin" && !isHost && !isDj) {
        logger.warn(
          `User ${req.user.id} not authorized to send messages for booking ${booking_id}`
        );
        return res.status(403).json({
          status: "error",
          message: "Not authorized to send messages for this booking",
        });
      }

      // Create chat message
      const newMessage = await Chat.create({
        booking_id,
        user_id: req.user.id,
        content,
        timestamp: new Date().toISOString(),
      });

      // Get user details
      const user = await User.getById(req.user.id);

      const messageWithUser = {
        ...newMessage[0],
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          avatar_url: user.avatar_url,
        },
      };

      // If socket.io is available, emit to booking room
      if (req.app.get("io")) {
        const io = req.app.get("io");
        io.to(`booking:${booking_id}`).emit("chat:message", messageWithUser);
      }

      logger.info(
        `Chat message created successfully for booking: ${booking_id}`
      );

      res.status(201).json({
        status: "success",
        message: "Chat message sent successfully",
        data: {
          message: messageWithUser,
        },
      });
    } catch (error) {
      logger.error(`Create chat message error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to send chat message",
        error: error.message,
      });
    }
  },

  /**
   * Initialize Socket.io for chat
   * @param {Object} io - Socket.io server instance
   */
  initSocketIO: (io) => {
    // Middleware for authentication
    io.use(async (socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      try {
        // Verify token (implement your JWT verification here)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user data to socket
        socket.user = decoded.user;
        next();
      } catch (error) {
        logger.error(`Socket authentication error: ${error.message}`);
        next(new Error("Authentication failed"));
      }
    });

    // Handle connections
    io.on("connection", (socket) => {
      logger.info(`Socket connected: ${socket.id} (User: ${socket.user.id})`);

      // Join booking room
      socket.on("join:booking", async (bookingId) => {
        try {
          // Verify that user has access to this booking
          const booking = await Booking.getById(bookingId);

          if (!booking) {
            socket.emit("error", { message: "Booking not found" });
            return;
          }

          // Check if user is authorized to join this booking's chat
          const isHost = booking.host_id === socket.user.id;
          let isDj = false;

          if (socket.user.role === "dj") {
            const djProfile = await DjProfile.getByUserId(socket.user.id);
            isDj = djProfile && djProfile.id === booking.dj_profile_id;
          }

          if (socket.user.role !== "admin" && !isHost && !isDj) {
            socket.emit("error", {
              message: "Not authorized to join this booking's chat",
            });
            return;
          }

          // Join the room
          socket.join(`booking:${bookingId}`);

          logger.info(
            `User ${socket.user.id} joined chat for booking: ${bookingId}`
          );

          // Notify room of new user
          socket.to(`booking:${bookingId}`).emit("user:joined", {
            userId: socket.user.id,
            username: socket.user.username,
          });

          socket.emit("join:success", { bookingId });
        } catch (error) {
          logger.error(`Error joining booking room: ${error.message}`);
          socket.emit("error", { message: "Failed to join booking chat" });
        }
      });

      // Leave booking room
      socket.on("leave:booking", (bookingId) => {
        socket.leave(`booking:${bookingId}`);
        logger.info(
          `User ${socket.user.id} left chat for booking: ${bookingId}`
        );
      });

      // Send chat message
      socket.on("chat:message", async (data) => {
        try {
          const { bookingId, content } = data;

          if (!bookingId || !content) {
            socket.emit("error", {
              message: "Booking ID and message content are required",
            });
            return;
          }

          // Verify that user has access to this booking
          const booking = await Booking.getById(bookingId);

          if (!booking) {
            socket.emit("error", { message: "Booking not found" });
            return;
          }

          // Check if user is authorized to send messages for this booking
          const isHost = booking.host_id === socket.user.id;
          let isDj = false;

          if (socket.user.role === "dj") {
            const djProfile = await DjProfile.getByUserId(socket.user.id);
            isDj = djProfile && djProfile.id === booking.dj_profile_id;
          }

          if (socket.user.role !== "admin" && !isHost && !isDj) {
            socket.emit("error", {
              message: "Not authorized to send messages for this booking",
            });
            return;
          }

          // Create chat message
          const newMessage = await Chat.create({
            booking_id: bookingId,
            user_id: socket.user.id,
            content,
            timestamp: new Date().toISOString(),
          });

          // Get user details
          const user = await User.getById(socket.user.id);

          const messageWithUser = {
            ...newMessage[0],
            user: {
              id: user.id,
              username: user.username,
              name: user.name,
              role: user.role,
              avatar_url: user.avatar_url,
            },
          };

          // Emit to the room
          io.to(`booking:${bookingId}`).emit("chat:message", messageWithUser);

          logger.info(
            `Socket chat message sent for booking: ${bookingId} by user: ${socket.user.id}`
          );
        } catch (error) {
          logger.error(`Socket chat message error: ${error.message}`);
          socket.emit("error", { message: "Failed to send message" });
        }
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        logger.info(
          `Socket disconnected: ${socket.id} (User: ${socket.user.id})`
        );
      });
    });

    logger.info("Socket.io initialized for chat");
  },
};

module.exports = ChatController;
