// backend/routes/hyperlocalRoutes.js
const express = require('express');
const { query, body, validationResult } = require('express-validator');
const hyperlocalController = require('../controllers/hyperlocalController');
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

// All routes require authentication (applied in server.js)

// GET /api/hyperlocal/services - Get available services nearby
router.get('/services',
    // Require either lat/lon or pincode
    query().custom((value, { req }) => {
        if (!req.query.pincode && (!req.query.lat || !req.query.lon)) {
          throw new Error('Either pincode or latitude/longitude query parameters are required.');
        }
        // Add validation for lat/lon format if needed
        return true;
    }),
    query('lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude.'),
    query('lon').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude.'),
    query('pincode').optional().isPostalCode('IN').withMessage('Invalid Indian pincode.'), // Assuming Indian pincodes
    handleValidationErrors,
    asyncHandler(hyperlocalController.getAvailableServices)
);

// GET /api/hyperlocal/:serviceType/details - Get details/slots for a service type
router.get('/:serviceType/details',
    // Add validation for serviceType param
    query('providerId').optional().isString().trim(),
    query('date').optional().isISO8601().toDate(),
    handleValidationErrors,
    asyncHandler(hyperlocalController.getServiceDetails)
);

// POST /api/hyperlocal/:serviceType - Book a service
router.post('/:serviceType',
     // Add validation for serviceType param
     body('providerId').isString().trim().notEmpty().withMessage('Provider ID is required.'),
     body('slotTime').isString().trim().notEmpty().withMessage('Slot time is required.'), // Adjust validation as needed
     body('address').isObject().withMessage('Address object is required.'), // Assuming address is an object now
     body('address.line1').isString().trim().notEmpty().withMessage('Address Line 1 required.'),
     body('address.city').isString().trim().notEmpty().withMessage('City required.'),
     body('address.pincode').isPostalCode('IN').withMessage('Valid Pincode required.'),
     body('estimatedCost').isNumeric().toFloat().isFloat({ min: 0 }).withMessage('Valid estimated cost required.'),
     body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']),
     handleValidationErrors,
     asyncHandler(hyperlocalController.bookService)
);

// POST /api/hyperlocal/:serviceType/:bookingId/cancel - Cancel a booking
router.post('/:serviceType/:bookingId/cancel',
    // Add validation for bookingId param if needed
    handleValidationErrors, // Add validation if needed
    asyncHandler(hyperlocalController.cancelServiceBooking)
);

module.exports = router;
