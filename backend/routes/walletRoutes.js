

const express = require('express');
const { body } = require('express-validator');
const walletController = require('../controllers/walletController');
const { payViaWalletInternal } = require('../controllers/walletController'); // Import the internal payment function
const router = express.Router();

// GET /api/wallet/balance - Get current user's wallet balance
router.get('/balance', walletController.getWalletBalance);

// POST /api/wallet/topup - Add funds to the wallet
router.post('/topup',
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive amount is required.'),
    body('fundingSourceInfo').isString().notEmpty().withMessage('Funding source information is required.'),
    walletController.topUpWallet
);

// POST /api/wallet/pay - Process payment directly from wallet
router.post('/pay',
    body('recipientIdentifier').isString().notEmpty().withMessage('Recipient identifier is required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive amount required.'),
    body('note').optional().isString().trim().isLength({ max: 100 }), // Optional note
    async (req, res, next) => { // Use async handler directly
        const userId = req.user.uid; // Assuming authMiddleware provides this
        const { recipientIdentifier, amount, note } = req.body;
        try {
            // Use the internal function for payment logic & logging
            const result = await payViaWalletInternal(userId, recipientIdentifier, amount, note);
            // Respond based on the internal function's result
            if (result.success) {
                res.status(200).json(result);
            } else {
                 // Use 400 for client-side errors like insufficient balance, 500 for others?
                const statusCode = result.message?.includes('Insufficient') ? 400 : 500;
                res.status(statusCode).json(result);
            }
        } catch (error) {
             next(error); // Pass unexpected errors to the error middleware
        }
    }
);


// Maybe add routes for wallet history if needed (separate from main transactions)
// router.get('/history', walletController.getWalletHistory);

module.exports = router;
        