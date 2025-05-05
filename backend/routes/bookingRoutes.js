// backend/routes/bookingRoutes.js
const express = require('express');
const { query, body, param, validationResult } = require('express-validator'); // Added param
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
    // Example validation: ensure 'type' is a supported value
    param('type').isIn(['bus', 'flight', 'train', 'movie', 'event']).withMessage('Invalid booking type.'),
    // Add specific query param validations based on type if needed
    query('city').if(param('type').equals('movie')).isString().trim().notEmpty().withMessage('City is required for movie search.'),
    query('date').if(param('type').equals('movie')).optional().isISO8601().toDate().withMessage('Invalid date format.'),
    // Add validations for other types like from/to/date for bus/train/flight
    handleValidationErrors,
    asyncHandler(bookingController.searchBookings)
);

// GET /api/bookings/:type/:id/details - Get details for a specific item (e.g., seat layout, showtimes)
router.get('/:type/:id/details',
    param('type').isIn(['bus', 'flight', 'train', 'movie', 'event']).withMessage('Invalid booking type.'),
    param('id').isString().trim().notEmpty().withMessage('Item ID is required.'),
    // Add specific query param validations based on type if needed
    query('cinemaId').if(param('type').equals('movie')).optional().isString().trim(),
    query('date').if(param('type').equals('movie')).optional().isISO8601().toDate(),
    handleValidationErrors,
    asyncHandler(bookingController.getBookingDetails)
);

// POST /api/bookings/:type - Confirm a booking
router.post('/:type',
    param('type').isIn(['bus', 'flight', 'train', 'movie', 'event']).withMessage('Invalid booking type.'),
    // Add validation for common booking fields
    body('totalAmount').isNumeric().toFloat().isFloat({ min: 0 }).withMessage('Valid total amount required.'),
    body('providerId').optional().isString().trim(),
    body('selection').isObject().withMessage('Booking selection details required.'), // Validate specific fields based on type if possible
    // Movie specific validation
    body('selection.movieId').if(param('type').equals('movie')).isString().notEmpty().withMessage('Movie ID required.'),
    body('selection.cinemaId').if(param('type').equals('movie')).isString().notEmpty().withMessage('Cinema ID required.'),
    body('selection.showtime').if(param('type').equals('movie')).isString().notEmpty().withMessage('Showtime required.'),
    body('selection.seats').if(param('type').equals('movie')).isArray({ min: 1 }).withMessage('At least one seat must be selected.'),
    // Bus specific validation
    body('selection.busId').if(param('type').equals('bus')).isString().notEmpty().withMessage('Bus ID required.'),
    body('selection.boardingPoint').if(param('type').equals('bus')).isString().notEmpty().withMessage('Boarding point required.'),
    body('selection.droppingPoint').if(param('type').equals('bus')).isString().notEmpty().withMessage('Dropping point required.'),
    body('selection.seats').if(param('type').equals('bus')).isArray({ min: 1 }).withMessage('At least one seat must be selected.'),
    // Add passenger details validation if needed across types
    body('passengerDetails').optional().isObject(),
    body('passengerDetails.name').optional().isString().trim().notEmpty(),
    body('passengerDetails.email').optional().isEmail().normalizeEmail(),
    body('passengerDetails.phone').optional().isMobilePhone('en-IN'), // Example
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']),
    handleValidationErrors,
    asyncHandler(bookingController.confirmBooking)
);

// POST /api/bookings/:type/:bookingId/cancel - Cancel a booking
router.post('/:type/:bookingId/cancel',
    param('type').isIn(['bus', 'flight', 'train', 'movie', 'event']).withMessage('Invalid booking type.'),
    param('bookingId').isString().trim().notEmpty().withMessage('Booking ID is required.'), // Validate bookingId format if possible
    handleValidationErrors,
    asyncHandler(bookingController.cancelBooking)
);


module.exports = router;

