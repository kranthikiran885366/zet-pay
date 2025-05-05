// backend/routes/hyperlocalRoutes.js
const express = require('express');
const { query, body } = require('express-validator');
const hyperlocalController = require('../controllers/hyperlocalController');
const router = express.Router();

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
    hyperlocalController.getAvailableServices
);

// GET /api/hyperlocal/:serviceType/details - Get details/slots for a service type
router.get('/:serviceType/details',
    // Add validation for serviceType param
    query('providerId').optional().isString(),
    query('date').optional().isISO8601().toDate(),
    hyperlocalController.getServiceDetails
);

// POST /api/hyperlocal/:serviceType - Book a service
router.post('/:serviceType',
     // Add validation for serviceType param
     body('providerId').isString().notEmpty().withMessage('Provider ID is required.'),
     body('slotTime').isString().notEmpty().withMessage('Slot time is required.'), // Adjust validation as needed
     body('address').isString().notEmpty().withMessage('Address is required.'),
     body('estimatedCost').isNumeric().toFloat().isFloat({ min: 0 }).withMessage('Valid estimated cost required.'),
     body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']),
     hyperlocalController.bookService
);

// POST /api/hyperlocal/:serviceType/:bookingId/cancel - Cancel a booking
router.post('/:serviceType/:bookingId/cancel',
    // Add validation for bookingId param
    hyperlocalController.cancelServiceBooking
);

module.exports = router;
