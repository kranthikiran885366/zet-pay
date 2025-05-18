
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
// GET /api/bookings/:type/search - Search for bookings (bus, flight, train, movie, event, marriage, car, bike)
router.get('/:type/search',
    param('type').isIn(['bus', 'flight', 'train', 'movie', 'event', 'marriage', 'car', 'bike']).withMessage('Invalid booking type.'),
    query('city').optional().isString().trim(),
    query('date').optional().isISO8601().toDate().withMessage('Invalid date format.'),
    query('guests').if(param('type').equals('marriage')).optional().isString(),
    query('hallType').if(param('type').equals('marriage')).optional().isString(),
    query('hasParking').if(param('type').equals('marriage')).optional().isBoolean(),
    query('cateringAvailable').if(param('type').equals('marriage')).optional().isBoolean(),
    query('decorationIncluded').if(param('type').equals('marriage')).optional().isBoolean(),
    // Add more query params for car/bike search if needed
    handleValidationErrors,
    asyncHandler(bookingController.searchBookings)
);

// GET /api/bookings/:type/:id/details - Get details for a specific item
router.get('/:type/:id/details',
    param('type').isIn(['bus', 'flight', 'train', 'movie', 'event', 'marriage', 'car', 'bike']).withMessage('Invalid booking type.'),
    param('id').isString().trim().notEmpty().withMessage('Item ID is required.'),
    handleValidationErrors,
    asyncHandler(bookingController.getBookingDetails)
);

// --- Generic Booking Confirmation & Cancellation ---
// POST /api/bookings/:type - Confirm a booking (generic for some types like movie, bus, car, bike)
router.post('/:type',
    param('type').isIn(['bus', 'flight', 'train', 'movie', 'event', 'car', 'bike']).withMessage('Invalid booking type for this endpoint. Use specific endpoint for marriage.'),
    body('totalAmount').isNumeric().toFloat().isFloat({ min: 0 }).withMessage('Valid total amount required.'), // Allow 0 for free bookings
    body('providerId').optional().isString().trim(), // Or use vehicleId for car/bike
    body('selection').optional().isObject().withMessage('Booking selection details required.'),
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']),
    body('passengerDetails').optional().isObject(),
    body('passengerDetails.name').optional().isString().trim(),
    body('passengerDetails.email').optional().isEmail().normalizeEmail(),
    body('passengerDetails.phone').optional().isMobilePhone('any'),
    // Car/Bike specific fields
    body('vehicleId').if(body => ['car', 'bike'].includes(req.params.type)).optional().isString().trim(),
    body('pickupDate').if(body => ['car', 'bike'].includes(req.params.type)).optional().isISO8601().toDate(),
    body('dropoffDate').if(body => ['car', 'bike'].includes(req.params.type)).optional().isISO8601().toDate(),
    body('rentalDuration').if(body => ['bike'].includes(req.params.type)).optional().isIn(['hour', 'day']),
    handleValidationErrors,
    asyncHandler(bookingController.confirmBooking)
);

// POST /api/bookings/:type/:bookingId/cancel - Cancel a booking
router.post('/:type/:bookingId/cancel',
    param('type').isIn(['bus', 'flight', 'train', 'movie', 'event', 'marriage', 'car', 'bike']).withMessage('Invalid booking type.'),
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
    body('userContact').isMobilePhone('any').withMessage('Valid user contact required.'),
    body('userEmail').isEmail().normalizeEmail().withMessage('Valid user email required.'),
    body('specialRequests').optional().isString().trim().isLength({ max: 500 }),
    body('totalAmount').optional().isNumeric().toFloat().isFloat({ min: 0 }).withMessage('Valid total amount or booking fee required.'),
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'),
    body('selectedAddons').optional().isObject(), // For catering, decor IDs
    body('appliedPromoCode').optional().isString().trim(),
    handleValidationErrors,
    asyncHandler(bookingController.confirmMarriageVenueBooking)
);


module.exports = router;

    