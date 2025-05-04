
const express = require('express');
const userController = require('../controllers/userController');
const router = express.Router();

// GET /api/users/profile - Fetch current user's profile
router.get('/profile', userController.getUserProfile);

// PUT /api/users/profile - Update current user's profile
router.put('/profile', userController.updateUserProfile);

// Add other user-related routes (e.g., POST /api/users/kyc, GET /api/users/:id/public-profile)

module.exports = router;
