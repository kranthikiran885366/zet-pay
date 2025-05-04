
const express = require('express');
const { query, body } = require('express-validator');
const templeController = require('../controllers/templeController');
const router = express.Router();

// --- Darshan ---
// GET /api/temple/darshan/slots?templeId=...&date=... - Search for darshan slots
router.get('/darshan/slots',
    query('templeId').isString().notEmpty(),
    query('date').isISO8601(), // Validate date format
    templeController.searchDarshanSlots
);

// POST /api/temple/darshan/book - Book a darshan slot (requires auth)
router.post('/darshan/book',
    body('templeId').isString().notEmpty(),
    body('date').isISO8601(),
    body('slotTime').isString().notEmpty(),
    body('quota').isString().notEmpty(),
    body('persons').isInt({ min: 1 }),
    body('totalAmount').optional().isNumeric(),
    templeController.bookDarshanSlot
);

// --- Virtual Pooja ---
// GET /api/temple/pooja/list?templeId=... - Get list of available virtual poojas
router.get('/pooja/list',
    query('templeId').isString().notEmpty(),
    templeController.getAvailablePoojas
);

// POST /api/temple/pooja/book - Book a virtual pooja (requires auth)
router.post('/pooja/book',
     body('templeId').isString().notEmpty(),
     body('poojaId').isString().notEmpty(),
     body('date').isISO8601(),
     body('devoteeName').isString().notEmpty(),
     body('amount').isNumeric({ min: 0 }),
     body('gotra').optional().isString(),
    templeController.bookVirtualPooja
);

// --- Prasadam ---
// GET /api/temple/prasadam/list?templeId=... - Get list of available prasadam
router.get('/prasadam/list',
    query('templeId').isString().notEmpty(),
    templeController.getAvailablePrasadam
);

// POST /api/temple/prasadam/order - Place an order for prasadam (requires auth)
router.post('/prasadam/order',
    body('templeId').isString().notEmpty(),
    body('cartItems').isArray({ min: 1 }),
    body('cartItems.*.id').isString().notEmpty(),
    body('cartItems.*.quantity').isInt({ min: 1 }),
    body('totalAmount').isNumeric({ gt: 0 }),
    body('deliveryAddress').isString().notEmpty(),
    templeController.orderPrasadam
);

// --- Donation ---
// POST /api/temple/donate - Make a donation (requires auth)
router.post('/donate',
    body('templeId').isString().notEmpty(),
    body('amount').isNumeric({ gt: 0 }),
    body('scheme').optional().isString(),
    body('donorName').optional().isString(),
    body('panNumber').optional().isString(), // Add validation if needed
    body('isAnonymous').optional().isBoolean(),
    templeController.donateToTemple
);

// --- User Bookings ---
// GET /api/temple/my-bookings - Get user's temple related bookings (darshan, pooja)
router.get('/my-bookings', templeController.getMyTempleBookings);


// Add routes for Info, Live Darshan etc. later if needed
// router.get('/info', templeController.getTempleInfo);
// router.get('/live-url', templeController.getLiveDarshanUrl);

module.exports = router;

    