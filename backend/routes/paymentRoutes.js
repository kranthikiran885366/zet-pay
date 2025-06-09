
// backend/routes/paymentRoutes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const paymentController = require('../controllers/paymentController');
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

// All routes require authentication (applied in server.js)

// POST /api/payments/card - Process payment using a saved card
router.post('/card',
    body('cardId').isString().trim().notEmpty().withMessage('Card ID (token) is required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid amount required.'),
    body('cvv').isString().isLength({ min: 3, max: 4 }).isNumeric().withMessage('Valid CVV required.'), 
    body('purpose').isString().trim().notEmpty().withMessage('Payment purpose is required.'),
    body('recipientIdentifier').optional().isString().trim(),
    handleValidationErrors,
    asyncHandler(paymentController.processCardPayment)
);

// POST /api/payments/fuel - Process a fuel payment
router.post('/fuel',
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive amount for fuel is required.'),
    handleValidationErrors,
    asyncHandler(paymentController.processFuelPayment) // Ensure this controller method exists
);


module.exports = router;
