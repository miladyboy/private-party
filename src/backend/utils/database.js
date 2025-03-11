const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const winston = require("winston");

// Load configuration
const configPath = path.join(__dirname, "../../config/config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

// Initialize logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: "database-utils" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: "database-error.log",
      level: "error",
    }),
    new winston.transports.File({ filename: "database.log" }),
  ],
});

// Initialize Supabase client
const supabase = createClient(config.database.url, config.database.key);

/**
 * Database schema definitions
 * These represent the table structures in Supabase
 */
const TABLES = {
  USERS: "users",
  DJ_PROFILES: "dj_profiles",
  BOOKINGS: "bookings",
  STREAMS: "streams",
  PAYMENTS: "payments",
  CHAT_MESSAGES: "chat_messages",
};

/**
 * Database query helper methods
 */
const db = {
  /**
   * Get all records from a table with optional filtering
   * @param {string} table - Table name
   * @param {Object} filters - Query filters
   * @returns {Promise} - Supabase query result
   */
  getAll: async (table, filters = {}) => {
    try {
      logger.info(
        `Fetching all records from ${table} with filters: ${JSON.stringify(
          filters
        )}`
      );
      let query = supabase.from(table).select("*");

      // Apply filters if provided
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data, error } = await query;

      if (error) {
        logger.error(`Error fetching from ${table}: ${error.message}`);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(`Database error in getAll: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get a single record by ID
   * @param {string} table - Table name
   * @param {string|number} id - Record ID
   * @returns {Promise} - Supabase query result
   */
  getById: async (table, id) => {
    try {
      logger.info(`Fetching record from ${table} with ID: ${id}`);
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        logger.error(`Error fetching from ${table}: ${error.message}`);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(`Database error in getById: ${error.message}`);
      throw error;
    }
  },

  /**
   * Insert a new record
   * @param {string} table - Table name
   * @param {Object} data - Record data
   * @returns {Promise} - Supabase query result
   */
  insert: async (table, data) => {
    try {
      logger.info(`Inserting record into ${table}: ${JSON.stringify(data)}`);
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select();

      if (error) {
        logger.error(`Error inserting into ${table}: ${error.message}`);
        throw error;
      }

      return result;
    } catch (error) {
      logger.error(`Database error in insert: ${error.message}`);
      throw error;
    }
  },

  /**
   * Update an existing record
   * @param {string} table - Table name
   * @param {string|number} id - Record ID
   * @param {Object} data - Updated data
   * @returns {Promise} - Supabase query result
   */
  update: async (table, id, data) => {
    try {
      logger.info(
        `Updating record in ${table} with ID ${id}: ${JSON.stringify(data)}`
      );
      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq("id", id)
        .select();

      if (error) {
        logger.error(`Error updating ${table}: ${error.message}`);
        throw error;
      }

      return result;
    } catch (error) {
      logger.error(`Database error in update: ${error.message}`);
      throw error;
    }
  },

  /**
   * Delete a record
   * @param {string} table - Table name
   * @param {string|number} id - Record ID
   * @returns {Promise} - Supabase query result
   */
  delete: async (table, id) => {
    try {
      logger.info(`Deleting record from ${table} with ID: ${id}`);
      const { data, error } = await supabase.from(table).delete().eq("id", id);

      if (error) {
        logger.error(`Error deleting from ${table}: ${error.message}`);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(`Database error in delete: ${error.message}`);
      throw error;
    }
  },
};

module.exports = {
  supabase,
  db,
  TABLES,
  logger,
};
