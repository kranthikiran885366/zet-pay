'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Car, Bike as Motorbike, CalendarIcon, Clock, MapPin, Filter, Users, Briefcase, Loader2, CheckCircle, Wallet, Check, Fuel, Gauge, Settings } from 'lucide-react';
import Link from 'next/link';
import { format, addDays, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs
import { confirmBooking, searchBookings } from '@/services/booking'; // Use booking service
import type { BookingSearchResult, BookingConfirmation, CarListing, BikeListing } from '@/services/types'; // Import types

// Mock Data (Combine Car and Bike mock data here or import)
const mockCars: CarListing[] = [
    { id: 'c1', name: 'Maruti Swift', type: 'Hatchback', transmission: 'Manual', fuelType: 'Petrol', seats: 5, imageUrl: 'https://picsum.photos/seed/swift/300/200', pricePerDay: 1200, rating: 4.2, location: 'Airport Road', kmsLimit: '150 Kms/day', isAvailable: true },
    { id: 'c2', name: 'Honda City', type: 'Sedan', transmission: 'Automatic', fuelType: 'Petrol', seats: 5, imageUrl: 'https://picsum.photos/seed/city/300/200', pricePerDay: 1800, rating: 4.5, location: 'Koramangala', kmsLimit: '200 Kms/day', isAvailable: true },
    { id: 'c3', name: 'Toyota Innova Crysta', type: 'SUV', transmission: 'Manual', fuelType: 'Diesel', seats: 7, imageUrl: 'https://picsum.photos/seed/innova/300/200', pricePerDay: 2500, rating: 4.6, location: 'Majestic', kmsLimit: '250 Kms/day', isAvailable: true },
];

const mockBikes: BikeListing[] = [
    { id: 'b1', name: 'Honda Activa 6G', type: 'Scooter', imageUrl: 'https://picsum.photos/seed/activa/300/200', pricePerHour: 30, pricePerDay: 300, location: 'Koramangala Hub', availability: 'Available', requiresHelmet: true },
    { id: 'b2', name: 'Bounce Infinity E1', type: 'Electric', imageUrl: 'https://picsum.photos/seed/bounce/300/200', pricePerHour: 25, pricePerDay: 250, location: 'Indiranagar Metro', availability: 'Available', batteryPercent: 85, requiresHelmet: true },
    { id: 'b3', name: 'Royal Enfield Classic 350', type: 'Motorcycle', imageUrl: 'https://picsum.photos/seed/reclassic/300/200', pricePerHour: 70, pricePerDay: 800, location: 'MG Road Station', availability: 'Available' }, // Make available for testing
];

const mockCities = ['Bangalore', 'Chennai', 'Hyderabad', 'Mumbai', 'Delhi', 'Pune'];

export default function RentVehiclePage() {
    // Shared State
    const [pickupCity, setPickupCity] = useState('');
    const [pickupDate, setPickupDate] = useState<Date | undefined>(new Date());
    const [dropoffDate, setDropoffDate] = useState<Date | undefined>(addDays(new Date(), 1));
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [activeTab, setActiveTab] = useState<'car' | 'bike'>('car'); // Control active tab

    // Car Specific State
    const [carSearchResults, setCarSearchResults] = useState<CarListing[]>([]);
    const [selectedCar, setSelectedCar] = useState<CarListing | null>(null);
    const [isBookingCar, setIsBookingCar] = useState(false);

    // Bike Specific State
    const [bikeSearchResults, setBikeSearchResults] = useState<BikeListing[]>([]);
    const [selectedBike, setSelectedBike] = useState<BikeListing | null>(null);
    const [isBookingBike, setIsBookingBike] = useState(false);
    const [rentalDuration, setRentalDuration] = useState<'hour' | 'day'>('hour'); // Default to hour for bikes? Or day?

    const { toast } = useToast();

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!pickupCity || !pickupDate || !dropoffDate || differenceInDays(dropoffDate, pickupDate) < 0) {
            toast({ variant: "destructive", title: "Please select City, Pickup & Drop-off Dates" });
            return;
        }
        setIsLoading(true);
        setShowResults(false);
        setCarSearchResults([]);
        setBikeSearchResults([]);
        setSelectedCar(null);
        setSelectedBike(null);

        const searchParams = { city: pickupCity, pickupDate: format(pickupDate, 'yyyy-MM-dd'), dropoffDate: format(dropoffDate, 'yyyy-MM-dd') };
        const searchType = activeTab; // Use the currently active tab type
        console.log(`Searching ${searchType}s:`, searchParams);

        try {
            // Simulate API call - In a real app, fetch based on activeTab
            await new Promise(resolve => setTimeout(resolve, 1500));
            if (searchType === 'car') {
                const results = mockCars.filter(car => car.isAvailable && Math.random() > 0.2);
                setCarSearchResults(results);
                 if (results.length === 0) toast({ description: "No cars found for the selected criteria." });
            } else {
                const results = mockBikes.filter(bike => bike.availability === 'Available' && Math.random() > 0.1);
                setBikeSearchResults(results);
                 if (results.length === 0) toast({ description: "No bikes available for the selected criteria." });
            }
            setShowResults(true);
        } catch (error) {
            console.error(`${searchType} search failed:`, error);
            toast({ variant: "destructive", title: "Search Failed", description: `Could not fetch ${searchType} listings.` });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectCar = (car: CarListing) => {
        setSelectedCar(car);
        // Proceed to booking confirmation step/page
        handleConfirmCarBooking(car);
    };

    const handleConfirmCarBooking = async (car: CarListing) => {
        setIsBookingCar(true);
        const rentalDays = differenceInDays(dropoffDate!, pickupDate!) + 1;
        const totalCost = rentalDays * car.pricePerDay;
        const bookingData = {
            vehicleId: car.id,
            pickupDate: format(pickupDate!, 'yyyy-MM-dd'),
            dropoffDate: format(dropoffDate!, 'yyyy-MM-dd'),
            totalAmount: totalCost,
            vehicleDetails: car, // Send details for confirmation/logging
            // Add user details, selected options (insurance etc.)
        };
        try {
            const result = await confirmBooking('car', bookingData); // Use 'car' type
            if (result.status === 'Completed') { // Check backend status
                toast({ title: "Car Booking Successful!", description: `Booked ${car.name} for ${rentalDays} days. Total: ₹${totalCost}. Please complete payment/formalities.` });
                setSelectedCar(null);
                setShowResults(false);
            } else {
                 toast({ variant: "destructive", title: "Booking Failed", description: result.message || "Could not confirm booking." });
            }
        } catch (error: any) {
            console.error("Car booking failed:", error);
            toast({ variant: "destructive", title: "Booking Failed", description: error.message || "Could not confirm your car booking." });
        } finally {
            setIsBookingCar(false);
        }
    };

     const handleSelectBike = (bike: BikeListing) => {
        setSelectedBike(bike);
         // Proceed to booking confirmation step/page
         handleConfirmBikeBooking(bike);
    };

    const handleConfirmBikeBooking = async (bike: BikeListing) => {
        setIsBookingBike(true);
        // Simplified duration/cost calculation for bikes
        const cost = rentalDuration === 'hour' ? bike.pricePerHour : bike.pricePerDay;
         const bookingData = {
            vehicleId: bike.id,
            pickupDate: format(pickupDate!, 'yyyy-MM-dd'), // Could add time if needed
            rentalDuration: rentalDuration, // hour or day
            totalAmount: cost,
            vehicleDetails: bike,
        };
        try {
            const result = await confirmBooking('bike', bookingData); // Use 'bike' type
            if (result.status === 'Completed') {
                toast({ title: "Bike Booking Successful!", description: `Booked ${bike.name} for 1 ${rentalDuration}. Cost: ₹${cost}. Unlock using the app.` });
                 setSelectedBike(null);
                 setShowResults(false);
            } else {
                 toast({ variant: "destructive", title: "Booking Failed", description: result.message || "Could not confirm booking." });
            }
        } catch (error: any) {
            console.error("Bike booking failed:", error);
            toast({ variant: "destructive", title: "Booking Failed", description: error.message || "Could not confirm your bike booking." });
        } finally {
            setIsBookingBike(false);
        }
    };

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/services" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                {activeTab === 'car' ? <Car className="h-6 w-6" /> : <Motorbike className="h-6 w-6" />}
                <h1 className="text-lg font-semibold">Rent a Vehicle</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'car' | 'bike')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="car">Rent a Car</TabsTrigger>
                        <TabsTrigger value="bike">Rent a Bike</TabsTrigger>
                    </TabsList>

                    {/* Search Form (Common for both) */}
                    {!showResults && (
                        <Card className="shadow-md">
                            <CardHeader>
                                <CardTitle>Find Your Ride ({activeTab === 'car' ? 'Car' : 'Bike'})</CardTitle>
                                <CardDescription>Search for available {activeTab}s for rent.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSearch} className="space-y-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="pickupCity">Pickup City / Area</Label>
                                        <Select value={pickupCity} onValueChange={setPickupCity} required>
                                            <SelectTrigger id="pickupCity"><SelectValue placeholder="Select City or Area" /></SelectTrigger>
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
                                    {/* Add Time Pickers if needed */}

                                    <Button type="submit" className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                        {isLoading ? `Searching ${activeTab}s...` : `Search ${activeTab === 'car' ? 'Cars' : 'Bikes'}`}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                     {/* Results Area */}
                    {showResults && (
                         <div className="space-y-4">
                            <Button variant="outline" onClick={() => setShowResults(false)} className="mb-4">
                                <ArrowLeft className="mr-2 h-4 w-4"/> Modify Search
                            </Button>
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-lg font-semibold">
                                    {activeTab === 'car' ? `${carSearchResults.length} Cars` : `${bikeSearchResults.length} Bikes`} Found
                                </h2>
                                <Button variant="ghost" size="sm"><Filter className="mr-1 h-4 w-4"/> Filter</Button>
                            </div>

                            {/* Car Results */}
                             {activeTab === 'car' && carSearchResults.map(car => (
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
                                                     {isBookingCar && selectedCar?.id === car.id ? (
                                                        <Button className="mt-1 h-8" disabled>
                                                            <Loader2 className="h-4 w-4 animate-spin"/>
                                                        </Button>
                                                     ) : (
                                                         <Button className="mt-1 h-8" onClick={() => handleSelectCar(car)} disabled={isBookingCar}>
                                                            Book Now
                                                        </Button>
                                                     )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                             ))}

                             {/* Bike Results */}
                              {activeTab === 'bike' && bikeSearchResults.map(bike => (
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
                                                     {isBookingBike && selectedBike?.id === bike.id ? (
                                                        <Button className="mt-1 h-8" disabled>
                                                            <Loader2 className="h-4 w-4 animate-spin"/>
                                                        </Button>
                                                     ) : (
                                                         <Button className="mt-1 h-8" onClick={() => handleSelectBike(bike)} disabled={isBookingBike}>
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

                </Tabs>
            </main>
        </div>
    );
}
```

```xml
  <change>
    <file>src/app/(features)/hyperlocal/ac-repair/page.tsx</file>
    <description>Create a new page for AC Repair booking under hyperlocal services.</description>
    <content><![CDATA['use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Wrench, ThermometerSnowflake, Info } from 'lucide-react'; // Use Wrench and ThermometerSnowflake icons
import Link from 'next/link';

export default function AcRepairPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <ThermometerSnowflake className="h-6 w-6" />
        <h1 className="text-lg font-semibold">AC Service & Repair</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Book AC Service</CardTitle>
            <CardDescription>Schedule AC installation, servicing, or repairs.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex justify-center gap-4 mb-6 text-primary">
                <ThermometerSnowflake className="h-16 w-16" />
                <Wrench className="h-16 w-16" />
            </div>
            <p className="text-muted-foreground mb-4">
              Get reliable AC service, repair, or installation from verified professionals at your doorstep. Coming Soon!
            </p>
             <Button disabled>Book Service (Coming Soon)</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
