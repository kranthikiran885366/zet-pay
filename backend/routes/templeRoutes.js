const express = require('express');
const { query, body, validationResult, param } = require('express-validator');
const templeController = require('../controllers/templeController');
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

// --- Darshan ---
// GET /api/temple/darshan/slots?templeId=...&date=... - Search for darshan slots
router.get('/darshan/slots',
    query('templeId').isString().trim().notEmpty().withMessage('Temple ID required.'),
    query('date').isISO8601().withMessage('Invalid date format (YYYY-MM-DD).'),
    handleValidationErrors,
    asyncHandler(templeController.searchDarshanSlots)
);

// POST /api/temple/darshan/book - Book a darshan slot (requires auth)
router.post('/darshan/book',
    body('templeId').isString().trim().notEmpty(),
    body('date').isISO8601(),
    body('slotTime').isString().trim().notEmpty(),
    body('quota').isString().trim().notEmpty(),
    body('persons').isInt({ min: 1 }).withMessage('Number of persons must be at least 1.'),
    body('totalAmount').optional().isNumeric().toFloat().isFloat({ min: 0 }),
    handleValidationErrors,
    asyncHandler(templeController.bookDarshanSlot)
);

// --- Virtual Pooja ---
// GET /api/temple/pooja/list?templeId=... - Get list of available virtual poojas
router.get('/pooja/list',
    query('templeId').isString().trim().notEmpty().withMessage('Temple ID required.'),
    handleValidationErrors,
    asyncHandler(templeController.getAvailablePoojas)
);

// POST /api/temple/pooja/book - Book a virtual pooja (requires auth)
router.post('/pooja/book',
     body('templeId').isString().trim().notEmpty(),
     body('poojaId').isString().trim().notEmpty(),
     body('date').isISO8601(),
     body('devoteeName').isString().trim().notEmpty(),
     body('amount').isNumeric({ min: 0 }),
     body('gotra').optional().isString().trim(),
     handleValidationErrors,
    asyncHandler(templeController.bookVirtualPooja)
);

// --- Prasadam ---
// GET /api/temple/prasadam/list?templeId=... - Get list of available prasadam
router.get('/prasadam/list',
    query('templeId').isString().trim().notEmpty().withMessage('Temple ID required.'),
    handleValidationErrors,
    asyncHandler(templeController.getAvailablePrasadam)
);

// POST /api/temple/prasadam/order - Place an order for prasadam (requires auth)
router.post('/prasadam/order',
    body('templeId').isString().trim().notEmpty(),
    body('cartItems').isArray({ min: 1 }).withMessage('Cart must contain at least one item.'),
    body('cartItems.*.id').isString().trim().notEmpty().withMessage('Item ID required.'),
    body('cartItems.*.quantity').isInt({ min: 1 }).withMessage('Item quantity must be at least 1.'),
    body('totalAmount').isNumeric({ gt: 0 }).withMessage('Total amount must be positive.'),
    body('deliveryAddress').isObject().withMessage('Delivery address object is required.'), // Assuming address is an object
    body('deliveryAddress.line1').isString().trim().notEmpty().withMessage('Address Line 1 required.'),
    body('deliveryAddress.city').isString().trim().notEmpty().withMessage('City required.'),
    body('deliveryAddress.pincode').isPostalCode('IN').withMessage('Valid Pincode required.'),
    handleValidationErrors,
    asyncHandler(templeController.orderPrasadam)
);

// --- Donation ---
// POST /api/temple/donate - Make a donation (requires auth)
router.post('/donate',
    body('templeId').isString().trim().notEmpty().withMessage('Temple ID required.'),
    body('amount').isNumeric({ gt: 0 }).withMessage('Donation amount must be positive.'),
    body('scheme').optional().isString().trim(),
    body('donorName').optional().isString().trim(),
    body('panNumber').optional({ checkFalsy: true }).isAlphanumeric().isLength({ min: 10, max: 10 }).withMessage('Invalid PAN format.'),
    body('isAnonymous').optional().isBoolean(),
    // Conditional validation: donorName is required if isAnonymous is not true
     body().custom((value, { req }) => {
        if (!req.body.isAnonymous && !req.body.donorName) {
          throw new Error('Donor name required unless donating anonymously.');
        }
        return true;
     }),
    handleValidationErrors,
    asyncHandler(templeController.donateToTemple)
);

// --- User Bookings ---
// GET /api/temple/my-bookings - Get user's temple related bookings (darshan, pooja)
router.get('/my-bookings', asyncHandler(templeController.getMyTempleBookings));

// --- Group Visit Request ---
router.post('/group-visit',
    body('templeId').isString().trim().notEmpty(),
    body('visitDate').isISO8601().toDate(),
    body('numberOfPersons').isInt({ min: 2 }).withMessage('Group size must be at least 2.'), // Group should have > 1
    body('groupLeaderName').isString().trim().notEmpty(),
    body('groupLeaderMobile').isMobilePhone('en-IN').withMessage('Valid Indian mobile number required.'),
    body('groupLeaderEmail').isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('specialRequests').optional().isString().trim(),
    handleValidationErrors,
    asyncHandler(templeController.requestGroupVisit) // Ensure controller exists
);

// --- Temple Info / Live Status ---
router.get('/info',
    query('templeId').isString().trim().notEmpty().withMessage('Temple ID required.'),
    handleValidationErrors,
    asyncHandler(templeController.getTempleInfo) // Ensure controller exists
);

router.get('/live-url',
    query('templeId').isString().trim().notEmpty().withMessage('Temple ID required.'),
    handleValidationErrors,
    asyncHandler(templeController.getLiveDarshanUrl) // Ensure controller exists
);

router.get('/audio',
    query('templeId').optional().isString().trim(), // Temple ID might be optional
    query('category').optional().isIn(['Aarti', 'Mantra', 'Bhajan']),
    handleValidationErrors,
    asyncHandler(templeController.getTempleAudio) // Ensure controller exists
);

router.get('/events',
    query('templeId').optional().isString().trim(), // Temple ID might be optional
    handleValidationErrors,
    asyncHandler(templeController.getTempleEvents) // Ensure controller exists
);

router.get('/accommodation',
     query('templeId').isString().trim().notEmpty().withMessage('Temple ID required.'),
     handleValidationErrors,
     asyncHandler(templeController.getNearbyAccommodation) // Ensure controller exists
);


module.exports = router;
