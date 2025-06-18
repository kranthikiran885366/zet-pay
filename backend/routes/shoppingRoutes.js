
// backend/routes/shoppingRoutes.js
const express = require('express');
const { query, body, param, validationResult } = require('express-validator');
const shoppingController = require('../controllers/shoppingController');
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

// --- Public Routes (Products & Categories) ---

// GET /api/shopping/categories - Get all shopping categories
router.get('/categories', asyncHandler(shoppingController.getCategories));

// GET /api/shopping/products - Get products (optionally by category or search term)
router.get('/products',
    query('categoryId').optional().isString().trim(),
    query('searchTerm').optional().isString().trim(),
    handleValidationErrors,
    asyncHandler(shoppingController.getProducts)
);

// GET /api/shopping/products/:productId - Get details of a specific product
router.get('/products/:productId',
    param('productId').isString().trim().notEmpty().withMessage('Product ID is required.'),
    handleValidationErrors,
    asyncHandler(shoppingController.getProductDetails)
);


// --- Authenticated Routes (Orders, Cart, Wishlist - Conceptual) ---

// POST /api/shopping/orders - Place a new order
router.post('/orders',
    authMiddleware,
    body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item.'),
    body('items.*.productId').isString().notEmpty().withMessage('Product ID is required for each item.'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Item quantity must be at least 1.'),
    body('items.*.price').isNumeric().withMessage('Item price at purchase is required.'), // Price at time of adding to cart
    body('totalAmount').isNumeric().isFloat({ gt: 0 }).withMessage('Valid total amount is required.'),
    body('shippingAddress').isObject().withMessage('Shipping address object is required.'), // Detailed validation for address fields needed
    body('shippingAddress.line1').isString().notEmpty().withMessage('Address line 1 is required.'),
    body('shippingAddress.city').isString().notEmpty().withMessage('City is required.'),
    body('shippingAddress.pincode').isPostalCode('IN').withMessage('Valid Indian pincode required.'),
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'),
    handleValidationErrors,
    asyncHandler(shoppingController.placeOrder) // Changed from placeMockOrder
);

// GET /api/shopping/orders - Get user's order history (Conceptual)
router.get('/orders', authMiddleware, asyncHandler(shoppingController.getOrderHistory));

// GET /api/shopping/orders/:orderId - Get details of a specific order (Conceptual)
router.get('/orders/:orderId',
    authMiddleware,
    param('orderId').isString().trim().notEmpty().withMessage('Order ID is required.'),
    handleValidationErrors,
    asyncHandler(shoppingController.getOrderDetails)
);

// TODO: Add routes for Cart and Wishlist management if needed
// e.g., /api/shopping/cart (GET, POST, PUT, DELETE)
// e.g., /api/shopping/wishlist (GET, POST, DELETE)

module.exports = router;
