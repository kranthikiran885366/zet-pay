
/**
 * @fileOverview Service functions for managing offers, loyalty, referrals, and scratch cards using Firestore.
 */
import { db, auth } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    getDoc,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp,
    writeBatch
} from 'firebase/firestore';
import { format, addDays } from 'date-fns';

// --- Offer Interfaces ---

export interface Offer {
  id?: string; // Firestore document ID
  offerId: string; // Your internal offer code or identifier
  description: string;
  imageUrl: string;
  offerType: 'Cashback' | 'Coupon' | 'Discount' | 'Partner'; // More specific types
  terms?: string;
  validUntil?: Timestamp; // Use Firestore Timestamp
  category?: string; // e.g., 'Recharge', 'Shopping', 'Food'
  isActive: boolean; // Flag to easily enable/disable offers
  createdAt?: Timestamp;
}

// Interface for user-specific claimed offer data
export interface ClaimedOffer {
    userId: string;
    offerId: string; // The ID of the Offer document
    claimedAt: Timestamp;
    // Add other relevant details like transaction ID if claimed on purchase
}


// --- Loyalty Interfaces ---

export interface LoyaltyStatus {
    userId: string; // Firestore document ID (Auth UID)
    points: number;
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    benefits: string[]; // Store current benefits (could also be derived from tier)
    lastUpdated: Timestamp;
}

// --- Referral Interfaces ---

export interface ReferralStatus {
    userId: string; // Firestore document ID (Auth UID)
    referralCode: string;
    successfulReferrals: number; // Count of successful referrals
    pendingReferrals: number; // Count of signups using code but not yet meeting criteria
    totalEarnings: number; // Total cashback/points earned via referrals
    // Store referred user IDs in a subcollection if needed
}

// --- Scratch Card Interfaces ---

export interface ScratchCardData {
    id?: string; // Firestore document ID
    userId: string;
    isScratched: boolean;
    rewardAmount?: number;
    expiryDate: Timestamp;
    message: string; // Message before/after scratching
    sourceOfferId?: string; // Optional: Link to the offer that generated this card
    createdAt: Timestamp;
    scratchedAt?: Timestamp;
}

// --- Service Functions ---

/**
 * Asynchronously retrieves a list of active offers from Firestore.
 *
 * @returns A promise that resolves to an array of Offer objects.
 */
export async function getOffers(): Promise<Offer[]> {
  console.log("Fetching active offers from Firestore...");
  try {
      const offersColRef = collection(db, 'offers');
      const q = query(offersColRef,
          where('isActive', '==', true), // Only get active offers
          where('validUntil', '>=', Timestamp.now()), // Only get non-expired offers
          orderBy('validUntil', 'asc') // Show soon-to-expire first
      );
      const querySnapshot = await getDocs(q);
      const offers = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          validUntil: doc.data().validUntil ? (doc.data().validUntil as Timestamp).toDate() : undefined, // Convert for display if needed
          createdAt: doc.data().createdAt ? (doc.data().createdAt as Timestamp).toDate() : undefined,
      } as Offer));
      console.log(`Fetched ${offers.length} active offers.`);
      return offers;
  } catch (error) {
      console.error("Error fetching offers:", error);
      throw new Error("Could not fetch available offers.");
  }
}

/**
 * Asynchronously retrieves the details for a specific offer from Firestore.
 *
 * @param offerId The Firestore document ID of the offer.
 * @returns A promise that resolves to the Offer object or null if not found.
 */
export async function getOfferDetails(offerId: string): Promise<Offer | null> {
    console.log(`Fetching details for offer: ${offerId}`);
    try {
        const offerDocRef = doc(db, 'offers', offerId);
        const offerDocSnap = await getDoc(offerDocRef);

        if (offerDocSnap.exists()) {
             const data = offerDocSnap.data();
             return {
                 id: offerDocSnap.id,
                 ...data,
                 validUntil: data.validUntil ? (data.validUntil as Timestamp).toDate() : undefined,
                 createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
             } as Offer;
        } else {
            console.log("Offer document not found:", offerId);
            return null;
        }
    } catch (error) {
        console.error("Error fetching offer details:", error);
        throw new Error("Could not fetch offer details.");
    }
}


/**
 * Claims an offer for the current user. (Simulated for now)
 * In a real app, this might add a record to a 'claimedOffers' subcollection for the user.
 *
 * @param offerId The ID of the offer to claim.
 * @returns A promise resolving to true if claim is recorded (simulated).
 */
export async function claimOffer(offerId: string): Promise<boolean> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User not logged in.");
    const userId = currentUser.uid;
    console.log(`Simulating claiming offer ${offerId} for user ${userId}`);

    // TODO: Check if offer exists and is claimable
    // TODO: Check if user has already claimed this offer

    // Simulate adding a record to user's claimed offers
    // const claimData: ClaimedOffer = { userId, offerId, claimedAt: serverTimestamp() };
    // await addDoc(collection(db, 'users', userId, 'claimedOffers'), claimData);

    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate backend operation
    console.log(`Offer ${offerId} claimed (simulated).`);
    return true;
}

/**
 * Fetches the user's current loyalty status from Firestore.
 * Creates a default status if none exists.
 * @param userId The user's ID.
 * @returns A promise resolving to the LoyaltyStatus object.
 */
export async function getLoyaltyStatus(userId?: string): Promise<LoyaltyStatus> {
     const currentUserId = userId || auth.currentUser?.uid;
     if (!currentUserId) throw new Error("User ID required.");
     console.log(`Fetching loyalty status for user ${currentUserId}...`);

     try {
         const loyaltyDocRef = doc(db, 'loyaltyStatus', currentUserId); // Store in top-level collection
         const loyaltyDocSnap = await getDoc(loyaltyDocRef);

         if (loyaltyDocSnap.exists()) {
             const data = loyaltyDocSnap.data();
             return {
                 ...data,
                 userId: currentUserId,
                 lastUpdated: (data.lastUpdated as Timestamp).toDate(),
             } as LoyaltyStatus;
         } else {
             // Create default Bronze status
             const defaultStatus: Omit<LoyaltyStatus, 'lastUpdated'> = {
                 userId: currentUserId,
                 points: 0,
                 tier: 'Bronze',
                 benefits: ['Basic Cashback Offers'],
             };
             await setDoc(loyaltyDocRef, {
                 ...defaultStatus,
                 lastUpdated: serverTimestamp()
             });
             return { ...defaultStatus, lastUpdated: new Date() };
         }
     } catch (error) {
         console.error("Error fetching/creating loyalty status:", error);
         throw new Error("Could not fetch loyalty status.");
     }
}

/**
 * Fetches the user's referral status from Firestore.
 * Creates a default status if none exists.
 * @param userId The user's ID.
 * @returns A promise resolving to the ReferralStatus object.
 */
export async function getReferralStatus(userId?: string): Promise<ReferralStatus> {
     const currentUserId = userId || auth.currentUser?.uid;
     if (!currentUserId) throw new Error("User ID required.");
     console.log(`Fetching referral status for user ${currentUserId}...`);

      try {
         const referralDocRef = doc(db, 'referralStatus', currentUserId); // Store in top-level collection
         const referralDocSnap = await getDoc(referralDocRef);

         if (referralDocSnap.exists()) {
             return { userId: currentUserId, ...referralDocSnap.data() } as ReferralStatus;
         } else {
             // Create default status with a generated code
             const defaultStatus: ReferralStatus = {
                 userId: currentUserId,
                 referralCode: `ZET${currentUserId.substring(0, 6).toUpperCase()}`, // Example code generation
                 successfulReferrals: 0,
                 pendingReferrals: 0,
                 totalEarnings: 0,
             };
             await setDoc(referralDocRef, defaultStatus);
             return defaultStatus;
         }
     } catch (error) {
         console.error("Error fetching/creating referral status:", error);
         throw new Error("Could not fetch referral status.");
     }
}

/**
 * Fetches available (unscratched) scratch cards for the user from Firestore.
 * @returns A promise resolving to an array of ScratchCardData objects.
 */
export async function getScratchCards(): Promise<ScratchCardData[]> {
     const currentUser = auth.currentUser;
     if (!currentUser) return [];
     const userId = currentUser.uid;
     console.log(`Fetching scratch cards for user ${userId}...`);

     try {
         const cardsColRef = collection(db, 'scratchCards');
         const q = query(cardsColRef,
             where('userId', '==', userId),
            // where('isScratched', '==', false), // Optionally fetch only unscratched
             where('expiryDate', '>=', Timestamp.now()), // Only non-expired
             orderBy('expiryDate', 'asc') // Show soon-to-expire first
         );
         const querySnapshot = await getDocs(q);
         const cards = querySnapshot.docs.map(doc => ({
             id: doc.id,
             ...doc.data(),
             expiryDate: (doc.data().expiryDate as Timestamp).toDate(),
             createdAt: (doc.data().createdAt as Timestamp).toDate(),
             scratchedAt: doc.data().scratchedAt ? (doc.data().scratchedAt as Timestamp).toDate() : undefined,
         } as ScratchCardData));
         console.log(`Fetched ${cards.length} scratch cards.`);
         return cards;
     } catch (error) {
         console.error("Error fetching scratch cards:", error);
         throw new Error("Could not fetch scratch cards.");
     }
}

/**
 * Simulates scratching a card, reveals reward, and updates status in Firestore.
 * @param cardId The Firestore document ID of the card to scratch.
 * @returns A promise resolving to the updated ScratchCardData (with reward).
 */
export async function scratchCard(cardId: string): Promise<ScratchCardData> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User not logged in.");
    const userId = currentUser.uid;
    console.log(`Scratching card: ${cardId} for user ${userId}`);

    const cardDocRef = doc(db, 'scratchCards', cardId);

    try {
        let updatedCardData: Partial<ScratchCardData> | null = null;

        await runTransaction(db, async (transaction) => {
             const cardDoc = await transaction.get(cardDocRef);
             if (!cardDoc.exists()) throw new Error("Scratch card not found.");

             const cardData = cardDoc.data() as ScratchCardData;
             if (cardData.userId !== userId) throw new Error("Permission denied.");
             if (cardData.isScratched) throw new Error("Card already scratched.");
             if (Timestamp.now() > cardData.expiryDate) throw new Error("Scratch card has expired.");

            // Simulate reward generation
            const wonAmount = Math.random() > 0.3 ? Math.floor(Math.random() * 50) + 5 : 0;
            const message = wonAmount > 0 ? `You won ₹${wonAmount} Cashback!` : "Better luck next time!";

            updatedCardData = {
                isScratched: true,
                rewardAmount: wonAmount > 0 ? wonAmount : undefined,
                message: message,
                scratchedAt: serverTimestamp() as Timestamp, // Use server timestamp
            };

            transaction.update(cardDocRef, updatedCardData);

            // TODO: If cashback is won, credit the user's wallet or add to pending cashback balance here within the transaction.
            if (wonAmount > 0) {
                 console.log(`TODO: Credit ₹${wonAmount} to user ${userId}'s wallet/cashback balance.`);
                 // Example: const walletRef = doc(db, 'wallets', userId);
                 // const walletSnap = await transaction.get(walletRef);
                 // const currentBalance = walletSnap.data()?.balance || 0;
                 // transaction.update(walletRef, { balance: currentBalance + wonAmount });
            }
         });

        // Fetch the updated document to return the complete data with resolved timestamps
        const finalCardSnap = await getDoc(cardDocRef);
        if (!finalCardSnap.exists() || !updatedCardData) throw new Error("Failed to retrieve updated card data."); // Should not happen

         const finalData = finalCardSnap.data();
         return {
             id: finalCardSnap.id,
             ...finalData,
             expiryDate: (finalData.expiryDate as Timestamp).toDate(),
             createdAt: (finalData.createdAt as Timestamp).toDate(),
             scratchedAt: finalData.scratchedAt ? (finalData.scratchedAt as Timestamp).toDate() : undefined,
         } as ScratchCardData;


    } catch (error: any) {
        console.error(`Error scratching card ${cardId}:`, error);
        throw new Error(error.message || "Could not scratch the card.");
    }
}

// Helper: Give a user a new scratch card (e.g., after a specific action)
export async function giveScratchCard(userId: string, message: string, expiryDays: number = 7, sourceOfferId?: string): Promise<void> {
     if (!userId) return;
     console.log(`Giving scratch card to user ${userId}: ${message}`);
     const cardData = {
        userId,
        isScratched: false,
        rewardAmount: undefined,
        expiryDate: Timestamp.fromDate(addDays(new Date(), expiryDays)),
        message,
        sourceOfferId: sourceOfferId || null,
        createdAt: serverTimestamp(),
        scratchedAt: null,
     };
     try {
         await addDoc(collection(db, 'scratchCards'), cardData);
         console.log("Scratch card added for user", userId);
     } catch (error) {
         console.error("Error giving scratch card:", error);
     }
}
