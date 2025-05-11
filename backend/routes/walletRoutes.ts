
import express from 'express';
import { body, validationResult } from 'express-validator';
import * as walletController from '../controllers/walletController.ts'; // Use functions from backend walletController.ts
import asyncHandler from '../middleware/asyncHandler'; // Import asyncHandler
import { Request, Response, NextFunction } from 'express'; // Import Express types
import authMiddleware from '../middleware/authMiddleware'; // Import auth middleware

const router = express.Router();

// Middleware to handle validation results
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        res.status(400);
        // Throw error for asyncHandler to catch and pass to errorMiddleware
        return next(new Error(`Validation Failed: ${errorMessages}`));
    }
    next();
};

// Apply auth middleware to all wallet routes
router.use(authMiddleware);

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
// This endpoint will use the backend's internal payment logic, which might call `payViaWalletInternal`.
router.post('/pay',
    body('recipientIdentifier').isString().trim().notEmpty().withMessage('Recipient identifier is required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive amount required.'),
    body('note').optional().isString().trim().isLength({ max: 100 }), // Optional note
    handleValidationErrors, // Handle validation results
    asyncHandler(walletController.payViaWalletController) // Use the specific controller for this endpoint
);

// payViaWalletInternal should NOT be exposed as a direct route.
// It's an internal backend service function.

export default router;
