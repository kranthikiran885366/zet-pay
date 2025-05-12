// backend/routes/chatRoutes.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const chatController = require('../controllers/chatController');
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

// All chat routes require authentication (applied in server.js)

// POST /api/chat/initiate/:recipientId - Initiate a chat or get existing session
router.post('/initiate/:recipientId',
    param('recipientId').isString().trim().notEmpty().withMessage('Recipient ID is required.'),
    handleValidationErrors,
    asyncHandler(chatController.initiateOrGetChatSession)
);

// GET /api/chat/:chatId/messages - Get message history for a chat session
router.get('/:chatId/messages',
    param('chatId').isString().trim().notEmpty().withMessage('Chat ID is required.'),
    // Optional query params for pagination (e.g., limit, beforeTimestamp)
    handleValidationErrors,
    asyncHandler(chatController.getChatMessages)
);

// POST /api/chat/:chatId/messages - Send a new message
router.post('/:chatId/messages',
    param('chatId').isString().trim().notEmpty().withMessage('Chat ID is required.'),
    body('text').optional({ checkFalsy: true }).isString().trim().withMessage('Message text must be a string.'),
    body('imageUrl').optional({ checkFalsy: true }).isURL().withMessage('Invalid image URL.'),
    // Add validation for other message types (voice, payment_request, etc.)
    // Ensure at least one content field is present
    body().custom((value, { req }) => {
        if (!req.body.text && !req.body.imageUrl /* && !req.body.voiceUrl etc. */) {
          throw new Error('Message content (text, image, etc.) is required.');
        }
        return true;
    }),
    handleValidationErrors,
    asyncHandler(chatController.sendMessage)
);

// PUT /api/chat/:chatId/messages/:messageId/read - Mark a message as read (conceptual)
router.put('/:chatId/messages/:messageId/read',
    param('chatId').isString().trim().notEmpty(),
    param('messageId').isString().trim().notEmpty(),
    handleValidationErrors,
    asyncHandler(chatController.markMessageAsRead) // Placeholder
);


module.exports = router;
