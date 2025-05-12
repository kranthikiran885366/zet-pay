// backend/routes/favoritesRoutes.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const favoritesController = require('../controllers/favoritesController');
const authMiddleware = require('../middleware/authMiddleware');
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

// All routes require authentication
router.use(authMiddleware);

// POST /api/favorites/qr - Add a new favorite QR
router.post('/qr',
    body('qrData').isString().trim().notEmpty().withMessage('QR Data is required.'),
    body('payeeUpi').isString().trim().notEmpty().contains('@').withMessage('Valid Payee UPI ID is required.'),
    body('payeeName').isString().trim().notEmpty().withMessage('Payee Name is required.'),
    body('customTagName').optional().isString().trim().isLength({ max: 50 }),
    body('defaultAmount').optional().isNumeric().toFloat({ min: 0.01 }),
    handleValidationErrors,
    asyncHandler(favoritesController.addFavorite)
);

// GET /api/favorites/qr - List all favorite QRs for the user
router.get('/qr', asyncHandler(favoritesController.listFavorites));

// DELETE /api/favorites/qr/:qrHash - Remove a favorite QR
router.delete('/qr/:qrHash',
    param('qrHash').isString().trim().notEmpty().withMessage('QR Hash parameter is required.'),
    handleValidationErrors,
    asyncHandler(favoritesController.removeFavorite)
);

module.exports = router;
