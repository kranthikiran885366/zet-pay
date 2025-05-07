// backend/routes/shoppingRoutes.js
const express = require('express');
const { body, query, validationResult } = require('express-validator');
const shoppingController = require('../controllers/shoppingController');
const authMiddleware = require('../middleware/authMiddleware');
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

// --- Public Routes (Products & Categories) ---

// GET /api/shopping/categories - Get all shopping categories
router.get('/categories', asyncHandler(shoppingController.getCategories));

// GET /api/shopping/products - Get products (optionally by category)
router.get('/products',
    query('categoryId').optional().isString().trim(),
    handleValidationErrors,
    asyncHandler(shoppingController.getProducts)
);

// GET /api/shopping/products/:productId - Get details of a specific product
router.get('/products/:productId', asyncHandler(shoppingController.getProductDetails));


// --- Authenticated Routes (Orders) ---

// POST /api/shopping/orders - Place a new mock order
router.post('/orders',
    authMiddleware, // Requires user to be logged in
    body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item.'),
    body('items.*.productId').isString().notEmpty().withMessage('Product ID is required for each item.'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Item quantity must be at least 1.'),
    body('items.*.price').isNumeric().withMessage('Item price must be a number.'),
    body('totalAmount').isNumeric().isFloat({ gt: 0 }).withMessage('Valid total amount is required.'),
    // TODO: Add validation for shippingAddress, paymentMethod if implemented
    handleValidationErrors,
    asyncHandler(shoppingController.placeMockOrder)
);


module.exports = router;
