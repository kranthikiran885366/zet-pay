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
router.get('/movies/search',
    query('city').isString().trim().notEmpty().withMessage('City is required.'),
    query('date').optional().isISO8601().toDate().withMessage('Invalid date format.'),
    handleValidationErrors,
    asyncHandler(entertainmentController.searchMovies)
);

router.get('/movies/:movieId/details',
    param('movieId').isString().trim().notEmpty().withMessage('Movie ID is required.'),
    query('city').isString().trim().notEmpty().withMessage('City is required.'),
    query('date').optional().isISO8601().toDate().withMessage('Invalid date format.'),
    handleValidationErrors,
    asyncHandler(entertainmentController.getMovieDetails)
);

router.post('/movies/book',
    body('movieId').isString().trim().notEmpty().withMessage('Movie ID required.'),
    body('cinemaId').isString().trim().notEmpty().withMessage('Cinema ID required.'),
    body('showtime').isString().trim().notEmpty().withMessage('Showtime required.'),
    body('seats').isArray({ min: 1 }).withMessage('At least one seat must be selected.'),
    body('seats.*').isString().trim().notEmpty().withMessage('Invalid seat ID.'), 
    body('totalAmount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid total amount required.'), 
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'),
    body('movieName').optional().isString().trim(), 
    body('cinemaName').optional().isString().trim(), 
    handleValidationErrors,
    asyncHandler(entertainmentController.bookMovieTickets) 
);

// --- Events (Generic/Comedy/Sports) ---
router.get('/events/search',
    query('city').isString().trim().notEmpty().withMessage('City is required.'),
    query('category').optional().isIn(['Comedy', 'Sports', 'Music', 'Workshop']).withMessage('Invalid category.'),
    query('date').optional().isISO8601().toDate(),
    handleValidationErrors,
    asyncHandler(entertainmentController.searchEvents)
);

router.get('/events/:eventId/details',
    param('eventId').isString().trim().notEmpty().withMessage('Event ID is required.'),
    handleValidationErrors,
    asyncHandler(entertainmentController.getEventDetails)
);

router.post('/events/book',
    body('eventId').isString().trim().notEmpty().withMessage('Event ID required.'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
    body('totalAmount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid total amount required.'),
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'),
    body('eventName').optional().isString().trim(), 
    handleValidationErrors,
    asyncHandler(entertainmentController.bookEventTickets)
);

// --- Gaming Vouchers ---
router.get('/vouchers/gaming/brands', asyncHandler(entertainmentController.getGamingVoucherBrands));

router.get('/vouchers/gaming/denominations',
    query('brandId').isString().trim().notEmpty().withMessage('Brand ID is required.'),
    handleValidationErrors,
    asyncHandler(entertainmentController.getGamingVoucherDenominations)
);

// Common endpoint for voucher purchase, differentiate by voucherType in payload
router.post('/vouchers/gaming/purchase',
    body('brandId').isString().trim().notEmpty().withMessage('Brand ID required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid amount required.'),
    body('playerId').optional({ checkFalsy: true }).isString().trim(), 
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'), // For consistency, though backend might default to wallet
    body('billerName').optional().isString().trim(),
    body('voucherType').default('gaming').isIn(['gaming']).withMessage('Invalid voucher type for this endpoint.'), // Specific to gaming
    handleValidationErrors,
    asyncHandler(entertainmentController.purchaseVoucher) // Use generic purchaseVoucher
);

// --- Digital Vouchers (e.g., Google Play, App Store) ---
// Note: This might be a separate route file in a larger app, or use query params to /vouchers.
// Using a distinct path for clarity for now.
router.post('/vouchers/digital/purchase',
    body('brandId').isString().trim().notEmpty().withMessage('Brand ID required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid amount required.'),
    body('recipientMobile').optional({ checkFalsy: true }).isMobilePhone('any').withMessage('Invalid recipient mobile number.'), // Make sure to validate mobile number
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'),
    body('billerName').optional().isString().trim(),
    body('voucherType').default('digital').isIn(['digital']).withMessage('Invalid voucher type for this endpoint.'), // Specific to digital
    handleValidationErrors,
    asyncHandler(entertainmentController.purchaseVoucher) // Use generic purchaseVoucher
);


module.exports = router;