// backend/routes/liveTrackingRoutes.js
const express = require('express');
const liveTrackingController = require('../controllers/liveTrackingController');
const router = express.Router();

// Note: These routes might not need strict user authentication
// if the tracking info is considered public, but add authMiddleware if needed.

// GET /api/live/bus/:identifier - Get live status for a bus
router.get('/bus/:identifier', liveTrackingController.getBusStatus);

// GET /api/live/train/:identifier - Get live status for a train
router.get('/train/:identifier', liveTrackingController.getTrainStatus);

module.exports = router;
