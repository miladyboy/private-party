const { supabase, logger, TABLES } = require("./database");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

// Load configuration
const configPath = path.join(__dirname, "../../config/config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || "your-temp-secret-key";
const JWT_EXPIRY = "24h";

/**
 * Generate a JWT token for authenticated users
 * @param {Object} user - User object
 * @returns {string} - JWT token
 */
const generateToken = (user) => {
  logger.info(`Generating token for user ID: ${user.id}`);

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

/**
 * Verify a JWT token
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token payload
 */
const verifyToken = (token) => {
  try {
    logger.info("Verifying token");
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.error(`Token verification failed: ${error.message}`);
    throw new Error("Invalid or expired token");
  }
};

/**
 * Register a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} role - User role (host or dj)
 * @returns {Object} - User object and token
 */
const registerUser = async (email, password, role = "host") => {
  try {
    logger.info(`Registering new user with email: ${email} and role: ${role}`);

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from(TABLES.USERS)
      .select("*")
      .eq("email", email)
      .single();

    if (existingUser) {
      logger.warn(`Registration failed: Email ${email} already exists`);
      throw new Error("Email already exists");
    }

    // Create user with Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      logger.error(`Supabase Auth signup failed: ${authError.message}`);
      throw authError;
    }

    // Hash password for additional storage in our users table
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in our database
    const { data: newUser, error } = await supabase
      .from(TABLES.USERS)
      .insert({
        email,
        password: hashedPassword,
        role,
        auth_id: authUser.user.id,
        created_at: new Date(),
      })
      .select();

    if (error) {
      logger.error(`Failed to create user in database: ${error.message}`);
      throw error;
    }

    // Generate JWT token
    const token = generateToken(newUser[0]);

    logger.info(`User registered successfully with ID: ${newUser[0].id}`);

    return {
      user: {
        id: newUser[0].id,
        email: newUser[0].email,
        role: newUser[0].role,
        created_at: newUser[0].created_at,
      },
      token,
    };
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    throw error;
  }
};

/**
 * Login a user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object} - User object and token
 */
const loginUser = async (email, password) => {
  try {
    logger.info(`Attempting login for user: ${email}`);

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
    const { data: user, error } = await supabase
      .from(TABLES.USERS)
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      logger.error(
        `User not found in database: ${error?.message || "No user found"}`
      );
      throw new Error("User not found");
    }

    // Generate JWT token
    const token = generateToken(user);

    logger.info(`User logged in successfully: ${user.id}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
      token,
    };
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    throw error;
  }
};

/**
 * Get user by ID
 * @param {string|number} id - User ID
 * @returns {Object} - User object
 */
const getUserById = async (id) => {
  try {
    logger.info(`Getting user by ID: ${id}`);

    const { data: user, error } = await supabase
      .from(TABLES.USERS)
      .select("id, email, role, created_at, updated_at")
      .eq("id", id)
      .single();

    if (error || !user) {
      logger.error(`User not found: ${error?.message || "No user found"}`);
      throw new Error("User not found");
    }

    return user;
  } catch (error) {
    logger.error(`Error getting user by ID: ${error.message}`);
    throw error;
  }
};

/**
 * Check if a user is authorized for a specific action
 * @param {string|number} userId - User ID
 * @param {string} role - Required role
 * @returns {boolean} - Is user authorized
 */
const isAuthorized = async (userId, role) => {
  try {
    logger.info(
      `Checking authorization for user ID ${userId} with required role: ${role}`
    );

    const user = await getUserById(userId);

    if (!user) {
      logger.warn(`Authorization failed: User ${userId} not found`);
      return false;
    }

    if (role && user.role !== role) {
      logger.warn(
        `Authorization failed: User ${userId} has role ${user.role}, needed ${role}`
      );
      return false;
    }

    logger.info(`User ${userId} authorized successfully`);
    return true;
  } catch (error) {
    logger.error(`Authorization check error: ${error.message}`);
    return false;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  registerUser,
  loginUser,
  getUserById,
  isAuthorized,
};
