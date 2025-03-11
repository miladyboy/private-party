const express = require("express");
const router = express.Router();
const DjController = require("../controllers/dj.controller");
const { authenticateJWT, authorizeRole } = require("../middleware/auth");

/**
 * @route   GET /api/djs
 * @desc    Get all DJ profiles
 * @access  Public
 */
router.get("/", DjController.getAllProfiles);

/**
 * @route   GET /api/djs/search
 * @desc    Search for DJ profiles
 * @access  Public
 */
router.get("/search", DjController.searchProfiles);

/**
 * @route   GET /api/djs/profile
 * @desc    Get current user's DJ profile
 * @access  Private (DJ only)
 */
router.get(
  "/profile",
  authenticateJWT,
  authorizeRole("dj"),
  DjController.getMyProfile
);

/**
 * @route   POST /api/djs/profile
 * @desc    Create a new DJ profile
 * @access  Private (DJ only)
 */
router.post(
  "/profile",
  authenticateJWT,
  authorizeRole("dj"),
  DjController.createProfile
);

/**
 * @route   PUT /api/djs/profile
 * @desc    Update DJ profile
 * @access  Private (DJ only)
 */
router.put(
  "/profile",
  authenticateJWT,
  authorizeRole("dj"),
  DjController.updateProfile
);

/**
 * @route   GET /api/djs/:id
 * @desc    Get DJ profile by ID
 * @access  Public
 */
router.get("/:id", DjController.getProfileById);

/**
 * @route   GET /api/djs/:id/availability
 * @desc    Get DJ availability
 * @access  Public
 */
router.get("/:id/availability", DjController.getAvailability);

module.exports = router;
