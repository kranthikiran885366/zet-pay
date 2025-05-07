
// backend/routes/scanRoutes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const scanController = require('../controllers/scanController');
const authMiddleware = require('../middleware/authMiddleware'); // All scan routes require auth
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

// POST /api/scan/validate - Validate scanned QR data
router.post('/validate',
    authMiddleware,
    body('qrData').isString().trim().notEmpty().withMessage('qrData string is required.'),
    // Optional: body('userId').isString().trim().notEmpty(), // If userId is sent explicitly
    handleValidationErrors,
    asyncHandler(scanController.validateQr)
);

// POST /api/scan/report - Report a QR code
router.post('/report',
    authMiddleware,
    body('qrData').isString().trim().notEmpty().withMessage('qrData string is required.'),
    body('reason').isString().trim().notEmpty().withMessage('Reason for reporting is required.'),
    // Optional: body('location').optional().isObject(), // If location is sent
    handleValidationErrors,
    asyncHandler(scanController.reportQr)
);

module.exports = router;
