
export interface Restaurant {
    id: string;
    name: string;
    cuisine: string[];
    rating: number;
    deliveryTimeMinutes: number;
    priceForTwo: number;
    imageUrl: string;
    offers?: string[];
    isPureVeg?: boolean;
    distanceKm?: number;
    isPromoted?: boolean;
    isTrending?: boolean;
}
export interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    isVeg: boolean;
    isBestSeller?: boolean;
    imageUrl?: string;
}
export interface RestaurantDetails extends Restaurant {
    address: string;
    timings: string;
    menuCategories: string[];
    menuItems: MenuItem[];
}

export const mockRestaurantsData: Restaurant[] = [
    { id: 'r1', name: "Pizza Palace", cuisine: ["Pizza", "Italian", "Fast Food"], rating: 4.5, deliveryTimeMinutes: 35, priceForTwo: 700, imageUrl: "https://picsum.photos/seed/pizza/400/250", offers: ["50% OFF up to ₹100"], distanceKm: 2.1, isPromoted: true },
    { id: 'r2', name: "Biryani Bliss", cuisine: ["Biryani", "North Indian", "Mughlai"], rating: 4.2, deliveryTimeMinutes: 45, priceForTwo: 500, imageUrl: "https://picsum.photos/seed/biryani/400/250", offers: ["₹125 OFF above ₹249"], distanceKm: 4.5, isTrending: true },
];

export const mockCuisinesData = ["All", "North Indian", "South Indian", "Chinese", "Pizza", "Biryani", "Healthy", "Desserts", "Fast Food", "Italian", "Asian"];

export const sortOptionsData = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'rating', label: 'Rating: High to Low' },
    { value: 'deliveryTime', label: 'Delivery Time: Low to High' },
    { value: 'costLowHigh', label: 'Cost: Low to High' },
    { value: 'costHighLow', label: 'Cost: High to Low' },
];

export const getMockRestaurantDetailsData = async (id: string): Promise<RestaurantDetails | null> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const baseInfo = mockRestaurantsData.find(r => r.id === id);
    if (!baseInfo) return null;

    return {
        ...baseInfo,
        address: `123 Food Street, ${id === 'r1' ? 'Pizza Nagar' : 'Biryani Ville'}, Food City`,
        timings: "11:00 AM - 11:00 PM",
        menuCategories: ["Recommended", baseInfo.cuisine[0] || "Main Course", "Starters", "Beverages"],
        menuItems: [
            { id: 'm1', name: `${baseInfo.cuisine[0] || 'Special'} Item 1`, description: "Classic delicious item", price: 350, category: baseInfo.cuisine[0] || "Main Course", isVeg: true, isBestSeller: true },
            { id: 'm2', name: "Generic Starter", description: "A popular starter", price: 150, category: "Starters", isVeg: true },
            { id: 'm3', name: "Refreshing Drink", description: "Cool beverage", price: 50, category: "Beverages", isVeg: true },
        ]
    };
};
