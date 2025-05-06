
import express from 'express';
import { query, param, validationResult } from 'express-validator'; // Added param
import * as transactionController from '../controllers/transactionController'; // Import using * as
import asyncHandler from '../middleware/asyncHandler'; // Import asyncHandler
import { Request, Response, NextFunction } from 'express'; // Import Express types
import authMiddleware from '../middleware/authMiddleware'; // Import auth middleware

const router = express.Router();

// Middleware to handle validation results
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        res.status(400); // Set status code
        // Throw error for asyncHandler to catch and pass to errorMiddleware
        return next(new Error(`Validation Failed: ${errorMessages}`));
    }
    next();
};


// Apply auth middleware to all transaction routes
router.use(authMiddleware);

// GET /api/transactions - Fetch transaction history with optional filters
router.get('/',
    // Optional query validations
    query('type').optional().isString().trim(),
    query('status').optional().isIn(['Completed', 'Pending', 'Failed', 'Processing Activation', 'Cancelled', 'Refunded']), // Add allowed statuses
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100.'),
    query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date format.'),
    query('endDate').optional().isISO8601().toDate().withMessage('Invalid end date format.')
        .custom((value, { req }) => {
             if (req.query?.startDate && new Date(value) < new Date(req.query.startDate as string)) {
                 throw new Error('End date must be after start date.');
             }
             return true;
         }),
    query('searchTerm').optional().isString().trim(),
    handleValidationErrors, // Handle any validation errors
    asyncHandler(transactionController.getTransactionHistory)
);

// GET /api/transactions/:id - Fetch details of a specific transaction
router.get('/:id',
    param('id').isString().notEmpty().withMessage('Valid transaction ID parameter required.'), // Basic validation, adjust if using MongoID etc.
    handleValidationErrors,
    asyncHandler(transactionController.getTransactionDetails)
);

// POST /api/transactions - Add a new transaction (mainly for internal backend use or testing)
// This endpoint might not be directly exposed if transactions are only logged internally by other actions.
// If exposed, add strong validation and ensure it's only used appropriately.
// router.post('/',
//     // Add necessary body validations here based on the Transaction type
//     // Example: body('type').isString().notEmpty(), body('amount').isNumeric(), etc.
//     handleValidationErrors,
//     asyncHandler(transactionController.addTransactionController)
// );


export default router;

