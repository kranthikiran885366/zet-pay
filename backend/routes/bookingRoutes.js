// backend/routes/bookingRoutes.js
const express = require('express');
const { query, body, param, validationResult } = require('express-validator');
const bookingController = require('../controllers/bookingController');
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

// All routes require authentication (applied in server.js)

// --- Generic Booking Search & Details ---
// GET /api/bookings/:type/search - Search for bookings (bus, flight, train, movie, event, marriage)
router.get('/:type/search',
    param('type').isIn(['bus', 'flight', 'train', 'movie', 'event', 'marriage']).withMessage('Invalid booking type.'),
    query('city').optional().isString().trim(),
    query('date').optional().isISO8601().toDate().withMessage('Invalid date format.'),
    query('guests').if(param('type').equals('marriage')).optional().isString(),
    handleValidationErrors,
    asyncHandler(bookingController.searchBookings)
);

// GET /api/bookings/:type/:id/details - Get details for a specific item
router.get('/:type/:id/details',
    param('type').isIn(['bus', 'flight', 'train', 'movie', 'event', 'marriage']).withMessage('Invalid booking type.'),
    param('id').isString().trim().notEmpty().withMessage('Item ID is required.'),
    handleValidationErrors,
    asyncHandler(bookingController.getBookingDetails)
);

// --- Generic Booking Confirmation & Cancellation ---
// POST /api/bookings/:type - Confirm a booking (generic for some types like movie, bus)
router.post('/:type',
    param('type').isIn(['bus', 'flight', 'train', 'movie', 'event']).withMessage('Invalid booking type for this endpoint. Use specific endpoint for marriage.'),
    body('totalAmount').isNumeric().toFloat().isFloat({ min: 0 }).withMessage('Valid total amount required.'), // Allow 0 for free bookings
    body('providerId').optional().isString().trim(),
    body('selection').isObject().withMessage('Booking selection details required.'),
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']),
    // Added passengerDetails for generic booking
    body('passengerDetails').optional().isObject(),
    body('passengerDetails.name').optional().isString().trim(),
    body('passengerDetails.email').optional().isEmail().normalizeEmail(),
    body('passengerDetails.phone').optional().isMobilePhone('any'),
    handleValidationErrors,
    asyncHandler(bookingController.confirmBooking)
);

// POST /api/bookings/:type/:bookingId/cancel - Cancel a booking
router.post('/:type/:bookingId/cancel',
    param('type').isIn(['bus', 'flight', 'train', 'movie', 'event', 'marriage']).withMessage('Invalid booking type.'),
    param('bookingId').isString().trim().notEmpty().withMessage('Booking ID is required.'),
    handleValidationErrors,
    asyncHandler(bookingController.cancelBooking)
);


// --- Marriage Hall Specific Booking Confirmation ---
// POST /api/bookings/marriage/:venueId/book - Confirm a marriage venue booking
router.post('/marriage/:venueId/book',
    param('venueId').isString().trim().notEmpty().withMessage('Venue ID is required.'),
    body('venueName').isString().trim().notEmpty().withMessage('Venue name required.'),
    body('city').isString().trim().notEmpty().withMessage('City required.'),
    body('date').isISO8601().toDate().withMessage('Valid event date required.'),
    body('guestCount').optional().isString(),
    body('userName').isString().trim().notEmpty().withMessage('User name required.'),
    body('userContact').isMobilePhone('any').withMessage('Valid user contact required.'), // Validating mobile number
    body('userEmail').isEmail().normalizeEmail().withMessage('Valid user email required.'),
    body('specialRequests').optional().isString().trim().isLength({ max: 500 }),
    body('totalAmount').optional().isNumeric().toFloat().isFloat({ min: 0 }).withMessage('Valid total amount or booking fee required.'),
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'),
    handleValidationErrors,
    asyncHandler(bookingController.confirmMarriageVenueBooking)
);


module.exports = router;

