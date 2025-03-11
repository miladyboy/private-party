const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const DjProfile = require("../models/DjProfile");
const User = require("../models/User");
const { logger } = require("../utils/database");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const config = require("../config/config.json");

/**
 * Payment Controller - Handlers for payment-related API endpoints
 */
const PaymentController = {
  /**
   * Get payment by ID
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  getPaymentById: async (req, res) => {
    try {
      const { id } = req.params;

      logger.info(`Getting payment by ID: ${id}`);

      const payment = await Payment.getById(id);

      if (!payment) {
        logger.warn(`Payment not found: ${id}`);
        return res.status(404).json({
          status: "error",
          message: "Payment not found",
        });
      }

      // Get booking to check authorization
      const booking = await Booking.getById(payment.booking_id);

      if (!booking) {
        logger.warn(`Associated booking not found for payment: ${id}`);
        return res.status(404).json({
          status: "error",
          message: "Associated booking not found",
        });
      }

      // Check if user is authorized to view this payment
      const isHost = booking.host_id === req.user.id;
      let isDj = false;

      if (req.user.role === "dj") {
        const djProfile = await DjProfile.getByUserId(req.user.id);
        isDj = djProfile && djProfile.id === booking.dj_profile_id;
      }

      if (req.user.role !== "admin" && !isHost && !isDj) {
        logger.warn(`User ${req.user.id} not authorized to view payment ${id}`);
        return res.status(403).json({
          status: "error",
          message: "Not authorized to view this payment",
        });
      }

      res.status(200).json({
        status: "success",
        data: {
          payment,
        },
      });
    } catch (error) {
      logger.error(`Get payment error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to get payment",
        error: error.message,
      });
    }
  },

  /**
   * Get payments by booking ID
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  getPaymentsByBookingId: async (req, res) => {
    try {
      const { bookingId } = req.params;

      logger.info(`Getting payments for booking: ${bookingId}`);

      // Get booking to check authorization
      const booking = await Booking.getById(bookingId);

      if (!booking) {
        logger.warn(`Booking not found: ${bookingId}`);
        return res.status(404).json({
          status: "error",
          message: "Booking not found",
        });
      }

      // Check if user is authorized to view payments for this booking
      const isHost = booking.host_id === req.user.id;
      let isDj = false;

      if (req.user.role === "dj") {
        const djProfile = await DjProfile.getByUserId(req.user.id);
        isDj = djProfile && djProfile.id === booking.dj_profile_id;
      }

      if (req.user.role !== "admin" && !isHost && !isDj) {
        logger.warn(
          `User ${req.user.id} not authorized to view payments for booking ${bookingId}`
        );
        return res.status(403).json({
          status: "error",
          message: "Not authorized to view payments for this booking",
        });
      }

      const payments = await Payment.getByBookingId(bookingId);

      res.status(200).json({
        status: "success",
        data: {
          payments,
        },
      });
    } catch (error) {
      logger.error(`Get payments by booking error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to get payments",
        error: error.message,
      });
    }
  },

  /**
   * Create payment intent for a booking
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  createPaymentIntent: async (req, res) => {
    try {
      const { booking_id } = req.body;

      if (!booking_id) {
        return res.status(400).json({
          status: "error",
          message: "Booking ID is required",
        });
      }

      logger.info(`Creating payment intent for booking: ${booking_id}`);

      // Get booking
      const booking = await Booking.getById(booking_id);

      if (!booking) {
        logger.warn(`Booking not found: ${booking_id}`);
        return res.status(404).json({
          status: "error",
          message: "Booking not found",
        });
      }

      // Check if user is the host of this booking
      if (req.user.role !== "admin" && booking.host_id !== req.user.id) {
        logger.warn(
          `User ${req.user.id} not authorized to create payment for booking ${booking_id}`
        );
        return res.status(403).json({
          status: "error",
          message: "Only the host can create a payment for this booking",
        });
      }

      // Check if booking status allows payment
      if (booking.status !== "pending" && booking.status !== "confirmed") {
        logger.warn(
          `Cannot create payment for booking with status: ${booking.status}`
        );
        return res.status(400).json({
          status: "error",
          message:
            "Cannot create payment for a booking that is not pending or confirmed",
        });
      }

      // Check if booking already has a payment
      const existingPayment = await Payment.getByBookingIdAndStatus(
        booking_id,
        "succeeded"
      );

      if (existingPayment) {
        logger.warn(`Payment already exists for booking: ${booking_id}`);
        return res.status(409).json({
          status: "error",
          message: "A payment already exists for this booking",
        });
      }

      // Get DJ profile to calculate service fee
      const djProfile = await DjProfile.getById(booking.dj_profile_id);

      if (!djProfile) {
        logger.warn(`DJ profile not found: ${booking.dj_profile_id}`);
        return res.status(404).json({
          status: "error",
          message: "DJ profile not found",
        });
      }

      // Calculate service fee (platform's commission)
      const serviceFeePercentage = config.payments.serviceFeePercentage || 0.1; // Default to 10%
      const serviceFee =
        Math.round(booking.total_amount * serviceFeePercentage * 100) / 100;

      // Final amount to charge (in cents for Stripe)
      const amountInCents = Math.round(
        (booking.total_amount + serviceFee) * 100
      );

      // Get customer information
      const host = await User.getById(booking.host_id);

      // Create or retrieve Stripe customer
      let customer;
      if (host.stripe_customer_id) {
        customer = host.stripe_customer_id;
      } else {
        const newCustomer = await stripe.customers.create({
          email: host.email,
          name: host.name || host.username,
          metadata: {
            user_id: host.id,
          },
        });

        customer = newCustomer.id;

        // Update user with Stripe customer ID
        await User.update(host.id, { stripe_customer_id: customer });
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        customer: customer,
        payment_method_types: ["card"],
        description: `Booking #${booking_id} - DJ Service for ${booking.duration_hours} hours`,
        metadata: {
          booking_id: booking_id,
          dj_profile_id: booking.dj_profile_id,
          host_id: booking.host_id,
          service_fee: serviceFee,
        },
      });

      // Create payment record in database
      const newPayment = await Payment.create({
        booking_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: booking.total_amount,
        service_fee: serviceFee,
        total_amount: booking.total_amount + serviceFee,
        status: "pending",
        created_at: new Date().toISOString(),
      });

      logger.info(
        `Payment intent created successfully for booking: ${booking_id}`
      );

      res.status(201).json({
        status: "success",
        message: "Payment intent created successfully",
        data: {
          payment: newPayment[0],
          client_secret: paymentIntent.client_secret,
        },
      });
    } catch (error) {
      logger.error(`Create payment intent error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to create payment intent",
        error: error.message,
      });
    }
  },

  /**
   * Handle Stripe webhook events
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  handleWebhook: async (req, res) => {
    const signature = req.headers["stripe-signature"];

    let event;

    try {
      // Verify the webhook signature
      event = stripe.webhooks.constructEvent(
        req.rawBody, // Note: requires bodyParser raw handler
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      logger.error(
        `Stripe webhook signature verification failed: ${error.message}`
      );
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    logger.info(`Received Stripe webhook event: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSuccess(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.status(200).json({ received: true });
  },
};

/**
 * Handle successful payment
 * @param {Object} paymentIntent - Stripe payment intent object
 */
async function handlePaymentSuccess(paymentIntent) {
  try {
    logger.info(`Payment succeeded: ${paymentIntent.id}`);

    // Get booking ID from metadata
    const { booking_id } = paymentIntent.metadata;

    if (!booking_id) {
      logger.error(
        `No booking ID in payment intent metadata: ${paymentIntent.id}`
      );
      return;
    }

    // Update payment status in database
    const payment = await Payment.getByStripePaymentIntentId(paymentIntent.id);

    if (!payment) {
      logger.error(`Payment not found for payment intent: ${paymentIntent.id}`);
      return;
    }

    await Payment.updateStatus(
      payment.id,
      "succeeded",
      new Date().toISOString()
    );

    // Update booking payment status
    await Booking.updatePaymentStatus(booking_id, "paid");

    // If booking was pending, update to confirmed
    const booking = await Booking.getById(booking_id);

    if (booking && booking.status === "pending") {
      await Booking.updateStatus(booking_id, "confirmed");
    }

    logger.info(
      `Payment and booking updated for successful payment: ${paymentIntent.id}`
    );
  } catch (error) {
    logger.error(`Error handling payment success: ${error.message}`);
  }
}

/**
 * Handle failed payment
 * @param {Object} paymentIntent - Stripe payment intent object
 */
async function handlePaymentFailed(paymentIntent) {
  try {
    logger.info(`Payment failed: ${paymentIntent.id}`);

    // Update payment status in database
    const payment = await Payment.getByStripePaymentIntentId(paymentIntent.id);

    if (!payment) {
      logger.error(`Payment not found for payment intent: ${paymentIntent.id}`);
      return;
    }

    await Payment.updateStatus(payment.id, "failed", new Date().toISOString());

    logger.info(`Payment updated for failed payment: ${paymentIntent.id}`);
  } catch (error) {
    logger.error(`Error handling payment failure: ${error.message}`);
  }
}

module.exports = PaymentController;
