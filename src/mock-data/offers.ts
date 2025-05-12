
import type { Offer } from '@/services/offers'; // Assuming DisplayOffer is a client-side extension of Offer

export interface DisplayOffer extends Offer {
  claimed?: boolean;
  category?: 'Cashback' | 'Coupon' | 'Partner';
}

export const mockOffersPageData: DisplayOffer[] = [
    { offerId: 'cashback1', description: 'Flat ₹50 Cashback on Electricity Bill Payment over ₹500', imageUrl: 'https://picsum.photos/seed/elec_cb/400/200', offerType: 'Cashback', category: 'Cashback', isActive: true },
    { offerId: 'coupon1', description: 'Get 20% off up to ₹150 on Movie Tickets', imageUrl: 'https://picsum.photos/seed/movie_coupon/400/200', offerType: 'Coupon', category: 'Coupon', isActive: true },
    { offerId: 'cashback2', description: 'Upto ₹25 Cashback on Mobile Recharge ₹199+', imageUrl: 'https://picsum.photos/seed/recharge_cb/400/200', offerType: 'Cashback', category: 'Cashback', isActive: true },
    { offerId: 'partner1', description: '10% off on Zomato Orders via PayFriend', imageUrl: 'https://picsum.photos/seed/zomato_offer/400/200', offerType: 'Discount', category: 'Partner', isActive: true },
];
