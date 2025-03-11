const express = require("express");
const router = express.Router();
const UserController = require("../controllers/user.controller");
const { authenticateJWT } = require("../middleware/auth");

/**
 * @route   POST /api/users/register
 * @desc    Register a new user
 * @access  Public
 */
router.post("/register", UserController.register);

/**
 * @route   POST /api/users/login
 * @desc    Login a user
 * @access  Public
 */
router.post("/login", UserController.login);

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/profile", authenticateJWT, UserController.getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put("/profile", authenticateJWT, UserController.updateProfile);

/**
 * @route   PUT /api/users/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put("/change-password", authenticateJWT, UserController.changePassword);

module.exports = router;
