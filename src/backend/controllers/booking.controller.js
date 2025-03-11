const Booking = require("../models/Booking");
const DjProfile = require("../models/DjProfile");
const { logger } = require("../utils/database");
const moment = require("moment-timezone");

/**
 * Booking Controller - Handlers for booking-related API endpoints
 */
const BookingController = {
  /**
   * Get all bookings for current user
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  getMyBookings: async (req, res) => {
    try {
      logger.info(`Getting bookings for user: ${req.user.id}`);

      let bookings;

      // Get bookings based on user role
      if (req.user.role === "host") {
        bookings = await Booking.getByHostId(req.user.id);
      } else if (req.user.role === "dj") {
        // Get DJ profile first
        const djProfile = await DjProfile.getByUserId(req.user.id);

        if (!djProfile) {
          logger.warn(`DJ profile not found for user: ${req.user.id}`);
          return res.status(404).json({
            status: "error",
            message: "DJ profile not found",
          });
        }

        bookings = await Booking.getByDjProfileId(djProfile.id);
      } else {
        logger.warn(`Invalid role for bookings: ${req.user.role}`);
        return res.status(403).json({
          status: "error",
          message: "Access denied",
        });
      }

      res.status(200).json({
        status: "success",
        data: {
          bookings,
        },
      });
    } catch (error) {
      logger.error(`Get bookings error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to get bookings",
        error: error.message,
      });
    }
  },

  /**
   * Get booking by ID
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  getBookingById: async (req, res) => {
    try {
      const { id } = req.params;

      logger.info(`Getting booking by ID: ${id}`);

      const booking = await Booking.getById(id);

      if (!booking) {
        logger.warn(`Booking not found: ${id}`);
        return res.status(404).json({
          status: "error",
          message: "Booking not found",
        });
      }

      // Check if user is authorized to view this booking
      if (
        req.user.role !== "admin" &&
        booking.host_id !== req.user.id &&
        req.user.role !== "dj"
      ) {
        logger.warn(`User ${req.user.id} not authorized to view booking ${id}`);
        return res.status(403).json({
          status: "error",
          message: "Not authorized to view this booking",
        });
      }

      // If user is a DJ, check if the booking is for their profile
      if (req.user.role === "dj") {
        const djProfile = await DjProfile.getByUserId(req.user.id);

        if (!djProfile || booking.dj_profile_id !== djProfile.id) {
          logger.warn(`DJ ${req.user.id} not authorized to view booking ${id}`);
          return res.status(403).json({
            status: "error",
            message: "Not authorized to view this booking",
          });
        }
      }

      res.status(200).json({
        status: "success",
        data: {
          booking,
        },
      });
    } catch (error) {
      logger.error(`Get booking error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to get booking",
        error: error.message,
      });
    }
  },

  /**
   * Create a new booking
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  createBooking: async (req, res) => {
    try {
      logger.info(`Create booking request for user: ${req.user.id}`);

      // Check if user is a host
      if (req.user.role !== "host") {
        logger.warn(`User ${req.user.id} is not a host`);
        return res.status(403).json({
          status: "error",
          message: "Only hosts can create bookings",
        });
      }

      // Extract booking data from request
      const { dj_profile_id, start_time, end_time, notes } = req.body;

      // Validate required fields
      if (!dj_profile_id || !start_time || !end_time) {
        logger.warn("Create booking failed: Missing required fields");
        return res.status(400).json({
          status: "error",
          message: "DJ profile ID, start time, and end time are required",
        });
      }

      // Get DJ profile
      const djProfile = await DjProfile.getById(dj_profile_id);

      if (!djProfile) {
        logger.warn(`DJ profile not found: ${dj_profile_id}`);
        return res.status(404).json({
          status: "error",
          message: "DJ profile not found",
        });
      }

      // Parse dates
      const startTime = moment(start_time);
      const endTime = moment(end_time);

      if (!startTime.isValid() || !endTime.isValid()) {
        logger.warn("Create booking failed: Invalid date format");
        return res.status(400).json({
          status: "error",
          message: "Invalid date format",
        });
      }

      // Ensure start time is in the future
      if (startTime.isBefore(moment())) {
        logger.warn("Create booking failed: Start time must be in the future");
        return res.status(400).json({
          status: "error",
          message: "Start time must be in the future",
        });
      }

      // Ensure end time is after start time
      if (endTime.isBefore(startTime)) {
        logger.warn("Create booking failed: End time must be after start time");
        return res.status(400).json({
          status: "error",
          message: "End time must be after start time",
        });
      }

      // Calculate duration in hours
      const durationHours = endTime.diff(startTime, "hours", true);

      // Calculate total amount
      const totalAmount = durationHours * djProfile.hourly_rate;

      // Check for booking conflicts
      const hasConflict = await Booking.checkConflicts(
        dj_profile_id,
        startTime,
        endTime
      );

      if (hasConflict) {
        logger.warn(
          `Booking conflict for DJ ${dj_profile_id} from ${startTime} to ${endTime}`
        );
        return res.status(409).json({
          status: "error",
          message: "DJ is not available during the selected time",
        });
      }

      // Create booking
      const newBooking = await Booking.create({
        host_id: req.user.id,
        dj_profile_id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_hours: durationHours,
        total_amount: totalAmount,
        status: "pending",
        payment_status: "pending",
        notes: notes || "",
      });

      logger.info(`Booking created successfully: ${newBooking[0].id}`);

      res.status(201).json({
        status: "success",
        message: "Booking created successfully",
        data: {
          booking: newBooking[0],
        },
      });
    } catch (error) {
      logger.error(`Create booking error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to create booking",
        error: error.message,
      });
    }
  },

  /**
   * Update booking
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  updateBooking: async (req, res) => {
    try {
      const { id } = req.params;

      logger.info(`Update booking request for booking: ${id}`);

      // Get booking
      const booking = await Booking.getById(id);

      if (!booking) {
        logger.warn(`Booking not found: ${id}`);
        return res.status(404).json({
          status: "error",
          message: "Booking not found",
        });
      }

      // Check if user is authorized to update this booking
      if (req.user.role !== "admin" && booking.host_id !== req.user.id) {
        logger.warn(
          `User ${req.user.id} not authorized to update booking ${id}`
        );
        return res.status(403).json({
          status: "error",
          message: "Not authorized to update this booking",
        });
      }

      // Check if booking can be updated
      if (booking.status === "completed" || booking.status === "cancelled") {
        logger.warn(`Cannot update booking with status: ${booking.status}`);
        return res.status(400).json({
          status: "error",
          message: `Cannot update booking with status: ${booking.status}`,
        });
      }

      // Extract booking data from request
      const { start_time, end_time, notes } = req.body;

      // Prepare update data
      const updateData = { notes };

      // If updating times, validate them
      if (start_time && end_time) {
        const startTime = moment(start_time);
        const endTime = moment(end_time);

        if (!startTime.isValid() || !endTime.isValid()) {
          logger.warn("Update booking failed: Invalid date format");
          return res.status(400).json({
            status: "error",
            message: "Invalid date format",
          });
        }

        // Ensure start time is in the future
        if (startTime.isBefore(moment())) {
          logger.warn(
            "Update booking failed: Start time must be in the future"
          );
          return res.status(400).json({
            status: "error",
            message: "Start time must be in the future",
          });
        }

        // Ensure end time is after start time
        if (endTime.isBefore(startTime)) {
          logger.warn(
            "Update booking failed: End time must be after start time"
          );
          return res.status(400).json({
            status: "error",
            message: "End time must be after start time",
          });
        }

        // Check for booking conflicts
        const hasConflict = await Booking.checkConflicts(
          booking.dj_profile_id,
          startTime,
          endTime,
          id
        );

        if (hasConflict) {
          logger.warn(
            `Booking conflict for DJ ${booking.dj_profile_id} from ${startTime} to ${endTime}`
          );
          return res.status(409).json({
            status: "error",
            message: "DJ is not available during the selected time",
          });
        }

        // Calculate duration in hours
        const durationHours = endTime.diff(startTime, "hours", true);

        // Calculate total amount
        const djProfile = await DjProfile.getById(booking.dj_profile_id);
        const totalAmount = durationHours * djProfile.hourly_rate;

        // Update booking data
        updateData.start_time = startTime.toISOString();
        updateData.end_time = endTime.toISOString();
        updateData.duration_hours = durationHours;
        updateData.total_amount = totalAmount;
      }

      // Update booking
      const updatedBooking = await Booking.update(id, updateData);

      logger.info(`Booking updated successfully: ${id}`);

      res.status(200).json({
        status: "success",
        message: "Booking updated successfully",
        data: {
          booking: updatedBooking[0],
        },
      });
    } catch (error) {
      logger.error(`Update booking error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to update booking",
        error: error.message,
      });
    }
  },

  /**
   * Update booking status
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  updateBookingStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      logger.info(`Update booking status request for booking: ${id}`);

      // Validate status
      const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
      if (!status || !validStatuses.includes(status)) {
        logger.warn(`Invalid status: ${status}`);
        return res.status(400).json({
          status: "error",
          message: "Invalid status",
        });
      }

      // Get booking
      const booking = await Booking.getById(id);

      if (!booking) {
        logger.warn(`Booking not found: ${id}`);
        return res.status(404).json({
          status: "error",
          message: "Booking not found",
        });
      }

      // Check authorization based on status change
      if (status === "cancelled") {
        // Both host and DJ can cancel
        if (req.user.role !== "admin" && booking.host_id !== req.user.id) {
          const djProfile = await DjProfile.getByUserId(req.user.id);

          if (!djProfile || booking.dj_profile_id !== djProfile.id) {
            logger.warn(
              `User ${req.user.id} not authorized to cancel booking ${id}`
            );
            return res.status(403).json({
              status: "error",
              message: "Not authorized to cancel this booking",
            });
          }
        }
      } else if (status === "confirmed") {
        // Only DJ or admin can confirm
        if (req.user.role !== "admin") {
          const djProfile = await DjProfile.getByUserId(req.user.id);

          if (!djProfile || booking.dj_profile_id !== djProfile.id) {
            logger.warn(
              `User ${req.user.id} not authorized to confirm booking ${id}`
            );
            return res.status(403).json({
              status: "error",
              message: "Not authorized to confirm this booking",
            });
          }
        }
      } else if (status === "completed") {
        // Only admin can mark as completed directly
        // In production, this would typically be done automatically after the stream ends
        if (req.user.role !== "admin") {
          logger.warn(
            `User ${req.user.id} not authorized to complete booking ${id}`
          );
          return res.status(403).json({
            status: "error",
            message: "Not authorized to complete this booking",
          });
        }
      }

      // Update status
      const updatedBooking = await Booking.updateStatus(id, status);

      logger.info(`Booking status updated successfully: ${id} -> ${status}`);

      res.status(200).json({
        status: "success",
        message: "Booking status updated successfully",
        data: {
          booking: updatedBooking[0],
        },
      });
    } catch (error) {
      logger.error(`Update booking status error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to update booking status",
        error: error.message,
      });
    }
  },

  /**
   * Delete booking
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  deleteBooking: async (req, res) => {
    try {
      const { id } = req.params;

      logger.info(`Delete booking request for booking: ${id}`);

      // Get booking
      const booking = await Booking.getById(id);

      if (!booking) {
        logger.warn(`Booking not found: ${id}`);
        return res.status(404).json({
          status: "error",
          message: "Booking not found",
        });
      }

      // Check if user is authorized to delete this booking
      if (req.user.role !== "admin" && booking.host_id !== req.user.id) {
        logger.warn(
          `User ${req.user.id} not authorized to delete booking ${id}`
        );
        return res.status(403).json({
          status: "error",
          message: "Not authorized to delete this booking",
        });
      }

      // Check if booking can be deleted
      if (booking.status === "confirmed" || booking.status === "completed") {
        logger.warn(`Cannot delete booking with status: ${booking.status}`);
        return res.status(400).json({
          status: "error",
          message: `Cannot delete booking with status: ${booking.status}`,
        });
      }

      // Delete booking
      await Booking.delete(id);

      logger.info(`Booking deleted successfully: ${id}`);

      res.status(200).json({
        status: "success",
        message: "Booking deleted successfully",
      });
    } catch (error) {
      logger.error(`Delete booking error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to delete booking",
        error: error.message,
      });
    }
  },
};

module.exports = BookingController;
