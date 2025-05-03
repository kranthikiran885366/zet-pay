'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Clock, Info, Share2, Search, Heart } from 'lucide-react'; // Example icons
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Mock function to get restaurant details (replace with API call)
const getMockRestaurantDetails = async (id: string) => {
    console.log(`Fetching details for restaurant ${id}`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

    // Find the base restaurant info from the mock list (or fetch directly)
    const baseInfo = mockRestaurants.find(r => r.id === id);
    if (!baseInfo) return null;

    // Add more detailed mock data
    return {
        ...baseInfo,
        address: `123 Food Street, ${id === 'r1' ? 'Pizza Nagar' : 'Biryani Ville'}, Food City`,
        timings: "11:00 AM - 11:00 PM",
        menuCategories: ["Recommended", "Pizza", "Starters", "Pasta", "Beverages"],
        menuItems: [ // Example menu items
            { id: 'm1', name: "Margherita Pizza", description: "Classic cheese pizza", price: 350, category: "Pizza", isVeg: true, isBestSeller: true },
            { id: 'm2', name: "Pepperoni Pizza", description: "Pizza with pepperoni topping", price: 450, category: "Pizza", isVeg: false },
            { id: 'm3', name: "Garlic Bread", description: "Toasted bread with garlic butter", price: 150, category: "Starters", isVeg: true },
            { id: 'm4', name: "Chicken Pasta", description: "Creamy pasta with chicken", price: 400, category: "Pasta", isVeg: false, isBestSeller: true },
            { id: 'm5', name: "Coke", description: "Cold beverage", price: 50, category: "Beverages", isVeg: true },
        ]
    };
};

// Re-include mockRestaurants definition if this is a separate file
// (Or preferably, move shared interfaces/data to a common location)
interface Restaurant {
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
interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    isVeg: boolean;
    isBestSeller?: boolean;
    imageUrl?: string; // Optional image for menu items
}

interface RestaurantDetails extends Restaurant {
    address: string;
    timings: string;
    menuCategories: string[];
    menuItems: MenuItem[];
}

const mockRestaurants: Restaurant[] = [ // Keep this list consistent or import from shared location
    { id: 'r1', name: "Pizza Palace", cuisine: ["Pizza", "Italian", "Fast Food"], rating: 4.5, deliveryTimeMinutes: 35, priceForTwo: 700, imageUrl: "https://picsum.photos/seed/pizza/400/250", offers: ["50% OFF up to ₹100"], distanceKm: 2.1, isPromoted: true },
    { id: 'r2', name: "Biryani Bliss", cuisine: ["Biryani", "North Indian", "Mughlai"], rating: 4.2, deliveryTimeMinutes: 45, priceForTwo: 500, imageUrl: "https://picsum.photos/seed/biryani/400/250", offers: ["₹125 OFF above ₹249"], distanceKm: 4.5, isTrending: true },
    // ... include other restaurants from the list page
];


export default function RestaurantDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const restaurantId = typeof params.restaurantId === 'string' ? params.restaurantId : '';
    const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!restaurantId) {
            setError("Invalid Restaurant ID");
            setIsLoading(false);
            return;
        }

        const fetchDetails = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const details = await getMockRestaurantDetails(restaurantId);
                if (!details) {
                    throw new Error("Restaurant not found");
                }
                setRestaurant(details);
            } catch (err: any) {
                console.error("Failed to fetch restaurant details:", err);
                setError(err.message || "Failed to load restaurant details.");
                toast({ variant: "destructive", title: "Error", description: err.message });
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetails();
    }, [restaurantId, toast]);

    if (isLoading) {
        return <RestaurantDetailsSkeleton />; // Show skeleton while loading
    }

    if (error) {
        return (
             <div className="min-h-screen bg-secondary flex flex-col items-center justify-center p-4">
                 <p className="text-destructive mb-4">{error}</p>
                 <Button onClick={() => router.back()}>Go Back</Button>
             </div>
         );
    }

    if (!restaurant) {
         return ( // Should ideally not be reached if error handling is correct, but good fallback
             <div className="min-h-screen bg-secondary flex flex-col items-center justify-center p-4">
                 <p className="text-muted-foreground mb-4">Restaurant data not available.</p>
                 <Button onClick={() => router.back()}>Go Back</Button>
             </div>
         );
    }

    // TODO: Implement Add to Cart functionality

    return (
        <div className="min-h-screen bg-background flex flex-col">
             {/* Header with Back, Share, Favorite */}
            <header className="sticky top-0 z-50 bg-background p-3 flex items-center justify-between border-b">
                 <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                 <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon"><Heart className="h-5 w-5" /></Button> {/* Favorite */}
                    <Button variant="ghost" size="icon"><Share2 className="h-5 w-5" /></Button> {/* Share */}
                </div>
            </header>

            {/* Restaurant Info Section */}
            <div className="p-4 border-b">
                <h1 className="text-2xl font-bold mb-1">{restaurant.name}</h1>
                <p className="text-sm text-muted-foreground mb-2">{restaurant.cuisine.join(', ')}</p>
                <p className="text-sm text-muted-foreground mb-2">{restaurant.address}</p>
                <div className="flex items-center space-x-4 text-sm mb-2">
                    <span className="flex items-center gap-1 font-semibold text-green-600"><Star className="h-4 w-4 fill-current"/> {restaurant.rating.toFixed(1)}</span>
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4"/> {restaurant.deliveryTimeMinutes} min</span>
                    <span className="flex items-center gap-1">₹{restaurant.priceForTwo} for two</span>
                </div>
                 {restaurant.offers && restaurant.offers.length > 0 && (
                    <p className="text-xs text-destructive font-medium">{restaurant.offers[0]}</p>
                 )}
            </div>

            {/* Menu Section */}
             <div className="flex-grow p-4 space-y-4 pb-20"> {/* Added padding-bottom */}
                <div className="sticky top-[60px] bg-background z-40 py-2"> {/* Adjust top offset based on header height */}
                     {/* Search within menu */}
                     <Input placeholder="Search within menu..." className="h-9" />
                     {/* Veg/Non-Veg Toggle */}
                     {/* Add Category Chips/Tabs */}
                 </div>

                {/* Menu Items */}
                {restaurant.menuCategories.map(category => (
                    <div key={category}>
                        <h2 className="text-lg font-semibold my-3">{category}</h2>
                        <div className="space-y-3">
                             {restaurant.menuItems.filter(item => item.category === category).map(item => (
                                <MenuItemCard key={item.id} item={item} />
                            ))}
                        </div>
                    </div>
                 ))}
            </div>

            {/* Fixed Cart Button (Example) */}
             <div className="fixed bottom-0 left-0 right-0 bg-primary text-primary-foreground p-3 shadow-lg flex justify-between items-center">
                 <span>Items: 0 | Total: ₹0.00</span>
                 <Button variant="secondary" className="bg-white text-primary hover:bg-gray-100">View Cart</Button>
            </div>
        </div>
    );
}

// Menu Item Card Component
interface MenuItemCardProps {
    item: MenuItem;
}

function MenuItemCard({ item }: MenuItemCardProps) {
    // TODO: Implement Add to Cart logic
    const handleAddToCart = () => {
        alert(`Adding ${item.name} to cart!`);
    };

    return (
         <div className="flex items-start justify-between gap-4 py-3 border-b last:border-none">
            <div className="flex-grow">
                 {/* Veg/Non-Veg Indicator */}
                 <span className={`inline-block w-3 h-3 border ${item.isVeg ? 'border-green-600 bg-green-600' : 'border-red-600 bg-red-600'} mr-1`}>
                    <span className="sr-only">{item.isVeg ? 'Veg' : 'Non-Veg'}</span>
                 </span>
                 <p className="font-semibold">{item.name}</p>
                 {item.isBestSeller && <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-500 mt-0.5">Bestseller</Badge>}
                 <p className="text-sm text-muted-foreground mt-0.5">₹{item.price.toFixed(2)}</p>
                 <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
            </div>
            <div className="flex-shrink-0 w-24 text-right relative">
                 {/* Optional Image */}
                 {item.imageUrl && (
                    <Image src={item.imageUrl} alt={item.name} width={96} height={96} className="rounded-md object-cover mb-2" data-ai-hint="menu item food photo"/>
                 )}
                <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={handleAddToCart}>
                    ADD
                </Button>
            </div>
        </div>
    );
}


// Skeleton Loader for Restaurant Details
function RestaurantDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-50 bg-background p-3 flex items-center justify-between border-b">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </header>

      {/* Info Skeleton */}
      <div className="p-4 border-b space-y-2">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <div className="flex items-center space-x-4">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-4 w-1/3" />
      </div>

      {/* Menu Skeleton */}
      <div className="flex-grow p-4 space-y-6 pb-20">
        <Skeleton className="h-9 w-full" /> {/* Search Skeleton */}
        {[1, 2, 3].map(i => (
          <div key={i}>
            <Skeleton className="h-6 w-1/3 my-3" />
            <div className="space-y-4">
              {[1, 2].map(j => (
                <div key={j} className="flex items-start justify-between gap-4 py-3 border-b last:border-none">
                  <div className="flex-grow space-y-1.5">
                    <Skeleton className="h-5 w-3/5" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                  <Skeleton className="h-20 w-24 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

       {/* Fixed Cart Button Skeleton */}
       <div className="fixed bottom-0 left-0 right-0 bg-muted p-3 shadow-lg flex justify-between items-center">
           <Skeleton className="h-6 w-32" />
           <Skeleton className="h-9 w-24" />
       </div>
    </div>
  );
}
