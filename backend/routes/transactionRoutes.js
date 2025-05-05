const express = require('express');
const { query, param, validationResult } = require('express-validator'); // Added param
const transactionController = require('../controllers/transactionController');
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


// GET /api/transactions - Fetch transaction history with optional filters
router.get('/',
    // Optional query validations
    query('type').optional().isString().trim(),
    query('status').optional().isIn(['Completed', 'Pending', 'Failed', 'Processing Activation', 'Cancelled']), // Add allowed statuses
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100.'),
    query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date format.'),
    query('endDate').optional().isISO8601().toDate().withMessage('Invalid end date format.')
        .custom((value, { req }) => {
             if (req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
                 throw new Error('End date must be after start date.');
             }
             return true;
         }),
    query('searchTerm').optional().isString().trim(),
    handleValidationErrors, // Handle any validation errors
    asyncHandler(transactionController.getTransactionHistory)
);

// GET /api/transactions/:id - Fetch details of a specific transaction (Implement in controller if needed)
router.get('/:id',
    param('id').isMongoId().withMessage('Invalid transaction ID format.'), // Example validation
    handleValidationErrors,
    asyncHandler(transactionController.getTransactionDetails)
);


module.exports = router;
