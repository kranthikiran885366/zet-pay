
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, UtensilsCrossed, Search, Filter, Star, MapPin, Bike, Percent, Clock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from "@/hooks/use-toast";

// Mock Data (Replace with actual API calls)
interface Restaurant {
    id: string;
    name: string;
    cuisine: string[];
    rating: number;
    deliveryTime: string; // e.g., "30-40 min"
    priceRange: string; // e.g., "₹₹" (for avg cost for two)
    imageUrl: string;
    offers?: string[];
    isPureVeg?: boolean;
    distance?: string; // e.g. "3 km"
}

const mockRestaurants: Restaurant[] = [
    { id: 'r1', name: "Pizza Palace", cuisine: ["Pizza", "Italian", "Fast Food"], rating: 4.5, deliveryTime: "35 min", priceRange: "₹₹₹", imageUrl: "https://picsum.photos/seed/pizza/400/250", offers: ["50% OFF up to ₹100"], distance: "2.1 km" },
    { id: 'r2', name: "Biryani Bliss", cuisine: ["Biryani", "North Indian", "Mughlai"], rating: 4.2, deliveryTime: "45 min", priceRange: "₹₹", imageUrl: "https://picsum.photos/seed/biryani/400/250", offers: ["₹125 OFF above ₹249"], distance: "4.5 km" },
    { id: 'r3', name: "Green Leaf Cafe", cuisine: ["South Indian", "Healthy Food"], rating: 4.8, deliveryTime: "25 min", priceRange: "₹", imageUrl: "https://picsum.photos/seed/vegcafe/400/250", isPureVeg: true, distance: "1.5 km" },
    { id: 'r4', name: "Dragon Wok", cuisine: ["Chinese", "Asian", "Thai"], rating: 4.0, deliveryTime: "40 min", priceRange: "₹₹₹", imageUrl: "https://picsum.photos/seed/chinese/400/250", offers: ["Free Delivery"], distance: "3.8 km" },
    { id: 'r5', name: "Burger Barn", cuisine: ["Burgers", "American", "Fast Food"], rating: 4.3, deliveryTime: "30 min", priceRange: "₹₹", imageUrl: "https://picsum.photos/seed/burger/400/250", distance: "2.9 km" },
];

const mockCuisines = ["All", "North Indian", "South Indian", "Chinese", "Pizza", "Biryani", "Healthy", "Desserts", "Fast Food"];

export default function OrderFoodPage() {
    const [location, setLocation] = useState("Current Location"); // Could be dynamic
    const [searchQuery, setSearchQuery] = useState('');
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

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

    // Filter restaurants based on search query (simple client-side filter)
    const filteredRestaurants = restaurants.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.cuisine.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                 <UtensilsCrossed className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Order Food</h1>
                 {/* Location Button (Optional) */}
                {/* <Button variant="ghost" size="sm" className="ml-auto text-xs text-primary-foreground hover:bg-primary/80">
                    <MapPin className="h-4 w-4 mr-1"/> {location}
                </Button> */}
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                {/* Search & Filters */}
                <div className="flex gap-2 items-center sticky top-[60px] z-40 bg-secondary pt-2 pb-2"> {/* Make search/filter sticky */}
                    <div className="relative flex-grow">
                         <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search for restaurants or dishes"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-9"
                        />
                    </div>
                    <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0">
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>

                {/* Cuisine Carousel */}
                 <ScrollArea className="w-full whitespace-nowrap -mt-2">
                    <div className="flex space-x-3 pb-3">
                        {mockCuisines.map(cuisine => (
                            <Button key={cuisine} variant="outline" size="sm" className="rounded-full h-7 px-3 text-xs flex-shrink-0">
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
                            {[...Array(4)].map((_, i) => <RestaurantSkeleton key={i} />)}
                        </div>
                    )}
                     {!isLoading && filteredRestaurants.length === 0 && (
                         <Card className="shadow-sm text-center">
                             <CardContent className="p-6">
                                 <p className="text-muted-foreground">No restaurants found matching your search "{searchQuery}".</p>
                             </CardContent>
                         </Card>
                     )}
                     {!isLoading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredRestaurants.map(restaurant => (
                                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
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
}

function RestaurantCard({ restaurant }: RestaurantCardProps) {
    // Mock onClick handler
    const handleClick = () => {
        alert(`Navigating to ${restaurant.name}... (Not Implemented)`);
        // router.push(`/food/${restaurant.id}`);
    };

    return (
        <Card className="shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={handleClick}>
            <div className="relative w-full h-32">
                 <Image
                    src={restaurant.imageUrl}
                    alt={restaurant.name}
                    layout="fill"
                    objectFit="cover"
                    data-ai-hint="restaurant food dish photo"
                />
                 {/* Offer Badge */}
                 {restaurant.offers && restaurant.offers.length > 0 && (
                    <Badge variant="destructive" className="absolute bottom-2 left-2 text-xs flex items-center gap-1">
                         <Percent className="h-3 w-3"/> {restaurant.offers[0]}
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
                 <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{restaurant.deliveryTime}</span>
                     <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{restaurant.distance}</span>
                    <span>{restaurant.priceRange}</span>
                 </div>
                  {restaurant.isPureVeg && <p className="text-xs text-green-600 font-medium mt-1">Pure Veg</p>}
            </CardContent>
        </Card>
    );
}

// Skeleton Loader for Restaurant Card
function RestaurantSkeleton() {
    return (
        <Card className="shadow-sm overflow-hidden">
            <div className="relative w-full h-32 bg-muted animate-pulse"></div>
            <CardContent className="p-3 space-y-2">
                <div className="h-5 w-3/4 bg-muted animate-pulse rounded"></div>
                <div className="h-4 w-1/2 bg-muted animate-pulse rounded"></div>
                <div className="flex justify-between items-center">
                    <div className="h-4 w-1/4 bg-muted animate-pulse rounded"></div>
                    <div className="h-4 w-1/4 bg-muted animate-pulse rounded"></div>
                     <div className="h-4 w-1/4 bg-muted animate-pulse rounded"></div>
                </div>
            </CardContent>
        </Card>
    );
}
