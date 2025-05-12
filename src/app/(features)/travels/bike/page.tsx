
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bike as Motorbike, MapPin, Filter, Loader2, Wallet, Search, Clock } from 'lucide-react';
import Link from 'next/link';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { mockBikesData } from '@/mock-data'; // Import centralized mock data
import type { BikeListing } from '@/services/booking'; // Ensure type consistency

export default function BikeRentalPage() {
    const [locationQuery, setLocationQuery] = useState('');
    const [searchResults, setSearchResults] = useState<BikeListing[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedBike, setSelectedBike] = useState<BikeListing | null>(null);
    const [rentalDuration, setRentalDuration] = useState<'hour' | 'day'>('hour');
    const [isBooking, setIsBooking] = useState(false);
    const { toast } = useToast();

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setIsLoading(true);
        setShowResults(false);
        setSearchResults([]);
        setSelectedBike(null);
        console.log("Searching Bikes near:", locationQuery || "Current Location");
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const results = mockBikesData.filter(bike => bike.availability === 'Available' && Math.random() > 0.1);
            setSearchResults(results);
            setShowResults(true);
            if (results.length === 0) {
                toast({ description: "No bikes available nearby or matching your search." });
            }
        } catch (error) {
            console.error("Bike search failed:", error);
            toast({ variant: "destructive", title: "Search Failed", description: "Could not fetch bike listings." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectBike = (bike: BikeListing) => {
        setSelectedBike(bike);
        handleConfirmBooking(bike);
    };

     const handleConfirmBooking = async (bike: BikeListing) => {
        setIsBooking(true);
        const cost = rentalDuration === 'hour' ? bike.pricePerHour : bike.pricePerDay;
        console.log(`Booking Bike: ${bike.name}, Duration: ${rentalDuration}, Cost: ${cost}`);
        try {
             await new Promise(resolve => setTimeout(resolve, 1500));
              toast({ title: "Booking Successful!", description: `Booked ${bike.name} for 1 ${rentalDuration}. Cost: ₹${cost}. Unlock using the app.` });
             setSelectedBike(null);
             setShowResults(false);
        } catch (error) {
             console.error("Bike booking failed:", error);
             toast({ variant: "destructive", title: "Booking Failed", description: "Could not confirm your bike booking." });
        } finally {
             setIsBooking(false);
        }
    }

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/services" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Motorbike className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Rent a Bike</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                 {!showResults ? (
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle>Find Bikes Nearby</CardTitle>
                            <CardDescription>Search for available bikes for rent.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSearch} className="space-y-4">
                                 <div className="space-y-1">
                                    <Label htmlFor="locationQuery">Location (or use current)</Label>
                                    <Input
                                        id="locationQuery"
                                        placeholder="Enter area, landmark, or hub name"
                                        value={locationQuery}
                                        onChange={(e) => setLocationQuery(e.target.value)}
                                    />
                                </div>
                                <Button type="submit" className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                    {isLoading ? 'Searching...' : 'Find Bikes'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                 ) : (
                     <div className="space-y-4">
                         <Button variant="outline" onClick={() => setShowResults(false)} className="mb-4">
                             <ArrowLeft className="mr-2 h-4 w-4"/> Modify Search
                         </Button>
                          <div className="flex justify-between items-center mb-2">
                             <h2 className="text-lg font-semibold">{searchResults.length} Bikes Found</h2>
                              <Button variant="ghost" size="sm"><Filter className="mr-1 h-4 w-4"/> Filter</Button>
                         </div>
                         {searchResults.map(bike => (
                            <Card key={bike.id} className="shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex flex-col sm:flex-row">
                                    <div className="relative w-full sm:w-32 h-32 sm:h-auto flex-shrink-0">
                                         <Image src={bike.imageUrl} alt={bike.name} layout="fill" objectFit="cover" className="rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none" data-ai-hint="bike scooter photo"/>
                                         {bike.type === 'Electric' && bike.batteryPercent !== undefined && (
                                             <Badge variant={bike.batteryPercent < 20 ? "destructive" : "default"} className="absolute top-1 right-1 text-xs">
                                                 {bike.batteryPercent}% Bat
                                             </Badge>
                                         )}
                                    </div>
                                    <div className="flex-grow p-3">
                                        <CardTitle className="text-base mb-1">{bike.name}</CardTitle>
                                         <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
                                             <span>{bike.type}</span>
                                             <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/> {bike.location}</span>
                                             {bike.requiresHelmet && <Badge variant="outline" className="text-xs">Helmet Required</Badge>}
                                         </div>
                                         <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-sm">₹{bike.pricePerHour}/hr</p>
                                                <p className="text-sm">₹{bike.pricePerDay}/day</p>
                                            </div>
                                            <div className="text-right">
                                                 {isBooking && selectedBike?.id === bike.id ? (
                                                    <Button className="mt-1 h-8" disabled>
                                                        <Loader2 className="h-4 w-4 animate-spin"/>
                                                    </Button>
                                                 ) : (
                                                    <Button className="mt-1 h-8" onClick={() => handleSelectBike(bike)} disabled={isBooking}>
                                                        Book Now
                                                    </Button>
                                                 )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                         ))}
                    </div>
                 )}
            </main>
        </div>
    );
}
