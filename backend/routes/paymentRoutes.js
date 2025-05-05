// backend/routes/paymentRoutes.js
const express = require('express');
const { body } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const router = express.Router();

// All routes require authentication (applied in server.js)

// POST /api/payments/card - Process payment using a saved card
router.post('/card',
    body('cardId').isString().notEmpty().withMessage('Card ID (token) is required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid amount required.'),
    body('cvv').isString().isLength({ min: 3, max: 4 }).withMessage('Valid CVV required.'), // Backend MUST NOT store this after use
    body('purpose').isString().notEmpty().withMessage('Payment purpose is required.'),
    body('recipientIdentifier').optional().isString(),
    paymentController.processCardPayment
);

// Add other generic payment endpoints if needed

module.exports = router;
