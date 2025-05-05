// backend/routes/entertainmentRoutes.js
const express = require('express');
const { query, body, param, validationResult } = require('express-validator');
const entertainmentController = require('../controllers/entertainmentController');
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

// --- Movies ---
// GET /api/entertainment/movies/search?city=...&date=... - Search movies
router.get('/movies/search',
    query('city').isString().trim().notEmpty().withMessage('City is required.'),
    query('date').optional().isISO8601().toDate().withMessage('Invalid date format.'),
    handleValidationErrors,
    asyncHandler(entertainmentController.searchMovies)
);

// GET /api/entertainment/movies/:movieId/details?city=...&date=... - Get movie details & showtimes
router.get('/movies/:movieId/details',
    param('movieId').isString().trim().notEmpty().withMessage('Movie ID is required.'),
    query('city').isString().trim().notEmpty().withMessage('City is required.'),
    query('date').optional().isISO8601().toDate().withMessage('Invalid date format.'),
    handleValidationErrors,
    asyncHandler(entertainmentController.getMovieDetails)
);

// POST /api/entertainment/movies/book - Book movie tickets
router.post('/movies/book',
    body('movieId').isString().trim().notEmpty().withMessage('Movie ID required.'),
    body('cinemaId').isString().trim().notEmpty().withMessage('Cinema ID required.'),
    body('showtime').isString().trim().notEmpty().withMessage('Showtime required.'),
    body('seats').isArray({ min: 1 }).withMessage('At least one seat must be selected.'),
    body('seats.*').isString().trim().notEmpty().withMessage('Invalid seat ID.'), // Validate individual seats
    body('totalAmount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid total amount required.'), // Ensure amount > 0
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'),
    body('movieName').optional().isString().trim(), // Optional for logging/display
    body('cinemaName').optional().isString().trim(), // Optional for logging/display
    handleValidationErrors,
    asyncHandler(entertainmentController.bookMovieTickets) // Use specific controller
);

// --- Events (Generic/Comedy/Sports) ---
// GET /api/entertainment/events/search?city=...&category=... - Search events
router.get('/events/search',
    query('city').isString().trim().notEmpty().withMessage('City is required.'),
    query('category').optional().isIn(['Comedy', 'Sports', 'Music', 'Workshop']).withMessage('Invalid category.'),
    query('date').optional().isISO8601().toDate(),
    handleValidationErrors,
    asyncHandler(entertainmentController.searchEvents)
);

// GET /api/entertainment/events/:eventId/details - Get event details
router.get('/events/:eventId/details',
    param('eventId').isString().trim().notEmpty().withMessage('Event ID is required.'),
    handleValidationErrors,
    asyncHandler(entertainmentController.getEventDetails)
);

// POST /api/entertainment/events/book - Book event tickets
router.post('/events/book',
    body('eventId').isString().trim().notEmpty().withMessage('Event ID required.'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
    body('totalAmount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid total amount required.'),
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'),
    body('eventName').optional().isString().trim(), // Optional for logging
    handleValidationErrors,
    asyncHandler(entertainmentController.bookEventTickets)
);

// --- Gaming Vouchers ---
// GET /api/entertainment/vouchers/gaming/brands - Get list of gaming platforms/brands
router.get('/vouchers/gaming/brands', asyncHandler(entertainmentController.getGamingVoucherBrands));

// GET /api/entertainment/vouchers/gaming/denominations?brandId=... - Get denominations for a brand
router.get('/vouchers/gaming/denominations',
    query('brandId').isString().trim().notEmpty().withMessage('Brand ID is required.'),
    handleValidationErrors,
    asyncHandler(entertainmentController.getGamingVoucherDenominations)
);

// POST /api/entertainment/vouchers/gaming/purchase - Purchase a gaming voucher
router.post('/vouchers/gaming/purchase',
    body('brandId').isString().trim().notEmpty().withMessage('Brand ID required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid amount required.'),
    body('playerId').optional({ checkFalsy: true }).isString().trim(), // Optional player ID, allow empty string if provided but falsy
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'),
    body('brandName').optional().isString().trim(), // Optional for logging
    handleValidationErrors,
    asyncHandler(entertainmentController.purchaseGamingVoucher)
);

// --- OTT Subscriptions ---
// GET /api/entertainment/subscriptions/billers - Get OTT billers (reuse /recharge/billers?type=Subscription ?)
// POST /api/entertainment/subscriptions/pay - Pay for subscription (reuse /bills/subscription ?)
// For now, assume these reuse existing bill payment/recharge routes.

module.exports = router;
