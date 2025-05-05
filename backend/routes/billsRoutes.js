// backend/routes/billsRoutes.js
const express = require('express');
const { query, body, validationResult, param } = require('express-validator'); // Added param
const billsController = require('../controllers/billsController');
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

// GET /api/bills/billers - Get list of billers by type
router.get('/billers',
    query('type').isString().trim().notEmpty().withMessage('Biller type query parameter is required.'),
    handleValidationErrors,
    asyncHandler(billsController.getBillers) // Use the new controller function
);


// GET /api/bills/:type/details/:identifier - Fetch bill details for a specific type and identifier
router.get('/:type/details/:identifier', // Combined type and identifier in path
    param('type').isString().trim().notEmpty().withMessage('Bill type parameter is required.'), // Validate type param
    param('identifier').isString().trim().notEmpty().withMessage('Identifier (e.g., consumer number) parameter is required.'), // Validate identifier param
    query('billerId').isString().trim().notEmpty().withMessage('Biller ID query parameter is required.'), // Biller ID from query
    handleValidationErrors,
    asyncHandler(billsController.fetchBillDetails)
);

// POST /api/bills/:type - Process a bill payment for a specific type
router.post('/:type',
    param('type').isString().trim().notEmpty().withMessage('Bill type parameter is required.'), // Validate type param
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


    