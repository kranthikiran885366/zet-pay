
const express = require('express');
const { body } = require('express-validator');
const upiController = require('../controllers/upiController');
const router = express.Router();

// GET /api/upi/accounts - Get linked bank accounts
router.get('/accounts', upiController.getLinkedAccounts);

// POST /api/upi/accounts - Link a new bank account (will require more steps in reality)
router.post('/accounts',
    body('bankName').trim().notEmpty().withMessage('Bank name is required.'),
    body('accountNumber').isLength({ min: 9, max: 18 }).withMessage('Account number is invalid.'), // Example validation
    upiController.linkBankAccount
);

// DELETE /api/upi/accounts/:upiId - Remove a linked UPI ID/account
router.delete('/accounts/:upiId', upiController.removeUpiId);

// PUT /api/upi/accounts/default - Set a default account
router.put('/accounts/default',
    body('upiId').isString().notEmpty().withMessage('UPI ID is required.'),
    upiController.setDefaultAccount
);

// GET /api/upi/verify - Verify a UPI ID
router.get('/verify', upiController.verifyUpiId);

// POST /api/upi/pay - Process a UPI payment
router.post('/pay',
    body('recipientUpiId').isString().notEmpty().contains('@').withMessage('Valid Recipient UPI ID is required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive amount is required.'),
    body('pin').isString().isLength({ min: 4, max: 6 }).withMessage('UPI PIN must be 4 or 6 digits.'),
    body('sourceAccountUpiId').isString().notEmpty().contains('@').withMessage('Valid Source Account UPI ID is required.'),
    body('note').optional().isString().trim().isLength({ max: 50 }),
    upiController.processUpiPayment
);

// POST /api/upi/balance - Check account balance (SIMULATED, needs PIN)
router.post('/balance',
    body('upiId').isString().notEmpty().contains('@').withMessage('Valid UPI ID is required.'),
    body('pin').isString().isLength({ min: 4, max: 6 }).withMessage('UPI PIN must be 4 or 6 digits.'),
    upiController.checkBalance
);

// POST /api/upi/pin/set - Endpoint for setting UPI PIN (Secure flow needed)
// router.post('/pin/set', upiController.setUpiPin);

// POST /api/upi/pin/reset - Endpoint for resetting UPI PIN (Secure flow needed)
// router.post('/pin/reset', upiController.resetUpiPin);

module.exports = router;
