const express = require('express');
const { query, body, validationResult, param } = require('express-validator'); // Added param
const rechargeController = require('../controllers/rechargeController');
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

// GET /api/recharge/billers - Get list of billers by type
router.get('/billers',
    query('type').isString().trim().notEmpty().withMessage('Biller type query parameter is required.'),
    handleValidationErrors,
    asyncHandler(rechargeController.getBillers)
);

// GET /api/recharge/plans - Get recharge plans for a biller/type
router.get('/plans',
    query('billerId').isString().trim().notEmpty().withMessage('Biller ID query parameter is required.'),
    query('type').isString().trim().notEmpty().withMessage('Type query parameter is required.'),
    query('identifier').optional().isString().trim(), // Optional identifier for circle specific plans
    handleValidationErrors,
    asyncHandler(rechargeController.getRechargePlans)
);

// POST /api/recharge - Process a recharge
router.post('/',
    body('type').isString().trim().notEmpty().withMessage('Recharge type is required.'),
    body('identifier').isString().trim().notEmpty().withMessage('Identifier (number/ID) is required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive amount is required.'),
    body('billerId').optional().isString().trim(),
    body('planId').optional().isString().trim(),
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'),
    // Add validation for UPI/Card details if method is selected
    body('sourceAccountUpiId').if(body('paymentMethod').equals('upi')).isString().trim().notEmpty().contains('@').withMessage('Valid Source Account UPI ID is required for UPI payment.'),
    body('pin').if(body('paymentMethod').equals('upi')).isString().isLength({ min: 4, max: 6 }).isNumeric().withMessage('UPI PIN must be 4 or 6 digits for UPI payment.'),
    // Add card detail validation if needed
    handleValidationErrors,
    asyncHandler(rechargeController.processRecharge)
);

// POST /api/recharge/schedule - Schedule a recurring recharge
router.post('/schedule',
     body('type').isString().trim().notEmpty(),
     body('identifier').isString().trim().notEmpty(),
     body('amount').isNumeric().toFloat().isFloat({ gt: 0 }),
     body('frequency').isIn(['monthly', 'weekly', 'daily']),
     body('startDate').isISO8601().toDate(),
     body('billerId').optional().isString().trim(),
     body('planId').optional().isString().trim(),
     handleValidationErrors,
    asyncHandler(rechargeController.scheduleRecharge)
);

// DELETE /api/recharge/schedule/:scheduleId - Cancel a scheduled recharge
router.delete('/schedule/:scheduleId',
    // Example validation using MongoID, adjust if needed
    param('scheduleId').isString().trim().notEmpty().withMessage('Schedule ID parameter is required.'), // Simplified validation
    handleValidationErrors,
    asyncHandler(rechargeController.cancelScheduledRecharge)
);

// GET /api/recharge/status/:transactionId - Check activation status of a recharge
router.get('/status/:transactionId',
    // Example validation using MongoID, adjust if needed
    param('transactionId').isString().trim().notEmpty().withMessage('Transaction ID parameter is required.'), // Simplified validation
    handleValidationErrors,
    asyncHandler(rechargeController.checkActivationStatus)
);

// POST /api/recharge/cancel/:transactionId - Request cancellation of a recent recharge
router.post('/cancel/:transactionId',
    // Example validation using MongoID, adjust if needed
    param('transactionId').isString().trim().notEmpty().withMessage('Transaction ID parameter is required.'), // Simplified validation
    handleValidationErrors,
    asyncHandler(rechargeController.cancelRecharge)
);

module.exports = router;
