const { db, TABLES, logger } = require("../utils/database");
const stripe = require("stripe");
const fs = require("fs");
const path = require("path");

// Load configuration
const configPath = path.join(__dirname, "../../config/config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

// Initialize Stripe
const stripeClient = stripe(config.stripe.secretKey);

/**
 * Payment Model - Functions for payment operations
 */
const Payment = {
  /**
   * Get all payments
   * @param {Object} filters - Optional filters
   * @returns {Promise} - Array of payments
   */
  getAll: async (filters = {}) => {
    try {
      logger.info(
        `Getting all payments with filters: ${JSON.stringify(filters)}`
      );
      return await db.getAll(TABLES.PAYMENTS, filters);
    } catch (error) {
      logger.error(`Error getting all payments: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get payment by ID
   * @param {string|number} id - Payment ID
   * @returns {Promise} - Payment object
   */
  getById: async (id) => {
    try {
      logger.info(`Getting payment by ID: ${id}`);
      return await db.getById(TABLES.PAYMENTS, id);
    } catch (error) {
      logger.error(`Error getting payment by ID: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get payments by booking ID
   * @param {string|number} bookingId - Booking ID
   * @returns {Promise} - Array of payments
   */
  getByBookingId: async (bookingId) => {
    try {
      logger.info(`Getting payments by booking ID: ${bookingId}`);
      return await db.getAll(TABLES.PAYMENTS, { booking_id: bookingId });
    } catch (error) {
      logger.error(`Error getting payments by booking ID: ${error.message}`);
      throw error;
    }
  },

  /**
   * Create a payment intent
   * @param {Object} paymentData - Payment data
   * @returns {Promise} - Payment intent and client secret
   */
  createPaymentIntent: async (paymentData) => {
    try {
      logger.info(`Creating payment intent: ${JSON.stringify(paymentData)}`);

      // Ensure required fields
      if (
        !paymentData.booking_id ||
        !paymentData.amount ||
        !paymentData.currency
      ) {
        throw new Error("Missing required payment fields");
      }

      // Calculate platform fee
      const platformFeePercentage = config.stripe.platformFeePercentage || 15;
      const platformFeeAmount = Math.round(
        paymentData.amount * (platformFeePercentage / 100)
      );

      // Create payment intent with Stripe
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount: paymentData.amount,
        currency: paymentData.currency || "usd",
        description: `Booking ID: ${paymentData.booking_id}`,
        metadata: {
          booking_id: paymentData.booking_id,
          host_id: paymentData.host_id,
          dj_profile_id: paymentData.dj_profile_id,
          platform_fee: platformFeeAmount,
        },
      });

      logger.info(`Payment intent created: ${paymentIntent.id}`);

      // Create payment record in database
      const newPayment = {
        booking_id: paymentData.booking_id,
        host_id: paymentData.host_id,
        dj_profile_id: paymentData.dj_profile_id,
        amount: paymentData.amount,
        currency: paymentData.currency || "usd",
        platform_fee: platformFeeAmount,
        payment_intent_id: paymentIntent.id,
        payment_intent_client_secret: paymentIntent.client_secret,
        status: "pending",
        created_at: new Date(),
      };

      const result = await db.insert(TABLES.PAYMENTS, newPayment);

      return {
        payment: result[0],
        client_secret: paymentIntent.client_secret,
      };
    } catch (error) {
      logger.error(`Error creating payment intent: ${error.message}`);
      throw error;
    }
  },

  /**
   * Update payment status
   * @param {string|number} id - Payment ID
   * @param {string} status - New status
   * @returns {Promise} - Updated payment object
   */
  updateStatus: async (id, status) => {
    try {
      logger.info(`Updating payment ${id} status to: ${status}`);

      // Validate status
      const validStatuses = [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "refunded",
      ];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
      }

      return await db.update(TABLES.PAYMENTS, id, {
        status,
        updated_at: new Date(),
      });
    } catch (error) {
      logger.error(`Error updating payment status: ${error.message}`);
      throw error;
    }
  },

  /**
   * Process Stripe webhook event
   * @param {Object} event - Stripe webhook event
   * @returns {Promise} - Result of webhook processing
   */
  processWebhook: async (event) => {
    try {
      logger.info(`Processing Stripe webhook event: ${event.type}`);

      switch (event.type) {
        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object;

          // Find payment in database
          const { data: payments, error } = await db.supabase
            .from(TABLES.PAYMENTS)
            .select("*")
            .eq("payment_intent_id", paymentIntent.id);

          if (error || !payments || payments.length === 0) {
            logger.error(
              `Payment not found for payment intent: ${paymentIntent.id}`
            );
            return { success: false, message: "Payment not found" };
          }

          const payment = payments[0];

          // Update payment status
          await Payment.updateStatus(payment.id, "succeeded");

          // Update booking payment status
          const { data: bookings, error: bookingError } = await db.supabase
            .from(TABLES.BOOKINGS)
            .select("*")
            .eq("id", payment.booking_id);

          if (!bookingError && bookings && bookings.length > 0) {
            const Booking = require("./Booking");
            await Booking.updatePaymentStatus(payment.booking_id, "completed");
            await Booking.updateStatus(payment.booking_id, "confirmed");
          }

          return { success: true, message: "Payment succeeded" };
        }

        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object;

          // Find payment in database
          const { data: payments, error } = await db.supabase
            .from(TABLES.PAYMENTS)
            .select("*")
            .eq("payment_intent_id", paymentIntent.id);

          if (error || !payments || payments.length === 0) {
            logger.error(
              `Payment not found for payment intent: ${paymentIntent.id}`
            );
            return { success: false, message: "Payment not found" };
          }

          const payment = payments[0];

          // Update payment status
          await Payment.updateStatus(payment.id, "failed");

          // Update booking payment status
          const { data: bookings, error: bookingError } = await db.supabase
            .from(TABLES.BOOKINGS)
            .select("*")
            .eq("id", payment.booking_id);

          if (!bookingError && bookings && bookings.length > 0) {
            const Booking = require("./Booking");
            await Booking.updatePaymentStatus(payment.booking_id, "failed");
          }

          return { success: true, message: "Payment failed" };
        }

        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
          return { success: true, message: "Unhandled event type" };
      }
    } catch (error) {
      logger.error(`Error processing webhook: ${error.message}`);
      throw error;
    }
  },

  /**
   * Refund a payment
   * @param {string|number} id - Payment ID
   * @param {Object} refundData - Refund data
   * @returns {Promise} - Refund result
   */
  refund: async (id, refundData = {}) => {
    try {
      logger.info(`Refunding payment ${id}: ${JSON.stringify(refundData)}`);

      // Get payment from database
      const payment = await Payment.getById(id);

      if (!payment || !payment.payment_intent_id) {
        throw new Error("Payment not found or missing payment intent ID");
      }

      // Create refund with Stripe
      const refund = await stripeClient.refunds.create({
        payment_intent: payment.payment_intent_id,
        amount: refundData.amount || payment.amount, // Full refund by default
        reason: refundData.reason || "requested_by_customer",
      });

      logger.info(`Refund created: ${refund.id}`);

      // Update payment status
      await Payment.updateStatus(id, "refunded");

      // Update booking status if needed
      if (payment.booking_id) {
        const Booking = require("./Booking");
        await Booking.updatePaymentStatus(payment.booking_id, "refunded");

        // If the booking is not yet completed, also cancel it
        const { data: bookings, error } = await db.supabase
          .from(TABLES.BOOKINGS)
          .select("*")
          .eq("id", payment.booking_id);

        if (
          !error &&
          bookings &&
          bookings.length > 0 &&
          bookings[0].status !== "completed"
        ) {
          await Booking.updateStatus(payment.booking_id, "cancelled");
        }
      }

      return {
        success: true,
        refund_id: refund.id,
        amount: refund.amount,
        status: refund.status,
      };
    } catch (error) {
      logger.error(`Error refunding payment: ${error.message}`);
      throw error;
    }
  },
};

module.exports = Payment;
