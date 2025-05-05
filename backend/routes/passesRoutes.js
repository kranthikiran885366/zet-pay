const express = require('express');
const { body, validationResult, param } = require('express-validator'); // Added param
const passesController = require('../controllers/passesController');
const asyncHandler = require('../middleware/asyncHandler'); // Import asyncHandler
const router = express.Router();

// Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        res.status(400); // Set status code
        throw new Error(`Validation Failed: ${errorMessages}`); // Throw error for asyncHandler
    }
    next();
};

// GET /api/passes/my-passes - Get the current user's purchased passes
router.get('/my-passes', asyncHandler(passesController.getMyPasses));

// POST /api/passes/apply - Apply for a new pass
router.post('/apply',
    // Add validation rules using express-validator
    body('passId').isString().trim().notEmpty().withMessage('Pass type ID is required.'),
    body('operatorName').isString().trim().notEmpty().withMessage('Operator name is required.'),
    body('passName').isString().trim().notEmpty().withMessage('Pass name is required.'),
    body('price').isNumeric().toFloat().isFloat({ min: 0 }).withMessage('Valid price required.'),
    body('duration').isString().trim().notEmpty().withMessage('Duration is required.'),
    body('passengerName').isString().trim().notEmpty().withMessage('Passenger name is required.'),
    body('passengerDob').isISO8601().toDate().withMessage('Valid Date of Birth required.'), // Validate date format
    body('passengerGender').isIn(['Male', 'Female', 'Other']).withMessage('Valid gender required.'), // Example gender validation
    body('passengerAddress').isString().trim().notEmpty().withMessage('Address is required.'),
    body('studentId').optional({ checkFalsy: true }).isString().trim(), // Optional student ID
    body('photoUrl').optional({ checkFalsy: true }).isURL().withMessage('Invalid photo URL.'), // Optional photo URL
    // TODO: Add more validations for gender, address, studentId, photoUrl etc.
    handleValidationErrors,
    asyncHandler(passesController.applyForPass)
);

// GET /api/passes/:purchaseId - Get details of a specific purchased pass
router.get('/:purchaseId',
    param('purchaseId').isMongoId().withMessage('Invalid pass purchase ID format.'), // Assuming MongoDB ObjectIDs
    handleValidationErrors,
    asyncHandler(passesController.getPassDetails)
);


// PUT /api/passes/:purchaseId/cancel - Cancel a specific purchased pass
router.put('/:purchaseId/cancel',
    param('purchaseId').isMongoId().withMessage('Invalid pass purchase ID format.'),
    handleValidationErrors,
    asyncHandler(passesController.cancelPass)
);


module.exports = router;
