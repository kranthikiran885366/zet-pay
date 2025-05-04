
const express = require('express');
const { query, body } = require('express-validator');
const rechargeController = require('../controllers/rechargeController');
const router = express.Router();

// GET /api/recharge/billers - Get list of billers by type
router.get('/billers',
    query('type').isString().notEmpty().withMessage('Biller type query parameter is required.'),
    rechargeController.getBillers
);

// GET /api/recharge/plans - Get recharge plans for a biller/type
router.get('/plans',
    query('billerId').isString().notEmpty().withMessage('Biller ID query parameter is required.'),
    query('type').isString().notEmpty().withMessage('Type query parameter is required.'),
    query('identifier').optional().isString(), // Optional identifier for circle specific plans
    rechargeController.getRechargePlans
);

// POST /api/recharge - Process a recharge or bill payment
router.post('/',
    body('type').isString().notEmpty().withMessage('Recharge type is required.'),
    body('identifier').isString().notEmpty().withMessage('Identifier (number/ID) is required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid positive amount is required.'),
    body('billerId').optional().isString(),
    body('planId').optional().isString(),
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'),
    // Add validation for UPI/Card details if method is selected
    rechargeController.processRecharge
);

// POST /api/recharge/schedule - Schedule a recurring recharge
router.post('/schedule',
     body('type').isString().notEmpty(),
     body('identifier').isString().notEmpty(),
     body('amount').isNumeric().toFloat().isFloat({ gt: 0 }),
     body('frequency').isIn(['monthly', 'weekly', 'daily']),
     body('startDate').isISO8601().toDate(),
     body('billerId').optional().isString(),
     body('planId').optional().isString(),
    rechargeController.scheduleRecharge
);

// DELETE /api/recharge/schedule/:scheduleId - Cancel a scheduled recharge
router.delete('/schedule/:scheduleId', rechargeController.cancelScheduledRecharge);

// GET /api/recharge/status/:transactionId - Check activation status of a recharge
router.get('/status/:transactionId', rechargeController.checkActivationStatus);

// POST /api/recharge/cancel/:transactionId - Request cancellation of a recent recharge
router.post('/cancel/:transactionId', rechargeController.cancelRecharge);

module.exports = router;
