const express = require('express');
const { query, body, validationResult, param } = require('express-validator'); 
const rechargeController = require('../controllers/rechargeController');
const asyncHandler = require('../middleware/asyncHandler'); 
const router = express.Router();

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        res.status(400); 
        throw new Error(`Validation Failed: ${errorMessages}`); 
    }
    next();
};

router.get('/billers',
    query('type').isString().trim().notEmpty().withMessage('Biller type query parameter is required.'),
    handleValidationErrors,
    asyncHandler(rechargeController.getBillers)
);

router.get('/plans',
    query('billerId').isString().trim().notEmpty().withMessage('Biller ID query parameter is required.'),
    query('type').isString().trim().notEmpty().withMessage('Type query parameter is required.'),
    query('identifier').optional().isString().trim(), 
    handleValidationErrors,
    asyncHandler(rechargeController.getRechargePlans)
);

router.post('/',
    body('type').isString().trim().notEmpty().withMessage('Recharge type is required.'),
    body('identifier').isString().trim().notEmpty().withMessage('Identifier (number/ID) is required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive amount is required.'),
    body('billerId').optional().isString().trim(),
    body('planId').optional().isString().trim(),
    body('couponCode').optional().isString().trim(), // Added couponCode
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'),
    body('sourceAccountUpiId').if(body('paymentMethod').equals('upi')).optional().isString().trim().contains('@').withMessage('Valid Source Account UPI ID is required for UPI payment.'),
    body('pin').if(body('paymentMethod').equals('upi')).optional().isString().isLength({ min: 4, max: 6 }).isNumeric().withMessage('UPI PIN must be 4 or 6 digits for UPI payment.'),
    handleValidationErrors,
    asyncHandler(rechargeController.processRecharge)
);

router.post('/schedule',
     body('type').isString().trim().notEmpty().withMessage('Recharge type required for scheduling.'), // Added specific validation
     body('identifier').isString().trim().notEmpty().withMessage('Identifier required for scheduling.'),
     body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid amount required for scheduling.'),
     body('frequency').isIn(['monthly', 'weekly']).withMessage('Valid frequency (monthly/weekly) required.'), // Corrected: daily was not supported, restrict to monthly/weekly
     body('startDate').isISO8601().toDate().withMessage('Valid start date required for scheduling.'),
     body('billerId').optional().isString().trim(),
     body('planId').optional().isString().trim(),
     handleValidationErrors,
    asyncHandler(rechargeController.scheduleRecharge)
);

router.delete('/schedule/:scheduleId',
    param('scheduleId').isString().trim().notEmpty().withMessage('Schedule ID parameter is required.'),
    handleValidationErrors,
    asyncHandler(rechargeController.cancelScheduledRecharge)
);

router.get('/status/:transactionId',
    param('transactionId').isString().trim().notEmpty().withMessage('Transaction ID parameter is required.'),
    handleValidationErrors,
    asyncHandler(rechargeController.checkActivationStatus)
);

router.post('/cancel/:transactionId',
    param('transactionId').isString().trim().notEmpty().withMessage('Transaction ID parameter is required.'),
    handleValidationErrors,
    asyncHandler(rechargeController.cancelRecharge) // Use POST for cancellation action
);

module.exports = router;
