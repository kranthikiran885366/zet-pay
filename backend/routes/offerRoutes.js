
const express = require('express');
const offerController = require('../controllers/offerController');
const router = express.Router();

// GET /api/offers - Get active offers (public or user-specific if logic added)
router.get('/', offerController.getActiveOffers);

// GET /api/offers/:offerId - Get details of a specific offer
router.get('/:offerId', offerController.getOfferDetails);

// --- User-Specific Rewards ---
// Needs auth middleware applied before these routes in server.js

// GET /api/offers/rewards/scratch-cards - Get user's available scratch cards
router.get('/rewards/scratch-cards', offerController.getScratchCards);

// POST /api/offers/rewards/scratch-cards/:cardId/scratch - Scratch a card
router.post('/rewards/scratch-cards/:cardId/scratch', offerController.scratchCard);

// GET /api/offers/rewards/loyalty - Get user's loyalty status
// router.get('/rewards/loyalty', offerController.getLoyaltyStatus);

// GET /api/offers/rewards/referral - Get user's referral status
// router.get('/rewards/referral', offerController.getReferralStatus);

module.exports = router;
