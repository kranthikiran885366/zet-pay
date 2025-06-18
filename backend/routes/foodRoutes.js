
// backend/routes/foodRoutes.js
const express = require('express');
const { query, body, param, validationResult } = require('express-validator');
const foodController = require('../controllers/foodController');
const authMiddleware = require('../middleware/authMiddleware');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        res.status(400);
        return next(new Error(`Validation Failed: ${errorMessages}`));
    }
    next();
};

// All routes require authentication
router.use(authMiddleware);

// GET /api/food/restaurants/search - Search restaurants
router.get('/restaurants/search',
    query('location').optional().isString().trim(), // e.g., "Koramangala" or "lat,lon"
    query('cuisine').optional().isString().trim(),
    query('query').optional().isString().trim(), // Search by name or dish
    handleValidationErrors,
    asyncHandler(foodController.searchRestaurants)
);

// GET /api/food/restaurants/:restaurantId/menu - Get menu for a specific restaurant
router.get('/restaurants/:restaurantId/menu',
    param('restaurantId').isString().trim().notEmpty().withMessage('Restaurant ID is required.'),
    handleValidationErrors,
    asyncHandler(foodController.getRestaurantMenu)
);

// POST /api/food/orders/place - Place a food order
router.post('/orders/place',
    body('restaurantId').isString().trim().notEmpty().withMessage('Restaurant ID is required.'),
    body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item.'),
    body('items.*.itemId').isString().notEmpty().withMessage('Menu item ID is required.'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Item quantity must be at least 1.'),
    body('items.*.price').isNumeric().withMessage('Item price is required.'), // Price at time of adding to cart
    body('totalAmount').isNumeric().isFloat({ gt: 0 }).withMessage('Valid total amount is required.'),
    body('deliveryAddress').isObject().withMessage('Delivery address object is required.'),
    body('deliveryAddress.line1').isString().notEmpty().withMessage('Address line 1 is required.'),
    body('deliveryAddress.city').isString().notEmpty().withMessage('City is required.'),
    body('deliveryAddress.pincode').isPostalCode('IN').withMessage('Valid Indian pincode required.'),
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'),
    handleValidationErrors,
    asyncHandler(foodController.placeFoodOrder)
);

// GET /api/food/orders/:orderId - Get order status (conceptual)
router.get('/orders/:orderId',
    param('orderId').isString().trim().notEmpty().withMessage('Order ID is required.'),
    handleValidationErrors,
    asyncHandler(foodController.getFoodOrderStatus)
);

module.exports = router;
