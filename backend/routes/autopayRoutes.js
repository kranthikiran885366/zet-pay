const express = require('express');
const { body, validationResult } = require('express-validator'); // Import validationResult
const autopayController = require('../controllers/autopayController');
const asyncHandler = require('../middleware/asyncHandler'); // Import asyncHandler
const router = express.Router();

// Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Construct a user-friendly message or return detailed errors
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        res.status(400); // Set status code
        throw new Error(`Validation Failed: ${errorMessages}`); // Throw error for asyncHandler
    }
    next();
};

// All routes under /api/autopay require authentication (applied in server.js)

// GET /api/autopay/mandates - Get all mandates for the current user
router.get('/mandates', asyncHandler(autopayController.getMandates));

// POST /api/autopay/mandates - Initiate setup of a new mandate
router.post('/mandates',
    // Add validation rules
    body('merchantName').isString().trim().notEmpty().withMessage('Merchant name is required.'),
    body('userUpiId').isString().trim().notEmpty().contains('@').withMessage('Valid User UPI ID is required.'),
    body('maxAmount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive max amount required.'),
    body('frequency').isIn(['Monthly', 'Quarterly', 'Half Yearly', 'Yearly', 'As Presented']).withMessage('Invalid frequency.'),
    body('startDate').isISO8601().toDate().withMessage('Valid start date required.'),
    body('validUntil').isISO8601().toDate().withMessage('Valid expiry date required.')
        .custom((value, { req }) => {
             if (new Date(value) <= new Date(req.body.startDate)) {
                 throw new Error('Expiry date must be after start date.');
             }
             return true;
         }),
    handleValidationErrors, // Handle validation results
    asyncHandler(autopayController.setupMandate) // Wrap controller with asyncHandler
);

// PUT /api/autopay/mandates/:mandateId/pause - Pause an active mandate
router.put('/mandates/:mandateId/pause', asyncHandler(autopayController.pauseMandate));

// PUT /api/autopay/mandates/:mandateId/resume - Resume a paused mandate
router.put('/mandates/:mandateId/resume', asyncHandler(autopayController.resumeMandate));

// DELETE /api/autopay/mandates/:mandateId - Cancel a mandate
router.delete('/mandates/:mandateId', asyncHandler(autopayController.cancelMandate));


module.exports = router;
