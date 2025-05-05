// backend/routes/cashWithdrawalRoutes.js
const express = require('express');
const { query, body, validationResult } = require('express-validator');
const cashWithdrawalController = require('../controllers/cashWithdrawalController');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();

// Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        res.status(400);
        throw new Error(`Validation Failed: ${errorMessages}`);
    }
    next();
};

// GET /api/cash-withdrawal/agents - Get nearby agents based on location
router.get('/agents',
    query('lat').isFloat().withMessage('Valid latitude is required.'),
    query('lon').isFloat().withMessage('Valid longitude is required.'),
    handleValidationErrors,
    asyncHandler(cashWithdrawalController.getNearbyAgents)
);

// POST /api/cash-withdrawal/initiate - Initiate a withdrawal request
router.post('/initiate',
    body('agentId').isString().trim().notEmpty().withMessage('Agent ID is required.'),
    body('agentName').optional().isString().trim(), // Keep optional for now
    body('amount').isNumeric().toFloat().isInt({ gt: 0 }).withMessage('Valid positive withdrawal amount required.'),
    handleValidationErrors,
    asyncHandler(cashWithdrawalController.initiateWithdrawal)
);

// GET /api/cash-withdrawal/status/:withdrawalId - Check the status of a withdrawal
router.get('/status/:withdrawalId',
    asyncHandler(cashWithdrawalController.checkWithdrawalStatus)
);

// POST /api/cash-withdrawal/cancel/:withdrawalId - Cancel a pending withdrawal request
router.post('/cancel/:withdrawalId',
    asyncHandler(cashWithdrawalController.cancelWithdrawal)
);

// POST /api/cash-withdrawal/confirm - Endpoint for AGENT to confirm dispensing cash (requires agent auth)
// This needs a separate authentication mechanism for agents.
// router.post('/confirm', agentAuthMiddleware, asyncHandler(cashWithdrawalController.confirmDispense));

module.exports = router;
