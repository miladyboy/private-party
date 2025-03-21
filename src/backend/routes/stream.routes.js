const express = require("express");
const StreamController = require("../controllers/stream.controller");
const { authenticateJWT } = require("../middleware/auth");
const { rateLimiter } = require("../middleware/rate-limiter");

const router = express.Router();

/**
 * Stream Routes
 * Base path: /api/streams
 */

/**
 * @route   GET /api/streams/:id
 * @desc    Get stream by ID
 * @access  Private (Host or DJ of this stream)
 */
router.get("/:id", authenticateJWT, StreamController.getStreamById);

/**
 * @route   GET /api/streams/booking/:bookingId
 * @desc    Get active stream for a booking
 * @access  Private (Host or DJ of this booking)
 */
router.get(
  "/booking/:bookingId",
  authenticateJWT,
  StreamController.getStreamByBookingId
);

/**
 * @route   POST /api/streams
 * @desc    Create a new stream
 * @access  Private (DJ only)
 */
router.post(
  "/",
  authenticateJWT,
  rateLimiter("stream_create", 5, 60 * 60), // 5 requests per hour
  StreamController.createStream
);

/**
 * @route   PATCH /api/streams/:id/start
 * @desc    Start stream
 * @access  Private (DJ only)
 */
router.patch(
  "/:id/start",
  authenticateJWT,
  rateLimiter("stream_start", 5, 60 * 60), // 5 requests per hour
  StreamController.startStream
);

/**
 * @route   PATCH /api/streams/:id/end
 * @desc    End stream
 * @access  Private (DJ or Host)
 */
router.patch(
  "/:id/end",
  authenticateJWT,
  rateLimiter("stream_end", 5, 60 * 60), // 5 requests per hour
  StreamController.endStream
);

/**
 * @route   DELETE /api/streams/:id
 * @desc    Delete stream
 * @access  Private (Admin only)
 */
router.delete("/:id", authenticateJWT, StreamController.deleteStream);

module.exports = router;
