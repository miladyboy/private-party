const { db, TABLES, logger } = require("../utils/database");
const moment = require("moment-timezone");

/**
 * Booking Model - Functions for booking operations
 */
const Booking = {
  /**
   * Get all bookings
   * @param {Object} filters - Optional filters
   * @returns {Promise} - Array of bookings
   */
  getAll: async (filters = {}) => {
    try {
      logger.info(
        `Getting all bookings with filters: ${JSON.stringify(filters)}`
      );
      return await db.getAll(TABLES.BOOKINGS, filters);
    } catch (error) {
      logger.error(`Error getting all bookings: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get booking by ID
   * @param {string|number} id - Booking ID
   * @returns {Promise} - Booking object
   */
  getById: async (id) => {
    try {
      logger.info(`Getting booking by ID: ${id}`);
      return await db.getById(TABLES.BOOKINGS, id);
    } catch (error) {
      logger.error(`Error getting booking by ID: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get bookings by host user ID
   * @param {string|number} hostId - Host user ID
   * @returns {Promise} - Array of bookings
   */
  getByHostId: async (hostId) => {
    try {
      logger.info(`Getting bookings by host ID: ${hostId}`);
      return await db.getAll(TABLES.BOOKINGS, { host_id: hostId });
    } catch (error) {
      logger.error(`Error getting bookings by host ID: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get bookings by DJ profile ID
   * @param {string|number} djProfileId - DJ profile ID
   * @returns {Promise} - Array of bookings
   */
  getByDjProfileId: async (djProfileId) => {
    try {
      logger.info(`Getting bookings by DJ profile ID: ${djProfileId}`);
      return await db.getAll(TABLES.BOOKINGS, { dj_profile_id: djProfileId });
    } catch (error) {
      logger.error(`Error getting bookings by DJ profile ID: ${error.message}`);
      throw error;
    }
  },

  /**
   * Create a new booking
   * @param {Object} bookingData - Booking data
   * @returns {Promise} - New booking object
   */
  create: async (bookingData) => {
    try {
      logger.info(`Creating new booking: ${JSON.stringify(bookingData)}`);

      // Ensure required fields
      if (
        !bookingData.host_id ||
        !bookingData.dj_profile_id ||
        !bookingData.start_time ||
        !bookingData.end_time
      ) {
        throw new Error("Missing required booking fields");
      }

      // Validate booking times
      const startTime = moment(bookingData.start_time);
      const endTime = moment(bookingData.end_time);

      if (!startTime.isValid() || !endTime.isValid()) {
        throw new Error("Invalid booking times");
      }

      if (endTime.isBefore(startTime)) {
        throw new Error("End time must be after start time");
      }

      // Calculate duration in hours
      const durationHours = endTime.diff(startTime, "hours", true);

      // Create booking data
      const newBooking = {
        host_id: bookingData.host_id,
        dj_profile_id: bookingData.dj_profile_id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_hours: durationHours,
        status: bookingData.status || "pending",
        total_amount: bookingData.total_amount,
        payment_status: bookingData.payment_status || "pending",
        notes: bookingData.notes || "",
        created_at: new Date(),
      };

      return await db.insert(TABLES.BOOKINGS, newBooking);
    } catch (error) {
      logger.error(`Error creating booking: ${error.message}`);
      throw error;
    }
  },

  /**
   * Update a booking
   * @param {string|number} id - Booking ID
   * @param {Object} bookingData - Updated booking data
   * @returns {Promise} - Updated booking object
   */
  update: async (id, bookingData) => {
    try {
      logger.info(`Updating booking ${id}: ${JSON.stringify(bookingData)}`);

      // If updating times, validate them
      if (bookingData.start_time && bookingData.end_time) {
        const startTime = moment(bookingData.start_time);
        const endTime = moment(bookingData.end_time);

        if (!startTime.isValid() || !endTime.isValid()) {
          throw new Error("Invalid booking times");
        }

        if (endTime.isBefore(startTime)) {
          throw new Error("End time must be after start time");
        }

        // Recalculate duration in hours
        bookingData.duration_hours = endTime.diff(startTime, "hours", true);
      }

      // Update booking data
      const updateData = {
        ...bookingData,
        updated_at: new Date(),
      };

      return await db.update(TABLES.BOOKINGS, id, updateData);
    } catch (error) {
      logger.error(`Error updating booking: ${error.message}`);
      throw error;
    }
  },

  /**
   * Delete a booking
   * @param {string|number} id - Booking ID
   * @returns {Promise} - Result of deletion
   */
  delete: async (id) => {
    try {
      logger.info(`Deleting booking: ${id}`);
      return await db.delete(TABLES.BOOKINGS, id);
    } catch (error) {
      logger.error(`Error deleting booking: ${error.message}`);
      throw error;
    }
  },

  /**
   * Update booking status
   * @param {string|number} id - Booking ID
   * @param {string} status - New status
   * @returns {Promise} - Updated booking object
   */
  updateStatus: async (id, status) => {
    try {
      logger.info(`Updating booking ${id} status to: ${status}`);

      // Validate status
      const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
      }

      return await db.update(TABLES.BOOKINGS, id, {
        status,
        updated_at: new Date(),
      });
    } catch (error) {
      logger.error(`Error updating booking status: ${error.message}`);
      throw error;
    }
  },

  /**
   * Update payment status
   * @param {string|number} id - Booking ID
   * @param {string} paymentStatus - New payment status
   * @returns {Promise} - Updated booking object
   */
  updatePaymentStatus: async (id, paymentStatus) => {
    try {
      logger.info(`Updating booking ${id} payment status to: ${paymentStatus}`);

      // Validate payment status
      const validPaymentStatuses = [
        "pending",
        "processing",
        "completed",
        "failed",
        "refunded",
      ];
      if (!validPaymentStatuses.includes(paymentStatus)) {
        throw new Error(`Invalid payment status: ${paymentStatus}`);
      }

      return await db.update(TABLES.BOOKINGS, id, {
        payment_status: paymentStatus,
        updated_at: new Date(),
      });
    } catch (error) {
      logger.error(`Error updating booking payment status: ${error.message}`);
      throw error;
    }
  },

  /**
   * Check for booking conflicts
   * @param {string|number} djProfileId - DJ profile ID
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @param {string|number} excludeBookingId - Optional booking ID to exclude from check
   * @returns {Promise} - Boolean indicating if conflict exists
   */
  checkConflicts: async (
    djProfileId,
    startTime,
    endTime,
    excludeBookingId = null
  ) => {
    try {
      logger.info(
        `Checking booking conflicts for DJ ${djProfileId} from ${startTime} to ${endTime}`
      );

      // Format times
      const start = moment(startTime).toISOString();
      const end = moment(endTime).toISOString();

      // Query for conflicting bookings
      let query = db.supabase
        .from(TABLES.BOOKINGS)
        .select("*")
        .eq("dj_profile_id", djProfileId)
        .eq("status", "confirmed")
        .or(`start_time.lte.${end},end_time.gte.${start}`);

      // Exclude the current booking if provided
      if (excludeBookingId) {
        query = query.neq("id", excludeBookingId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error(`Error checking booking conflicts: ${error.message}`);
        throw error;
      }

      // If any bookings are found, there's a conflict
      return data && data.length > 0;
    } catch (error) {
      logger.error(`Error checking booking conflicts: ${error.message}`);
      throw error;
    }
  },
};

module.exports = Booking;
