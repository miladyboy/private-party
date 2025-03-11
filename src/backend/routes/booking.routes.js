const express = require("express");
const BookingController = require("../controllers/booking.controller");
const { authenticateJWT } = require("../middleware/auth");
const { rateLimiter } = require("../middleware/rate-limiter");

const router = express.Router();

/**
 * Booking Routes
 * Base path: /api/bookings
 */

/**
 * @route   GET /api/bookings/me
 * @desc    Get all bookings for current user
 * @access  Private (Host, DJ)
 */
router.get("/me", authenticateJWT, BookingController.getMyBookings);

/**
 * @route   GET /api/bookings/:id
 * @desc    Get booking by ID
 * @access  Private (Host, DJ of this booking)
 */
router.get("/:id", authenticateJWT, BookingController.getBookingById);

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking
 * @access  Private (Host only)
 */
router.post(
  "/",
  authenticateJWT,
  rateLimiter("booking_create", 10, 60 * 60), // 10 requests per hour
  BookingController.createBooking
);

/**
 * @route   PUT /api/bookings/:id
 * @desc    Update booking
 * @access  Private (Host of this booking)
 */
router.put(
  "/:id",
  authenticateJWT,
  rateLimiter("booking_update", 20, 60 * 60), // 20 requests per hour
  BookingController.updateBooking
);

/**
 * @route   PATCH /api/bookings/:id/status
 * @desc    Update booking status
 * @access  Private (Host or DJ of this booking, depending on status)
 */
router.patch(
  "/:id/status",
  authenticateJWT,
  rateLimiter("booking_status", 15, 60 * 60), // 15 requests per hour
  BookingController.updateBookingStatus
);

/**
 * @route   DELETE /api/bookings/:id
 * @desc    Delete booking
 * @access  Private (Host of this booking, Admin)
 */
router.delete("/:id", authenticateJWT, BookingController.deleteBooking);

module.exports = router;
