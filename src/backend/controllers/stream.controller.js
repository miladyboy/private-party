const Stream = require("../models/Stream");
const Booking = require("../models/Booking");
const DjProfile = require("../models/DjProfile");
const { logger } = require("../utils/database");
const {
  IvsClient,
  CreateChannelCommand,
  DeleteChannelCommand,
  GetStreamCommand,
  GetStreamKeyCommand,
  CreateStreamKeyCommand,
} = require("@aws-sdk/client-ivs");
const config = require("../config/config.json");

// Initialize AWS IVS client
const ivsClient = new IvsClient({
  region: config.aws.region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Stream Controller - Handlers for streaming-related API endpoints
 */
const StreamController = {
  /**
   * Get stream by ID
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  getStreamById: async (req, res) => {
    try {
      const { id } = req.params;

      logger.info(`Getting stream by ID: ${id}`);

      const stream = await Stream.getById(id);

      if (!stream) {
        logger.warn(`Stream not found: ${id}`);
        return res.status(404).json({
          status: "error",
          message: "Stream not found",
        });
      }

      // Get booking to check authorization
      const booking = await Booking.getById(stream.booking_id);

      if (!booking) {
        logger.warn(`Associated booking not found for stream: ${id}`);
        return res.status(404).json({
          status: "error",
          message: "Associated booking not found",
        });
      }

      // Check if user is authorized to view this stream
      const isHost = booking.host_id === req.user.id;
      let isDj = false;

      if (req.user.role === "dj") {
        const djProfile = await DjProfile.getByUserId(req.user.id);
        isDj = djProfile && djProfile.id === booking.dj_profile_id;
      }

      if (req.user.role !== "admin" && !isHost && !isDj) {
        logger.warn(`User ${req.user.id} not authorized to view stream ${id}`);
        return res.status(403).json({
          status: "error",
          message: "Not authorized to view this stream",
        });
      }

      // If stream is active, get current metrics from AWS IVS
      if (stream.status === "active") {
        try {
          const getStreamCommand = new GetStreamCommand({
            channelArn: stream.channel_arn,
          });

          const awsStreamData = await ivsClient.send(getStreamCommand);

          if (awsStreamData.stream) {
            stream.viewer_count = awsStreamData.stream.viewerCount || 0;
            stream.health = awsStreamData.stream.health || "UNKNOWN";
          }
        } catch (awsError) {
          logger.warn(`Failed to get AWS IVS stream data: ${awsError.message}`);
          // Don't return an error, just continue with the database data
        }
      }

      // For DJ role, include streaming credentials
      if (isDj) {
        try {
          const getStreamKeyCommand = new GetStreamKeyCommand({
            arn: stream.stream_key_arn,
          });

          const streamKeyData = await ivsClient.send(getStreamKeyCommand);
          stream.rtmp_url = `rtmps://${
            streamKeyData.streamKey.channelArn.split("/")[1]
          }.global-contribute.live-video.net:443/app/`;
          stream.stream_key = streamKeyData.streamKey.value;
        } catch (awsError) {
          logger.warn(`Failed to get AWS IVS stream key: ${awsError.message}`);
        }
      }

      res.status(200).json({
        status: "success",
        data: {
          stream,
        },
      });
    } catch (error) {
      logger.error(`Get stream error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to get stream",
        error: error.message,
      });
    }
  },

  /**
   * Get active stream for a booking
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  getStreamByBookingId: async (req, res) => {
    try {
      const { bookingId } = req.params;

      logger.info(`Getting stream for booking: ${bookingId}`);

      // Get booking to check authorization
      const booking = await Booking.getById(bookingId);

      if (!booking) {
        logger.warn(`Booking not found: ${bookingId}`);
        return res.status(404).json({
          status: "error",
          message: "Booking not found",
        });
      }

      // Check if user is authorized to view this booking's stream
      const isHost = booking.host_id === req.user.id;
      let isDj = false;

      if (req.user.role === "dj") {
        const djProfile = await DjProfile.getByUserId(req.user.id);
        isDj = djProfile && djProfile.id === booking.dj_profile_id;
      }

      if (req.user.role !== "admin" && !isHost && !isDj) {
        logger.warn(
          `User ${req.user.id} not authorized to view stream for booking ${bookingId}`
        );
        return res.status(403).json({
          status: "error",
          message: "Not authorized to view this stream",
        });
      }

      // Get active stream for booking
      const stream = await Stream.getActiveByBookingId(bookingId);

      if (!stream) {
        return res.status(404).json({
          status: "error",
          message: "No active stream found for this booking",
        });
      }

      // If stream is active, get current metrics from AWS IVS
      if (stream.status === "active") {
        try {
          const getStreamCommand = new GetStreamCommand({
            channelArn: stream.channel_arn,
          });

          const awsStreamData = await ivsClient.send(getStreamCommand);

          if (awsStreamData.stream) {
            stream.viewer_count = awsStreamData.stream.viewerCount || 0;
            stream.health = awsStreamData.stream.health || "UNKNOWN";
          }
        } catch (awsError) {
          logger.warn(`Failed to get AWS IVS stream data: ${awsError.message}`);
          // Don't return an error, just continue with the database data
        }
      }

      // For DJ role, include streaming credentials
      if (isDj) {
        try {
          const getStreamKeyCommand = new GetStreamKeyCommand({
            arn: stream.stream_key_arn,
          });

          const streamKeyData = await ivsClient.send(getStreamKeyCommand);
          stream.rtmp_url = `rtmps://${
            streamKeyData.streamKey.channelArn.split("/")[1]
          }.global-contribute.live-video.net:443/app/`;
          stream.stream_key = streamKeyData.streamKey.value;
        } catch (awsError) {
          logger.warn(`Failed to get AWS IVS stream key: ${awsError.message}`);
        }
      }

      res.status(200).json({
        status: "success",
        data: {
          stream,
        },
      });
    } catch (error) {
      logger.error(`Get stream by booking error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to get stream",
        error: error.message,
      });
    }
  },

  /**
   * Create a new stream
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  createStream: async (req, res) => {
    try {
      const { booking_id } = req.body;

      if (!booking_id) {
        return res.status(400).json({
          status: "error",
          message: "Booking ID is required",
        });
      }

      logger.info(`Creating stream for booking: ${booking_id}`);

      // Get booking
      const booking = await Booking.getById(booking_id);

      if (!booking) {
        logger.warn(`Booking not found: ${booking_id}`);
        return res.status(404).json({
          status: "error",
          message: "Booking not found",
        });
      }

      // Check if booking is confirmed
      if (booking.status !== "confirmed") {
        logger.warn(
          `Cannot create stream for booking with status: ${booking.status}`
        );
        return res.status(400).json({
          status: "error",
          message: "Cannot create stream for a booking that is not confirmed",
        });
      }

      // Check if user is authorized (DJ only can create a stream)
      let isDj = false;
      let djProfile;

      if (req.user.role === "dj") {
        djProfile = await DjProfile.getByUserId(req.user.id);
        isDj = djProfile && djProfile.id === booking.dj_profile_id;
      }

      if (req.user.role !== "admin" && !isDj) {
        logger.warn(
          `User ${req.user.id} not authorized to create stream for booking ${booking_id}`
        );
        return res.status(403).json({
          status: "error",
          message: "Only the DJ or admin can create a stream",
        });
      }

      // Check if there's already an active stream for this booking
      const existingStream = await Stream.getActiveByBookingId(booking_id);

      if (existingStream) {
        logger.warn(`Active stream already exists for booking: ${booking_id}`);
        return res.status(409).json({
          status: "error",
          message: "An active stream already exists for this booking",
        });
      }

      // Create an IVS channel
      const createChannelParams = {
        name: `PartyStream-${booking_id}-${new Date().getTime()}`,
        type: "STANDARD", // Use STANDARD or BASIC based on requirements
        latencyMode: "LOW", // LOW latency for DJ streaming
        authorized: false, // No need for extra authorization since we control access
      };

      const createChannelCommand = new CreateChannelCommand(
        createChannelParams
      );
      const channelData = await ivsClient.send(createChannelCommand);

      // Create a stream key for the channel
      const createStreamKeyCommand = new CreateStreamKeyCommand({
        channelArn: channelData.channel.arn,
        name: `StreamKey-${booking_id}-${new Date().getTime()}`,
      });

      const streamKeyData = await ivsClient.send(createStreamKeyCommand);

      // Create the stream record in our database
      const newStream = await Stream.create({
        booking_id,
        dj_profile_id: booking.dj_profile_id,
        host_id: booking.host_id,
        status: "created",
        channel_arn: channelData.channel.arn,
        stream_key_arn: streamKeyData.streamKey.arn,
        playback_url: channelData.channel.playbackUrl,
        start_time: null,
        end_time: null,
        viewers_peak: 0,
        recorded: false,
      });

      // Return stream data with credentials for the DJ
      const streamResponse = {
        ...newStream[0],
        rtmp_url: `rtmps://${channelData.channel.ingestEndpoint}/app/`,
        stream_key: streamKeyData.streamKey.value,
      };

      logger.info(`Stream created successfully: ${newStream[0].id}`);

      res.status(201).json({
        status: "success",
        message: "Stream created successfully",
        data: {
          stream: streamResponse,
        },
      });
    } catch (error) {
      logger.error(`Create stream error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to create stream",
        error: error.message,
      });
    }
  },

  /**
   * Start stream
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  startStream: async (req, res) => {
    try {
      const { id } = req.params;

      logger.info(`Starting stream: ${id}`);

      const stream = await Stream.getById(id);

      if (!stream) {
        logger.warn(`Stream not found: ${id}`);
        return res.status(404).json({
          status: "error",
          message: "Stream not found",
        });
      }

      // Check if stream is in created status
      if (stream.status !== "created") {
        logger.warn(`Cannot start stream with status: ${stream.status}`);
        return res.status(400).json({
          status: "error",
          message: `Cannot start stream with status: ${stream.status}`,
        });
      }

      // Check if user is authorized (DJ only can start a stream)
      let isDj = false;

      if (req.user.role === "dj") {
        const djProfile = await DjProfile.getByUserId(req.user.id);
        isDj = djProfile && djProfile.id === stream.dj_profile_id;
      }

      if (req.user.role !== "admin" && !isDj) {
        logger.warn(`User ${req.user.id} not authorized to start stream ${id}`);
        return res.status(403).json({
          status: "error",
          message: "Only the DJ or admin can start a stream",
        });
      }

      // Update stream status
      const updatedStream = await Stream.updateStatus(
        id,
        "active",
        new Date().toISOString()
      );

      logger.info(`Stream started successfully: ${id}`);

      res.status(200).json({
        status: "success",
        message: "Stream started successfully",
        data: {
          stream: updatedStream[0],
        },
      });
    } catch (error) {
      logger.error(`Start stream error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to start stream",
        error: error.message,
      });
    }
  },

  /**
   * End stream
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  endStream: async (req, res) => {
    try {
      const { id } = req.params;

      logger.info(`Ending stream: ${id}`);

      const stream = await Stream.getById(id);

      if (!stream) {
        logger.warn(`Stream not found: ${id}`);
        return res.status(404).json({
          status: "error",
          message: "Stream not found",
        });
      }

      // Check if stream is in active status
      if (stream.status !== "active") {
        logger.warn(`Cannot end stream with status: ${stream.status}`);
        return res.status(400).json({
          status: "error",
          message: `Cannot end stream with status: ${stream.status}`,
        });
      }

      // Check if user is authorized (DJ or host can end a stream)
      let isDj = false;
      let isHost = false;

      if (req.user.role === "dj") {
        const djProfile = await DjProfile.getByUserId(req.user.id);
        isDj = djProfile && djProfile.id === stream.dj_profile_id;
      }

      isHost = stream.host_id === req.user.id;

      if (req.user.role !== "admin" && !isDj && !isHost) {
        logger.warn(`User ${req.user.id} not authorized to end stream ${id}`);
        return res.status(403).json({
          status: "error",
          message: "Only the DJ, host, or admin can end a stream",
        });
      }

      // Get current stream info from AWS
      try {
        const getStreamCommand = new GetStreamCommand({
          channelArn: stream.channel_arn,
        });

        const awsStreamData = await ivsClient.send(getStreamCommand);

        if (awsStreamData.stream) {
          // Update viewers peak if higher than current value
          if (awsStreamData.stream.viewerCount > stream.viewers_peak) {
            await Stream.updateViewersPeak(
              id,
              awsStreamData.stream.viewerCount
            );
          }
        }
      } catch (awsError) {
        logger.warn(`Failed to get AWS IVS stream data: ${awsError.message}`);
        // Continue with ending the stream even if we can't get viewer count
      }

      // Update stream status
      const updatedStream = await Stream.updateStatus(
        id,
        "ended",
        null,
        new Date().toISOString()
      );

      // Update the associated booking status to completed if the DJ ended it
      if (isDj || req.user.role === "admin") {
        await Booking.updateStatus(stream.booking_id, "completed");
      }

      logger.info(`Stream ended successfully: ${id}`);

      res.status(200).json({
        status: "success",
        message: "Stream ended successfully",
        data: {
          stream: updatedStream[0],
        },
      });
    } catch (error) {
      logger.error(`End stream error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to end stream",
        error: error.message,
      });
    }
  },

  /**
   * Delete a stream (and its AWS IVS channel)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  deleteStream: async (req, res) => {
    try {
      const { id } = req.params;

      logger.info(`Deleting stream: ${id}`);

      // Only admin can delete streams
      if (req.user.role !== "admin") {
        logger.warn(
          `User ${req.user.id} not authorized to delete stream ${id}`
        );
        return res.status(403).json({
          status: "error",
          message: "Only admin can delete streams",
        });
      }

      const stream = await Stream.getById(id);

      if (!stream) {
        logger.warn(`Stream not found: ${id}`);
        return res.status(404).json({
          status: "error",
          message: "Stream not found",
        });
      }

      // Cannot delete active streams
      if (stream.status === "active") {
        logger.warn(`Cannot delete an active stream: ${id}`);
        return res.status(400).json({
          status: "error",
          message: "Cannot delete an active stream",
        });
      }

      // Delete IVS channel
      try {
        const deleteChannelCommand = new DeleteChannelCommand({
          arn: stream.channel_arn,
        });

        await ivsClient.send(deleteChannelCommand);
      } catch (awsError) {
        logger.warn(`Error deleting AWS IVS channel: ${awsError.message}`);
        // Continue with deletion in our database, even if AWS deletion fails
      }

      // Delete stream from database
      await Stream.delete(id);

      logger.info(`Stream deleted successfully: ${id}`);

      res.status(200).json({
        status: "success",
        message: "Stream deleted successfully",
      });
    } catch (error) {
      logger.error(`Delete stream error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to delete stream",
        error: error.message,
      });
    }
  },
};

module.exports = StreamController;
