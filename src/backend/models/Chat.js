const { db, TABLES, logger } = require("../utils/database");

/**
 * Chat Model - Functions for chat message operations
 */
const Chat = {
  /**
   * Get all chat messages for a stream
   * @param {string|number} streamId - Stream ID
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise} - Array of chat messages
   */
  getMessagesByStreamId: async (streamId, options = {}) => {
    try {
      logger.info(`Getting chat messages for stream ${streamId}`);

      const limit = options.limit || 50;
      const offset = options.offset || 0;

      const { data, error } = await db.supabase
        .from(TABLES.CHAT_MESSAGES)
        .select("*")
        .eq("stream_id", streamId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error(`Error getting chat messages: ${error.message}`);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(`Error getting chat messages: ${error.message}`);
      throw error;
    }
  },

  /**
   * Create a new chat message
   * @param {Object} messageData - Message data
   * @returns {Promise} - New chat message object
   */
  createMessage: async (messageData) => {
    try {
      logger.info(`Creating chat message: ${JSON.stringify(messageData)}`);

      // Ensure required fields
      if (
        !messageData.stream_id ||
        !messageData.user_id ||
        !messageData.content
      ) {
        throw new Error("Missing required chat message fields");
      }

      // Create message data
      const newMessage = {
        stream_id: messageData.stream_id,
        user_id: messageData.user_id,
        user_name: messageData.user_name || "Anonymous",
        content: messageData.content,
        created_at: new Date(),
      };

      return await db.insert(TABLES.CHAT_MESSAGES, newMessage);
    } catch (error) {
      logger.error(`Error creating chat message: ${error.message}`);
      throw error;
    }
  },

  /**
   * Delete a chat message
   * @param {string|number} id - Message ID
   * @returns {Promise} - Result of deletion
   */
  deleteMessage: async (id) => {
    try {
      logger.info(`Deleting chat message: ${id}`);
      return await db.delete(TABLES.CHAT_MESSAGES, id);
    } catch (error) {
      logger.error(`Error deleting chat message: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get recent chat messages for a stream
   * @param {string|number} streamId - Stream ID
   * @param {number} limit - Number of messages to retrieve
   * @returns {Promise} - Array of chat messages
   */
  getRecentMessages: async (streamId, limit = 20) => {
    try {
      logger.info(`Getting recent chat messages for stream ${streamId}`);

      const { data, error } = await db.supabase
        .from(TABLES.CHAT_MESSAGES)
        .select("*")
        .eq("stream_id", streamId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        logger.error(`Error getting recent chat messages: ${error.message}`);
        throw error;
      }

      // Return in chronological order (oldest first)
      return data.reverse();
    } catch (error) {
      logger.error(`Error getting recent chat messages: ${error.message}`);
      throw error;
    }
  },

  /**
   * Subscribe to real-time chat messages
   * @param {string|number} streamId - Stream ID
   * @param {Function} callback - Callback function for new messages
   * @returns {Object} - Subscription object
   */
  subscribeToMessages: async (streamId, callback) => {
    try {
      logger.info(`Subscribing to chat messages for stream ${streamId}`);

      const subscription = db.supabase
        .channel(`chat:${streamId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: TABLES.CHAT_MESSAGES,
            filter: `stream_id=eq.${streamId}`,
          },
          (payload) => {
            logger.info(`New chat message received for stream ${streamId}`);
            callback(payload.new);
          }
        )
        .subscribe();

      return subscription;
    } catch (error) {
      logger.error(`Error subscribing to chat messages: ${error.message}`);
      throw error;
    }
  },

  /**
   * Unsubscribe from real-time chat messages
   * @param {Object} subscription - Subscription object
   * @returns {Promise} - Result of unsubscription
   */
  unsubscribeFromMessages: async (subscription) => {
    try {
      logger.info("Unsubscribing from chat messages");

      if (subscription) {
        await db.supabase.removeChannel(subscription);
      }

      return { success: true };
    } catch (error) {
      logger.error(`Error unsubscribing from chat messages: ${error.message}`);
      throw error;
    }
  },
};

module.exports = Chat;
