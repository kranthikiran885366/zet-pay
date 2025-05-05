// backend/routes/pocketMoneyRoutes.js
const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const pocketMoneyController = require('../controllers/pocketMoneyController');
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

// GET /api/pocket-money/config - Get the parent's pocket money configuration
router.get('/config', asyncHandler(pocketMoneyController.getPocketMoneyConfig));

// PUT /api/pocket-money/config - Update the pocket money configuration
router.put('/config',
    // Validate the structure of the children array and its objects
    body('children').isArray().withMessage('Children must be an array.'),
    body('children.*.id').isString().trim().notEmpty().withMessage('Child ID is required.'),
    body('children.*.name').isString().trim().notEmpty().withMessage('Child name is required.'),
    body('children.*.balance').isNumeric().withMessage('Child balance must be a number.'),
    body('children.*.allowanceAmount').optional({ checkFalsy: true }).isNumeric().toFloat().isFloat({ min: 0 }).withMessage('Invalid allowance amount.'),
    body('children.*.allowanceFrequency').optional({ checkFalsy: true }).isIn(['Daily', 'Weekly', 'Monthly', 'None']).withMessage('Invalid allowance frequency.'),
    body('children.*.lastAllowanceDate').optional({ checkFalsy: true }).isISO8601().toDate().withMessage('Invalid last allowance date.'),
    body('children.*.spendingLimitPerTxn').optional({ checkFalsy: true }).isNumeric().toFloat().isFloat({ min: 0 }).withMessage('Invalid spending limit.'),
    body('children.*.linkedSchoolBillerId').optional({ checkFalsy: true }).isString().trim(),
    handleValidationErrors,
    asyncHandler(pocketMoneyController.updatePocketMoneyConfig)
);

// POST /api/pocket-money/add-funds - Add funds to a child's wallet
router.post('/add-funds',
    body('childId').isString().trim().notEmpty().withMessage('Child ID is required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive amount required.'),
    handleValidationErrors,
    asyncHandler(pocketMoneyController.addFundsToChild)
);

// GET /api/pocket-money/transactions/:childId - Get transactions for a specific child
router.get('/transactions/:childId',
    param('childId').isString().trim().notEmpty().withMessage('Child ID parameter is required.'),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt().withMessage('Invalid limit (1-50).'),
    handleValidationErrors,
    asyncHandler(pocketMoneyController.getChildTransactions)
);

module.exports = router;
