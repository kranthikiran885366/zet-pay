
const express = require('express');
const { body } = require('express-validator');
const passesController = require('../controllers/passesController');
const router = express.Router();

// GET /api/passes/my-passes - Get the current user's purchased passes
router.get('/my-passes', passesController.getMyPasses);

// POST /api/passes/apply - Apply for a new pass
router.post('/apply',
    // Add validation rules using express-validator
    body('passId').isString().notEmpty(),
    body('operatorName').isString().notEmpty(),
    body('passName').isString().notEmpty(),
    body('price').isNumeric().toFloat().isFloat({ min: 0 }),
    body('duration').isString().notEmpty(),
    body('passengerName').isString().notEmpty(),
    body('passengerDob').isISO8601().toDate(), // Validate date format
    // Add more validations for gender, address, studentId, photoUrl etc.
    passesController.applyForPass
);

// GET /api/passes/:purchaseId - Get details of a specific purchased pass
router.get('/:purchaseId', passesController.getPassDetails);


// PUT /api/passes/:purchaseId/cancel - Cancel a specific purchased pass
router.put('/:purchaseId/cancel', passesController.cancelPass);


module.exports = router;

    