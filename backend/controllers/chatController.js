// backend/controllers/chatController.js
const chatService = require('../services/chatService'); // Assuming service exists

// Initiate a new chat session or get an existing one
exports.initiateOrGetChatSession = async (req, res, next) => {
    const userId1 = req.user.uid; // Authenticated user
    const userId2 = req.params.recipientId; // The other participant

    if (userId1 === userId2) {
        res.status(400);
        return next(new Error("Cannot initiate chat with oneself."));
    }

    try {
        const session = await chatService.getOrCreateChatSession(userId1, userId2);
        res.status(200).json(session);
    } catch (error) {
        next(error);
    }
};

// Get message history for a chat session
exports.getChatMessages = async (req, res, next) => {
    const userId = req.user.uid;
    const { chatId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50; // Default limit
    const beforeTimestamp = req.query.before ? new Date(req.query.before) : undefined;

    try {
        // Service should verify user is part of this chat
        const messages = await chatService.getMessageHistory(chatId, userId, limit, beforeTimestamp);
        res.status(200).json(messages);
    } catch (error) {
        next(error);
    }
};

// Send a new message
exports.sendMessage = async (req, res, next) => {
    const senderId = req.user.uid;
    const { chatId } = req.params;
    const { text, imageUrl, type = 'text', receiverId } = req.body; // Assume receiverId is passed if needed by service

    if (!receiverId) {
         res.status(400);
         return next(new Error("Receiver ID is required to send a message."));
    }

    const messageData = {
        text,
        imageUrl,
        type, // 'text', 'image', 'payment_request', etc.
        // Add other message type specific data here (e.g., paymentDetails for 'payment_request')
    };

    try {
        // Service should verify sender is part of this chat
        const newMessage = await chatService.createMessage(chatId, senderId, receiverId, messageData);
        // chatService.createMessage should also handle WebSocket broadcast
        res.status(201).json(newMessage);
    } catch (error) {
        next(error);
    }
};

// Mark a message as read (placeholder/conceptual)
exports.markMessageAsRead = async (req, res, next) => {
    const userId = req.user.uid;
    const { chatId, messageId } = req.params;
    try {
        // TODO: Implement logic in chatService to update read status and notify via WebSocket
        console.log(`User ${userId} marking message ${messageId} in chat ${chatId} as read (Not Implemented)`);
        res.status(200).json({ success: true, message: "Message read status updated (simulated)." });
    } catch (error) {
        next(error);
    }
};
