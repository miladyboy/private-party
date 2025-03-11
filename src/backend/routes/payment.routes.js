const express = require("express");
const PaymentController = require("../controllers/payment.controller");
const { authenticate } = require("../middleware/auth");
const { rateLimiter } = require("../middleware/rate-limiter");
const { rawBodyMiddleware } = require("../middleware/raw-body");

const router = express.Router();

/**
 * Payment Routes
 * Base path: /api/payments
 */

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment by ID
 * @access  Private (Host or DJ of this payment's booking)
 */
router.get("/:id", authenticate, PaymentController.getPaymentById);

/**
 * @route   GET /api/payments/booking/:bookingId
 * @desc    Get payments for a booking
 * @access  Private (Host or DJ of this booking)
 */
router.get(
  "/booking/:bookingId",
  authenticate,
  PaymentController.getPaymentsByBookingId
);

/**
 * @route   POST /api/payments/create-intent
 * @desc    Create payment intent for a booking
 * @access  Private (Host only)
 */
router.post(
  "/create-intent",
  authenticate,
  rateLimiter("payment_intent", 10, 60 * 60), // 10 requests per hour
  PaymentController.createPaymentIntent
);

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle Stripe webhook events
 * @access  Public
 */
router.post("/webhook", rawBodyMiddleware, PaymentController.handleWebhook);

module.exports = router;
