
// backend/routes/bankStatusRoutes.js
const express = require('express');
const { getBankStatus } = require('../services/bankStatusService'); // Import the service
const router = express.Router();

// GET /api/banks/status/:bankIdentifier - Get status for a specific bank
router.get('/status/:bankIdentifier', async (req, res, next) => {
    const { bankIdentifier } = req.params;
    if (!bankIdentifier) {
        return res.status(400).json({ message: 'Bank identifier is required.' });
    }
    try {
        const status = await getBankStatus(bankIdentifier);
        res.status(200).json({ bankIdentifier, status });
    } catch (error) {
        next(error); // Pass error to middleware
    }
});

module.exports = router;
        