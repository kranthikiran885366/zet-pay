const express = require('express');
const offerController = require('../controllers/offerController');
const asyncHandler = require('../middleware/asyncHandler'); // Import asyncHandler
const router = express.Router();

// --- Public Routes ---
// GET /api/offers - Get active offers (public or user-specific if logic added)
router.get('/', asyncHandler(offerController.getActiveOffers));

// GET /api/offers/:offerId - Get details of a specific offer
router.get('/:offerId', asyncHandler(offerController.getOfferDetails));

// --- User-Specific Rewards ---
// Needs auth middleware applied before these routes in server.js

// POST /api/offers/:offerId/claim - Claim a specific offer
router.post('/:offerId/claim', asyncHandler(offerController.claimOffer)); // Added claim route

// GET /api/offers/rewards/scratch-cards - Get user's available scratch cards
router.get('/rewards/scratch-cards', asyncHandler(offerController.getScratchCards));

// POST /api/offers/rewards/scratch-cards/:cardId/scratch - Scratch a card
router.post('/rewards/scratch-cards/:cardId/scratch', asyncHandler(offerController.scratchCard));

// GET /api/offers/rewards/loyalty - Get user's loyalty status
router.get('/rewards/loyalty', asyncHandler(offerController.getLoyaltyStatus));

// GET /api/offers/rewards/referral - Get user's referral status
router.get('/rewards/referral', asyncHandler(offerController.getReferralStatus));

module.exports = router;
