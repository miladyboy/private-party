const rateLimit = require("express-rate-limit");
const { logger } = require("../utils/database");

/**
 * Custom rate limiter middleware with configurable options
 * @param {string} keyPrefix - Prefix for rate limit keys
 * @param {number} max - Maximum number of requests within windowMs
 * @param {number} windowSec - Time window in seconds
 * @returns {Function} - Express middleware
 */
const rateLimiter = (keyPrefix, max, windowSec) => {
  const limiter = rateLimit({
    windowMs: windowSec * 1000,
    max: max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use IP + userID if authenticated, otherwise just IP
      return req.user ? `${req.ip}-${req.user.id}-${keyPrefix}` : `${req.ip}-${keyPrefix}`;
    },
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for ${req.ip} on ${keyPrefix}`);
      return res.status(429).json({
        status: "error",
        message: "Too many requests, please try again later",
      });
    },
  });

  return limiter;
};

module.exports = {
  rateLimiter,
};