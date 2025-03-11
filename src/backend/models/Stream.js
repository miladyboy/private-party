const { db, TABLES, logger } = require("../utils/database");
const {
  IvsClient,
  CreateChannelCommand,
  DeleteChannelCommand,
  GetStreamCommand,
  GetStreamSessionCommand,
} = require("@aws-sdk/client-ivs");
const fs = require("fs");
const path = require("path");

// Load configuration
const configPath = path.join(__dirname, "../../config/config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

// Initialize AWS IVS client
const ivsClient = new IvsClient({
  region: config.aws.region,
});

/**
 * Stream Model - Functions for streaming operations
 */
const Stream = {
  /**
   * Get all streams
   * @param {Object} filters - Optional filters
   * @returns {Promise} - Array of streams
   */
  getAll: async (filters = {}) => {
    try {
      logger.info(
        `Getting all streams with filters: ${JSON.stringify(filters)}`
      );
      return await db.getAll(TABLES.STREAMS, filters);
    } catch (error) {
      logger.error(`Error getting all streams: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get stream by ID
   * @param {string|number} id - Stream ID
   * @returns {Promise} - Stream object
   */
  getById: async (id) => {
    try {
      logger.info(`Getting stream by ID: ${id}`);
      return await db.getById(TABLES.STREAMS, id);
    } catch (error) {
      logger.error(`Error getting stream by ID: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get stream by booking ID
   * @param {string|number} bookingId - Booking ID
   * @returns {Promise} - Stream object
   */
  getByBookingId: async (bookingId) => {
    try {
      logger.info(`Getting stream by booking ID: ${bookingId}`);

      const streams = await db.getAll(TABLES.STREAMS, {
        booking_id: bookingId,
      });

      if (!streams || streams.length === 0) {
        return null;
      }

      return streams[0];
    } catch (error) {
      logger.error(`Error getting stream by booking ID: ${error.message}`);
      throw error;
    }
  },

  /**
   * Create a new stream
   * @param {Object} streamData - Stream data
   * @returns {Promise} - New stream object with IVS channel details
   */
  create: async (streamData) => {
    try {
      logger.info(`Creating new stream: ${JSON.stringify(streamData)}`);

      // Ensure required fields
      if (!streamData.booking_id || !streamData.dj_profile_id) {
        throw new Error("Missing required stream fields");
      }

      // Create IVS channel
      const channelParams = {
        name: `party-stream-${streamData.booking_id}`,
        type: config.aws.ivs.type,
        latencyMode: config.aws.ivs.latencyMode,
        authorized: false, // Public channel for MVP
      };

      const createChannelCommand = new CreateChannelCommand(channelParams);
      const ivsResponse = await ivsClient.send(createChannelCommand);

      logger.info(`IVS channel created: ${JSON.stringify(ivsResponse)}`);

      // Create stream data
      const newStream = {
        booking_id: streamData.booking_id,
        dj_profile_id: streamData.dj_profile_id,
        host_id: streamData.host_id,
        title: streamData.title || "Private Party Stream",
        status: "created",
        ivs_channel_arn: ivsResponse.channel.arn,
        ivs_ingest_endpoint: ivsResponse.channel.ingestEndpoint,
        ivs_playback_url: ivsResponse.channel.playbackUrl,
        ivs_stream_key: ivsResponse.streamKey.value,
        created_at: new Date(),
      };

      // Save to database
      const result = await db.insert(TABLES.STREAMS, newStream);

      return result;
    } catch (error) {
      logger.error(`Error creating stream: ${error.message}`);
      throw error;
    }
  },

  /**
   * Update a stream
   * @param {string|number} id - Stream ID
   * @param {Object} streamData - Updated stream data
   * @returns {Promise} - Updated stream object
   */
  update: async (id, streamData) => {
    try {
      logger.info(`Updating stream ${id}: ${JSON.stringify(streamData)}`);

      // Update stream data
      const updateData = {
        ...streamData,
        updated_at: new Date(),
      };

      return await db.update(TABLES.STREAMS, id, updateData);
    } catch (error) {
      logger.error(`Error updating stream: ${error.message}`);
      throw error;
    }
  },

  /**
   * Delete a stream
   * @param {string|number} id - Stream ID
   * @returns {Promise} - Result of deletion
   */
  delete: async (id) => {
    try {
      logger.info(`Deleting stream: ${id}`);

      // Get stream to find IVS channel ARN
      const stream = await Stream.getById(id);

      if (!stream) {
        throw new Error("Stream not found");
      }

      // Delete IVS channel
      if (stream.ivs_channel_arn) {
        const deleteChannelCommand = new DeleteChannelCommand({
          arn: stream.ivs_channel_arn,
        });

        await ivsClient.send(deleteChannelCommand);
        logger.info(`IVS channel deleted: ${stream.ivs_channel_arn}`);
      }

      // Delete from database
      return await db.delete(TABLES.STREAMS, id);
    } catch (error) {
      logger.error(`Error deleting stream: ${error.message}`);
      throw error;
    }
  },

  /**
   * Update stream status
   * @param {string|number} id - Stream ID
   * @param {string} status - New status
   * @returns {Promise} - Updated stream object
   */
  updateStatus: async (id, status) => {
    try {
      logger.info(`Updating stream ${id} status to: ${status}`);

      // Validate status
      const validStatuses = ["created", "live", "ended", "failed"];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
      }

      return await db.update(TABLES.STREAMS, id, {
        status,
        updated_at: new Date(),
      });
    } catch (error) {
      logger.error(`Error updating stream status: ${error.message}`);
      throw error;
    }
  },

  /**
   * Check if a stream is currently live
   * @param {string|number} id - Stream ID
   * @returns {Promise} - Boolean indicating if stream is live
   */
  isLive: async (id) => {
    try {
      logger.info(`Checking if stream ${id} is live`);

      // Get stream from database
      const stream = await Stream.getById(id);

      if (!stream || !stream.ivs_channel_arn) {
        return false;
      }

      // Check with IVS API
      const getStreamCommand = new GetStreamCommand({
        channelArn: stream.ivs_channel_arn,
      });

      try {
        const streamResponse = await ivsClient.send(getStreamCommand);
        logger.info(
          `Stream status from IVS: ${JSON.stringify(streamResponse)}`
        );

        // If we get a response without error, the stream is live
        return true;
      } catch (ivsError) {
        // If we get a ResourceNotFoundException, the stream is not live
        if (ivsError.name === "ResourceNotFoundException") {
          return false;
        }

        // For other errors, log and rethrow
        logger.error(
          `Error checking stream status with IVS: ${ivsError.message}`
        );
        throw ivsError;
      }
    } catch (error) {
      logger.error(`Error checking if stream is live: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get stream metrics
   * @param {string|number} id - Stream ID
   * @returns {Promise} - Stream metrics
   */
  getMetrics: async (id) => {
    try {
      logger.info(`Getting metrics for stream ${id}`);

      // Get stream from database
      const stream = await Stream.getById(id);

      if (!stream || !stream.ivs_channel_arn) {
        throw new Error("Stream not found or missing IVS channel ARN");
      }

      // For MVP, we'll return basic metrics
      // In a production app, you would integrate with CloudWatch metrics
      return {
        id: stream.id,
        status: stream.status,
        created_at: stream.created_at,
        updated_at: stream.updated_at,
        // Additional metrics would be added here
      };
    } catch (error) {
      logger.error(`Error getting stream metrics: ${error.message}`);
      throw error;
    }
  },
};

module.exports = Stream;
