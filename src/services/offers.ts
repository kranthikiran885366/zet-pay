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
   * The type of offer (e.g., Cashback, Coupon, Scratch Card).
   */
  offerType: string;
}

/**
 * Asynchronously retrieves a list of available offers.
 *
 * @returns A promise that resolves to an array of Offer objects.
 */
export async function getOffers(): Promise<Offer[]> {
  // TODO: Implement this by calling an API.
  return [
    {
      offerId: '1',
      description: 'Get 50% cashback on your first transaction.',
      imageUrl: 'https://example.com/cashback.png',
      offerType: 'Cashback',
    },
    {
      offerId: '2',
      description: 'Get a coupon for 20% off on your next purchase.',
      imageUrl: 'https://example.com/coupon.png',
      offerType: 'Coupon',
    },
  ];
}
