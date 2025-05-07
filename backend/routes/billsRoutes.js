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
    asyncHandler(billsController.getBillers) // Use the correct controller function name
);


// GET /api/bills/details/:type/:identifier - Fetch bill details for a specific type and identifier
router.get('/details/:type/:identifier',
    param('type').isString().trim().notEmpty().withMessage('Bill type parameter is required.'),
    param('identifier').isString().trim().notEmpty().withMessage('Identifier (e.g., consumer number, student ID) parameter is required.'),
    query('billerId').isString().trim().notEmpty().withMessage('Biller ID query parameter is required.'),
    handleValidationErrors,
    asyncHandler(billsController.fetchBillDetails)
);

// POST /api/bills/pay/:type - Process a bill payment for a specific type
router.post('/pay/:type',
    param('type').isString().trim().notEmpty().withMessage('Bill type parameter is required.'),
    body('billerId').isString().trim().notEmpty().withMessage('Biller ID is required.'),
    body('identifier').isString().trim().notEmpty().withMessage('Identifier (e.g., consumer number, student ID) is required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive amount is required.'),
    body('billerName').optional().isString().trim(),
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'),
    // Add validation for UPI/Card details if method is selected
    body('sourceAccountUpiId').if(body('paymentMethod').equals('upi')).isString().trim().notEmpty().contains('@').withMessage('Valid Source Account UPI ID is required for UPI payment.'),
    body('pin').if(body('paymentMethod').equals('upi')).isString().isLength({ min: 4, max: 6 }).isNumeric().withMessage('UPI PIN must be 4 or 6 digits for UPI payment.'),
    // Add card detail validation if needed (e.g., cardToken, cvv)
    body('cardToken').if(body('paymentMethod').equals('card')).isString().trim().notEmpty().withMessage('Card token is required for Card payment.'),
    body('cvv').if(body('paymentMethod').equals('card')).isString().isLength({ min: 3, max: 4 }).isNumeric().withMessage('CVV is required for Card payment.'),
    handleValidationErrors,
    asyncHandler(billsController.processBillPayment)
);

module.exports = router;
