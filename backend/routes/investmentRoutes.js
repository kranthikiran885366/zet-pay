// backend/routes/investmentRoutes.js
const express = require('express');
const { query, body } = require('express-validator');
const investmentController = require('../controllers/investmentController');
const router = express.Router();

// All routes require authentication (applied in server.js)

// --- Mutual Funds ---
// GET /api/invest/mf/search - Search/Browse Mutual Funds
router.get('/mf/search', investmentController.searchMutualFunds);

// GET /api/invest/mf/:fundId - Get details of a specific fund
router.get('/mf/:fundId', investmentController.getFundDetails);

// POST /api/invest/mf - Invest in a Mutual Fund (Lumpsum or SIP)
router.post('/mf',
    body('fundId').isString().notEmpty().withMessage('Fund ID is required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid amount required.'),
    body('investmentType').isIn(['Lumpsum', 'SIP']).withMessage('Investment type must be Lumpsum or SIP.'),
    // Conditional validation for SIP
    body('sipFrequency').if(body('investmentType').equals('SIP')).isIn(['Monthly', 'Quarterly']).withMessage('Invalid SIP frequency.'),
    body('sipDate').if(body('investmentType').equals('SIP')).isInt({ min: 1, max: 28 }).withMessage('Invalid SIP date (1-28).'),
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'bank']), // Validate payment method
    investmentController.investInMutualFund
);

// --- Digital Gold ---
// GET /api/invest/gold/price - Get live gold price
router.get('/gold/price', investmentController.getGoldPrice);

// POST /api/invest/gold/buy - Buy Digital Gold
router.post('/gold/buy',
    body('amountInINR').optional().isNumeric().toFloat().isFloat({ gt: 0 }),
    body('amountInGrams').optional().isNumeric().toFloat().isFloat({ gt: 0 }),
    // Add other required fields like payment method
    investmentController.buyDigitalGold
);

// POST /api/invest/gold/sell - Sell Digital Gold
router.post('/gold/sell',
    body('amountInGrams').isNumeric().toFloat().isFloat({ gt: 0 }),
    // Add bank details for credit
    investmentController.sellDigitalGold
);

// GET /api/invest/gold/portfolio - Get user's gold holdings
router.get('/gold/portfolio', investmentController.getGoldPortfolio);


// --- Deposits (FD/RD) ---
// GET /api/invest/deposits/schemes - Get available deposit schemes/rates
router.get('/deposits/schemes', investmentController.getDepositSchemes);

// POST /api/invest/deposits - Book a new deposit
router.post('/deposits',
    body('type').isIn(['FD', 'RD']).withMessage('Deposit type must be FD or RD.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }),
    body('tenureMonths').isInt({ gt: 0 }),
    // Add bank/source details
    investmentController.bookDeposit
);

// GET /api/invest/deposits - Get user's active deposits
router.get('/deposits', investmentController.getUserDeposits);


module.exports = router;
