const express = require('express');
const { body, validationResult } = require('express-validator');
const walletController = require('../controllers/walletController');
const { payViaWalletInternal } = require('../controllers/walletController'); // Import the internal payment function
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


// GET /api/wallet/balance - Get current user's wallet balance
router.get('/balance', asyncHandler(walletController.getWalletBalance));

// POST /api/wallet/topup - Add funds to the wallet
router.post('/topup',
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive amount is required.'),
    body('fundingSourceInfo').isString().trim().notEmpty().withMessage('Funding source information is required.'),
    handleValidationErrors, // Handle validation results
    asyncHandler(walletController.topUpWallet)
);

// POST /api/wallet/pay - Process payment directly from wallet
router.post('/pay',
    body('recipientIdentifier').isString().trim().notEmpty().withMessage('Recipient identifier is required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive amount required.'),
    body('note').optional().isString().trim().isLength({ max: 100 }), // Optional note
    handleValidationErrors, // Handle validation results
    asyncHandler(async (req, res, next) => { // Wrap internal logic with asyncHandler
        const userId = req.user.uid; // Assuming authMiddleware provides this
        const { recipientIdentifier, amount, note } = req.body;
        // Use the internal function for payment logic & logging
        // IMPORTANT: The internal function now includes error handling and logging.
        // We pass the result directly to the response.
        const result = await payViaWalletInternal(userId, recipientIdentifier, amount, note);
        // Respond based on the internal function's result
        if (result.success) {
            res.status(200).json(result);
        } else {
            // Use 400 for client-side errors like insufficient balance, 500 for others?
            const statusCode = result.message?.toLowerCase().includes('insufficient') ? 400 : 500;
            // Let the error middleware handle throwing based on status code
            res.status(statusCode);
            throw new Error(result.message || "Wallet payment failed."); // Throw error
        }
    })
);


// Maybe add routes for wallet history if needed (separate from main transactions)
// router.get('/history', asyncHandler(walletController.getWalletHistory));

module.exports = router;
