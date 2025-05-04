
const express = require('express');
const { body } = require('express-validator'); // For validation
const autopayController = require('../controllers/autopayController');
const router = express.Router();

// All routes under /api/autopay require authentication (applied in server.js)

// GET /api/autopay/mandates - Get all mandates for the current user
router.get('/mandates', autopayController.getMandates);

// POST /api/autopay/mandates - Initiate setup of a new mandate
router.post('/mandates',
    // Add validation rules
    body('merchantName').isString().notEmpty().withMessage('Merchant name is required.'),
    body('userUpiId').isString().notEmpty().contains('@').withMessage('Valid User UPI ID is required.'),
    body('maxAmount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive max amount required.'),
    body('frequency').isIn(['Monthly', 'Quarterly', 'Half Yearly', 'Yearly', 'As Presented']).withMessage('Invalid frequency.'),
    body('startDate').isISO8601().toDate().withMessage('Valid start date required.'),
    body('validUntil').isISO8601().toDate().withMessage('Valid expiry date required.'),
    // TODO: Add validation to ensure validUntil > startDate
    autopayController.setupMandate
);

// PUT /api/autopay/mandates/:mandateId/pause - Pause an active mandate
router.put('/mandates/:mandateId/pause', autopayController.pauseMandate);

// PUT /api/autopay/mandates/:mandateId/resume - Resume a paused mandate
router.put('/mandates/:mandateId/resume', autopayController.resumeMandate);

// DELETE /api/autopay/mandates/:mandateId - Cancel a mandate
router.delete('/mandates/:mandateId', autopayController.cancelMandate);


module.exports = router;
