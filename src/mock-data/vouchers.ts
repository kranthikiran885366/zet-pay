
export interface GamingPlatform {
    id: string;
    name: string;
    logoUrl?: string;
    requiresPlayerId?: boolean; // Added
    allowCustomAmount?: boolean; // Added
    customMinAmount?: number; // Added
    customMaxAmount?: number; // Added
}
export const mockGamingPlatformsData: GamingPlatform[] = [
    { id: 'google-play', name: 'Google Play Recharge Code', logoUrl: '/logos/googleplay.png', requiresPlayerId: false, allowCustomAmount: true, customMinAmount: 10, customMaxAmount: 5000 },
    { id: 'freefire', name: 'Garena Free Fire Diamonds', logoUrl: '/logos/freefire.png', requiresPlayerId: true, allowCustomAmount: false },
    { id: 'pubg-uc', name: 'PUBG Mobile UC (BGMI)', logoUrl: '/logos/pubg.png', requiresPlayerId: true, allowCustomAmount: false },
];

export interface GamingVoucher {
    id: string;
    value: number; // INR value
    description?: string;
}
export const mockGamingVouchersData: { [platformId: string]: GamingVoucher[] } = {
    'google-play': [
        { id: 'gp-100', value: 100 }, { id: 'gp-300', value: 300 }, { id: 'gp-500', value: 500 }, { id: 'gp-1000', value: 1000 },
    ],
    'freefire': [
        { id: 'ff-100d', value: 80, description: '100 Diamonds' }, { id: 'ff-310d', value: 240, description: '310 Diamonds' },
        { id: 'ff-520d', value: 400, description: '520 Diamonds' }, { id: 'ff-1060d', value: 800, description: '1060 Diamonds' },
    ],
     'pubg-uc': [
        { id: 'pubg-60uc', value: 75, description: '60 UC' }, { id: 'pubg-325uc', value: 380, description: '300 + 25 UC' },
        { id: 'pubg-660uc', value: 750, description: '600 + 60 UC' },
    ],
};

export interface DigitalVoucherBrand {
    id: string;
    name: string;
    logoUrl?: string;
    denominations: number[];
    allowCustomAmount: boolean;
    minAmount?: number; // Renamed from customMinAmount
    maxAmount?: number; // Renamed from customMaxAmount
}
export const mockDigitalVoucherBrandsData: DigitalVoucherBrand[] = [
    { id: 'google-play-voucher', name: 'Google Play Recharge Code', logoUrl: '/logos/googleplay.png', denominations: [100, 300, 500, 1000], allowCustomAmount: true, minAmount: 10, maxAmount: 5000 },
    { id: 'apple-store-voucher', name: 'App Store & iTunes Code', logoUrl: '/logos/appstore.png', denominations: [500, 1000, 2000], allowCustomAmount: false },
    { id: 'uber-voucher', name: 'Uber Ride Voucher', logoUrl: '/logos/uber.png', denominations: [100, 250, 500], allowCustomAmount: true, minAmount: 50, maxAmount: 1000 },
];

export interface GiftCardBrand {
    id: string;
    name: string;
    logoUrl?: string;
    categories: string[];
    denominations: number[];
    allowCustomAmount: boolean;
    minCustomAmount?: number;
    maxCustomAmount?: number;
}
export const mockGiftCardBrandsData: GiftCardBrand[] = [
    { id: 'amazon', name: 'Amazon Pay Gift Card', logoUrl: '/logos/amazon.png', categories: ['Shopping', 'Popular', 'All'], denominations: [100, 250, 500, 1000, 2000], allowCustomAmount: true, minCustomAmount: 50, maxCustomAmount: 10000 },
    { id: 'flipkart', name: 'Flipkart Gift Card', logoUrl: '/logos/flipkart.png', categories: ['Shopping', 'Popular', 'All'], denominations: [250, 500, 1000, 2000], allowCustomAmount: false },
    { id: 'myntra', name: 'Myntra Gift Card', logoUrl: '/logos/myntra.png', categories: ['Fashion', 'Shopping', 'All'], denominations: [500, 1000, 2500], allowCustomAmount: false },
    { id: 'bookmyshow', name: 'BookMyShow Gift Card', logoUrl: '/logos/bms.png', categories: ['Entertainment', 'Popular', 'All'], denominations: [250, 500, 1000], allowCustomAmount: true, minCustomAmount: 100, maxCustomAmount: 5000 },
];

export const mockGiftCardCategoriesData = ['All', 'Popular', 'Shopping', 'Fashion', 'Entertainment', 'Food', 'Travel'];
