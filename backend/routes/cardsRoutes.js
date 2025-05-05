// backend/routes/cardsRoutes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const cardsController = require('../controllers/cardsController');
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

// GET /api/cards - Get all saved cards for the current user
router.get('/', asyncHandler(cardsController.getSavedCards));

// POST /api/cards - Add and tokenize a new card
router.post('/',
    body('cardNumber').isCreditCard().withMessage('Invalid card number.'),
    // Basic expiry validation - might need refinement for MM/YYYY format
    body('expiryMonth').isInt({ min: 1, max: 12 }).withMessage('Invalid expiry month.'),
    body('expiryYear').isInt({ min: new Date().getFullYear() }).withMessage('Invalid expiry year.'), // Ensure year is current or future
    body('cvv').isLength({ min: 3, max: 4 }).isNumeric().withMessage('Invalid CVV.'),
    body('cardHolderName').optional().isString().trim(),
    body('cardType').isIn(['Credit', 'Debit']).withMessage('Card type must be Credit or Debit.'),
    handleValidationErrors,
    asyncHandler(cardsController.addCard)
);

// DELETE /api/cards/:cardId - Delete a saved card
router.delete('/:cardId', asyncHandler(cardsController.deleteCard));

// PUT /api/cards/:cardId/set-primary - Set a card as primary
router.put('/:cardId/set-primary', asyncHandler(cardsController.setPrimaryCard));

module.exports = router;
