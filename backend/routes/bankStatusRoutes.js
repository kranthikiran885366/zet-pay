// backend/routes/bankStatusRoutes.js
const express = require('express');
const { getBankStatus } = require('../services/bankStatusService'); // Import the service
const asyncHandler = require('../middleware/asyncHandler'); // Import async handler
const router = express.Router();

// GET /api/banks/status/:bankIdentifier - Get status for a specific bank
router.get('/status/:bankIdentifier', asyncHandler(async (req, res, next) => {
    const { bankIdentifier } = req.params;
    if (!bankIdentifier) {
        res.status(400); // Use res.status().json()
        throw new Error('Bank identifier is required.'); // Throw error for asyncHandler
    }
    const status = await getBankStatus(bankIdentifier);
    res.status(200).json({ bankIdentifier, status });
}));

module.exports = router;
