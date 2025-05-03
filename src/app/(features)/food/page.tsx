'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, UtensilsCrossed, Search, Filter, Star, MapPin, Bike, Percent, Clock, ArrowUpDown, Flame, IndianRupee, CheckCircle, Salad } from 'lucide-react'; // Added more icons
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation'; // Import useRouter
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu"; // Import DropdownMenu components
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

// Mock Data (Replace with actual API calls)
interface Restaurant {
    id: string;
    name: string;
    cuisine: string[];
    rating: number;
    deliveryTimeMinutes: number; // Store time in minutes for sorting
    priceForTwo: number; // Store price for sorting
    imageUrl: string;
    offers?: string[];
    isPureVeg?: boolean;
    distanceKm?: number; // Store distance for display/sorting
    isPromoted?: boolean; // e.g., Zomato Gold / Swiggy One partners
    isTrending?: boolean; // For a trending badge
}

const mockRestaurants: Restaurant[] = [
    { id: 'r1', name: "Pizza Palace", cuisine: ["Pizza", "Italian", "Fast Food"], rating: 4.5, deliveryTimeMinutes: 35, priceForTwo: 700, imageUrl: "https://picsum.photos/seed/pizza/400/250", offers: ["50% OFF up to ₹100"], distanceKm: 2.1, isPromoted: true },
    { id: 'r2', name: "Biryani Bliss", cuisine: ["Biryani", "North Indian", "Mughlai"], rating: 4.2, deliveryTimeMinutes: 45, priceForTwo: 500, imageUrl: "https://picsum.photos/seed/biryani/400/250", offers: ["₹125 OFF above ₹249"], distanceKm: 4.5, isTrending: true },
    { id: 'r3', name: "Green Leaf Cafe", cuisine: ["South Indian", "Healthy Food", "Vegan"], rating: 4.8, deliveryTimeMinutes: 25, priceForTwo: 300, imageUrl: "https://picsum.photos/seed/vegcafe/400/250", isPureVeg: true, distanceKm: 1.5 },
    { id: 'r4', name: "Dragon Wok", cuisine: ["Chinese", "Asian", "Thai"], rating: 4.0, deliveryTimeMinutes: 40, priceForTwo: 800, imageUrl: "https://picsum.photos/seed/chinese/400/250", offers: ["Free Delivery"], distanceKm: 3.8 },
    { id: 'r5', name: "Burger Barn", cuisine: ["Burgers", "American", "Fast Food"], rating: 4.3, deliveryTimeMinutes: 30, priceForTwo: 450, imageUrl: "https://picsum.photos/seed/burger/400/250", distanceKm: 2.9, isTrending: true },
    { id: 'r6', name: "Curry House", cuisine: ["North Indian", "Punjabi"], rating: 3.9, deliveryTimeMinutes: 50, priceForTwo: 600, imageUrl: "https://picsum.photos/seed/curry/400/250", distanceKm: 5.2 },
];

const mockCuisines = ["All", "North Indian", "South Indian", "Chinese", "Pizza", "Biryani", "Healthy", "Desserts", "Fast Food", "Italian", "Asian"];
const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'rating', label: 'Rating: High to Low' },
    { value: 'deliveryTime', label: 'Delivery Time: Low to High' },
    { value: 'costLowHigh', label: 'Cost: Low to High' },
    { value: 'costHighLow', label: 'Cost: High to Low' },
];

export default function OrderFoodPage() {
    const [location, setLocation] = useState("Current Location"); // Could be dynamic
    const [searchQuery, setSearchQuery] = useState('');
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCuisine, setSelectedCuisine] = useState<string>("All");
    const [sortBy, setSortBy] = useState<string>("relevance");
    const [filters, setFilters] = useState({
        rating: 0, // Minimum rating (0 means no filter)
        maxDeliveryTime: 0, // Max delivery time in minutes (0 means no filter)
        isPureVeg: false,
        hasOffer: false,
    });
    const { toast } = useToast();
    const router = useRouter(); // Initialize router

    // Fetch restaurants on load
    useEffect(() => {
        const fetchRestaurants = async () => {
            setIsLoading(true);
            try {
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1000));
                setRestaurants(mockRestaurants); // Use mock data
            } catch (error) {
                console.error("Failed to fetch restaurants:", error);
                toast({ variant: "destructive", title: "Error Loading Restaurants" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchRestaurants();
    }, [toast]);

    // Filter and Sort restaurants based on state
    const processedRestaurants = restaurants
        .filter(r => {
            const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                r.cuisine.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCuisine = selectedCuisine === "All" || r.cuisine.includes(selectedCuisine);
            const matchesRating = filters.rating === 0 || r.rating >= filters.rating;
            const matchesDeliveryTime = filters.maxDeliveryTime === 0 || r.deliveryTimeMinutes <= filters.maxDeliveryTime;
            const matchesPureVeg = !filters.isPureVeg || r.isPureVeg === true;
            const matchesOffer = !filters.hasOffer || (r.offers && r.offers.length > 0);

            return matchesSearch && matchesCuisine && matchesRating && matchesDeliveryTime && matchesPureVeg && matchesOffer;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'rating': return b.rating - a.rating;
                case 'deliveryTime': return a.deliveryTimeMinutes - b.deliveryTimeMinutes;
                case 'costLowHigh': return a.priceForTwo - b.priceForTwo;
                case 'costHighLow': return b.priceForTwo - a.priceForTwo;
                case 'relevance': // Add relevance logic if needed, otherwise default sort
                default: return 0; // Keep original order or implement relevance
            }
        });

    const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-2 shadow-md">
                <Link href="/" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                 {/* Location Button (Enhanced) */}
                 <Button variant="ghost" size="sm" className="text-left h-auto p-0 hover:bg-primary/80">
                    <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-grow">
                            <p className="text-sm font-semibold truncate">{location}</p>
                            <p className="text-xs opacity-80 truncate">Tap to change location</p>
                        </div>
                    </div>
                </Button>
                {/* Profile/Search Icons (Optional) */}
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                {/* Search Bar */}
                <div className="relative">
                     <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search for restaurants, cuisines, or dishes"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-10"
                    />
                </div>

                {/* Filters & Sorting Section */}
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex space-x-2 pb-3 items-center">
                        {/* Main Filter Button */}
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button variant="outline" size="sm" className="h-7 px-3 text-xs flex-shrink-0">
                               <Filter className="h-3 w-3 mr-1" /> Filters
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent>
                             <DropdownMenuLabel>Apply Filters</DropdownMenuLabel>
                             <DropdownMenuSeparator />
                              <DropdownMenuCheckboxItem
                                checked={filters.isPureVeg}
                                onCheckedChange={(checked) => handleFilterChange('isPureVeg', checked)}
                              >
                                <Salad className="h-3 w-3 mr-1" /> Pure Veg
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={filters.hasOffer}
                                onCheckedChange={(checked) => handleFilterChange('hasOffer', checked)}
                              >
                                 <Percent className="h-3 w-3 mr-1" /> Offers
                              </DropdownMenuCheckboxItem>
                               <DropdownMenuSeparator />
                               {/* Rating Filter - Example */}
                                <DropdownMenuLabel>Min Rating</DropdownMenuLabel>
                                 <DropdownMenuRadioGroup value={String(filters.rating)} onValueChange={(v) => handleFilterChange('rating', Number(v))}>
                                    <DropdownMenuRadioItem value="0">Any</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="4.5">4.5+</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="4.0">4.0+</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="3.5">3.5+</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                                {/* Add more filters like delivery time ranges */}
                           </DropdownMenuContent>
                         </DropdownMenu>

                        {/* Sort By Dropdown */}
                        <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button variant="outline" size="sm" className="h-7 px-3 text-xs flex-shrink-0">
                                <ArrowUpDown className="h-3 w-3 mr-1" /> Sort By
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent>
                             <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                             <DropdownMenuSeparator />
                             <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                               {sortOptions.map(option => (
                                 <DropdownMenuRadioItem key={option.value} value={option.value}>
                                   {option.label}
                                 </DropdownMenuRadioItem>
                               ))}
                             </DropdownMenuRadioGroup>
                           </DropdownMenuContent>
                         </DropdownMenu>

                        {/* Cuisine Filters */}
                        {mockCuisines.map(cuisine => (
                            <Button
                                key={cuisine}
                                variant={selectedCuisine === cuisine ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedCuisine(cuisine)}
                                className="rounded-full h-7 px-3 text-xs flex-shrink-0"
                            >
                                {cuisine}
                            </Button>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>

                {/* Restaurant List */}
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold">Restaurants Near You</h2>
                    {isLoading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[...Array(4)].map((_, i) => <RestaurantCardSkeleton key={i} />)}
                        </div>
                    )}
                     {!isLoading && processedRestaurants.length === 0 && (
                         <Card className="shadow-sm text-center">
                             <CardContent className="p-6">
                                 <p className="text-muted-foreground">No restaurants found matching your criteria.</p>
                                 {/* Button to clear filters? */}
                             </CardContent>
                         </Card>
                     )}
                     {!isLoading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {processedRestaurants.map(restaurant => (
                                <RestaurantCard key={restaurant.id} restaurant={restaurant} router={router} />
                            ))}
                        </div>
                     )}
                </div>
            </main>
        </div>
    );
}


// Restaurant Card Component
interface RestaurantCardProps {
    restaurant: Restaurant;
    router: any; // Pass router instance
}

function RestaurantCard({ restaurant, router }: RestaurantCardProps) {
    const handleClick = () => {
        // Navigate to a dynamic restaurant details page
         router.push(`/food/${restaurant.id}`);
    };

    return (
        <Card className="shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={handleClick}>
            <div className="relative w-full h-40"> {/* Increased height */}
                 <Image
                    src={restaurant.imageUrl}
                    alt={restaurant.name}
                    fill // Use fill instead of layout
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Responsive sizes
                    style={{ objectFit: 'cover' }} // Use objectFit style
                    data-ai-hint="restaurant food dish photo"
                    priority={restaurant.isPromoted || restaurant.isTrending} // Prioritize loading for promoted/trending
                />
                 {/* Offer Badge */}
                 {restaurant.offers && restaurant.offers.length > 0 && (
                    <Badge variant="destructive" className="absolute bottom-2 left-2 text-xs flex items-center gap-1 z-10">
                         <Percent className="h-3 w-3"/> {restaurant.offers[0]}
                    </Badge>
                 )}
                 {/* Promoted Badge */}
                  {restaurant.isPromoted && (
                    <Badge variant="secondary" className="absolute top-2 left-2 text-xs flex items-center gap-1 z-10 bg-yellow-400 text-black">
                         <Star className="h-3 w-3"/> Promoted
                    </Badge>
                 )}
                 {/* Trending Badge */}
                   {restaurant.isTrending && (
                    <Badge variant="default" className="absolute top-2 right-2 text-xs flex items-center gap-1 z-10 bg-orange-500 text-white">
                         <Flame className="h-3 w-3"/> Trending
                    </Badge>
                 )}
            </div>
            <CardContent className="p-3">
                <div className="flex justify-between items-start mb-1">
                     <CardTitle className="text-base font-semibold">{restaurant.name}</CardTitle>
                      <Badge variant="default" className="text-xs h-5 px-1.5 flex items-center gap-1 bg-green-600 text-white">
                        {restaurant.rating.toFixed(1)} <Star className="h-3 w-3 fill-current"/>
                     </Badge>
                </div>
                 <CardDescription className="text-xs text-muted-foreground truncate mb-2">{restaurant.cuisine.join(', ')}</CardDescription>
                 <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                     <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{restaurant.deliveryTimeMinutes} min</span>
                     {restaurant.distanceKm && <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{restaurant.distanceKm.toFixed(1)} km</span>}
                     <span className="flex items-center gap-0.5"><IndianRupee className="h-3 w-3"/>{restaurant.priceForTwo} for two</span>
                 </div>
                  {restaurant.isPureVeg && <p className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle className="h-3 w-3"/> Pure Veg</p>}
            </CardContent>
        </Card>
    );
}

// Skeleton Loader for Restaurant Card
function RestaurantCardSkeleton() {
    return (
        <Card className="shadow-sm overflow-hidden">
            <Skeleton className="h-40 w-full" />
            <CardContent className="p-3 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/4" />
                     <Skeleton className="h-4 w-1/4" />
                </div>
            </CardContent>
        </Card>
    );
}

// Mock dynamic restaurant page (Create /app/food/[restaurantId]/page.tsx)
// export default function RestaurantDetailsPage({ params }: { params: { restaurantId: string } }) {
//     return <div>Details for Restaurant ID: {params.restaurantId} (Not Implemented)</div>;
// }
