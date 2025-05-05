// backend/controllers/cardsController.js
const cardService = require('../services/cards'); // Assuming service is in ../services/cards

// Get Saved Cards
exports.getSavedCards = async (req, res, next) => {
    const userId = req.user.uid;
    const cards = await cardService.getSavedCards(userId);
    res.status(200).json(cards);
};

// Add New Card (Tokenization happens in service/backend)
exports.addCard = async (req, res, next) => {
    const userId = req.user.uid;
    // Extract card details from body - CVV should only be used for tokenization, not stored
    const { cardNumber, expiryMonth, expiryYear, cvv, cardHolderName, cardType } = req.body;

    const cardMetadata = { cardNumber, expiryMonth, expiryYear, cvv, cardHolderName, cardType };

    // Service handles tokenization with gateway and saves only non-sensitive metadata
    const savedCard = await cardService.addCard(userId, cardMetadata);

    res.status(201).json(savedCard); // Return only non-sensitive metadata
};

// Delete Card
exports.deleteCard = async (req, res, next) => {
    const userId = req.user.uid;
    const { cardId } = req.params;

    await cardService.deleteCard(userId, cardId); // Service handles logic and checks

    res.status(200).json({ success: true, message: 'Card deleted successfully.' });
};

// Set Primary Card
exports.setPrimaryCard = async (req, res, next) => {
    const userId = req.user.uid;
    const { cardId } = req.params;

    await cardService.setPrimaryCard(userId, cardId); // Service handles logic

    res.status(200).json({ success: true, message: 'Primary card updated successfully.' });
};

