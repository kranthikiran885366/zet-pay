// backend/routes/authRoutes.js
const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware'); // Middleware to protect routes
const router = express.Router();

// Example Protected Route to Verify Current Token and Get User Info
// GET /api/auth/verify
router.get('/verify', authMiddleware, authController.verifyToken);

// Note: Login, Signup, Password Reset are usually handled client-side with Firebase SDK.
// Add routes here if you implement backend-specific auth flows like custom token generation.
// e.g., POST /api/auth/custom-token

module.exports = router;
