/**
 * @fileOverview Service functions for managing offers, loyalty, referrals, and scratch cards via the backend API.
 */
import { apiClient } from '@/lib/apiClient';
import type { Offer, LoyaltyStatus, ReferralStatus, ScratchCardData } from './types'; // Assume types are defined in a shared file

// Re-export types if needed
export type { Offer, LoyaltyStatus, ReferralStatus, ScratchCardData };


// --- Service Functions ---

/**
 * Asynchronously retrieves a list of active offers from the backend API.
 *
 * @returns A promise that resolves to an array of Offer objects.
 */
export async function getOffers(): Promise<Offer[]> {
  console.log("Fetching active offers via API...");
  try {
      const offers = await apiClient<Offer[]>('/offers');
      // Convert date strings if API returns strings
      return offers.map(offer => ({
          ...offer,
          validUntil: offer.validUntil ? new Date(offer.validUntil) : undefined,
          createdAt: offer.createdAt ? new Date(offer.createdAt) : undefined,
      }));
  } catch (error) {
      console.error("Error fetching offers via API:", error);
      return []; // Return empty on error
  }
}

/**
 * Asynchronously retrieves the details for a specific offer from the backend API.
 *
 * @param offerId The ID of the offer.
 * @returns A promise that resolves to the Offer object or null if not found.
 */
export async function getOfferDetails(offerId: string): Promise<Offer | null> {
    console.log(`Fetching details via API for offer: ${offerId}`);
    try {
        const offer = await apiClient<Offer>(`/offers/${offerId}`);
         // Convert date strings if API returns strings
        return {
            ...offer,
            validUntil: offer.validUntil ? new Date(offer.validUntil) : undefined,
            createdAt: offer.createdAt ? new Date(offer.createdAt) : undefined,
        };
    } catch (error: any) {
        // Handle 404 specifically if possible
        if (error.message?.includes('404') || error.message?.toLowerCase().includes('not found')) {
            console.log("Offer not found via API:", offerId);
            return null;
        }
        console.error("Error fetching offer details via API:", error);
        throw error; // Re-throw other errors
    }
}


/**
 * Claims an offer for the current user via the backend API.
 *
 * @param offerId The ID of the offer to claim.
 * @returns A promise resolving to true if claim is successful.
 */
export async function claimOffer(offerId: string): Promise<boolean> {
    console.log(`Claiming offer via API: ${offerId}`);
    try {
        // Backend handles checking eligibility, claim status, etc.
        await apiClient<void>(`/offers/${offerId}/claim`, { // Assuming a POST endpoint for claiming
            method: 'POST',
        });
        return true;
    } catch (error) {
        console.error(`Error claiming offer ${offerId} via API:`, error);
        throw error; // Re-throw error for UI handling
    }
}

/**
 * Fetches the user's current loyalty status from the backend API.
 * @returns A promise resolving to the LoyaltyStatus object.
 */
export async function getLoyaltyStatus(): Promise<LoyaltyStatus> {
     console.log(`Fetching loyalty status via API...`);
     try {
         const status = await apiClient<LoyaltyStatus>('/offers/rewards/loyalty'); // Assuming this endpoint exists
          // Convert date string if needed
         return {
             ...status,
             lastUpdated: status.lastUpdated ? new Date(status.lastUpdated) : new Date(), // Provide fallback date
         };
     } catch (error) {
         console.error("Error fetching loyalty status via API:", error);
         // Return a default or throw error
         throw new Error("Could not fetch loyalty status.");
     }
}

/**
 * Fetches the user's referral status from the backend API.
 * @returns A promise resolving to the ReferralStatus object.
 */
export async function getReferralStatus(): Promise<ReferralStatus> {
     console.log(`Fetching referral status via API...`);
      try {
         // Assuming an endpoint like '/offers/rewards/referral'
         const status = await apiClient<ReferralStatus>('/offers/rewards/referral');
         return status;
     } catch (error) {
         console.error("Error fetching referral status via API:", error);
         throw new Error("Could not fetch referral status.");
     }
}

/**
 * Fetches available scratch cards for the user from the backend API.
 * @returns A promise resolving to an array of ScratchCardData objects.
 */
export async function getScratchCards(): Promise<ScratchCardData[]> {
     console.log(`Fetching scratch cards via API...`);
     try {
         const cards = await apiClient<ScratchCardData[]>('/offers/rewards/scratch-cards');
         // Convert date strings
         return cards.map(card => ({
             ...card,
             expiryDate: new Date(card.expiryDate),
             createdAt: new Date(card.createdAt),
             scratchedAt: card.scratchedAt ? new Date(card.scratchedAt) : undefined,
         }));
     } catch (error) {
         console.error("Error fetching scratch cards via API:", error);
         return [];
     }
}

/**
 * Scratches a card via the backend API.
 * @param cardId The ID of the card to scratch.
 * @returns A promise resolving to the updated ScratchCardData (with reward).
 */
export async function scratchCard(cardId: string): Promise<ScratchCardData> {
    console.log(`Scratching card via API: ${cardId}`);
    try {
        const result = await apiClient<ScratchCardData>(`/offers/rewards/scratch-cards/${cardId}/scratch`, {
            method: 'POST',
        });
         // Convert dates
         return {
             ...result,
             expiryDate: new Date(result.expiryDate),
             createdAt: new Date(result.createdAt),
             scratchedAt: result.scratchedAt ? new Date(result.scratchedAt) : undefined,
         };
    } catch (error: any) {
        console.error(`Error scratching card ${cardId} via API:`, error);
        throw error;
    }
}

// Remove Firestore specific imports if no longer used
// import { Timestamp } from 'firebase/firestore';
// import { format, addDays } from 'date-fns';
import type { Timestamp } from 'firebase/firestore'; // Keep if type definition uses it
