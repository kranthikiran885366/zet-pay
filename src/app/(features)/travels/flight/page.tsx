'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Plane, CalendarIcon, Search, ArrowRightLeft, Loader2, Users, Wallet, Filter, CheckCircle, XCircle, Clock, Ticket, Briefcase, Clock10 } from 'lucide-react';
import Link from 'next/link';
import { format, addDays, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { searchBookings, confirmBooking } from '@/services/booking'; // Import booking services
import type { BookingSearchResult, BookingConfirmation, FlightListing } from '@/services/types'; // Import types
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase'; // For auth check

// Mock Data (Replace with actual API calls via services)
const mockCities = ['Bangalore (BLR)', 'Chennai (MAA)', 'Hyderabad (HYD)', 'Mumbai (BOM)', 'Delhi (DEL)', 'Kolkata (CCU)', 'Pune (PNQ)']; // Add airport codes
const mockAirlines = ['IndiGo', 'Air India', 'SpiceJet', 'Vistara', 'Akasa Air'];

// Use FlightListing interface defined in types.ts
const mockFlightResults: FlightListing[] = [
    { id: 'f1', airline: 'IndiGo', flightNumber: '6E 202', departureAirport: 'BLR', arrivalAirport: 'DEL', departureTime: '06:00', arrivalTime: '08:45', duration: '2h 45m', stops: 0, price: 4500, refundable: true, baggage: { cabin: '7kg', checkin: '15kg' }, imageUrl: '/logos/indigo.png' },
    { id: 'f2', airline: 'Vistara', flightNumber: 'UK 810', departureAirport: 'BLR', arrivalAirport: 'DEL', departureTime: '07:30', arrivalTime: '10:10', duration: '2h 40m', stops: 0, price: 5200, refundable: true, baggage: { cabin: '7kg', checkin: '20kg' }, imageUrl: '/logos/vistara.png' },
    { id: 'f3', airline: 'Air India', flightNumber: 'AI 505', departureAirport: 'BLR', arrivalAirport: 'DEL', departureTime: '09:00', arrivalTime: '11:50', duration: '2h 50m', stops: 0, price: 4800, refundable: false, baggage: { cabin: '8kg', checkin: '20kg' }, imageUrl: '/logos/airindia.png' },
    { id: 'f4', airline: 'SpiceJet', flightNumber: 'SG 804', departureAirport: 'BLR', arrivalAirport: 'DEL', departureTime: '11:15', arrivalTime: '14:00', duration: '2h 45m', stops: 0, price: 4350, refundable: false, baggage: { cabin: '7kg', checkin: '15kg' }, imageUrl: '/logos/spicejet.png' },
    { id: 'f5', airline: 'IndiGo', flightNumber: '6E 5301', departureAirport: 'BLR', arrivalAirport: 'DEL', departureTime: '14:00', arrivalTime: '18:30', duration: '4h 30m', stops: 1, price: 4000, refundable: true, baggage: { cabin: '7kg', checkin: '15kg' }, imageUrl: '/logos/indigo.png' }, // Connecting flight example
];

export default function FlightBookingPage() {
    const [fromCity, setFromCity] = useState('');
    const [toCity, setToCity] = useState('');
    const [departureDate, setDepartureDate] = useState<Date | undefined>(new Date());
    const [returnDate, setReturnDate] = useState<Date | undefined>(); // For round trip
    const [tripType, setTripType] = useState<'oneWay' | 'roundTrip'>('oneWay');
    const [passengers, setPassengers] = useState({ adults: 1, children: 0, infants: 0 });
    const [cabinClass, setCabinClass] = useState<'economy' | 'premium' | 'business'>('economy');
    const [searchResults, setSearchResults] = useState<FlightListing[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedFlight, setSelectedFlight] = useState<FlightListing | null>(null); // Track selected flight for booking
    const [isBooking, setIsBooking] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!fromCity || !toCity || !departureDate || (tripType === 'roundTrip' && !returnDate)) {
            toast({ variant: "destructive", title: "Please fill all travel details" });
            return;
        }
        if (tripType === 'roundTrip' && differenceInDays(returnDate!, departureDate) < 0) {
            toast({ variant: "destructive", title: "Return date must be after departure date" });
            return;
        }

        setIsLoading(true);
        setShowResults(false);
        setSearchResults([]);
        setSelectedFlight(null); // Clear previous selection

        const searchParams = {
            from: fromCity.split(' ')[0], // Send only code
            to: toCity.split(' ')[0],
            departureDate: format(departureDate, 'yyyy-MM-dd'),
            returnDate: tripType === 'roundTrip' ? format(returnDate!, 'yyyy-MM-dd') : undefined,
            adults: passengers.adults,
            children: passengers.children,
            infants: passengers.infants,
            cabinClass,
        };
        console.log("Searching Flights:", searchParams);

        try {
            // Simulate API call: Replace with actual service call
            // const results = await searchBookings('flight', searchParams);
            await new Promise(resolve => setTimeout(resolve, 1500));
            // Filter mock data (replace with API results)
            const results = mockFlightResults.filter(flight =>
                flight.departureAirport === searchParams.from && flight.arrivalAirport === searchParams.to
            );
            setSearchResults(results as FlightListing[]); // Assert type if needed
            setShowResults(true);
            if (results.length === 0) {
                toast({ description: "No flights found for the selected route and date." });
            }
        } catch (error) {
            console.error("Flight search failed:", error);
            toast({ variant: "destructive", title: "Search Failed", description: "Could not fetch flight listings." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectFlight = (flight: FlightListing) => {
         setSelectedFlight(flight);
         // For now, simulate directly confirming booking
         handleConfirmBooking(flight);
     };

    const handleConfirmBooking = async (flight: FlightListing) => {
        if (!auth.currentUser) {
            toast({ variant: "destructive", title: "Login Required", description: "Please log in to book flights." });
            return;
        }
        if (!departureDate) return; // Should not happen if flight is selected

        setIsBooking(true);
        const bookingData = {
            providerId: flight.airline, // Or a specific provider ID if available
            selection: {
                 flightId: flight.id,
                 flightNumber: flight.flightNumber,
                 departureDate: format(departureDate, 'yyyy-MM-dd'),
                 // Add return details if round trip
            },
            passengerDetails: { // Example, fetch from profile or form
                 name: auth.currentUser.displayName || "Test User",
                 email: auth.currentUser.email || "test@example.com",
                 phone: auth.currentUser.phoneNumber || "9999999999",
            },
            totalAmount: flight.price * passengers.adults, // Simplified cost calculation
            paymentMethod: 'wallet', // Default or get selection
        };
        console.log("Confirming Flight Booking:", bookingData);

        try {
            const result = await confirmBooking('flight', bookingData);
            if (result.status === 'Completed') {
                toast({ title: "Flight Booking Successful!", description: `Booked ${flight.airline} ${flight.flightNumber}. PNR: ${result.bookingDetails?.pnr || 'Pending'}. Check My Bookings.` });
                setShowResults(false); // Go back to search form
            } else {
                toast({ variant: "destructive", title: `Booking ${result.status || 'Failed'}`, description: result.message || "Could not confirm flight booking." });
            }
        } catch (error: any) {
             console.error("Flight booking confirmation failed:", error);
             toast({ variant: "destructive", title: "Booking Failed", description: error.message || "An error occurred during booking." });
        } finally {
            setIsBooking(false);
            setSelectedFlight(null); // Clear selection regardless of outcome
        }
    };

    const swapCities = () => {
        setFromCity(toCity);
        setToCity(fromCity);
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
                <Plane className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Book Flights</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                {!showResults ? (
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle>Search Flights</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSearch} className="space-y-4">
                                {/* Trip Type */}
                                 <Tabs value={tripType} onValueChange={(value) => setTripType(value as 'oneWay' | 'roundTrip')} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="oneWay">One Way</TabsTrigger>
                                        <TabsTrigger value="roundTrip">Round Trip</TabsTrigger>
                                    </TabsList>
                                 </Tabs>

                                {/* From/To Cities */}
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="fromCity">From</Label>
                                        <Select value={fromCity} onValueChange={setFromCity} required>
                                            <SelectTrigger id="fromCity"><SelectValue placeholder="Select Origin" /></SelectTrigger>
                                            <SelectContent>
                                                {mockCities.map(city => <SelectItem key={`from-${city}`} value={city}>{city}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="mt-6" onClick={swapCities}>
                                        <ArrowRightLeft className="h-4 w-4 text-primary" />
                                    </Button>
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="toCity">To</Label>
                                        <Select value={toCity} onValueChange={setToCity} required>
                                            <SelectTrigger id="toCity"><SelectValue placeholder="Select Destination" /></SelectTrigger>
                                            <SelectContent>
                                                 {mockCities.map(city => <SelectItem key={`to-${city}`} value={city}>{city}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-1">
                                        <Label htmlFor="departureDate">Depart</Label>
                                         <Popover>
                                            <PopoverTrigger asChild>
                                                <Button id="departureDate" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !departureDate && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {departureDate ? format(departureDate, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                 <Calendar mode="single" selected={departureDate} onSelect={setDepartureDate} initialFocus disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}/>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                     <div className="space-y-1">
                                        <Label htmlFor="returnDate">Return</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button id="returnDate" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !returnDate && "text-muted-foreground")} disabled={tripType === 'oneWay'}>
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {returnDate ? format(returnDate, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar mode="single" selected={returnDate} onSelect={setReturnDate} initialFocus disabled={(date) => date < (departureDate || new Date(new Date().setHours(0,0,0,0)))}/>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                 {/* Passengers & Class */}
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-1">
                                        <Label>Passengers</Label>
                                         {/* TODO: Add passenger selection popover */}
                                        <Input value={`${passengers.adults} Adult${passengers.adults !== 1 ? 's' : ''}${passengers.children ? `, ${passengers.children} Child` : ''}${passengers.infants ? `, ${passengers.infants} Infant` : ''}`} readOnly/>
                                    </div>
                                     <div className="space-y-1">
                                        <Label htmlFor="cabinClass">Class</Label>
                                        <Select value={cabinClass} onValueChange={(value) => setCabinClass(value as any)} required>
                                            <SelectTrigger id="cabinClass"><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="economy">Economy</SelectItem>
                                                <SelectItem value="premium">Premium Economy</SelectItem>
                                                <SelectItem value="business">Business</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Button type="submit" className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                    {isLoading ? 'Searching...' : 'Search Flights'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                 ) : (
                     /* Search Results */
                     <div className="space-y-4">
                         <Button variant="outline" onClick={() => setShowResults(false)} className="mb-4">
                             <ArrowLeft className="mr-2 h-4 w-4"/> Modify Search
                         </Button>
                          <div className="flex justify-between items-center mb-2">
                             <h2 className="text-lg font-semibold">{searchResults.length} Flights Found</h2>
                              <Button variant="ghost" size="sm"><Filter className="mr-1 h-4 w-4"/> Filter</Button> {/* Add Filter functionality */}
                         </div>
                         {searchResults.map(flight => (
                            <Card key={flight.id} className="shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-3">
                                     <div className="flex items-center justify-between gap-2 mb-2">
                                         <div className="flex items-center gap-2">
                                             <Image src={flight.imageUrl || '/logos/default-airline.png'} alt={flight.airline} width={24} height={24} className="h-6 w-6 object-contain rounded-full" data-ai-hint="airline logo"/>
                                             <span className="text-sm font-medium">{flight.airline}</span>
                                              <span className="text-xs text-muted-foreground">{flight.flightNumber}</span>
                                         </div>
                                          <Badge variant={flight.refundable ? "secondary" : "outline"} className={`text-xs ${flight.refundable ? 'text-green-700 bg-green-100' : ''}`}>
                                              {flight.refundable ? 'Refundable' : 'Non-Refundable'}
                                          </Badge>
                                     </div>
                                     <div className="grid grid-cols-3 items-center text-center mb-2">
                                         <div className="text-left">
                                             <p className="font-semibold">{flight.departureTime}</p>
                                             <p className="text-xs text-muted-foreground">{flight.departureAirport}</p>
                                         </div>
                                          <div className="text-center">
                                             <p className="text-xs text-muted-foreground">{flight.duration}</p>
                                             <div className="flex items-center justify-center text-primary">
                                                 <div className="w-2 h-2 bg-primary rounded-full"></div>
                                                 <div className="flex-grow border-t border-dashed border-primary/50 mx-1"></div>
                                                  {flight.stops > 0 && <span className="text-xs bg-primary/10 px-1 rounded">{flight.stops} Stop</span>}
                                                  {flight.stops === 0 && <span className="text-xs text-muted-foreground">Non-Stop</span>}
                                                 <div className="flex-grow border-t border-dashed border-primary/50 mx-1"></div>
                                                 <div className="w-2 h-2 bg-primary rounded-full"></div>
                                             </div>
                                         </div>
                                         <div className="text-right">
                                              <p className="font-semibold">{flight.arrivalTime}</p>
                                             <p className="text-xs text-muted-foreground">{flight.arrivalAirport}</p>
                                         </div>
                                     </div>
                                      <Separator className="my-2"/>
                                     <div className="flex justify-between items-end">
                                         <div className="text-xs text-muted-foreground space-y-0.5">
                                             <p>Cabin: {flight.baggage.cabin}</p>
                                             <p>Check-in: {flight.baggage.checkin}</p>
                                         </div>
                                         <div className="text-right">
                                             <p className="text-lg font-bold">₹{flight.price.toLocaleString()}</p>
                                              {isBooking && selectedFlight?.id === flight.id ? (
                                                <Button className="mt-1 h-8" disabled>
                                                    <Loader2 className="h-4 w-4 animate-spin"/>
                                                </Button>
                                             ) : (
                                                <Button className="mt-1 h-8" onClick={() => handleSelectFlight(flight)} disabled={isBooking}>
                                                    Book Now
                                                </Button>
                                             )}
                                        </div>
                                     </div>
                                </CardContent>
                            </Card>
                         ))}
                    </div>
                 )}
            </main>
        </div>
    );
}
