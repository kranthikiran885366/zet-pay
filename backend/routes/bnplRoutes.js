// backend/routes/bnplRoutes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const bnplController = require('../controllers/bnplController');
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

// GET /api/bnpl/status - Get user's BNPL status and details
router.get('/status', asyncHandler(bnplController.getBnplStatus));

// POST /api/bnpl/activate - Attempt to activate BNPL for the user
router.post('/activate', asyncHandler(bnplController.activateBnpl));

// GET /api/bnpl/statement - Get the latest unpaid BNPL statement
router.get('/statement', asyncHandler(bnplController.getBnplStatement));

// POST /api/bnpl/repay - Repay the BNPL bill
router.post('/repay',
    body('statementId').isString().trim().notEmpty().withMessage('Statement ID is required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive repayment amount required.'),
    body('paymentMethodInfo').isString().trim().notEmpty().withMessage('Payment method info is required.'), // e.g., "UPI:xxx@ok", "Wallet"
    handleValidationErrors,
    asyncHandler(bnplController.repayBnplBill)
);

// GET /api/bnpl/transactions/:statementId - Get transactions for a specific statement (optional)
// router.get('/transactions/:statementId', asyncHandler(bnplController.getStatementTransactions));

module.exports = router;
