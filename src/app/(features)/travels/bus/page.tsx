
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Bus, CalendarIcon, Search, ArrowRightLeft, Loader2, User, Wallet, Filter, ChevronDown, ChevronUp, Armchair, X, Plane } from 'lucide-react'; // Added Plane
import Link from 'next/link';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";


// Mock Data (Replace with actual API calls)
const mockCities = ['Bangalore', 'Chennai', 'Hyderabad', 'Mumbai', 'Delhi', 'Pune', 'Kolkata'];
const mockBusOperators = ['KSRTC', 'RedBus Express', 'VRL Travels', 'Orange Tours', 'SRS Travels'];

interface BusRoute {
    id: string;
    operator: string;
    type: 'AC Sleeper' | 'Non-AC Seater' | 'AC Seater/Sleeper' | 'Volvo Multi-Axle';
    departureTime: string;
    arrivalTime: string;
    duration: string;
    price: number;
    seatsAvailable: number;
    rating: number;
    boardingPoints: string[];
    droppingPoints: string[];
}

const mockBusRoutes: BusRoute[] = [
    { id: 'bus1', operator: 'KSRTC', type: 'AC Sleeper', departureTime: '21:00', arrivalTime: '05:00', duration: '8h 0m', price: 850, seatsAvailable: 15, rating: 4.2, boardingPoints: ['Majestic', 'Silk Board'], droppingPoints: ['Koyambedu', 'Guindy'] },
    { id: 'bus2', operator: 'RedBus Express', type: 'Non-AC Seater', departureTime: '22:30', arrivalTime: '06:30', duration: '8h 0m', price: 500, seatsAvailable: 30, rating: 3.8, boardingPoints: ['Madiwala', 'Electronic City'], droppingPoints: ['Perungalathur', 'Tambaram'] },
    { id: 'bus3', operator: 'VRL Travels', type: 'Volvo Multi-Axle', departureTime: '20:00', arrivalTime: '04:30', duration: '8h 30m', price: 1100, seatsAvailable: 5, rating: 4.5, boardingPoints: ['Anand Rao Circle', 'Hebbal'], droppingPoints: ['Koyambedu', 'Ashok Pillar'] },
    { id: 'bus4', operator: 'Orange Tours', type: 'AC Seater/Sleeper', departureTime: '21:45', arrivalTime: '05:30', duration: '7h 45m', price: 950, seatsAvailable: 22, rating: 4.0, boardingPoints: ['Majestic', 'Madiwala'], droppingPoints: ['Koyambedu', 'Vadapalani'] },
];

interface Seat {
    id: string; // e.g., L1, U5
    number: string; // e.g., 1, 5
    isLower: boolean;
    isSleeper: boolean;
    isAvailable: boolean;
    isWomenOnly?: boolean;
    price: number;
}

// Generate a mock seat layout (simplified)
const generateMockSeats = (busType: BusRoute['type'], basePrice: number): Seat[] => {
    const seats: Seat[] = [];
    const isSleeperLayout = busType.includes('Sleeper');
    const rows = isSleeperLayout ? 10 : 12;
    const cols = isSleeperLayout ? 3 : 4; // 1+2 for sleeper, 2+2 for seater

    for (let r = 1; r <= rows; r++) {
        // Lower Deck
        for (let c = 1; c <= cols; c++) {
            const seatId = `L${r}${String.fromCharCode(64 + c)}`; // L1A, L1B, ...
             const isSleeper = isSleeperLayout;
             const isAvailable = Math.random() > 0.3; // 70% available
             const isWomenOnly = isAvailable && Math.random() > 0.9; // 10% of available are women only
            seats.push({ id: seatId, number: `${r}${String.fromCharCode(64 + c)}`, isLower: true, isSleeper, isAvailable, price: basePrice, isWomenOnly });
        }
        // Upper Deck (only if sleeper)
        if (isSleeperLayout) {
            for (let c = 1; c <= cols; c++) {
                const seatId = `U${r}${String.fromCharCode(64 + c)}`; // U1A, U1B, ...
                 const isAvailable = Math.random() > 0.4; // 60% available upper
                 const isWomenOnly = isAvailable && Math.random() > 0.95; // 5% of available upper are women only
                seats.push({ id: seatId, number: `${r}${String.fromCharCode(64 + c)}`, isLower: false, isSleeper: true, isAvailable, price: basePrice + 100, isWomenOnly }); // Upper deck slightly more expensive
            }
        }
    }
    return seats;
};


export default function BusBookingPage() {
    const [fromCity, setFromCity] = useState('');
    const [toCity, setToCity] = useState('');
    const [travelDate, setTravelDate] = useState<Date | undefined>(new Date());
    const [searchResults, setSearchResults] = useState<BusRoute[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedBus, setSelectedBus] = useState<BusRoute | null>(null);
    const [seatLayout, setSeatLayout] = useState<Seat[]>([]);
    const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
    const [showSeatSelection, setShowSeatSelection] = useState(false);
    const [boardingPoint, setBoardingPoint] = useState<string>('');
    const [droppingPoint, setDroppingPoint] = useState<string>('');
     const [passengerDetails, setPassengerDetails] = useState({ name: '', email: '', phone: '' });
     const [isBooking, setIsBooking] = useState(false);
    const { toast } = useToast();

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!fromCity || !toCity || !travelDate) {
            toast({ variant: "destructive", title: "Please fill all fields" });
            return;
        }
        setIsLoading(true);
        setShowResults(false); // Hide previous results
        setSearchResults([]); // Clear previous results
        console.log("Searching buses:", { fromCity, toCity, date: format(travelDate, 'yyyy-MM-dd') });
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            // Filter mock data (in real app, API does this)
            const results = mockBusRoutes.filter(route => Math.random() > 0.3); // Simulate getting some results
            setSearchResults(results);
            setShowResults(true);
            if (results.length === 0) {
                toast({ description: "No buses found for this route on the selected date." });
            }
        } catch (error) {
            console.error("Bus search failed:", error);
            toast({ variant: "destructive", title: "Search Failed", description: "Could not fetch bus routes." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectBus = (bus: BusRoute) => {
        setSelectedBus(bus);
        const mockSeats = generateMockSeats(bus.type, bus.price);
        setSeatLayout(mockSeats);
        setSelectedSeats([]); // Clear previously selected seats
        setShowSeatSelection(true);
        setBoardingPoint(''); // Reset points
        setDroppingPoint('');
    };

    const handleSeatSelect = (seat: Seat) => {
        if (!seat.isAvailable) {
            toast({ description: "Seat not available" });
            return;
        }
        setSelectedSeats(prev => {
            const isSelected = prev.some(s => s.id === seat.id);
            if (isSelected) {
                return prev.filter(s => s.id !== seat.id);
            } else {
                if (prev.length >= 6) { // Limit max seats selectable
                    toast({ description: "You can select a maximum of 6 seats." });
                    return prev;
                }
                return [...prev, seat];
            }
        });
    };

    const totalFare = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

    const handleProceedToBook = () => {
        if (selectedSeats.length === 0) {
            toast({ variant: "destructive", title: "Select Seats", description: "Please select at least one seat." });
            return;
        }
        if (!boardingPoint || !droppingPoint) {
            toast({ variant: "destructive", title: "Select Points", description: "Please select boarding and dropping points." });
            return;
        }
        // Move to passenger details / final confirmation (could be another step or modal)
        console.log("Proceeding to book:", { selectedBus, selectedSeats, boardingPoint, droppingPoint });
         // For simplicity, using a simple alert/toast for now. Ideally, navigate to a payment page.
        // alert(`Booking ${selectedSeats.length} seat(s) on ${selectedBus?.operator} for ₹${totalFare}. BP: ${boardingPoint}, DP: ${droppingPoint}`);
         handleConfirmBooking(); // Directly call booking confirmation for demo
    }

    const handleConfirmBooking = async () => {
         if (!passengerDetails.name || !passengerDetails.email || !passengerDetails.phone) {
             toast({ variant: "destructive", title: "Passenger Details Required" });
             return; // In a real app, you'd validate this earlier
         }
         setIsBooking(true);
         try {
             console.log("Confirming booking with details:", passengerDetails);
             // Simulate API call for booking
             await new Promise(resolve => setTimeout(resolve, 2000));
             toast({ title: "Booking Confirmed!", description: `Your tickets for ${selectedBus?.operator} are booked. Total Fare: ₹${totalFare}` });
             // Reset state or navigate away
             setShowSeatSelection(false);
             setSelectedBus(null);
             setShowResults(false);
             // router.push('/tickets'); // Redirect to a tickets page
         } catch (error) {
             console.error("Booking failed:", error);
             toast({ variant: "destructive", title: "Booking Failed", description: "Could not confirm your booking." });
         } finally {
             setIsBooking(false);
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
                <Link href="/" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Bus className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Bus Tickets</h1>
            </header>

            {/* Search Form */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                {!showResults && !showSeatSelection && (
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle>Search for Buses</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSearch} className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="fromCity">From</Label>
                                        <Select value={fromCity} onValueChange={setFromCity} required>
                                            <SelectTrigger id="fromCity">
                                                <SelectValue placeholder="Select Origin" />
                                            </SelectTrigger>
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
                                            <SelectTrigger id="toCity">
                                                <SelectValue placeholder="Select Destination" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {mockCities.map(city => <SelectItem key={`to-${city}`} value={city}>{city}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="travelDate">Date of Travel</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="travelDate"
                                                variant={"outline"}
                                                className={cn("w-full justify-start text-left font-normal", !travelDate && "text-muted-foreground")}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {travelDate ? format(travelDate, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={travelDate} onSelect={setTravelDate} initialFocus disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}/>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <Button type="submit" className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                    {isLoading ? 'Searching...' : 'Search Buses'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Search Results */}
                {showResults && !showSeatSelection && (
                     <div>
                         <Button variant="outline" onClick={() => setShowResults(false)} className="mb-4">
                             <ArrowLeft className="mr-2 h-4 w-4"/> Modify Search
                         </Button>
                         <div className="flex justify-between items-center mb-2">
                             <h2 className="text-lg font-semibold">{searchResults.length} Buses Found</h2>
                              <Button variant="ghost" size="sm"><Filter className="mr-1 h-4 w-4"/> Filter</Button> {/* Add Filter functionality */}
                         </div>
                         <div className="space-y-3">
                            {searchResults.map(bus => (
                                <Card key={bus.id} className="shadow-sm hover:shadow-md transition-shadow">
                                    <CardContent className="p-3">
                                        <div className="flex justify-between items-start mb-1">
                                            <div>
                                                <p className="font-semibold text-primary">{bus.operator}</p>
                                                <p className="text-xs text-muted-foreground">{bus.type}</p>
                                            </div>
                                             <Badge variant="outline" className="text-xs">{bus.rating} ★</Badge>
                                        </div>
                                        <div className="flex justify-between items-center text-sm mb-2">
                                            <div>
                                                <p>Dep: <span className="font-medium">{bus.departureTime}</span></p>
                                                <p>Arr: <span className="font-medium">{bus.arrivalTime}</span></p>
                                            </div>
                                            <p className="text-muted-foreground">{bus.duration}</p>
                                            <div>
                                                <p className="text-lg font-bold text-right">₹{bus.price}</p>
                                                <p className="text-xs text-muted-foreground text-right">{bus.seatsAvailable} Seats left</p>
                                            </div>
                                        </div>
                                        <Button className="w-full h-8" onClick={() => handleSelectBus(bus)}>Select Seats</Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Seat Selection */}
                {showSeatSelection && selectedBus && (
                    <Dialog open={showSeatSelection} onOpenChange={(open) => { if (!open) { setShowSeatSelection(false); setSelectedBus(null); } }}>
                         <DialogContent className="max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl p-0">
                            <DialogHeader className="p-4 border-b">
                                <DialogTitle className="flex items-center gap-2">
                                    <Bus className="h-5 w-5"/> Select Seats - {selectedBus.operator}
                                </DialogTitle>
                                <DialogDescription>{fromCity} to {toCity} on {format(travelDate!, 'PPP')} ({selectedBus.type})</DialogDescription>
                                 <Button variant="ghost" size="icon" className="absolute right-4 top-4 h-7 w-7" onClick={() => {setShowSeatSelection(false); setSelectedBus(null);}}>
                                    <X className="h-4 w-4"/>
                                </Button>
                            </DialogHeader>

                            <div className="p-4 max-h-[70vh] overflow-y-auto">
                                {/* Seat Layout Grid */}
                                <Card className="border-dashed p-4 mb-4">
                                    <CardContent className="p-0">
                                         {/* Legend */}
                                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs mb-3">
                                             <div className="flex items-center gap-1"><div className="w-4 h-4 border border-gray-400 rounded-sm"></div> Available</div>
                                             <div className="flex items-center gap-1"><div className="w-4 h-4 bg-primary text-primary-foreground rounded-sm flex items-center justify-center">✓</div> Selected</div>
                                             <div className="flex items-center gap-1"><div className="w-4 h-4 bg-gray-300 border border-gray-400 rounded-sm"></div> Booked</div>
                                             <div className="flex items-center gap-1"><div className="w-4 h-4 border border-pink-400 bg-pink-100 rounded-sm"></div> Women Only</div>
                                        </div>
                                        <Separator className="mb-3"/>

                                        <div className="grid grid-cols-5 gap-2 justify-center"> {/* Adjust cols based on layout */}
                                             {seatLayout.map(seat => (
                                                <Button
                                                    key={seat.id}
                                                    variant={selectedSeats.some(s => s.id === seat.id) ? "default" : seat.isWomenOnly ? "outline" : "outline"}
                                                    size="icon"
                                                    className={cn(
                                                        "h-8 w-8 text-xs font-mono border",
                                                        !seat.isAvailable && "bg-gray-300 text-gray-500 cursor-not-allowed border-gray-400",
                                                        selectedSeats.some(s => s.id === seat.id) && "bg-primary text-primary-foreground",
                                                        seat.isWomenOnly && !selectedSeats.some(s => s.id === seat.id) && "border-pink-400 bg-pink-100 text-pink-700 hover:bg-pink-200",
                                                        seat.isSleeper && "h-8 w-12 rounded", // Wider for sleeper
                                                    )}
                                                    onClick={() => handleSeatSelect(seat)}
                                                    disabled={!seat.isAvailable}
                                                    title={seat.isSleeper ? 'Sleeper' : 'Seater'}
                                                >
                                                     <Armchair className={cn("h-4 w-4", seat.isSleeper ? "hidden" : "")}/>
                                                      <span className={cn(seat.isSleeper ? "" : "hidden")}>{seat.isLower ? 'L' : 'U'}</span>
                                                </Button>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Boarding & Dropping Points */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <Label htmlFor="boardingPoint">Boarding Point</Label>
                                        <Select value={boardingPoint} onValueChange={setBoardingPoint} required>
                                            <SelectTrigger id="boardingPoint"><SelectValue placeholder="Select Boarding Point" /></SelectTrigger>
                                            <SelectContent>
                                                {selectedBus.boardingPoints.map(point => <SelectItem key={`bp-${point}`} value={point}>{point}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                     <div>
                                        <Label htmlFor="droppingPoint">Dropping Point</Label>
                                        <Select value={droppingPoint} onValueChange={setDroppingPoint} required>
                                            <SelectTrigger id="droppingPoint"><SelectValue placeholder="Select Dropping Point" /></SelectTrigger>
                                            <SelectContent>
                                                {selectedBus.droppingPoints.map(point => <SelectItem key={`dp-${point}`} value={point}>{point}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Passenger Details (Simple for Demo) */}
                                <Card className="mb-4">
                                     <CardHeader className="pb-2">
                                         <CardTitle className="text-sm">Passenger Details</CardTitle>
                                     </CardHeader>
                                     <CardContent className="space-y-2">
                                         <Input placeholder="Full Name" value={passengerDetails.name} onChange={e => setPassengerDetails({...passengerDetails, name: e.target.value})} required/>
                                         <Input type="email" placeholder="Email Address" value={passengerDetails.email} onChange={e => setPassengerDetails({...passengerDetails, email: e.target.value})} required/>
                                         <Input type="tel" placeholder="Mobile Number" value={passengerDetails.phone} onChange={e => setPassengerDetails({...passengerDetails, phone: e.target.value})} required/>
                                     </CardContent>
                                </Card>
                            </div>

                             <DialogFooter className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2">
                                 <div className="text-left">
                                     <p className="text-sm text-muted-foreground">Seats: {selectedSeats.map(s => s.id).join(', ')} ({selectedSeats.length})</p>
                                     <p className="text-lg font-bold">Total Fare: ₹{totalFare.toFixed(2)}</p>
                                 </div>
                                 <Button
                                     className="w-full sm:w-auto bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                     disabled={selectedSeats.length === 0 || !boardingPoint || !droppingPoint || isBooking}
                                     onClick={handleConfirmBooking} // Use confirmation directly for demo
                                 >
                                     {isBooking ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <User className="mr-2 h-4 w-4"/>}
                                     {isBooking ? 'Booking...' : 'Confirm Booking'}
                                 </Button>
                             </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </main>
        </div>
    );
}
