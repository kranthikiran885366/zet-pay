// backend/routes/contactsRoutes.js
const express = require('express');
const { body } = require('express-validator');
const contactsController = require('../controllers/contactsController');
const router = express.Router();

// All routes require authentication (applied in server.js)

// GET /api/contacts - Get all contacts for the current user (optionally filtered by query)
router.get('/', contactsController.getContacts);

// POST /api/contacts - Add a new contact/payee
router.post('/',
    body('name').trim().notEmpty().withMessage('Payee name is required.'),
    body('identifier').trim().notEmpty().withMessage('Identifier (Mobile/UPI/Account) is required.'),
    body('type').isIn(['mobile', 'bank', 'dth', 'fastag']).withMessage('Invalid payee type.'),
    // Add optional validations for upiId, accountNumber etc.
    contactsController.addContact
);

// GET /api/contacts/:id - Get details of a specific contact
router.get('/:id', contactsController.getContactDetails);

// PUT /api/contacts/:id - Update an existing contact
router.put('/:id',
    body('name').optional().trim().notEmpty(),
    body('identifier').optional().trim().notEmpty(),
    body('type').optional().isIn(['mobile', 'bank', 'dth', 'fastag']),
    // Add more optional fields to update
    contactsController.updateContact
);

// DELETE /api/contacts/:id - Delete a contact
router.delete('/:id', contactsController.deleteContact);

module.exports = router;
