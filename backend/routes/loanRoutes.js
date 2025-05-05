// backend/routes/loanRoutes.js
const express = require('express');
const { query, body, validationResult } = require('express-validator');
const loanController = require('../controllers/loanController');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();

// Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        res.status(400);
        throw new Error(`Validation Failed: ${errorMessages}`);
    }
    next();
};

// GET /api/loans/micro/eligibility - Check micro-loan eligibility
router.get('/micro/eligibility',
    query('checkAmount').optional().isNumeric().toFloat().isInt({ gt: 0 }).withMessage('Invalid check amount.'),
    handleValidationErrors,
    asyncHandler(loanController.checkMicroLoanEligibility)
);

// POST /api/loans/micro/apply - Apply for a micro-loan
router.post('/micro/apply',
    body('amount').isNumeric().toFloat().isInt({ gt: 0 }).withMessage('Valid loan amount is required.'),
    body('purpose').isIn(['General', 'Education']).withMessage('Valid purpose (General/Education) is required.'),
    handleValidationErrors,
    asyncHandler(loanController.applyForMicroLoan)
);

// GET /api/loans/micro/status - Get the status of the active micro-loan
router.get('/micro/status', asyncHandler(loanController.getMicroLoanStatus));

// POST /api/loans/micro/repay - Repay the micro-loan
router.post('/micro/repay',
    body('loanId').isString().trim().notEmpty().withMessage('Loan ID is required.'), // Assuming loanId is sent in body for repayment
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive repayment amount required.'),
    handleValidationErrors,
    asyncHandler(loanController.repayMicroLoan)
);

// GET /api/loans/personal/offers - Get pre-approved personal loan offers (Placeholder)
router.get('/personal/offers', asyncHandler(loanController.getPersonalLoanOffers));

// POST /api/loans/personal/apply - Apply for a personal loan (Placeholder)
// router.post('/personal/apply', asyncHandler(loanController.applyForPersonalLoan));

module.exports = router;
