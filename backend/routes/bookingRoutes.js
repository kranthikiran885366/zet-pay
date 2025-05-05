// backend/routes/bookingRoutes.js
const express = require('express');
const { query, body, validationResult } = require('express-validator');
const bookingController = require('../controllers/bookingController');
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

// GET /api/bookings/:type/search - Search for bookings (bus, flight, train, movie, event)
router.get('/:type/search',
    // Add specific query param validations based on type if needed
    handleValidationErrors,
    asyncHandler(bookingController.searchBookings)
);

// GET /api/bookings/:type/:id/details - Get details for a specific item (e.g., seat layout, showtimes)
router.get('/:type/:id/details',
    // Add specific query param validations based on type if needed
    handleValidationErrors,
    asyncHandler(bookingController.getBookingDetails)
);

// POST /api/bookings/:type - Confirm a booking
router.post('/:type',
    // Add validation for common booking fields
    body('totalAmount').isNumeric().toFloat().isFloat({ min: 0 }).withMessage('Valid total amount required.'),
    body('providerId').optional().isString().trim(),
    body('selection').isObject().withMessage('Booking selection details required.'), // Validate specific fields based on type if possible
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']),
    // Add specific body validations based on type if needed (e.g., passenger details for flights)
    handleValidationErrors,
    asyncHandler(bookingController.confirmBooking)
);

// POST /api/bookings/:type/:bookingId/cancel - Cancel a booking
router.post('/:type/:bookingId/cancel',
    // Validate bookingId format if possible
    handleValidationErrors, // Add validation if needed
    asyncHandler(bookingController.cancelBooking)
);


module.exports = router;
