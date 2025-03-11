/**
 * Middleware to capture raw request body (needed for Stripe webhook validation)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const rawBodyMiddleware = (req, res, next) => {
  let data = "";

  // Capture raw body as a string
  req.on("data", (chunk) => {
    data += chunk;
  });

  req.on("end", () => {
    req.rawBody = data;
    next();
  });
};

module.exports = {
  rawBodyMiddleware,
};
