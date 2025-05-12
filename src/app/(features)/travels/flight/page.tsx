
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Plane, CalendarIcon, Search, ArrowRightLeft, Loader2, Users, Wallet, Filter, CheckCircle, Info } from 'lucide-react';
import Link from 'next/link';
import { format, addDays, differenceInDays, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { searchBookings, confirmBooking } from '@/services/booking';
import type { FlightListing, BookingConfirmation } from '@/services/types';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockCities, mockPassengerCounts } from '@/mock-data'; // Import centralized mock data

export default function FlightBookingPage() {
    const [fromCity, setFromCity] = useState('');
    const [toCity, setToCity] = useState('');
    const [departureDate, setDepartureDate] = useState<Date | undefined>(new Date());
    const [returnDate, setReturnDate] = useState<Date | undefined>();
    const [tripType, setTripType] = useState<'oneWay' | 'roundTrip'>('oneWay');
    const [passengers, setPassengers] = useState({ adults: 1, children: 0, infants: 0 });
    const [cabinClass, setCabinClass] = useState<'economy' | 'premium' | 'business'>('economy');
    const [searchResults, setSearchResults] = useState<FlightListing[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedFlight, setSelectedFlight] = useState<FlightListing | null>(null);
    const [isBooking, setIsBooking] = useState(false);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [passengerDetailsForm, setPassengerDetailsForm] = useState({ name: '', email: '', phone: '' });

    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            setPassengerDetailsForm({
                name: currentUser.displayName || '',
                email: currentUser.email || '',
                phone: currentUser.phoneNumber || '',
            });
        }
    }, []);

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!fromCity || !toCity || !departureDate || (tripType === 'roundTrip' && !returnDate)) {
            toast({ variant: "destructive", title: "Please fill all travel details" });
            return;
        }
        if (tripType === 'roundTrip' && returnDate && departureDate && differenceInDays(returnDate, departureDate) < 0) {
            toast({ variant: "destructive", title: "Return date must be after departure date" });
            return;
        }

        setIsLoading(true);
        setShowResults(false);
        setSearchResults([]);
        setSelectedFlight(null);

        const searchParams = {
            from: fromCity.split(' ')[0],
            to: toCity.split(' ')[0],
            departureDate: format(departureDate, 'yyyy-MM-dd'),
            returnDate: tripType === 'roundTrip' && returnDate ? format(returnDate, 'yyyy-MM-dd') : undefined,
            adults: passengers.adults,
            children: passengers.children,
            infants: passengers.infants,
            cabinClass,
        };
        console.log("Searching Flights via Client Service:", searchParams);

        try {
            const results = await searchBookings('flight', searchParams) as FlightListing[];
            setSearchResults(results);
            setShowResults(true);
            if (results.length === 0) {
                toast({ description: "No flights found for the selected route and date." });
            }
        } catch (error: any) {
            console.error("Flight search failed:", error);
            toast({ variant: "destructive", title: "Search Failed", description: error.message || "Could not fetch flight listings." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectFlight = (flight: FlightListing) => {
        setSelectedFlight(flight);
        setShowBookingModal(true);
    };

    const handleConfirmBooking = async () => {
        if (!auth.currentUser) {
            toast({ variant: "destructive", title: "Login Required", description: "Please log in to book flights." });
            return;
        }
        if (!selectedFlight || !departureDate || !passengerDetailsForm.name || !passengerDetailsForm.email || !passengerDetailsForm.phone) {
            toast({ variant: "destructive", title: "Booking Error", description: "Missing flight or passenger details." });
            return;
        }

        setIsBooking(true);
        const bookingData = {
            providerId: selectedFlight.airline,
            selection: {
                flightId: selectedFlight.id,
                flightNumber: selectedFlight.flightNumber,
                departureDate: format(departureDate, 'yyyy-MM-dd'),
                returnDate: tripType === 'roundTrip' && returnDate ? format(returnDate, 'yyyy-MM-dd') : undefined,
                departureCity: fromCity,
                arrivalCity: toCity,
            },
            passengerDetails: passengerDetailsForm,
            totalAmount: selectedFlight.price * (passengers.adults + passengers.children),
            paymentMethod: 'wallet',
        };
        console.log("Confirming Flight Booking via Client Service:", bookingData);

        try {
            const result: BookingConfirmation = await confirmBooking('flight', bookingData);
            if (result.status === 'Completed') {
                toast({ title: "Flight Booking Successful!", description: `Booked ${selectedFlight.airline} ${selectedFlight.flightNumber}. PNR: ${result.bookingDetails?.pnr || 'Pending'}. Total: ₹${bookingData.totalAmount.toLocaleString()}`, duration: 7000 });
                setShowBookingModal(false);
                setSelectedFlight(null);
                setShowResults(false);
                router.push('/history');
            } else {
                throw new Error(result.message || `Booking ${result.status || 'Failed'}`);
            }
        } catch (error: any) {
            console.error("Flight booking confirmation failed:", error);
            toast({ variant: "destructive", title: "Booking Failed", description: error.message });
        } finally {
            setIsBooking(false);
        }
    };

    const swapCities = () => {
        setFromCity(toCity);
        setToCity(fromCity);
    };

    const handlePassengerChange = (type: 'adults' | 'children' | 'infants', value: number) => {
        const newCount = Math.max(type === 'adults' ? 1 : 0, value);
        const totalPassengers = (type === 'adults' ? newCount : passengers.adults) +
                                (type === 'children' ? newCount : passengers.children) +
                                (type === 'infants' ? newCount : passengers.infants);
        if (totalPassengers > 9) {
            toast({ description: "Maximum 9 passengers allowed." });
            return;
        }
        setPassengers(prev => ({ ...prev, [type]: newCount }));
    };
    
    const totalPassengersDisplay = `${passengers.adults} Adult${passengers.adults > 1 ? 's' : ''}${passengers.children > 0 ? `, ${passengers.children} Child${passengers.children > 1 ? 'ren':''}` : ''}${passengers.infants > 0 ? `, ${passengers.infants} Infant${passengers.infants > 1 ? 's':''}`:''}`;


    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/travels" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Plane className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Book Flights</h1>
            </header>

            <main className="flex-grow p-4 space-y-4 pb-20">
                {!showResults ? (
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle>Search Flights</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSearch} className="space-y-4">
                                <Tabs value={tripType} onValueChange={(value) => setTripType(value as 'oneWay' | 'roundTrip')} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="oneWay">One Way</TabsTrigger>
                                        <TabsTrigger value="roundTrip">Round Trip</TabsTrigger>
                                    </TabsList>
                                </Tabs>

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

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>Passengers</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                    <Users className="mr-2 h-4 w-4"/> {totalPassengersDisplay}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-64 p-4 space-y-3">
                                                 { (['adults', 'children', 'infants'] as const).map(type => (
                                                    <div key={type} className="flex justify-between items-center">
                                                        <Label htmlFor={`pass-${type}`} className="capitalize">{type}</Label>
                                                        <div className="flex items-center gap-1">
                                                            <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => handlePassengerChange(type, passengers[type] - 1)} disabled={passengers[type] <= (type === 'adults' ? 1 : 0)}>-</Button>
                                                            <Input id={`pass-${type}`} type="number" value={passengers[type]} readOnly className="w-10 h-6 text-center p-0"/>
                                                            <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => handlePassengerChange(type, passengers[type] + 1)}>+</Button>
                                                        </div>
                                                    </div>
                                                 ))}
                                            </PopoverContent>
                                        </Popover>
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
                    <div className="space-y-4">
                        <Button variant="outline" onClick={() => {setShowResults(false); setSearchResults([]); setSelectedFlight(null);}} className="mb-4">
                            <ArrowLeft className="mr-2 h-4 w-4"/> Modify Search
                        </Button>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-lg font-semibold">{searchResults.length} Flights Found</h2>
                            <Button variant="ghost" size="sm"><Filter className="mr-1 h-4 w-4"/> Filter</Button>
                        </div>
                        {isLoading ? (
                             Array.from({length:3}).map((_, i) => <FlightCardSkeleton key={i}/>)
                        ) : searchResults.map(flight => (
                            <FlightCard key={flight.id} flight={flight} onSelectFlight={handleSelectFlight} isBooking={isBooking && selectedFlight?.id === flight.id}/>
                        ))}
                    </div>
                )}

                <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Confirm Your Flight</DialogTitle>
                            <DialogDescription>
                                Review passenger details and confirm your booking for {selectedFlight?.airline} {selectedFlight?.flightNumber}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-3">
                             <div className="font-semibold">Flight: {selectedFlight?.airline} {selectedFlight?.flightNumber}</div>
                             <div className="text-sm text-muted-foreground">From: {fromCity} To: {toCity}</div>
                             <div className="text-sm text-muted-foreground">Date: {departureDate ? format(departureDate, "PPP") : ''}</div>
                             <div className="text-sm text-muted-foreground">Passengers: {totalPassengersDisplay}</div>
                             <Separator/>
                             <h4 className="text-sm font-medium pt-2">Passenger Details</h4>
                            <div className="space-y-1">
                                <Label htmlFor="passengerName">Full Name</Label>
                                <Input id="passengerName" value={passengerDetailsForm.name} onChange={e => setPassengerDetailsForm({...passengerDetailsForm, name: e.target.value})} required/>
                            </div>
                             <div className="space-y-1">
                                <Label htmlFor="passengerEmail">Email</Label>
                                <Input id="passengerEmail" type="email" value={passengerDetailsForm.email} onChange={e => setPassengerDetailsForm({...passengerDetailsForm, email: e.target.value})} required/>
                            </div>
                             <div className="space-y-1">
                                <Label htmlFor="passengerPhone">Phone</Label>
                                <Input id="passengerPhone" type="tel" value={passengerDetailsForm.phone} onChange={e => setPassengerDetailsForm({...passengerDetailsForm, phone: e.target.value})} required/>
                            </div>
                            <Separator/>
                            <div className="flex justify-between items-center font-bold text-lg">
                                <span>Total Fare:</span>
                                <span>₹{(selectedFlight?.price || 0) * (passengers.adults + passengers.children)}</span>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                            <Button className="bg-green-600 hover:bg-green-700" onClick={handleConfirmBooking} disabled={isBooking}>
                                {isBooking ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
                                {isBooking ? 'Processing...' : 'Confirm & Pay'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </main>
        </div>
    );
}


interface FlightCardProps {
    flight: FlightListing;
    onSelectFlight: (flight: FlightListing) => void;
    isBooking: boolean;
}

function FlightCard({ flight, onSelectFlight, isBooking }: FlightCardProps) {
    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                        <Image src={flight.imageUrl || '/logos/default-airline.png'} alt={flight.airline} width={24} height={24} className="h-6 w-6 object-contain rounded-full" data-ai-hint={`${flight.airline} airline logo`}/>
                        <span className="text-sm font-medium">{flight.airline}</span>
                        <span className="text-xs text-muted-foreground">{flight.flightNumber}</span>
                    </div>
                    <Badge variant={flight.refundable ? "secondary" : "outline"} className={`text-xs ${flight.refundable ? 'text-green-700 bg-green-100' : 'border-destructive text-destructive'}`}>
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
                            {flight.stops > 0 && <span className="text-xs bg-primary/10 px-1 rounded">{flight.stops} Stop(s)</span>}
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
                        <Button className="mt-1 h-8" onClick={() => onSelectFlight(flight)} disabled={isBooking}>
                            {isBooking ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Select Flight'}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function FlightCardSkeleton() {
    return (
        <Card className="shadow-sm">
            <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-12" />
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <div className="grid grid-cols-3 items-center text-center mb-2">
                    <div className="text-left space-y-1"><Skeleton className="h-4 w-10"/><Skeleton className="h-3 w-8"/></div>
                    <div className="text-center space-y-1"><Skeleton className="h-3 w-12"/><Skeleton className="h-4 w-full"/></div>
                    <div className="text-right space-y-1"><Skeleton className="h-4 w-10"/><Skeleton className="h-3 w-8"/></div>
                </div>
                <Separator className="my-2"/>
                <div className="flex justify-between items-end">
                    <div className="text-xs space-y-1"><Skeleton className="h-3 w-16"/><Skeleton className="h-3 w-16"/></div>
                    <div className="text-right space-y-1"><Skeleton className="h-6 w-20"/><Skeleton className="h-8 w-24 mt-1"/></div>
                </div>
            </CardContent>
        </Card>
    );
}
