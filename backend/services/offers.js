// backend/services/offers.js
const admin = require('../config/firebaseAdmin');
const db = admin.firestore();
const { collection, getDocs, doc, getDoc, addDoc, updateDoc, query, where, orderBy, limit, runTransaction, serverTimestamp, Timestamp } = db; 
const { payViaWalletInternal } = require('./wallet'); 
const redisClient = require('../config/redisClient'); // Import Redis client
const CACHE_TTL_OFFERS = 900; // 15 minutes for active offers

async function getActiveOffers() {
    const cacheKey = 'offers:active';
    console.log("[Offers Service - Backend] Fetching active offers...");

    try {
        if (redisClient.isOpen) {
            const cachedOffers = await redisClient.get(cacheKey);
            if (cachedOffers) {
                console.log(`[Offers Service - Backend] Cache HIT for ${cacheKey}`);
                return JSON.parse(cachedOffers).map(o => ({
                    ...o,
                    validFrom: o.validFrom ? new Date(o.validFrom) : undefined,
                    validUntil: o.validUntil ? new Date(o.validUntil) : undefined,
                    createdAt: o.createdAt ? new Date(o.createdAt) : undefined,
                }));
            }
            console.log(`[Offers Service - Backend] Cache MISS for ${cacheKey}`);
        } else {
            console.warn('[Offers Service - Backend] Redis client not open, skipping cache for active offers.');
        }
    } catch (cacheError) {
        console.error(`[Offers Service - Backend] Redis GET error for ${cacheKey}:`, cacheError);
    }
    
    const offersColRef = collection(db, 'offers');
    const q = query(offersColRef, where('isActive', '==', true), orderBy('createdAt', 'desc')); 

    try {
        const snapshot = await getDocs(q);
        const offers = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convert Firestore Timestamps to JS Dates for consistency before caching
            validFrom: doc.data().validFrom?.toDate ? doc.data().validFrom.toDate() : undefined,
            validUntil: doc.data().validUntil?.toDate ? doc.data().validUntil.toDate() : undefined,
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : undefined,
        }));
        console.log(`[Offers Service - Backend] Found ${offers.length} active offers from DB.`);

        try {
            if (redisClient.isOpen && offers.length > 0) {
                // Serialize dates to ISO strings for JSON compatibility in Redis
                const offersToCache = offers.map(o => ({
                    ...o,
                    validFrom: o.validFrom?.toISOString(),
                    validUntil: o.validUntil?.toISOString(),
                    createdAt: o.createdAt?.toISOString(),
                }));
                await redisClient.set(cacheKey, JSON.stringify(offersToCache), { EX: CACHE_TTL_OFFERS });
                console.log(`[Offers Service - Backend] Stored ${cacheKey} in cache.`);
            }
        } catch (cacheSetError) {
            console.error(`[Offers Service - Backend] Redis SET error for ${cacheKey}:`, cacheSetError);
        }
        return offers;
    } catch (error) {
        console.error("[Offers Service - Backend] Error fetching active offers from DB:", error);
        throw new Error("Could not retrieve offers.");
    }
}

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
        const data = docSnap.data();
        return { 
            id: docSnap.id, 
            ...data,
            validFrom: data.validFrom?.toDate ? data.validFrom.toDate() : undefined,
            validUntil: data.validUntil?.toDate ? data.validUntil.toDate() : undefined,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : undefined,
        };
    } catch (error) {
        console.error(`[Offers Service - Backend] Error fetching offer ${offerId}:`, error);
        throw new Error("Could not retrieve offer details.");
    }
}

async function claimOffer(userId, offerId) {
    if (!userId || !offerId) throw new Error("User ID and Offer ID required.");
    console.log(`[Offers Service - Backend] User ${userId} claiming offer ${offerId}...`);

    const offerDetails = await getOfferDetails(offerId);
    if (!offerDetails || !offerDetails.isActive) {
        throw new Error("Offer is not valid or does not exist.");
    }

    try {
        const userClaimsRef = collection(db, 'users', userId, 'claimedOffers');
        await addDoc(userClaimsRef, {
            offerId: offerId,
            offerDescription: offerDetails.description,
            claimedAt: serverTimestamp(),
        });
        console.log(`[Offers Service - Backend] Offer ${offerId} claim logged for user ${userId}.`);
        // Invalidate offer cache if needed (e.g., if claim affects totalRedemptions)
        // if (redisClient.isOpen) { await redisClient.del('offers:active'); }
        return true;
    } catch (error) {
         console.error(`[Offers Service - Backend] Error logging offer claim for user ${userId}, offer ${offerId}:`, error);
         throw new Error("Could not claim the offer.");
    }
}

async function getScratchCards(userId) {
    if (!userId) throw new Error("User ID required.");
    console.log(`[Offers Service - Backend] Fetching scratch cards for user ${userId}...`);
    const cardsColRef = collection(db, 'users', userId, 'scratchCards');
    const q = query(cardsColRef, orderBy('isScratched'), orderBy('expiryDate', 'desc'));

    try {
        const snapshot = await getDocs(q);
        const cards = snapshot.docs.map(docSnap => ({ 
            id: docSnap.id, 
            ...docSnap.data(),
            expiryDate: docSnap.data().expiryDate?.toDate ? docSnap.data().expiryDate.toDate() : undefined,
            createdAt: docSnap.data().createdAt?.toDate ? docSnap.data().createdAt.toDate() : undefined,
            scratchedAt: docSnap.data().scratchedAt?.toDate ? docSnap.data().scratchedAt.toDate() : undefined,
         }));
        console.log(`[Offers Service - Backend] Found ${cards.length} scratch cards for user ${userId}.`);
        return cards;
    } catch (error) {
         console.error(`[Offers Service - Backend] Error fetching scratch cards for ${userId}:`, error);
        throw new Error("Could not retrieve scratch cards.");
    }
}

async function scratchCard(userId, cardId) {
     if (!userId || !cardId) throw new Error("User ID and Card ID required.");
     console.log(`[Offers Service - Backend] User ${userId} scratching card ${cardId}...`);

     const cardDocRef = doc(db, 'users', userId, 'scratchCards', cardId);

     try {
         let updatedCardData = null;
         let rewardAmountForWallet = 0;

         await runTransaction(db, async (transaction) => {
             const cardSnap = await transaction.get(cardDocRef);
             if (!cardSnap.exists()) throw new Error("Scratch card not found.");

             const cardData = cardSnap.data();
             if (cardData.isScratched) throw new Error("Card already scratched.");
             if (cardData.expiryDate && new Date() > cardData.expiryDate.toDate()) throw new Error("Scratch card has expired.");

             const random = Math.random();
             let rewardAmount = 0;
             let message = "Better luck next time!";
             if (random < 0.1) { 
                 rewardAmount = Math.floor(Math.random() * 41) + 10; 
                 message = `Congratulations! You won ₹${rewardAmount}!`;
             } else if (random < 0.6) { 
                 rewardAmount = Math.floor(Math.random() * 9) + 1; 
                 message = `You won ₹${rewardAmount}! Credited to your wallet.`;
             }
             rewardAmountForWallet = rewardAmount; // Store for wallet credit after transaction

              const updateData = {
                  isScratched: true,
                  rewardAmount: rewardAmount,
                  message: message,
                  scratchedAt: serverTimestamp(),
              };
              transaction.update(cardDocRef, updateData);
             updatedCardData = { id: cardId, ...cardData, ...updateData };
         });

         if (!updatedCardData) {
            throw new Error("Failed to update scratch card data.");
         }
         
         // Credit wallet AFTER the Firestore transaction for the card update is successful
         if (rewardAmountForWallet > 0) {
             console.log(`[Offers Service - Backend] Crediting ₹${rewardAmountForWallet} to user ${userId} wallet for scratch card ${cardId}`);
             const walletCreditResult = await payViaWalletInternal(userId, `SCRATCH_REWARD_${cardId}`, -rewardAmountForWallet, `Scratch Card Win: ${updatedCardData.message}`);
             if (!walletCreditResult.success) {
                  console.error(`[Offers Service - Backend] CRITICAL: Wallet credit failed for card ${cardId}, user ${userId}, amount ${rewardAmountForWallet}. Reason: ${walletCreditResult.message}`);
                  // Potentially log this for manual intervention or retry
             }
         }

         console.log(`[Offers Service - Backend] Card ${cardId} scratched. Reward: ₹${updatedCardData.rewardAmount}`);
         return updatedCardData;

     } catch (error) {
         console.error(`[Offers Service - Backend] Error scratching card ${cardId} for ${userId}:`, error);
         throw error; 
     }
}

async function getLoyaltyStatus(userId) {
    if (!userId) throw new Error("User ID required.");
    console.log(`[Offers Service - Backend] Fetching loyalty status for user ${userId}...`);
    const loyaltyDocRef = doc(db, 'loyaltyStatus', userId); 
    try {
        const docSnap = await getDoc(loyaltyDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return { userId, ...data, lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : undefined };
        } else {
            return { userId, points: 0, tier: 'Bronze', benefits: ['Basic Offers'], lastUpdated: Timestamp.now().toDate() };
        }
    } catch (error) {
        console.error(`[Offers Service - Backend] Error fetching loyalty status for ${userId}:`, error);
        throw new Error("Could not retrieve loyalty status.");
    }
}

async function getReferralStatus(userId) {
     if (!userId) throw new Error("User ID required.");
     console.log(`[Offers Service - Backend] Fetching referral status for user ${userId}...`);
     const referralDocRef = doc(db, 'referralStatus', userId); 
     try {
        const docSnap = await getDoc(referralDocRef);
         if (docSnap.exists()) {
             return { userId, ...docSnap.data() };
         } else {
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
