const { verifyToken, isAuthorized } = require("../utils/auth");
const { logger } = require("../utils/database");

/**
 * Authentication middleware to validate JWT token
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
const authenticateJWT = (req, res, next) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn("Authentication failed: No token provided");
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    // Extract token from Bearer format
    const token = authHeader.split(" ")[1];

    if (!token) {
      logger.warn("Authentication failed: Invalid token format");
      return res.status(401).json({
        status: "error",
        message: "Invalid token format",
      });
    }

    // Verify the token
    const decodedToken = verifyToken(token);

    // Add the user ID to the request object
    req.user = {
      id: decodedToken.id,
      email: decodedToken.email,
      role: decodedToken.role,
    };

    logger.info(`User authenticated: ${req.user.id}`);
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return res.status(401).json({
      status: "error",
      message: "Authentication failed",
      error: error.message,
    });
  }
};

/**
 * Authorization middleware to check user role
 * @param {string} role - Required role
 * @returns {Function} - Express middleware
 */
const authorizeRole = (role) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        logger.warn("Authorization failed: No authenticated user");
        return res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
      }

      const authorized = await isAuthorized(req.user.id, role);

      if (!authorized) {
        logger.warn(
          `Role authorization failed for user ${req.user.id}: Required role ${role}`
        );
        return res.status(403).json({
          status: "error",
          message: "Not authorized to access this resource",
        });
      }

      logger.info(`User ${req.user.id} authorized with role: ${role}`);
      next();
    } catch (error) {
      logger.error(`Role authorization error: ${error.message}`);
      return res.status(500).json({
        status: "error",
        message: "Authorization failed",
        error: error.message,
      });
    }
  };
};

/**
 * Resource owner middleware to check if user owns a resource
 * @param {Function} resourceFetcher - Function to fetch resource
 * @param {string} paramName - Request parameter for resource ID
 * @returns {Function} - Express middleware
 */
const authorizeResourceOwner = (resourceFetcher, paramName = "id") => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        logger.warn("Resource authorization failed: No authenticated user");
        return res.status(401).json({
          status: "error",
          message: "User not authenticated",
        });
      }

      const resourceId = req.params[paramName];

      if (!resourceId) {
        logger.warn(
          `Resource authorization failed: No resource ID provided (param: ${paramName})`
        );
        return res.status(400).json({
          status: "error",
          message: "Resource ID not provided",
        });
      }

      const resource = await resourceFetcher(resourceId);

      if (!resource) {
        logger.warn(
          `Resource authorization failed: Resource ${resourceId} not found`
        );
        return res.status(404).json({
          status: "error",
          message: "Resource not found",
        });
      }

      // Check if user is admin (can access any resource)
      if (req.user.role === "admin") {
        logger.info(`Admin access granted for resource ${resourceId}`);
        next();
        return;
      }

      // Check if user is resource owner
      if (resource.user_id !== req.user.id) {
        logger.warn(
          `Resource authorization failed: User ${req.user.id} is not owner of resource ${resourceId}`
        );
        return res.status(403).json({
          status: "error",
          message: "Not authorized to access this resource",
        });
      }

      logger.info(
        `User ${req.user.id} authorized as owner of resource ${resourceId}`
      );
      next();
    } catch (error) {
      logger.error(`Resource authorization error: ${error.message}`);
      return res.status(500).json({
        status: "error",
        message: "Authorization failed",
        error: error.message,
      });
    }
  };
};

module.exports = {
  authenticateJWT,
  authorizeRole,
  authorizeResourceOwner,
};
