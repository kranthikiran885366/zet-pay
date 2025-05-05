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
    // Validation similar to bookingRoutes
    body('movieId').isString().trim().notEmpty(),
    body('cinemaId').isString().trim().notEmpty(),
    body('showtime').isString().trim().notEmpty(),
    body('seats').isArray({ min: 1 }),
    body('totalAmount').isNumeric().toFloat().isFloat({ min: 0 }),
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']),
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
    body('eventId').isString().trim().notEmpty(),
    body('quantity').isInt({ min: 1 }),
    body('totalAmount').isNumeric().toFloat().isFloat({ min: 0 }),
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']),
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
    body('brandId').isString().trim().notEmpty(),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }),
    body('playerId').optional().isString().trim(), // Optional player ID
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']),
    handleValidationErrors,
    asyncHandler(entertainmentController.purchaseGamingVoucher)
);

// --- OTT Subscriptions ---
// GET /api/entertainment/subscriptions/billers - Get OTT billers (reuse /recharge/billers?type=Subscription ?)
// POST /api/entertainment/subscriptions/pay - Pay for subscription (reuse /bills/subscription ?)
// For now, assume these reuse existing bill payment/recharge routes.

module.exports = router;
