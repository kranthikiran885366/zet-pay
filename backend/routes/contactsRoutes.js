// backend/routes/contactsRoutes.js
const express = require('express');
const { body, validationResult, param } = require('express-validator'); // Added param for ID validation
const contactsController = require('../controllers/contactsController');
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

// GET /api/contacts - Get all contacts for the current user (optionally filtered by query)
router.get('/', asyncHandler(contactsController.getContacts));

// POST /api/contacts - Add a new contact/payee
router.post('/',
    body('name').trim().notEmpty().withMessage('Payee name is required.'),
    body('identifier').trim().notEmpty().withMessage('Identifier (Mobile/UPI/Account) is required.'),
    // Relax type validation slightly or add more specific types if needed
    body('type').isString().trim().notEmpty().withMessage('Payee type is required.'), // Ensure type is present
    // Add optional validations for upiId, accountNumber etc.
    body('upiId').optional({ checkFalsy: true }).trim().contains('@').withMessage('Invalid UPI ID format.'),
    body('accountNumber').optional({ checkFalsy: true }).trim().isNumeric().isLength({ min: 9, max: 18 }).withMessage('Invalid account number format.'),
    body('ifsc').optional({ checkFalsy: true }).trim().isAlphanumeric().isLength({ min: 11, max: 11 }).withMessage('Invalid IFSC code format.'),
    handleValidationErrors,
    asyncHandler(contactsController.addContact)
);

// GET /api/contacts/:id - Get details of a specific contact
router.get('/:id',
    param('id').isMongoId().withMessage('Invalid contact ID format.'), // Assuming MongoDB ObjectIDs
    handleValidationErrors,
    asyncHandler(contactsController.getContactDetails)
);

// PUT /api/contacts/:id - Update an existing contact
router.put('/:id',
    param('id').isMongoId().withMessage('Invalid contact ID format.'), // Validate ID in URL
    body('name').optional().trim().notEmpty(),
    body('identifier').optional().trim().notEmpty(),
    body('type').optional().isString().trim().notEmpty(), // Ensure type is present if provided
    // Add more optional fields to update
    body('upiId').optional({ checkFalsy: true }).trim().contains('@').withMessage('Invalid UPI ID format.'),
    body('accountNumber').optional({ checkFalsy: true }).trim().isNumeric().isLength({ min: 9, max: 18 }).withMessage('Invalid account number format.'),
    body('ifsc').optional({ checkFalsy: true }).trim().isAlphanumeric().isLength({ min: 11, max: 11 }).withMessage('Invalid IFSC code format.'),
    body('isFavorite').optional().isBoolean(),
    handleValidationErrors,
    asyncHandler(contactsController.updateContact)
);

// DELETE /api/contacts/:id - Delete a contact
router.delete('/:id',
    param('id').isMongoId().withMessage('Invalid contact ID format.'), // Validate ID in URL
    handleValidationErrors,
    asyncHandler(contactsController.deleteContact)
);

module.exports = router;
