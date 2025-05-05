const express = require('express');
const { body, query, validationResult, param } = require('express-validator'); // Added query, param
const upiController = require('../controllers/upiController');
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

// GET /api/upi/accounts - Get linked bank accounts
router.get('/accounts', asyncHandler(upiController.getLinkedAccounts));

// POST /api/upi/accounts - Link a new bank account (will require more steps in reality)
router.post('/accounts',
    body('bankName').trim().notEmpty().withMessage('Bank name is required.'),
    body('accountNumber').isLength({ min: 9, max: 18 }).isNumeric().withMessage('Account number is invalid.'), // Ensure numeric and length
    handleValidationErrors,
    asyncHandler(upiController.linkBankAccount)
);

// DELETE /api/upi/accounts/:upiId - Remove a linked UPI ID/account
router.delete('/accounts/:upiId',
    param('upiId').isString().trim().notEmpty().contains('@').withMessage('Valid UPI ID parameter required.'), // Validate param
    handleValidationErrors,
    asyncHandler(upiController.removeUpiId)
);

// PUT /api/upi/accounts/default - Set a default account
router.put('/accounts/default',
    body('upiId').isString().trim().notEmpty().contains('@').withMessage('Valid UPI ID in body is required.'),
    handleValidationErrors,
    asyncHandler(upiController.setDefaultAccount)
);

// GET /api/upi/verify - Verify a UPI ID
router.get('/verify',
    query('upiId').isString().trim().notEmpty().contains('@').withMessage('Valid UPI ID query parameter required.'),
    handleValidationErrors,
    asyncHandler(upiController.verifyUpiId)
);

// POST /api/upi/pay - Process a UPI payment
router.post('/pay',
    body('recipientUpiId').isString().trim().notEmpty().contains('@').withMessage('Valid Recipient UPI ID is required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive amount is required.'),
    body('pin').isString().isLength({ min: 4, max: 6 }).isNumeric().withMessage('UPI PIN must be 4 or 6 digits.'),
    body('sourceAccountUpiId').isString().trim().notEmpty().contains('@').withMessage('Valid Source Account UPI ID is required.'),
    body('note').optional().isString().trim().isLength({ max: 50 }),
    handleValidationErrors,
    asyncHandler(upiController.processUpiPayment)
);

// POST /api/upi/balance - Check account balance (SIMULATED, needs PIN)
router.post('/balance',
    body('upiId').isString().trim().notEmpty().contains('@').withMessage('Valid UPI ID is required.'),
    body('pin').isString().isLength({ min: 4, max: 6 }).isNumeric().withMessage('UPI PIN must be 4 or 6 digits.'),
    handleValidationErrors,
    asyncHandler(upiController.checkBalance)
);

// POST /api/upi/pin/set - Endpoint for setting UPI PIN (Secure flow needed)
// router.post('/pin/set', asyncHandler(upiController.setUpiPin)); // Ensure controller exists

// POST /api/upi/pin/reset - Endpoint for resetting UPI PIN (Secure flow needed)
// router.post('/pin/reset', asyncHandler(upiController.resetUpiPin)); // Ensure controller exists

// POST /api/upi/lite/enable - Enable UPI Lite
router.post('/lite/enable',
    body('linkedAccountUpiId').isString().trim().notEmpty().contains('@').withMessage('Valid linked bank account UPI ID required.'),
    handleValidationErrors,
    asyncHandler(upiController.enableUpiLite) // Ensure controller exists
);

// POST /api/upi/lite/topup - Add funds to UPI Lite
router.post('/lite/topup',
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive top-up amount required.'),
    body('fundingSourceUpiId').isString().trim().notEmpty().contains('@').withMessage('Valid funding source UPI ID required.'),
    handleValidationErrors,
    asyncHandler(upiController.topUpUpiLite) // Ensure controller exists
);

// POST /api/upi/lite/disable - Disable UPI Lite
router.post('/lite/disable', asyncHandler(upiController.disableUpiLite)); // Ensure controller exists

// GET /api/upi/lite/status - Get UPI Lite status and balance
router.get('/lite/status', asyncHandler(upiController.getUpiLiteStatus)); // Ensure controller exists

module.exports = router;
