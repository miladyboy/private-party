const { supabase, db, TABLES, logger } = require("../utils/database");
const { generateToken } = require("../utils/auth");
const bcrypt = require("bcrypt");

/**
 * User Model - Functions for user operations
 */
const User = {
  /**
   * Get all users
   * @returns {Promise} - Array of users
   */
  getAll: async () => {
    try {
      logger.info("Getting all users");
      return await db.getAll(TABLES.USERS);
    } catch (error) {
      logger.error(`Error getting all users: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get user by ID
   * @param {string|number} id - User ID
   * @returns {Promise} - User object
   */
  getById: async (id) => {
    try {
      logger.info(`Getting user by ID: ${id}`);
      return await db.getById(TABLES.USERS, id);
    } catch (error) {
      logger.error(`Error getting user by ID: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Promise} - User object
   */
  getByEmail: async (email) => {
    try {
      logger.info(`Getting user by email: ${email}`);

      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select("*")
        .eq("email", email);

      if (error) {
        logger.error(`Error getting user by email: ${error.message}`);
        throw error;
      }

      // Handle no records found
      if (!data || data.length === 0) {
        logger.warn(`No user found with email: ${email}`);
        return null;
      }

      // If multiple records found (should not happen), use the first one
      if (data.length > 1) {
        logger.warn(`Multiple users found with email: ${email}, using the first one`);
      }

      return data[0];
    } catch (error) {
      logger.error(`Error getting user by email: ${error.message}`);
      throw error;
    }
  },

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise} - New user object
   */
  create: async (userData) => {
    try {
      logger.info(`Creating new user: ${JSON.stringify(userData)}`);

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user with Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

      if (authError) {
        logger.error(
          `Error creating Supabase Auth user: ${
            authError.message || "Unknown auth error"
          }`
        );
        throw authError;
      }

      // Create user in our database
      const newUser = {
        email: userData.email,
        password: hashedPassword,
        role: userData.role || "host",
        first_name: userData.first_name || null,
        last_name: userData.last_name || null,
        auth_id: authUser.user.id,
        created_at: new Date(),
      };

      const result = await db.insert(TABLES.USERS, newUser);

      if (!result || result.length === 0) {
        throw new Error("Failed to insert user into database");
      }

      // Generate token
      const token = generateToken(result[0]);

      return {
        user: {
          id: result[0].id,
          email: result[0].email,
          role: result[0].role,
          first_name: result[0].first_name,
          last_name: result[0].last_name,
          created_at: result[0].created_at,
        },
        token,
      };
    } catch (error) {
      logger.error(
        `Error creating user: ${error ? error.message : "Unknown error"}`
      );
      throw error;
    }
  },

  /**
   * Update a user
   * @param {string|number} id - User ID
   * @param {Object} userData - Updated user data
   * @returns {Promise} - Updated user object
   */
  update: async (id, userData) => {
    try {
      logger.info(`Updating user ${id}: ${JSON.stringify(userData)}`);

      // If password is being updated, hash it
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }

      // Update user in our database
      const updateData = {
        ...userData,
        updated_at: new Date(),
      };

      return await db.update(TABLES.USERS, id, updateData);
    } catch (error) {
      logger.error(`Error updating user: ${error.message}`);
      throw error;
    }
  },

  /**
   * Delete a user
   * @param {string|number} id - User ID
   * @returns {Promise} - Result of deletion
   */
  delete: async (id) => {
    try {
      logger.info(`Deleting user: ${id}`);

      // Get user to find auth_id
      const user = await User.getById(id);

      if (!user) {
        throw new Error("User not found");
      }

      // Delete user from Supabase Auth
      if (user.auth_id) {
        const { error: authError } = await supabase.auth.admin.deleteUser(
          user.auth_id
        );

        if (authError) {
          logger.error(
            `Error deleting Supabase Auth user: ${authError.message}`
          );
          // We'll continue to delete from our database anyway
        }
      }

      // Delete user from our database
      return await db.delete(TABLES.USERS, id);
    } catch (error) {
      logger.error(`Error deleting user: ${error.message}`);
      throw error;
    }
  },

  /**
   * Authenticate a user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} - User object and token
   */
  authenticate: async (email, password) => {
    try {
      logger.info(`Authenticating user: ${email}`);

      // Sign in with Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        logger.error(`Supabase Auth signin failed: ${authError.message}`);
        throw new Error("Invalid email or password");
      }

      // Get user from our database
      const user = await User.getByEmail(email);

      if (!user) {
        logger.warn(`User authenticated with Supabase Auth but not found in database table: ${email}`);
        
        // Create user record in our database table if they exist in Auth but not in our table
        // This helps recover from situations where user registration didn't complete properly
        const newUserData = {
          email,
          password: await bcrypt.hash(password, 10), // Hash the password for storage
          role: "host", // Default role
          auth_id: authData.user.id,
          created_at: new Date(),
        };
        
        const result = await db.insert(TABLES.USERS, newUserData);
        
        if (!result || result.length === 0) {
          logger.error("Failed to create user record in database during authentication recovery");
          throw new Error("Authentication failed - database error");
        }
        
        logger.info(`Created missing user record during authentication: ${result[0].id}`);
        
        // Generate token for the new user
        const token = generateToken(result[0]);
        
        return {
          user: {
            id: result[0].id,
            email: result[0].email,
            role: result[0].role,
            created_at: result[0].created_at,
          },
          token,
        };
      }

      // Generate token
      const token = generateToken(user);

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          created_at: user.created_at,
        },
        token,
      };
    } catch (error) {
      logger.error(`Authentication error: ${error.message}`);
      throw error;
    }
  },
};

module.exports = User;
