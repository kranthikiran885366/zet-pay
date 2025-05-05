// backend/routes/paymentRoutes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const asyncHandler = require('../middleware/asyncHandler'); // Import asyncHandler
const router = express.Router();

// Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        res.status(400); // Set status code
        throw new Error(`Validation Failed: ${errorMessages}`); // Throw error for asyncHandler
    }
    next();
};

// All routes require authentication (applied in server.js)

// POST /api/payments/card - Process payment using a saved card
router.post('/card',
    body('cardId').isString().trim().notEmpty().withMessage('Card ID (token) is required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid amount required.'),
    body('cvv').isString().isLength({ min: 3, max: 4 }).isNumeric().withMessage('Valid CVV required.'), // Backend MUST NOT store this after use
    body('purpose').isString().trim().notEmpty().withMessage('Payment purpose is required.'),
    body('recipientIdentifier').optional().isString().trim(),
    handleValidationErrors,
    asyncHandler(paymentController.processCardPayment)
);

// Add other generic payment endpoints if needed (e.g., initiate net banking)

module.exports = router;
