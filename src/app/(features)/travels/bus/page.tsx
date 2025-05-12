
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Bus, CalendarIcon, Search, ArrowRightLeft, Loader2, User, Wallet, Filter, ChevronDown, ChevronUp, Armchair, X, Plane, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { apiClient } from '@/lib/apiClient';
import { confirmBooking } from '@/services/booking';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { mockCities, mockBusOperators, mockBusRoutes, BusRoute } from '@/mock-data'; // Import centralized mock data

interface Seat {
    id: string;
    number?: string;
    isLower: boolean;
    type: 'seater' | 'sleeper' | 'aisle';
    isAvailable: boolean;
    isWomenOnly?: boolean;
    isGangway?: boolean;
    price: number;
    gridColumn: string;
    gridRow: string;
}

const generateBusSeats = (busType: BusRoute['type'], basePrice: number): Seat[] => {
    const seats: Seat[] = [];
    const isSleeper = busType.includes('Sleeper');
    const rows = isSleeper ? 10 : 12;
    
    for (let r = 1; r <= rows; r++) {
        if (isSleeper) {
            seats.push({ id: `L${r}S`, number: `L${r}`, isLower: true, type: 'sleeper', isAvailable: Math.random() > 0.3, price: basePrice + 50, gridColumn: '1', gridRow: String(r) });
            seats.push({ id: `LA${r}`, isLower: true, type: 'aisle', isAvailable: false, price: 0, isGangway: true, gridColumn: '2', gridRow: String(r) });
            seats.push({ id: `L${r}DA`, number: `L${r}A`, isLower: true, type: 'sleeper', isAvailable: Math.random() > 0.3, price: basePrice + 50, gridColumn: '3', gridRow: String(r) });
            seats.push({ id: `L${r}DB`, number: `L${r}B`, isLower: true, type: 'sleeper', isAvailable: Math.random() > 0.3, price: basePrice + 50, gridColumn: '4', gridRow: String(r) });
            
            seats.push({ id: `U${r}S`, number: `U${r}`, isLower: false, type: 'sleeper', isAvailable: Math.random() > 0.4, price: basePrice + 100, gridColumn: '1', gridRow: String(r) });
            seats.push({ id: `UA${r}`, isLower: false, type: 'aisle', isAvailable: false, price: 0, isGangway: true, gridColumn: '2', gridRow: String(r) });
            seats.push({ id: `U${r}DA`, number: `U${r}A`, isLower: false, type: 'sleeper', isAvailable: Math.random() > 0.4, price: basePrice + 100, gridColumn: '3', gridRow: String(r) });
            seats.push({ id: `U${r}DB`, number: `U${r}B`, isLower: false, type: 'sleeper', isAvailable: Math.random() > 0.4, price: basePrice + 100, gridColumn: '4', gridRow: String(r) });
        } else {
            seats.push({ id: `L${r}A`, number: `${r}A`, isLower: true, type: 'seater', isAvailable: Math.random() > 0.3, price: basePrice, gridColumn: '1', gridRow: String(r) });
            seats.push({ id: `L${r}B`, number: `${r}B`, isLower: true, type: 'seater', isAvailable: Math.random() > 0.3, price: basePrice, gridColumn: '2', gridRow: String(r) });
            seats.push({ id: `LA${r}`, isLower: true, type: 'aisle', isAvailable: false, price: 0, isGangway: true, gridColumn: '3', gridRow: String(r) });
            seats.push({ id: `L${r}C`, number: `${r}C`, isLower: true, type: 'seater', isAvailable: Math.random() > 0.3, price: basePrice, gridColumn: '4', gridRow: String(r) });
            seats.push({ id: `L${r}D`, number: `${r}D`, isLower: true, type: 'seater', isAvailable: Math.random() > 0.3, price: basePrice, gridColumn: '5', gridRow: String(r) });
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
    const router = useRouter();

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!fromCity || !toCity || !travelDate) {
            toast({ variant: "destructive", title: "Please fill all fields" });
            return;
        }
        setIsLoading(true);
        setShowResults(false);
        setSearchResults([]);
        console.log("Searching buses:", { fromCity, toCity, date: format(travelDate, 'yyyy-MM-dd') });
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const results = mockBusRoutes.filter(route => Math.random() > 0.3);
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
        const mockSeats = generateBusSeats(bus.type, bus.price);
        setSeatLayout(mockSeats);
        setSelectedSeats([]);
        setShowSeatSelection(true);
        setBoardingPoint('');
        setDroppingPoint('');
    };

    const handleSeatSelect = (seat: Seat) => {
        if (seat.type === 'aisle' || !seat.isAvailable) {
             if (!seat.isAvailable) toast({ description: "Seat not available" });
             return;
        }
        setSelectedSeats(prev => {
            const isSelected = prev.some(s => s.id === seat.id);
            if (isSelected) {
                return prev.filter(s => s.id !== seat.id);
            } else {
                if (prev.length >= 6) {
                    toast({ description: "You can select a maximum of 6 seats." });
                    return prev;
                }
                return [...prev, seat];
            }
        });
    };

    const totalFare = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

    const handleConfirmBooking = async () => {
         if (!passengerDetails.name || !passengerDetails.email || !passengerDetails.phone) {
             toast({ variant: "destructive", title: "Passenger Details Required" });
             return;
         }
         if (!selectedBus || !travelDate) {
              toast({ variant: "destructive", title: "Booking Error", description: "Missing booking details." });
             return;
         }
         setIsBooking(true);
         try {
             const bookingData = {
                 providerId: selectedBus.id,
                 selection: {
                     busId: selectedBus.id,
                     routeName: `${fromCity} to ${toCity}`,
                     boardingPoint,
                     droppingPoint,
                     seats: selectedSeats.map(s => s.id),
                 },
                 passengerDetails: passengerDetails,
                 totalAmount: totalFare,
                 paymentMethod: 'wallet',
             };
             const result = await confirmBooking('bus', bookingData);

             if (result.status === 'Completed') {
                toast({ title: "Booking Confirmed!", description: `Your tickets for ${selectedBus?.operator} are booked. Total Fare: ₹${totalFare}` });
                setShowSeatSelection(false);
                setSelectedBus(null);
                setShowResults(false);
                router.push('/history');
             } else {
                 toast({ variant: "destructive", title: `Booking ${result.status || 'Failed'}`, description: result.message || "Could not confirm your booking." });
             }
         } catch (error: any) {
             console.error("Booking failed:", error);
             toast({ variant: "destructive", title: "Booking Failed", description: error.message || "Could not confirm your booking." });
         } finally {
             setIsBooking(false);
         }
     };

    const swapCities = () => {
        setFromCity(toCity);
        setToCity(fromCity);
    };

    const lowerDeckSeats = seatLayout.filter(s => s.isLower);
    const upperDeckSeats = seatLayout.filter(s => !s.isLower && s.type !== 'aisle');
    const isSleeperLayout = selectedBus?.type.includes('Sleeper');
    const gridColsClass = isSleeperLayout ? 'grid-cols-4' : 'grid-cols-5';

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

            {/* Main Content */}
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

                {showResults && !showSeatSelection && (
                     <div>
                         <Button variant="outline" onClick={() => setShowResults(false)} className="mb-4">
                             <ArrowLeft className="mr-2 h-4 w-4"/> Modify Search
                         </Button>
                         <div className="flex justify-between items-center mb-2">
                             <h2 className="text-lg font-semibold">{searchResults.length} Buses Found</h2>
                              <Button variant="ghost" size="sm"><Filter className="mr-1 h-4 w-4"/> Filter</Button>
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

                 <Dialog open={showSeatSelection} onOpenChange={(open) => { if (!open) { setShowSeatSelection(false); setSelectedBus(null); } }}>
                     <DialogContent className="max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl p-0">
                         <DialogHeader className="p-4 border-b">
                             <DialogTitle className="flex items-center gap-2">
                                 <Bus className="h-5 w-5"/> Select Seats - {selectedBus?.operator}
                             </DialogTitle>
                             <DialogDescription>{fromCity} to {toCity} on {travelDate ? format(travelDate, 'PPP') : ''} ({selectedBus?.type})</DialogDescription>
                             <Button variant="ghost" size="icon" className="absolute right-4 top-4 h-7 w-7" onClick={() => {setShowSeatSelection(false); setSelectedBus(null);}}>
                                 <X className="h-4 w-4"/>
                             </Button>
                         </DialogHeader>
                         <div className="p-4 max-h-[65vh] overflow-y-auto">
                             <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mb-3 border-b pb-2 justify-center">
                                 <div className="flex items-center gap-1"><div className="w-4 h-4 border border-gray-400 rounded-sm"></div> Available</div>
                                 <div className="flex items-center gap-1"><div className="w-4 h-4 bg-primary text-primary-foreground rounded-sm flex items-center justify-center text-[10px]">✓</div> Selected</div>
                                 <div className="flex items-center gap-1"><div className="w-4 h-4 bg-gray-300 border border-gray-400 rounded-sm"></div> Booked</div>
                                 <div className="flex items-center gap-1"><div className="w-4 h-4 border border-pink-400 bg-pink-100 rounded-sm"></div> Women Only</div>
                             </div>

                             <div className="mb-2 text-right pr-4">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-steering-wheel inline-block h-5 w-5 text-muted-foreground"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 15.5V22"/><path d="M12 8.5V2"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
                             </div>

                            <div className="mb-4">
                                 <p className="text-center font-semibold text-sm mb-2">Lower Deck</p>
                                 <div className={`grid ${gridColsClass} gap-1.5 justify-center items-center`}>
                                     {lowerDeckSeats.map(seat => (
                                         <SeatButton key={seat.id} seat={seat} isSelected={selectedSeats.some(s => s.id === seat.id)} onSelect={handleSeatSelect} />
                                     ))}
                                 </div>
                             </div>

                             {isSleeperLayout && upperDeckSeats.length > 0 && (
                                 <div className="mt-6">
                                     <Separator className="mb-3"/>
                                     <p className="text-center font-semibold text-sm mb-2">Upper Deck</p>
                                      <div className={`grid ${gridColsClass} gap-1.5 justify-center items-center`}>
                                         {upperDeckSeats.map(seat => (
                                            <SeatButton key={seat.id} seat={seat} isSelected={selectedSeats.some(s => s.id === seat.id)} onSelect={handleSeatSelect} />
                                         ))}
                                     </div>
                                 </div>
                             )}

                             <Separator className="my-4"/>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                 <div>
                                     <Label htmlFor="boardingPoint">Boarding Point</Label>
                                     <Select value={boardingPoint} onValueChange={setBoardingPoint} required>
                                         <SelectTrigger id="boardingPoint"><SelectValue placeholder="Select Boarding Point" /></SelectTrigger>
                                         <SelectContent>
                                             {selectedBus && selectedBus.boardingPoints.map(point => <SelectItem key={`bp-${point}`} value={point}>{point}</SelectItem>)}
                                         </SelectContent>
                                     </Select>
                                 </div>
                                  <div>
                                     <Label htmlFor="droppingPoint">Dropping Point</Label>
                                     <Select value={droppingPoint} onValueChange={setDroppingPoint} required>
                                         <SelectTrigger id="droppingPoint"><SelectValue placeholder="Select Dropping Point" /></SelectTrigger>
                                         <SelectContent>
                                             {selectedBus && selectedBus.droppingPoints.map(point => <SelectItem key={`dp-${point}`} value={point}>{point}</SelectItem>)}
                                         </SelectContent>
                                     </Select>
                                 </div>
                             </div>

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
                                  <p className="text-sm text-muted-foreground">Seats: {selectedSeats.map(s => s.number || s.id).join(', ') || 'None'} ({selectedSeats.length})</p>
                                  <p className="text-lg font-bold">Total Fare: ₹{totalFare.toFixed(2)}</p>
                              </div>
                              <Button
                                  className="w-full sm:w-auto bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                  disabled={selectedSeats.length === 0 || !boardingPoint || !droppingPoint || isBooking || !passengerDetails.name || !passengerDetails.email || !passengerDetails.phone}
                                  onClick={handleConfirmBooking}
                              >
                                  {isBooking ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserCircle className="mr-2 h-4 w-4"/>}
                                  {isBooking ? 'Booking...' : 'Confirm Booking'}
                              </Button>
                          </DialogFooter>
                     </DialogContent>
                 </Dialog>
            </main>
        </div>
    );
}

interface SeatButtonProps {
    seat: Seat;
    isSelected: boolean;
    onSelect: (seat: Seat) => void;
}

function SeatButton({ seat, isSelected, onSelect }: SeatButtonProps) {
    if (seat.isGangway) {
         return <div style={{ gridColumn: seat.gridColumn, gridRow: seat.gridRow }} className="w-full h-full"></div>;
    }
    return (
        <Button
             style={{ gridColumn: seat.gridColumn, gridRow: seat.gridRow }}
             variant={isSelected ? "default" : seat.isWomenOnly ? "outline" : "outline"}
             size="icon"
             className={cn(
                "h-8 text-xs font-mono border rounded",
                seat.type === 'sleeper' ? "w-12" : "w-8",
                !seat.isAvailable && "bg-gray-300 text-gray-500 cursor-not-allowed border-gray-400",
                isSelected && "bg-primary text-primary-foreground",
                 seat.isWomenOnly && !isSelected && "border-pink-400 bg-pink-100 text-pink-700 hover:bg-pink-200",
             )}
             onClick={() => onSelect(seat)}
             disabled={!seat.isAvailable}
             title={seat.type === 'sleeper' ? 'Sleeper' : 'Seater'}
        >
            {seat.type === 'seater' ? <Armchair className="h-4 w-4"/> : seat.number}
        </Button>
    )
}
