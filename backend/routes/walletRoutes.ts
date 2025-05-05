
import express from 'express';
import { body, validationResult } from 'express-validator';
import * as walletController from '../controllers/walletController'; // Import controller functions
import asyncHandler from '../middleware/asyncHandler'; // Import asyncHandler
import { Request, Response, NextFunction } from 'express'; // Import Express types

const router = express.Router();

// Middleware to handle validation results
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
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

// POST /api/wallet/pay - Process payment directly from wallet (uses backend internal logic)
router.post('/pay',
    body('recipientIdentifier').isString().trim().notEmpty().withMessage('Recipient identifier is required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive amount required.'),
    body('note').optional().isString().trim().isLength({ max: 100 }), // Optional note
    handleValidationErrors, // Handle validation results
    asyncHandler(walletController.payViaWalletController) // Use the specific controller for this endpoint
);


// Maybe add routes for wallet history if needed (separate from main transactions)
// router.get('/history', asyncHandler(walletController.getWalletHistory));

export default router;

    