// backend/routes/investmentRoutes.js
const express = require('express');
const { query, body, validationResult } = require('express-validator');
const investmentController = require('../controllers/investmentController');
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

// All routes require authentication (applied in server.js)

// --- Mutual Funds ---
// GET /api/invest/mf/search - Search/Browse Mutual Funds
router.get('/mf/search', asyncHandler(investmentController.searchMutualFunds));

// GET /api/invest/mf/:fundId - Get details of a specific fund
router.get('/mf/:fundId', asyncHandler(investmentController.getFundDetails));

// POST /api/invest/mf - Invest in a Mutual Fund (Lumpsum or SIP)
router.post('/mf',
    body('fundId').isString().trim().notEmpty().withMessage('Fund ID is required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid amount required.'),
    body('investmentType').isIn(['Lumpsum', 'SIP']).withMessage('Investment type must be Lumpsum or SIP.'),
    // Conditional validation for SIP
    body('sipFrequency').if(body('investmentType').equals('SIP')).isIn(['Monthly', 'Quarterly']).withMessage('Invalid SIP frequency.'),
    body('sipDate').if(body('investmentType').equals('SIP')).isInt({ min: 1, max: 28 }).withMessage('Invalid SIP date (1-28).'),
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'bank']), // Validate payment method
    handleValidationErrors,
    asyncHandler(investmentController.investInMutualFund)
);

// --- Digital Gold ---
// GET /api/invest/gold/price - Get live gold price
router.get('/gold/price', asyncHandler(investmentController.getGoldPrice));

// POST /api/invest/gold/buy - Buy Digital Gold
router.post('/gold/buy',
    // Validate one of the amount fields is present and valid
    body().custom((value, { req }) => {
        if (!req.body.amountInINR && !req.body.amountInGrams) {
          throw new Error('Either amountInINR or amountInGrams is required.');
        }
        return true;
    }),
    body('amountInINR').optional({ checkFalsy: true }).isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Invalid amount in INR.'),
    body('amountInGrams').optional({ checkFalsy: true }).isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Invalid amount in grams.'),
    // Add other required fields like payment method
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'bank']),
    handleValidationErrors,
    asyncHandler(investmentController.buyDigitalGold) // Ensure controller exists
);

// POST /api/invest/gold/sell - Sell Digital Gold
router.post('/gold/sell',
    body('amountInGrams').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid amount in grams required.'),
    // Add bank details for credit validation
    body('bankAccountId').isString().trim().notEmpty().withMessage('Bank account ID for credit is required.'), // Example validation
    handleValidationErrors,
    asyncHandler(investmentController.sellDigitalGold) // Ensure controller exists
);

// GET /api/invest/gold/portfolio - Get user's gold holdings
router.get('/gold/portfolio', asyncHandler(investmentController.getGoldPortfolio)); // Ensure controller exists


// --- Deposits (FD/RD) ---
// GET /api/invest/deposits/schemes - Get available deposit schemes/rates
router.get('/deposits/schemes', asyncHandler(investmentController.getDepositSchemes)); // Ensure controller exists

// POST /api/invest/deposits - Book a new deposit
router.post('/deposits',
    body('type').isIn(['FD', 'RD']).withMessage('Deposit type must be FD or RD.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid deposit amount required.'),
    body('tenureMonths').isInt({ gt: 0 }).withMessage('Valid tenure in months required.'),
    // Add bank/source details validation
    body('sourceAccountId').isString().trim().notEmpty().withMessage('Source account ID is required.'),
    handleValidationErrors,
    asyncHandler(investmentController.bookDeposit) // Ensure controller exists
);

// GET /api/invest/deposits - Get user's active deposits
router.get('/deposits', asyncHandler(investmentController.getUserDeposits)); // Ensure controller exists


module.exports = router;
