// backend/routes/vaultRoutes.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const vaultController = require('../controllers/vaultController');
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

// All routes require authentication (applied in server.js or authMiddleware here)

// GET /api/vault/items - Get all vault items for the user
router.get('/items', asyncHandler(vaultController.getVaultItems));

// POST /api/vault/items - Add a new item to the vault (metadata only, file upload handled separately if needed)
router.post('/items',
    body('name').isString().trim().notEmpty().withMessage('Item name is required.'),
    body('type').isIn(['Ticket', 'Bill', 'Document', 'Plan', 'Other']).withMessage('Invalid item type.'),
    body('source').optional().isString().trim(),
    body('fileUrl').optional().isURL().withMessage('Invalid file URL.'), // If storing external links
    body('notes').optional().isString().trim(),
    handleValidationErrors,
    asyncHandler(vaultController.addVaultItem)
);

// GET /api/vault/items/:itemId - Get details of a specific vault item
router.get('/items/:itemId',
    param('itemId').isString().trim().notEmpty().withMessage('Item ID is required.'),
    handleValidationErrors,
    asyncHandler(vaultController.getVaultItemDetails)
);

// PUT /api/vault/items/:itemId - Update a vault item
router.put('/items/:itemId',
    param('itemId').isString().trim().notEmpty().withMessage('Item ID is required.'),
    body('name').optional().isString().trim().notEmpty(),
    body('type').optional().isIn(['Ticket', 'Bill', 'Document', 'Plan', 'Other']),
    body('source').optional().isString().trim(),
    body('fileUrl').optional({ checkFalsy: true }).isURL().withMessage('Invalid file URL.'),
    body('notes').optional({ checkFalsy: true }).isString().trim(),
    handleValidationErrors,
    asyncHandler(vaultController.updateVaultItem)
);

// DELETE /api/vault/items/:itemId - Delete a vault item
router.delete('/items/:itemId',
    param('itemId').isString().trim().notEmpty().withMessage('Item ID is required.'),
    handleValidationErrors,
    asyncHandler(vaultController.deleteVaultItem)
);

// POST /api/vault/upload-url - Get a signed URL for uploading a file to storage (if direct upload)
// router.post('/upload-url', asyncHandler(vaultController.getUploadUrl));


module.exports = router;
