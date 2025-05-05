// backend/routes/billsRoutes.js
const express = require('express');
const { query, body } = require('express-validator');
const billsController = require('../controllers/billsController');
const router = express.Router();

// All routes require authentication (applied in server.js)

// GET /api/bills/:type/details - Fetch bill details for a specific type (e.g., electricity)
router.get('/:type/details',
    query('billerId').isString().notEmpty().withMessage('Biller ID is required.'),
    query('identifier').isString().notEmpty().withMessage('Identifier (e.g., consumer number) is required.'),
    // Add validation for :type param if needed
    billsController.fetchBillDetails
);

// POST /api/bills/:type - Process a bill payment for a specific type
router.post('/:type',
    // Add validation for :type param if needed
    body('billerId').isString().notEmpty().withMessage('Biller ID is required.'),
    body('identifier').isString().notEmpty().withMessage('Identifier (e.g., consumer number) is required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive amount is required.'),
    body('billerName').optional().isString(),
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'),
    // Add validation for UPI/Card details if method is selected
    billsController.processBillPayment
);

module.exports = router;
