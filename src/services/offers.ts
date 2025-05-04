
import { format, addDays } from 'date-fns';

/**
 * Represents an offer or reward.
 */
export interface Offer {
  /**
   * The ID of the offer.
   */
  offerId: string;
  /**
   * A description of the offer.
   */
  description: string;
  /**
   * URL for the image associated with the offer.
   */
  imageUrl: string;
  /**
   * The type of offer (e.g., Cashback, Coupon, Scratch Card, Discount).
   */
  offerType: string;
  /**
   * Optional terms and conditions string.
   */
  terms?: string;
  /**
   * Optional validity date (ISO string).
   */
  validUntil?: string;
}

// Keep the original mock data simple for the list view
const mockOffersData: Offer[] = [
    { offerId: 'cashback1', description: 'Flat ₹50 Cashback on Electricity Bill Payment over ₹500', imageUrl: 'https://picsum.photos/seed/elec_cb/400/200', offerType: 'Cashback', validUntil: addDays(new Date(), 10).toISOString() },
    { offerId: 'coupon1', description: 'Get 20% off up to ₹150 on Movie Tickets', imageUrl: 'https://picsum.photos/seed/movie_coupon/400/200', offerType: 'Coupon', validUntil: addDays(new Date(), 7).toISOString() },
    { offerId: 'cashback2', description: 'Upto ₹25 Cashback on Mobile Recharge ₹199+', imageUrl: 'https://picsum.photos/seed/recharge_cb/400/200', offerType: 'Cashback', validUntil: addDays(new Date(), 15).toISOString() },
    { offerId: 'partner1', description: '10% off on Zomato Orders via PayFriend', imageUrl: 'https://picsum.photos/seed/zomato_offer/400/200', offerType: 'Discount', validUntil: addDays(new Date(), 30).toISOString() },
    { offerId: 'coupon2', description: '₹100 OFF on Myntra Shopping over ₹1000', imageUrl: 'https://picsum.photos/seed/myntra_coupon/400/200', offerType: 'Coupon', validUntil: addDays(new Date(), 5).toISOString() },
    { offerId: 'cashback3', description: '₹20 Cashback on first UPI Lite transaction', imageUrl: 'https://picsum.photos/seed/upilite_cb/400/200', offerType: 'Cashback', validUntil: addDays(new Date(), 60).toISOString() },
];


/**
 * Asynchronously retrieves a list of available offers.
 *
 * @returns A promise that resolves to an array of Offer objects.
 */
export async function getOffers(): Promise<Offer[]> {
  console.log("Fetching all offers...");
  // TODO: Implement this by calling an API.
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
  return mockOffersData;
}

/**
 * Asynchronously retrieves the details for a specific offer.
 *
 * @param offerId The ID of the offer to retrieve.
 * @returns A promise that resolves to the Offer object with details, or null if not found.
 */
export async function getOfferDetails(offerId: string): Promise<Offer | null> {
    console.log(`Fetching details for offer: ${offerId}`);
    // TODO: Implement API call to fetch specific offer details.
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate API delay

    const baseOffer = mockOffersData.find(o => o.offerId === offerId);
    if (!baseOffer) return null;

    // Add mock details for the specific offer
    const mockTerms = `1. Offer valid for PayFriend users only.\n2. Minimum transaction amount might apply.\n3. Offer valid once per user during the offer period.\n4. Cashback/Discount will be processed within 48 hours.\n5. PayFriend reserves the right to modify or withdraw the offer.`;
    const details = {
        ...baseOffer,
        terms: mockTerms,
        // validity is already in baseOffer, we just ensure it's there
        validUntil: baseOffer.validUntil || addDays(new Date(), 7).toISOString(), // Add default expiry if missing
    };

    return details;
}


// ----- Loyalty & Referral (Conceptual) -----

export interface LoyaltyStatus {
    points: number;
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    benefits: string[];
}

export interface ReferralStatus {
    referralCode: string;
    successfulReferrals: number;
    pendingReferrals: number;
    totalEarnings: number;
}

/**
 * Fetches the user's current loyalty status and points.
 */
export async function getLoyaltyStatus(): Promise<LoyaltyStatus> {
    console.log("Fetching loyalty status...");
    await new Promise(resolve => setTimeout(resolve, 600));
    // Mock data
    return {
        points: 1250,
        tier: 'Silver',
        benefits: ['Exclusive cashback offers', 'Priority customer support'],
    };
}

/**
 * Fetches the user's referral status and code.
 */
export async function getReferralStatus(): Promise<ReferralStatus> {
     console.log("Fetching referral status...");
     await new Promise(resolve => setTimeout(resolve, 500));
     // Mock data
     return {
        referralCode: 'PAYFRND123',
        successfulReferrals: 5,
        pendingReferrals: 2,
        totalEarnings: 250,
     };
}

// ----- Scratch Cards (Conceptual) -----

export interface ScratchCardData {
    id: string;
    isScratched: boolean;
    rewardAmount?: number; // Amount won, undefined until scratched
    expiryDate: string; // ISO Date
    message: string; // e.g., "Cashback Reward", "Better Luck Next Time"
}

/**
 * Fetches available scratch cards for the user.
 */
export async function getScratchCards(): Promise<ScratchCardData[]> {
    console.log("Fetching scratch cards...");
    await new Promise(resolve => setTimeout(resolve, 700));
    // Mock data
    return [
        { id: 'sc1', isScratched: false, expiryDate: addDays(new Date(), 3).toISOString(), message: "Scratch to win cashback!" },
        { id: 'sc2', isScratched: true, rewardAmount: 15, expiryDate: addDays(new Date(), -1).toISOString(), message: "You won ₹15 Cashback!" },
        { id: 'sc3', isScratched: false, expiryDate: addDays(new Date(), 5).toISOString(), message: "Win up to ₹100!" },
    ];
}

/**
 * Simulates scratching a card and reveals the reward.
 * @param cardId The ID of the card to scratch.
 */
export async function scratchCard(cardId: string): Promise<Omit<ScratchCardData, 'isScratched'>> {
     console.log(`Scratching card: ${cardId}`);
     await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate scratching delay

     // Find the card to update (in real app, this happens backend)
     const cardIndex = -1; // This needs state management or refetching in real UI
     // For simulation, generate a random reward
     const wonAmount = Math.random() > 0.3 ? Math.floor(Math.random() * 50) + 5 : 0; // 70% chance to win 5-55

     const result = {
         id: cardId,
         rewardAmount: wonAmount > 0 ? wonAmount : undefined,
         expiryDate: addDays(new Date(), 3).toISOString(), // Assume expiry remains same for demo
         message: wonAmount > 0 ? `You won ₹${wonAmount} Cashback!` : "Better luck next time!",
     }
     // TODO: Update the card status in the backend/state
     return result;
}
