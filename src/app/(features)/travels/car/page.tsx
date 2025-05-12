
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Car, CalendarIcon, Clock, MapPin, Filter, Users, Briefcase, Loader2, CheckCircle, Wallet, Check, Fuel, Gauge, Settings } from 'lucide-react';
import Link from 'next/link';
import { format, addDays, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { mockCities, mockCarsData } from '@/mock-data'; // Import centralized mock data
import type { CarListing } from '@/services/booking'; // Ensure type consistency

export default function CarRentalPage() {
    const [pickupCity, setPickupCity] = useState('');
    const [pickupDate, setPickupDate] = useState<Date | undefined>(new Date());
    const [dropoffDate, setDropoffDate] = useState<Date | undefined>(addDays(new Date(), 1));
    const [searchResults, setSearchResults] = useState<CarListing[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedCar, setSelectedCar] = useState<CarListing | null>(null);
    const [isBooking, setIsBooking] = useState(false);
    const { toast } = useToast();

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!pickupCity || !pickupDate || !dropoffDate || differenceInDays(dropoffDate, pickupDate) < 0) {
            toast({ variant: "destructive", title: "Please select City, Pickup & Drop-off Dates" });
            return;
        }
        setIsLoading(true);
        setShowResults(false);
        setSearchResults([]);
        setSelectedCar(null);
        console.log("Searching Cars:", { city: pickupCity, pickup: format(pickupDate, 'yyyy-MM-dd'), dropoff: format(dropoffDate, 'yyyy-MM-dd') });
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const results = mockCarsData.filter(car => car.isAvailable && Math.random() > 0.2);
            setSearchResults(results);
            setShowResults(true);
            if (results.length === 0) {
                toast({ description: "No cars found for the selected criteria." });
            }
        } catch (error) {
            console.error("Car search failed:", error);
            toast({ variant: "destructive", title: "Search Failed", description: "Could not fetch car listings." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectCar = (car: CarListing) => {
        setSelectedCar(car);
         handleConfirmBooking(car);
    };

     const handleConfirmBooking = async (car: CarListing) => {
        setIsBooking(true);
        const rentalDays = differenceInDays(dropoffDate!, pickupDate!) + 1;
        const totalCost = rentalDays * car.pricePerDay;
        console.log(`Booking Car: ${car.name}, Days: ${rentalDays}, Total: ${totalCost}`);
        try {
             await new Promise(resolve => setTimeout(resolve, 2000));
              toast({ title: "Booking Successful!", description: `Booked ${car.name} for ${rentalDays} days. Total: ₹${totalCost}. Please complete payment.` });
             setSelectedCar(null);
             setShowResults(false);
        } catch (error) {
             console.error("Car booking failed:", error);
             toast({ variant: "destructive", title: "Booking Failed", description: "Could not confirm your car booking." });
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
                <Car className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Rent a Car</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                 {!showResults ? (
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle>Find Your Ride</CardTitle>
                            <CardDescription>Search for self-drive or chauffeur-driven cars.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSearch} className="space-y-4">
                                 <div className="space-y-1">
                                    <Label htmlFor="pickupCity">Pickup City</Label>
                                    <Select value={pickupCity} onValueChange={setPickupCity} required>
                                        <SelectTrigger id="pickupCity"><SelectValue placeholder="Select City" /></SelectTrigger>
                                        <SelectContent>
                                            {mockCities.map(city => <SelectItem key={`city-${city}`} value={city}>{city}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="pickupDate">Pickup Date</Label>
                                         <Popover>
                                            <PopoverTrigger asChild>
                                                <Button id="pickupDate" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !pickupDate && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {pickupDate ? format(pickupDate, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                 <Calendar mode="single" selected={pickupDate} onSelect={setPickupDate} initialFocus disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}/>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                     <div className="space-y-1">
                                        <Label htmlFor="dropoffDate">Drop-off Date</Label>
                                         <Popover>
                                            <PopoverTrigger asChild>
                                                <Button id="dropoffDate" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dropoffDate && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {dropoffDate ? format(dropoffDate, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                 <Calendar mode="single" selected={dropoffDate} onSelect={setDropoffDate} initialFocus disabled={(date) => date < (pickupDate || new Date(new Date().setHours(0,0,0,0)))}/>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                <Button type="submit" className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                    {isLoading ? 'Searching...' : 'Search Cars'}
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
                             <h2 className="text-lg font-semibold">{searchResults.length} Cars Found</h2>
                              <Button variant="ghost" size="sm"><Filter className="mr-1 h-4 w-4"/> Filter</Button>
                         </div>
                         {searchResults.map(car => (
                            <Card key={car.id} className="shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex flex-col sm:flex-row">
                                    <div className="relative w-full sm:w-48 h-32 sm:h-auto flex-shrink-0">
                                         <Image src={car.imageUrl} alt={car.name} layout="fill" objectFit="cover" className="rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none" data-ai-hint="car exterior photo"/>
                                    </div>
                                    <div className="flex-grow p-3">
                                        <CardTitle className="text-base mb-1">{car.name}</CardTitle>
                                         <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
                                             <span className="flex items-center gap-1"><Car className="h-3 w-3"/> {car.type}</span>
                                             <span className="flex items-center gap-1"><Settings className="h-3 w-3"/> {car.transmission}</span>
                                             <span className="flex items-center gap-1"><Fuel className="h-3 w-3"/> {car.fuelType}</span>
                                             <span className="flex items-center gap-1"><Users className="h-3 w-3"/> {car.seats} Seats</span>
                                             {car.kmsLimit && <span className="flex items-center gap-1"><Gauge className="h-3 w-3"/> {car.kmsLimit}</span>}
                                         </div>
                                         <div className="flex justify-between items-end">
                                            <div>
                                                 <p className="text-xs text-muted-foreground">{car.location}</p>
                                                 <Badge variant="outline" className="text-xs mt-1">{car.rating} ★</Badge>
                                            </div>
                                            <div className="text-right">
                                                 <p className="text-lg font-bold">₹{car.pricePerDay}/day</p>
                                                 {isBooking && selectedCar?.id === car.id ? (
                                                    <Button className="mt-1 h-8" disabled>
                                                        <Loader2 className="h-4 w-4 animate-spin"/>
                                                    </Button>
                                                 ) : (
                                                     <Button className="mt-1 h-8" onClick={() => handleSelectCar(car)} disabled={isBooking}>
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
