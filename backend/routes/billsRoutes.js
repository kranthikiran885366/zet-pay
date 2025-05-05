// backend/routes/billsRoutes.js
const express = require('express');
const { query, body, validationResult } = require('express-validator');
const billsController = require('../controllers/billsController');
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

// GET /api/bills/:type/details - Fetch bill details for a specific type (e.g., electricity)
router.get('/:type/details',
    query('billerId').isString().trim().notEmpty().withMessage('Biller ID is required.'),
    query('identifier').isString().trim().notEmpty().withMessage('Identifier (e.g., consumer number) is required.'),
    // Add validation for :type param if needed
    handleValidationErrors,
    asyncHandler(billsController.fetchBillDetails)
);

// POST /api/bills/:type - Process a bill payment for a specific type
router.post('/:type',
    // Add validation for :type param if needed
    body('billerId').isString().trim().notEmpty().withMessage('Biller ID is required.'),
    body('identifier').isString().trim().notEmpty().withMessage('Identifier (e.g., consumer number) is required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive amount is required.'),
    body('billerName').optional().isString().trim(),
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'),
    // Add validation for UPI/Card details if method is selected
    handleValidationErrors,
    asyncHandler(billsController.processBillPayment)
);

module.exports = router;
