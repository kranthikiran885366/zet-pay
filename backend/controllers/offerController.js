// backend/controllers/offerController.js
const offerService = require('../services/offers'); // Assuming service is in ../services/offers

// Get Active Offers (non-user specific for now)
exports.getActiveOffers = async (req, res, next) => {
    // TODO: Potentially add filtering based on user segment or location if needed
    const offers = await offerService.getActiveOffers();
    res.status(200).json(offers);
};

// Get Offer Details
exports.getOfferDetails = async (req, res, next) => {
    const { offerId } = req.params;
    const offer = await offerService.getOfferDetails(offerId);
    if (!offer) {
        res.status(404);
        throw new Error('Offer not found.');
    }
    res.status(200).json(offer);
};

// Claim Offer
exports.claimOffer = async (req, res, next) => {
    const userId = req.user.uid;
    const { offerId } = req.params;
    // Service handles checking eligibility and marking as claimed
    const success = await offerService.claimOffer(userId, offerId);
    if (success) {
        res.status(200).json({ success: true, message: 'Offer claimed successfully.' });
    } else {
        // If claimOffer returns false without throwing (adjust service if needed)
        res.status(400); // Bad request (e.g., already claimed, ineligible)
        throw new Error("Failed to claim offer. It might be already claimed or you might not be eligible.");
    }
};


// Get User-Specific Scratch Cards
exports.getScratchCards = async (req, res, next) => {
    const userId = req.user.uid;
    const cards = await offerService.getScratchCards(userId);
    res.status(200).json(cards);
};

// Scratch a Card
exports.scratchCard = async (req, res, next) => {
    const userId = req.user.uid;
    const { cardId } = req.params;
    // Service handles the logic of scratching, reward generation, and wallet update
    const result = await offerService.scratchCard(userId, cardId);
    res.status(200).json(result); // Return the updated card data
};

// Get Loyalty Status
exports.getLoyaltyStatus = async (req, res, next) => {
    const userId = req.user.uid;
    const status = await offerService.getLoyaltyStatus(userId);
    res.status(200).json(status);
};

// Get Referral Status
exports.getReferralStatus = async (req, res, next) => {
    const userId = req.user.uid;
    const status = await offerService.getReferralStatus(userId);
    res.status(200).json(status);
};
