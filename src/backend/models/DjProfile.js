const { db, TABLES, logger } = require("../utils/database");

/**
 * DJ Profile Model - Functions for DJ profile operations
 */
const DjProfile = {
  /**
   * Get all DJ profiles
   * @param {Object} filters - Optional filters
   * @returns {Promise} - Array of DJ profiles
   */
  getAll: async (filters = {}) => {
    try {
      logger.info(
        `Getting all DJ profiles with filters: ${JSON.stringify(filters)}`
      );
      return await db.getAll(TABLES.DJ_PROFILES, filters);
    } catch (error) {
      logger.error(`Error getting all DJ profiles: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get DJ profile by ID
   * @param {string|number} id - DJ profile ID
   * @returns {Promise} - DJ profile object
   */
  getById: async (id) => {
    try {
      logger.info(`Getting DJ profile by ID: ${id}`);
      return await db.getById(TABLES.DJ_PROFILES, id);
    } catch (error) {
      logger.error(`Error getting DJ profile by ID: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get DJ profile by user ID
   * @param {string|number} userId - User ID
   * @returns {Promise} - DJ profile object
   */
  getByUserId: async (userId) => {
    try {
      logger.info(`Getting DJ profile by user ID: ${userId}`);

      const profiles = await db.getAll(TABLES.DJ_PROFILES, { user_id: userId });

      if (!profiles || profiles.length === 0) {
        return null;
      }

      return profiles[0];
    } catch (error) {
      logger.error(`Error getting DJ profile by user ID: ${error.message}`);
      throw error;
    }
  },

  /**
   * Create a new DJ profile
   * @param {Object} profileData - DJ profile data
   * @returns {Promise} - New DJ profile object
   */
  create: async (profileData) => {
    try {
      logger.info(`Creating new DJ profile: ${JSON.stringify(profileData)}`);

      // Ensure required fields
      if (!profileData.user_id) {
        throw new Error("User ID is required");
      }

      // Create profile data
      const newProfile = {
        user_id: profileData.user_id,
        stage_name: profileData.stage_name,
        hourly_rate: profileData.hourly_rate,
        genres: profileData.genres || [],
        bio: profileData.bio || "",
        experience: profileData.experience || "",
        equipment: profileData.equipment || "",
        video_links: profileData.video_links || [],
        languages: profileData.languages || ["English"],
        created_at: new Date(),
      };

      return await db.insert(TABLES.DJ_PROFILES, newProfile);
    } catch (error) {
      logger.error(`Error creating DJ profile: ${error.message}`);
      throw error;
    }
  },

  /**
   * Update a DJ profile
   * @param {string|number} id - DJ profile ID
   * @param {Object} profileData - Updated DJ profile data
   * @returns {Promise} - Updated DJ profile object
   */
  update: async (id, profileData) => {
    try {
      logger.info(`Updating DJ profile ${id}: ${JSON.stringify(profileData)}`);

      // Update profile data
      const updateData = {
        ...profileData,
        updated_at: new Date(),
      };

      return await db.update(TABLES.DJ_PROFILES, id, updateData);
    } catch (error) {
      logger.error(`Error updating DJ profile: ${error.message}`);
      throw error;
    }
  },

  /**
   * Delete a DJ profile
   * @param {string|number} id - DJ profile ID
   * @returns {Promise} - Result of deletion
   */
  delete: async (id) => {
    try {
      logger.info(`Deleting DJ profile: ${id}`);
      return await db.delete(TABLES.DJ_PROFILES, id);
    } catch (error) {
      logger.error(`Error deleting DJ profile: ${error.message}`);
      throw error;
    }
  },

  /**
   * Search for DJ profiles
   * @param {Object} searchParams - Search parameters
   * @returns {Promise} - Array of matching DJ profiles
   */
  search: async (searchParams) => {
    try {
      logger.info(
        `Searching DJ profiles with params: ${JSON.stringify(searchParams)}`
      );

      let query = db.supabase.from(TABLES.DJ_PROFILES).select("*");

      // Apply search filters
      if (searchParams.genres && searchParams.genres.length > 0) {
        // Search for profiles that have any of the specified genres
        query = query.contains("genres", searchParams.genres);
      }

      if (searchParams.minRate) {
        query = query.gte("hourly_rate", searchParams.minRate);
      }

      if (searchParams.maxRate) {
        query = query.lte("hourly_rate", searchParams.maxRate);
      }

      if (searchParams.languages && searchParams.languages.length > 0) {
        // Search for profiles that have any of the specified languages
        query = query.contains("languages", searchParams.languages);
      }

      // Execute query
      const { data, error } = await query;

      if (error) {
        logger.error(`Error searching DJ profiles: ${error.message}`);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(`Error searching DJ profiles: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get DJ availability
   * @param {string|number} djId - DJ profile ID
   * @param {Date} startDate - Start date for availability check
   * @param {Date} endDate - End date for availability check
   * @returns {Promise} - Array of available time slots
   */
  getAvailability: async (djId, startDate, endDate) => {
    try {
      logger.info(
        `Getting availability for DJ ${djId} from ${startDate} to ${endDate}`
      );

      // Get DJ profile
      const djProfile = await DjProfile.getById(djId);

      if (!djProfile) {
        throw new Error("DJ profile not found");
      }

      // Get bookings for this DJ in the date range
      const { data: bookings, error } = await db.supabase
        .from(TABLES.BOOKINGS)
        .select("*")
        .eq("dj_profile_id", djId)
        .gte("start_time", startDate.toISOString())
        .lte("end_time", endDate.toISOString());

      if (error) {
        logger.error(`Error getting bookings for DJ: ${error.message}`);
        throw error;
      }

      // TODO: Implement availability calculation based on bookings
      // For now, return a simple structure
      return {
        dj_profile_id: djId,
        bookings: bookings || [],
        // Additional availability logic would go here
      };
    } catch (error) {
      logger.error(`Error getting DJ availability: ${error.message}`);
      throw error;
    }
  },
};

module.exports = DjProfile;
