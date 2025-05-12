
export interface GamingPlatform {
    id: string;
    name: string;
    logoUrl?: string;
}
export const mockGamingPlatformsData: GamingPlatform[] = [
    { id: 'google-play', name: 'Google Play Recharge Code', logoUrl: '/logos/googleplay.png' },
    { id: 'freefire', name: 'Garena Free Fire Diamonds', logoUrl: '/logos/freefire.png' },
];

export interface GamingVoucher {
    id: string;
    value: number; // INR value
    description?: string;
}
export const mockGamingVouchersData: { [platformId: string]: GamingVoucher[] } = {
    'google-play': [
        { id: 'gp-100', value: 100 }, { id: 'gp-300', value: 300 },
    ],
    'freefire': [
        { id: 'ff-100d', value: 80, description: '100 Diamonds' }, { id: 'ff-310d', value: 240, description: '310 Diamonds' },
    ],
};

export interface DigitalVoucherBrand {
    id: string;
    name: string;
    logoUrl?: string;
    denominations: number[];
    allowCustomAmount: boolean;
    minAmount?: number;
    maxAmount?: number;
}
export const mockDigitalVoucherBrandsData: DigitalVoucherBrand[] = [
    { id: 'google-play-voucher', name: 'Google Play Recharge Code', logoUrl: '/logos/googleplay.png', denominations: [100, 300, 500], allowCustomAmount: true, minAmount: 10, maxAmount: 5000 },
    { id: 'apple-store-voucher', name: 'App Store & iTunes Code', logoUrl: '/logos/appstore.png', denominations: [500, 1000], allowCustomAmount: false },
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
    { id: 'amazon', name: 'Amazon Pay Gift Card', logoUrl: '/logos/amazon.png', categories: ['Shopping', 'Popular'], denominations: [100, 250, 500], allowCustomAmount: true, minCustomAmount: 50, maxCustomAmount: 10000 },
    { id: 'flipkart', name: 'Flipkart Gift Card', logoUrl: '/logos/flipkart.png', categories: ['Shopping', 'Popular'], denominations: [250, 500], allowCustomAmount: false },
];

export const mockGiftCardCategoriesData = ['All', 'Popular', 'Shopping', 'Fashion', 'Entertainment'];
