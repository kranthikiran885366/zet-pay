// backend/services/offers.js
const admin = require('../config/firebaseAdmin');
const db = admin.firestore();
const { collection, getDocs, doc, getDoc, addDoc, updateDoc, query, where, orderBy, limit, runTransaction, serverTimestamp, Timestamp } = db; // Use admin SDK Firestore
const { payViaWalletInternal } = require('./wallet'); // Import internal wallet function for rewards

// --- Offers ---

/**
 * Fetches active offers (example implementation).
 * TODO: Implement proper filtering, pagination, and user segmentation.
 * @returns A promise resolving to an array of offer objects.
 */
async function getActiveOffers() {
    console.log("[Offers Service - Backend] Fetching active offers...");
    const offersColRef = collection(db, 'offers');
    const q = query(offersColRef, where('isActive', '==', true), orderBy('createdAt', 'desc')); // Example query

    try {
        const snapshot = await getDocs(q);
        const offers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`[Offers Service - Backend] Found ${offers.length} active offers.`);
        return offers;
    } catch (error) {
        console.error("[Offers Service - Backend] Error fetching active offers:", error);
        throw new Error("Could not retrieve offers.");
    }
}

/**
 * Fetches details for a specific offer.
 * @param offerId The ID of the offer.
 * @returns A promise resolving to the offer object or null.
 */
async function getOfferDetails(offerId) {
    if (!offerId) throw new Error("Offer ID required.");
    console.log(`[Offers Service - Backend] Fetching details for offer: ${offerId}`);
    const offerDocRef = doc(db, 'offers', offerId);
    try {
        const docSnap = await getDoc(offerDocRef);
        if (!docSnap.exists()) {
            console.warn(`[Offers Service - Backend] Offer not found: ${offerId}`);
            return null;
        }
        return { id: docSnap.id, ...docSnap.data() };
    } catch (error) {
        console.error(`[Offers Service - Backend] Error fetching offer ${offerId}:`, error);
        throw new Error("Could not retrieve offer details.");
    }
}

/**
 * Claims an offer for a user. (Simplified: Just logs claim).
 * TODO: Add eligibility checks, usage limits, link to user profile.
 * @param userId The ID of the user claiming.
 * @param offerId The ID of the offer being claimed.
 * @returns A promise resolving to true if claim logged successfully.
 */
async function claimOffer(userId, offerId) {
    if (!userId || !offerId) throw new Error("User ID and Offer ID required.");
    console.log(`[Offers Service - Backend] User ${userId} claiming offer ${offerId}...`);

    // 1. Check if offer exists and is active
    const offerDetails = await getOfferDetails(offerId);
    if (!offerDetails || !offerDetails.isActive) {
        throw new Error("Offer is not valid or does not exist.");
    }

    // 2. TODO: Check user eligibility (e.g., first time user, usage criteria)
    // 3. TODO: Check if user already claimed/used this offer if it's single-use

    // 4. Log the claim event (e.g., in a user subcollection or separate log)
    try {
        const userClaimsRef = collection(db, 'users', userId, 'claimedOffers');
        await addDoc(userClaimsRef, {
            offerId: offerId,
            offerDescription: offerDetails.description, // Store some context
            claimedAt: serverTimestamp(),
        });
        console.log(`[Offers Service - Backend] Offer ${offerId} claim logged for user ${userId}.`);
        // Optionally update user's profile or trigger coupon generation etc.
        return true;
    } catch (error) {
         console.error(`[Offers Service - Backend] Error logging offer claim for user ${userId}, offer ${offerId}:`, error);
         throw new Error("Could not claim the offer.");
    }
}

// --- Scratch Cards ---

/**
 * Fetches available (unscratched first) scratch cards for a user.
 * @param userId The ID of the user.
 * @returns A promise resolving to an array of scratch card data.
 */
async function getScratchCards(userId) {
    if (!userId) throw new Error("User ID required.");
    console.log(`[Offers Service - Backend] Fetching scratch cards for user ${userId}...`);
    const cardsColRef = collection(db, 'users', userId, 'scratchCards');
    // Order by isScratched (false first), then by expiry
    const q = query(cardsColRef, orderBy('isScratched'), orderBy('expiryDate', 'desc'));

    try {
        const snapshot = await getDocs(q);
        const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`[Offers Service - Backend] Found ${cards.length} scratch cards for user ${userId}.`);
        return cards;
    } catch (error) {
         console.error(`[Offers Service - Backend] Error fetching scratch cards for ${userId}:`, error);
        throw new Error("Could not retrieve scratch cards.");
    }
}

/**
 * Simulates scratching a card, determining reward, updating status, and crediting wallet.
 * @param userId The ID of the user scratching.
 * @param cardId The ID of the scratch card document.
 * @returns A promise resolving to the updated scratch card data.
 */
async function scratchCard(userId, cardId) {
     if (!userId || !cardId) throw new Error("User ID and Card ID required.");
     console.log(`[Offers Service - Backend] User ${userId} scratching card ${cardId}...`);

     const cardDocRef = doc(db, 'users', userId, 'scratchCards', cardId);

     try {
         let updatedCardData = null;
         await runTransaction(db, async (transaction) => {
             const cardSnap = await transaction.get(cardDocRef);
             if (!cardSnap.exists) throw new Error("Scratch card not found.");

             const cardData = cardSnap.data();
             if (cardData.isScratched) throw new Error("Card already scratched.");
             if (new Date() > cardData.expiryDate.toDate()) throw new Error("Scratch card has expired."); // Check expiry

             // Determine reward (Mock Logic)
             const random = Math.random();
             let rewardAmount = 0;
             let message = "Better luck next time!";
             if (random < 0.1) { // 10% chance of bigger reward
                 rewardAmount = Math.floor(Math.random() * 41) + 10; // 10-50
                 message = `Congratulations! You won ₹${rewardAmount}!`;
             } else if (random < 0.6) { // 50% chance of smaller reward
                 rewardAmount = Math.floor(Math.random() * 9) + 1; // 1-9
                  message = `You won ₹${rewardAmount}! Credited to your wallet.`;
             }

             // Prepare update data
              const updateData = {
                  isScratched: true,
                  rewardAmount: rewardAmount,
                  message: message,
                  scratchedAt: serverTimestamp(),
              };
              transaction.update(cardDocRef, updateData);

             // If reward > 0, credit wallet INTERNALLY within the same transaction if possible
             // NOTE: Calling payViaWalletInternal (which has its own transaction) *inside* this transaction is NOT standard Firestore practice and won't work atomically.
             // The correct approach is to trigger a separate reliable function (e.g., Cloud Function) AFTER this transaction commits successfully to credit the wallet.
             // For SIMULATION, we'll just log the intent here.
             if (rewardAmount > 0) {
                  console.log(`[Offers Service - Backend] TODO: Trigger wallet credit of ₹${rewardAmount} for user ${userId} (Card: ${cardId})`);
                 // Example (Simulated): await payViaWalletInternal(userId, `SCRATCH_REWARD_${cardId}`, -rewardAmount, `Scratch Card Win`);
                 // This internal call would fail in a real Firestore transaction.
             }

             // Store the data to return after transaction commits
             updatedCardData = { id: cardId, ...cardData, ...updateData };
         });

         if (!updatedCardData) {
            throw new Error("Failed to update scratch card data.");
         }

         console.log(`[Offers Service - Backend] Card ${cardId} scratched. Reward: ₹${updatedCardData.rewardAmount}`);
         // Return the updated data (timestamps will be Firestore Timestamps initially)
         return updatedCardData;

     } catch (error) {
         console.error(`[Offers Service - Backend] Error scratching card ${cardId} for ${userId}:`, error);
         throw error; // Re-throw
     }
}

// --- Loyalty & Referrals ---

/**
 * Fetches the user's loyalty status.
 * @param userId The ID of the user.
 * @returns A promise resolving to the loyalty status object.
 */
async function getLoyaltyStatus(userId) {
    if (!userId) throw new Error("User ID required.");
    console.log(`[Offers Service - Backend] Fetching loyalty status for user ${userId}...`);
    const loyaltyDocRef = doc(db, 'loyaltyStatus', userId); // Example storage
    try {
        const docSnap = await getDoc(loyaltyDocRef);
        if (docSnap.exists()) {
            return { userId, ...docSnap.data() };
        } else {
            // Return default status if none exists
            return { userId, points: 0, tier: 'Bronze', benefits: ['Basic Offers'], lastUpdated: Timestamp.now() };
        }
    } catch (error) {
        console.error(`[Offers Service - Backend] Error fetching loyalty status for ${userId}:`, error);
        throw new Error("Could not retrieve loyalty status.");
    }
}

/**
 * Fetches the user's referral status.
 * @param userId The ID of the user.
 * @returns A promise resolving to the referral status object.
 */
async function getReferralStatus(userId) {
     if (!userId) throw new Error("User ID required.");
     console.log(`[Offers Service - Backend] Fetching referral status for user ${userId}...`);
     const referralDocRef = doc(db, 'referralStatus', userId); // Example storage
     try {
        const docSnap = await getDoc(referralDocRef);
         if (docSnap.exists()) {
             return { userId, ...docSnap.data() };
         } else {
             // Return default status if none exists
             const defaultReferralCode = `ZET${userId.substring(0, 5).toUpperCase()}${Math.floor(Math.random()*100)}`;
             return { userId, referralCode: defaultReferralCode, successfulReferrals: 0, pendingReferrals: 0, totalEarnings: 0 };
         }
     } catch (error) {
         console.error(`[Offers Service - Backend] Error fetching referral status for ${userId}:`, error);
         throw new Error("Could not retrieve referral status.");
     }
}

module.exports = {
    getActiveOffers,
    getOfferDetails,
    claimOffer,
    getScratchCards,
    scratchCard,
    getLoyaltyStatus,
    getReferralStatus,
};
