
// backend/services/offers.js
const admin = require('../config/firebaseAdmin');
const db = admin.firestore();
const { collection, getDocs, doc, getDoc, addDoc, updateDoc, query, where, orderBy, limit, runTransaction, serverTimestamp, Timestamp } = db; 
const { payViaWalletInternal } = require('./wallet'); 
const redisClient = require('../config/redisClient'); // Import Redis client
const CACHE_TTL_OFFERS = 900; // 15 minutes for active offers
const { sendToUser } = require('../server'); // For WebSocket updates

async function getActiveOffers() {
    const cacheKey = 'offers:active_v2'; // Use a new version for potentially different structure
    console.log("[Offers Service - Backend] Fetching active offers...");

    try {
        if (redisClient.isOpen) {
            const cachedOffers = await redisClient.get(cacheKey);
            if (cachedOffers) {
                console.log(`[Offers Service - Backend] Cache HIT for ${cacheKey}`);
                return JSON.parse(cachedOffers).map(o => ({
                    ...o,
                    // Ensure dates are properly handled after parsing from cache
                    validFrom: o.validFrom ? new Date(o.validFrom) : undefined,
                    validUntil: o.validUntil ? new Date(o.validUntil) : undefined,
                    createdAt: o.createdAt ? new Date(o.createdAt) : undefined,
                    updatedAt: o.updatedAt ? new Date(o.updatedAt) : undefined,
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
    // Query for active offers where validUntil is in the future or not set, and isActive is true
    const q = query(offersColRef, 
        where('isActive', '==', true),
        // Firestore doesn't support OR queries like (validUntil >= now OR validUntil == null) directly.
        // So, we might need to filter client-side or fetch all active and then filter by date.
        // For simplicity, let's fetch all `isActive: true` and filter by date, or assume `validUntil` is always set for active offers.
        // If `validUntil` can be null for "always active" offers, this query needs adjustment or post-filtering.
        orderBy('validUntil', 'desc'), // Optional: show soon-to-expire first or recently added
        orderBy('createdAt', 'desc') 
    );

    try {
        const snapshot = await getDocs(q);
        const now = new Date();
        const offers = snapshot.docs
            .map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data(),
                validFrom: docSnap.data().validFrom?.toDate ? docSnap.data().validFrom.toDate() : undefined,
                validUntil: docSnap.data().validUntil?.toDate ? docSnap.data().validUntil.toDate() : undefined,
                createdAt: docSnap.data().createdAt?.toDate ? docSnap.data().createdAt.toDate() : undefined,
                updatedAt: docSnap.data().updatedAt?.toDate ? docSnap.data().updatedAt.toDate() : undefined,
            }))
            .filter(offer => !offer.validUntil || offer.validUntil >= now); // Filter out expired offers

        console.log(`[Offers Service - Backend] Found ${offers.length} active, non-expired offers from DB.`);

        try {
            if (redisClient.isOpen && offers.length > 0) {
                const offersToCache = offers.map(o => ({
                    ...o,
                    // Convert dates to ISO strings for JSON compatibility in Redis
                    validFrom: o.validFrom?.toISOString(),
                    validUntil: o.validUntil?.toISOString(),
                    createdAt: o.createdAt?.toISOString(),
                    updatedAt: o.updatedAt?.toISOString(),
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
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
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
    if (!offerDetails || !offerDetails.isActive || (offerDetails.validUntil && new Date(offerDetails.validUntil) < new Date())) {
        throw new Error("Offer is not valid, active, or has expired.");
    }

    // Check if already claimed (if redemptionLimitPerUser is 1)
    if (offerDetails.redemptionLimitPerUser === 1) {
        const userClaimsRef = collection(db, 'users', userId, 'claimedOffers');
        const q = query(userClaimsRef, where('offerId', '==', offerId), limit(1));
        const existingClaim = await getDocs(q);
        if (!existingClaim.empty) {
            throw new Error("Offer already claimed by this user.");
        }
    }

    try {
        const userClaimsRef = collection(db, 'users', userId, 'claimedOffers');
        const claimDocRef = await addDoc(userClaimsRef, {
            offerId: offerId,
            offerTitle: offerDetails.title, // Denormalize title
            offerDescription: offerDetails.description,
            claimedAt: serverTimestamp(),
            status: 'Claimed', // Initial status
        });
        console.log(`[Offers Service - Backend] Offer ${offerId} claim logged for user ${userId} (Claim ID: ${claimDocRef.id}).`);
        
        // Invalidate offer cache if claims affect totals or availability for others
        // if (redisClient.isOpen) { await redisClient.del('offers:active_v2'); }

        // Send a notification or update via WebSocket
        sendToUser(userId, { type: 'offer_claimed', payload: { offerId, offerTitle: offerDetails.title, claimId: claimDocRef.id } });

        return { success: true, message: "Offer claimed successfully!", claimId: claimDocRef.id };
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
         let finalCardData = null;
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
             let rewardType = 'Cashback'; // Default to cashback

             // Simulate different reward types
             if (random < 0.05) { // 5% no reward
                 rewardAmount = 0;
             } else if (random < 0.5) { // 45% Cashback (1-50)
                 rewardAmount = Math.floor(Math.random() * 50) + 1;
                 message = `Congratulations! You won ₹${rewardAmount} cashback!`;
             } else if (random < 0.8) { // 30% Points (10-100)
                 rewardAmount = Math.floor(Math.random() * 91) + 10;
                 rewardType = 'Points';
                 message = `Yay! You earned ${rewardAmount} Loyalty Points!`;
             } else { // 20% Coupon Code
                 rewardAmount = 0; // No direct monetary value for coupon itself
                 rewardType = 'CouponCode';
                 const couponValue = ['ZETPAY10', 'SAVE20NOW', 'GET50OFF'][Math.floor(Math.random()*3)];
                 message = `You've won a coupon: ${couponValue}! Use it on your next transaction.`;
                 cardData.couponCodeValue = couponValue; // Add to card data
             }
             
             if (rewardType === 'Cashback') {
                 rewardAmountForWallet = rewardAmount;
             } else if (rewardType === 'Points' && rewardAmount > 0) {
                 // TODO: Add points to loyaltyStatus for the user
                 const loyaltyRef = doc(db, 'loyaltyStatus', userId);
                 transaction.set(loyaltyRef, { points: admin.firestore.FieldValue.increment(rewardAmount), lastUpdated: serverTimestamp() }, { merge: true });
                 console.log(`[Offers Service - Backend] Added ${rewardAmount} points to user ${userId}`);
             }

              const updateData = {
                  isScratched: true,
                  rewardAmount: rewardAmount,
                  rewardType: rewardType,
                  couponCodeValue: cardData.couponCodeValue || null,
                  message: message,
                  scratchedAt: serverTimestamp(),
              };
              transaction.update(cardDocRef, updateData);
             finalCardData = { id: cardId, ...cardData, ...updateData, updatedAt: new Date() }; // simulate immediate update for return
         });

         if (!finalCardData) {
            throw new Error("Failed to update scratch card data during transaction.");
         }
         
         if (rewardAmountForWallet > 0) {
             console.log(`[Offers Service - Backend] Crediting ₹${rewardAmountForWallet} to user ${userId} wallet for scratch card ${cardId}`);
             const walletCreditResult = await payViaWalletInternal(userId, `SCRATCH_REWARD_${cardId}`, -rewardAmountForWallet, `Scratch Card Win: ${finalCardData.message}`);
             if (!walletCreditResult.success) {
                  console.error(`[Offers Service - Backend] CRITICAL: Wallet credit failed for card ${cardId}, user ${userId}, amount ${rewardAmountForWallet}. Reason: ${walletCreditResult.message}`);
                  finalCardData.message += ` (Wallet credit pending: ${walletCreditResult.message})`;
             } else {
                 // Notify user about wallet credit
                 sendToUser(userId, { type: 'wallet_credited', payload: { amount: rewardAmountForWallet, reason: `Scratch Card: ${cardId}` } });
             }
         }

         console.log(`[Offers Service - Backend] Card ${cardId} scratched. Reward: ${finalCardData.rewardType} - ${finalCardData.rewardAmount}, Msg: ${finalCardData.message}`);
         // Convert timestamps for client response
         const clientResult = {
            ...finalCardData,
            expiryDate: finalCardData.expiryDate?.toDate ? finalCardData.expiryDate.toDate() : finalCardData.expiryDate,
            createdAt: finalCardData.createdAt?.toDate ? finalCardData.createdAt.toDate() : finalCardData.createdAt,
            scratchedAt: finalCardData.scratchedAt?.toDate ? finalCardData.scratchedAt.toDate() : finalCardData.scratchedAt,
        };
        sendToUser(userId, { type: 'scratch_card_update', payload: clientResult });
        return clientResult;

     } catch (error: any) {
         console.error(`[Offers Service - Backend] Error scratching card ${cardId} for ${userId}:`, error);
         throw new Error(error.message || "Failed to scratch card.");
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
            return { 
                userId, 
                ...data, 
                lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : undefined,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : undefined,
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
            };
        } else {
            // Create initial loyalty status if none exists
            const initialStatus = { userId, points: 0, tier: 'Bronze', benefits: ['Basic Offers', 'Standard Support'], pointsToNextTier: 500, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
            await setDoc(loyaltyDocRef, initialStatus);
            return { ...initialStatus, createdAt: new Date(), updatedAt: new Date(), lastUpdated: new Date() };
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
             const data = docSnap.data();
             return { 
                userId, 
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : undefined,
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
            };
         } else {
             const defaultReferralCode = `ZET${userId.substring(0, 5).toUpperCase()}${Math.floor(Math.random()*1000)}`;
             const initialStatus = { userId, referralCode: defaultReferralCode, successfulReferrals: 0, pendingReferrals: 0, totalEarnings: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
             await setDoc(referralDocRef, initialStatus);
             return { ...initialStatus, createdAt: new Date(), updatedAt: new Date() };
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

