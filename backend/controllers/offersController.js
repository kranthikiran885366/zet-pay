// backend/controllers/offerController.js
const offerService = require('../services/offers'); // Assuming service is in ../services/offers
const asyncHandler = require('../middleware/asyncHandler');

// Get Active Offers
exports.getActiveOffers = asyncHandler(async (req, res, next) => {
    // TODO: Potentially add filtering based on user segment or location if needed
    const offers = await offerService.getActiveOffers();
    res.status(200).json(offers);
});

// Get Offer Details
exports.getOfferDetails = asyncHandler(async (req, res, next) => {
    const { offerId } = req.params;
    const offer = await offerService.getOfferDetails(offerId);
    if (!offer) {
        res.status(404); // Set status before throwing
        throw new Error('Offer not found.');
    }
    res.status(200).json(offer);
});

// Claim Offer
exports.claimOffer = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid; // From authMiddleware
    const { offerId } = req.params;
    // Service handles checking eligibility and marking as claimed
    const success = await offerService.claimOffer(userId, offerId);
    if (success) {
        res.status(200).json({ success: true, message: 'Offer claimed successfully.' });
    }
    // If service throws an error (e.g., ineligible, already claimed), asyncHandler catches it.
});


// Get User-Specific Scratch Cards
exports.getScratchCards = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const cards = await offerService.getScratchCards(userId);
    res.status(200).json(cards);
});

// Scratch a Card
exports.scratchCard = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const { cardId } = req.params;
    // Service handles the logic of scratching, reward generation, and potentially wallet update trigger
    const result = await offerService.scratchCard(userId, cardId);
    // Convert timestamps for client if needed
    const clientResult = {
        ...result,
        expiryDate: result.expiryDate?.toDate ? result.expiryDate.toDate().toISOString() : result.expiryDate,
        createdAt: result.createdAt?.toDate ? result.createdAt.toDate().toISOString() : result.createdAt,
        scratchedAt: result.scratchedAt?.toDate ? result.scratchedAt.toDate().toISOString() : result.scratchedAt,
    };
    res.status(200).json(clientResult); // Return the updated card data
});

// Get Loyalty Status
exports.getLoyaltyStatus = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const status = await offerService.getLoyaltyStatus(userId);
     // Convert timestamps for client
     const clientStatus = {
         ...status,
         lastUpdated: status.lastUpdated?.toDate ? status.lastUpdated.toDate().toISOString() : status.lastUpdated,
     };
    res.status(200).json(clientStatus);
});

// Get Referral Status
exports.getReferralStatus = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const status = await offerService.getReferralStatus(userId);
    res.status(200).json(status);
});
