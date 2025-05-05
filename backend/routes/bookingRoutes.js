// backend/routes/bookingRoutes.js
const express = require('express');
const { query, body } = require('express-validator');
const bookingController = require('../controllers/bookingController');
const router = express.Router();

// All routes require authentication (applied in server.js)

// GET /api/bookings/:type/search - Search for bookings (bus, flight, train, movie, event)
router.get('/:type/search',
    // Add specific query param validations based on type if needed
    bookingController.searchBookings
);

// GET /api/bookings/:type/:id/details - Get details for a specific item (e.g., seat layout, showtimes)
router.get('/:type/:id/details',
    // Add specific query param validations based on type if needed
    bookingController.getBookingDetails
);

// POST /api/bookings/:type - Confirm a booking
router.post('/:type',
    // Add validation for common booking fields
    body('totalAmount').isNumeric().toFloat().isFloat({ min: 0 }).withMessage('Valid total amount required.'),
    body('providerId').optional().isString(),
    body('selection').isObject().withMessage('Booking selection details required.'), // Validate specific fields based on type if possible
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']),
    // Add specific body validations based on type if needed (e.g., passenger details for flights)
    bookingController.confirmBooking
);

// POST /api/bookings/:type/:bookingId/cancel - Cancel a booking
router.post('/:type/:bookingId/cancel',
    // Validate bookingId format if possible
    bookingController.cancelBooking
);


module.exports = router;
