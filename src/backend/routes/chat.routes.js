const express = require("express");
const ChatController = require("../controllers/chat.controller");
const { authenticate } = require("../middleware/auth");
const { rateLimiter } = require("../middleware/rate-limiter");

const router = express.Router();

/**
 * Chat Routes
 * Base path: /api/chat
 */

/**
 * @route   GET /api/chat/booking/:bookingId
 * @desc    Get chat messages for a booking
 * @access  Private (Host or DJ of this booking)
 */
router.get("/booking/:bookingId", authenticate, ChatController.getChatMessages);

/**
 * @route   POST /api/chat/message
 * @desc    Create a new chat message (REST API fallback)
 * @access  Private (Host or DJ of the booking)
 */
router.post(
  "/message",
  authenticate,
  rateLimiter("chat_message", 60, 60), // 60 messages per minute
  ChatController.createChatMessage
);

module.exports = router;
