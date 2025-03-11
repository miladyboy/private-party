const DjProfile = require("../models/DjProfile");
const { logger } = require("../utils/database");

/**
 * DJ Controller - Handlers for DJ-related API endpoints
 */
const DjController = {
  /**
   * Get all DJ profiles
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  getAllProfiles: async (req, res) => {
    try {
      logger.info("Get all DJ profiles request received");

      // Extract query parameters for filtering
      const { genres, minRate, maxRate, languages } = req.query;

      // Prepare search parameters
      const searchParams = {};

      if (genres) {
        searchParams.genres = genres.split(",");
      }

      if (minRate) {
        searchParams.minRate = parseFloat(minRate);
      }

      if (maxRate) {
        searchParams.maxRate = parseFloat(maxRate);
      }

      if (languages) {
        searchParams.languages = languages.split(",");
      }

      // Search for DJ profiles
      const djProfiles =
        Object.keys(searchParams).length > 0
          ? await DjProfile.search(searchParams)
          : await DjProfile.getAll();

      res.status(200).json({
        status: "success",
        data: {
          profiles: djProfiles,
        },
      });
    } catch (error) {
      logger.error(`Get all DJ profiles error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to get DJ profiles",
        error: error.message,
      });
    }
  },

  /**
   * Get DJ profile by ID
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  getProfileById: async (req, res) => {
    try {
      const { id } = req.params;

      logger.info(`Get DJ profile request for ID: ${id}`);

      const djProfile = await DjProfile.getById(id);

      if (!djProfile) {
        logger.warn(`DJ profile not found: ${id}`);
        return res.status(404).json({
          status: "error",
          message: "DJ profile not found",
        });
      }

      res.status(200).json({
        status: "success",
        data: {
          profile: djProfile,
        },
      });
    } catch (error) {
      logger.error(`Get DJ profile error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to get DJ profile",
        error: error.message,
      });
    }
  },

  /**
   * Get DJ profile for current user
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  getMyProfile: async (req, res) => {
    try {
      logger.info(`Get DJ profile for user: ${req.user.id}`);

      // Check if user is a DJ
      if (req.user.role !== "dj") {
        logger.warn(`User ${req.user.id} is not a DJ`);
        return res.status(403).json({
          status: "error",
          message: "Only DJs can access this endpoint",
        });
      }

      const djProfile = await DjProfile.getByUserId(req.user.id);

      if (!djProfile) {
        logger.warn(`DJ profile not found for user: ${req.user.id}`);
        return res.status(404).json({
          status: "error",
          message: "DJ profile not found",
        });
      }

      res.status(200).json({
        status: "success",
        data: {
          profile: djProfile,
        },
      });
    } catch (error) {
      logger.error(`Get DJ profile error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to get DJ profile",
        error: error.message,
      });
    }
  },

  /**
   * Create a new DJ profile
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  createProfile: async (req, res) => {
    try {
      logger.info(`Create DJ profile request for user: ${req.user.id}`);

      // Check if user is a DJ
      if (req.user.role !== "dj") {
        logger.warn(`User ${req.user.id} is not a DJ`);
        return res.status(403).json({
          status: "error",
          message: "Only DJs can create profiles",
        });
      }

      // Check if user already has a profile
      const existingProfile = await DjProfile.getByUserId(req.user.id);

      if (existingProfile) {
        logger.warn(`User ${req.user.id} already has a DJ profile`);
        return res.status(409).json({
          status: "error",
          message: "DJ profile already exists for this user",
        });
      }

      // Extract profile data from request
      const {
        stage_name,
        hourly_rate,
        genres,
        bio,
        experience,
        equipment,
        video_links,
        languages,
      } = req.body;

      // Validate required fields
      if (!stage_name || !hourly_rate) {
        logger.warn("Create DJ profile failed: Missing required fields");
        return res.status(400).json({
          status: "error",
          message: "Stage name and hourly rate are required",
        });
      }

      // Create profile
      const newProfile = await DjProfile.create({
        user_id: req.user.id,
        stage_name,
        hourly_rate: parseFloat(hourly_rate),
        genres: genres || [],
        bio: bio || "",
        experience: experience || "",
        equipment: equipment || "",
        video_links: video_links || [],
        languages: languages || ["English"],
      });

      logger.info(`DJ profile created successfully: ${newProfile[0].id}`);

      res.status(201).json({
        status: "success",
        message: "DJ profile created successfully",
        data: {
          profile: newProfile[0],
        },
      });
    } catch (error) {
      logger.error(`Create DJ profile error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to create DJ profile",
        error: error.message,
      });
    }
  },

  /**
   * Update DJ profile
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  updateProfile: async (req, res) => {
    try {
      logger.info(`Update DJ profile request for user: ${req.user.id}`);

      // Check if user is a DJ
      if (req.user.role !== "dj") {
        logger.warn(`User ${req.user.id} is not a DJ`);
        return res.status(403).json({
          status: "error",
          message: "Only DJs can update profiles",
        });
      }

      // Get user's DJ profile
      const djProfile = await DjProfile.getByUserId(req.user.id);

      if (!djProfile) {
        logger.warn(`DJ profile not found for user: ${req.user.id}`);
        return res.status(404).json({
          status: "error",
          message: "DJ profile not found",
        });
      }

      // Extract profile data from request
      const {
        stage_name,
        hourly_rate,
        genres,
        bio,
        experience,
        equipment,
        video_links,
        languages,
      } = req.body;

      // Prepare update data
      const updateData = {};

      if (stage_name) updateData.stage_name = stage_name;
      if (hourly_rate) updateData.hourly_rate = parseFloat(hourly_rate);
      if (genres) updateData.genres = genres;
      if (bio !== undefined) updateData.bio = bio;
      if (experience !== undefined) updateData.experience = experience;
      if (equipment !== undefined) updateData.equipment = equipment;
      if (video_links) updateData.video_links = video_links;
      if (languages) updateData.languages = languages;

      // Update profile
      const updatedProfile = await DjProfile.update(djProfile.id, updateData);

      logger.info(`DJ profile updated successfully: ${djProfile.id}`);

      res.status(200).json({
        status: "success",
        message: "DJ profile updated successfully",
        data: {
          profile: updatedProfile[0],
        },
      });
    } catch (error) {
      logger.error(`Update DJ profile error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to update DJ profile",
        error: error.message,
      });
    }
  },

  /**
   * Get DJ availability
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  getAvailability: async (req, res) => {
    try {
      const { id } = req.params;
      const { start_date, end_date } = req.query;

      logger.info(`Get availability request for DJ: ${id}`);

      // Validate required query parameters
      if (!start_date || !end_date) {
        logger.warn("Get availability failed: Missing date range");
        return res.status(400).json({
          status: "error",
          message: "Start date and end date are required",
        });
      }

      // Parse dates
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        logger.warn("Get availability failed: Invalid date format");
        return res.status(400).json({
          status: "error",
          message: "Invalid date format",
        });
      }

      // Get availability
      const availability = await DjProfile.getAvailability(
        id,
        startDate,
        endDate
      );

      res.status(200).json({
        status: "success",
        data: {
          availability,
        },
      });
    } catch (error) {
      logger.error(`Get availability error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to get DJ availability",
        error: error.message,
      });
    }
  },

  /**
   * Search for DJ profiles
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  searchProfiles: async (req, res) => {
    try {
      logger.info("Search DJ profiles request received");

      // Extract search parameters
      const { genres, min_rate, max_rate, languages } = req.query;

      // Prepare search parameters
      const searchParams = {};

      if (genres) {
        searchParams.genres = genres.split(",");
      }

      if (min_rate) {
        searchParams.minRate = parseFloat(min_rate);
      }

      if (max_rate) {
        searchParams.maxRate = parseFloat(max_rate);
      }

      if (languages) {
        searchParams.languages = languages.split(",");
      }

      // Search for DJ profiles
      const djProfiles = await DjProfile.search(searchParams);

      res.status(200).json({
        status: "success",
        data: {
          profiles: djProfiles,
        },
      });
    } catch (error) {
      logger.error(`Search DJ profiles error: ${error.message}`);

      res.status(500).json({
        status: "error",
        message: "Failed to search DJ profiles",
        error: error.message,
      });
    }
  },
};

module.exports = DjController;
