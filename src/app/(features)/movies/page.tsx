'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Clapperboard, CalendarIcon, Clock, MapPin, Filter, ChevronDown, ChevronUp, Armchair, X, Loader2, Plane, UserCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, addDays, startOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import React from 'react';
import { confirmBooking } from '@/services/booking'; // Import the booking service
import { useRouter } from 'next/navigation'; // Import useRouter

// Mock Data (Replace with actual API calls)
interface Movie {
    id: string;
    title: string;
    genre: string;
    language: string;
    rating: string; // e.g., "UA", "A"
    duration: string; // e.g., "2h 30m"
    imageUrl: string;
    releaseDate?: Date;
    isUpcoming?: boolean;
    dataAiHint?: string; // Added optional AI hint
}

const mockMovies: Movie[] = [
    { id: 'm1', title: "Action Movie Alpha", genre: "Action/Thriller", language: "English", rating: "UA", duration: "2h 15m", imageUrl: "https://picsum.photos/seed/alpha/300/450", dataAiHint:"action movie poster" },
    { id: 'm2', title: "Comedy Fest", genre: "Comedy/Romance", language: "Hindi", rating: "U", duration: "2h 05m", imageUrl: "https://picsum.photos/seed/comedy/300/450", dataAiHint:"comedy movie poster" },
    { id: 'm3', title: "Sci-Fi Voyager", genre: "Sci-Fi/Adventure", language: "English", rating: "UA", duration: "2h 45m", imageUrl: "https://picsum.photos/seed/scifi/300/450", dataAiHint:"science fiction movie poster" },
    { id: 'm4', title: "Drama Queen", genre: "Drama", language: "Tamil", rating: "A", duration: "2h 20m", imageUrl: "https://picsum.photos/seed/drama/300/450", dataAiHint:"drama movie poster" },
    { id: 'm5', title: "Upcoming Hero", genre: "Superhero", language: "English", rating: "UA", duration: "N/A", imageUrl: "https://picsum.photos/seed/upcoming/300/450", releaseDate: addDays(new Date(), 14), isUpcoming: true, dataAiHint:"superhero movie poster upcoming" },
];

interface Cinema {
    id: string;
    name: string;
    location: string;
    amenities: string[]; // e.g., ['IMAX', 'Dolby Atmos', 'Recliner Seats']
}

interface Showtime {
    time: string; // e.g., "10:00 AM"
    format: string; // e.g., "2D", "IMAX 3D"
    price: number;
    isFillingFast?: boolean;
    isAlmostFull?: boolean;
}

const mockCinemas: Cinema[] = [
    { id: 'c1', name: "PVR Orion Mall", location: "Rajajinagar", amenities: ['IMAX', 'Recliner Seats'] },
    { id: 'c2', name: "INOX Garuda Mall", location: "MG Road", amenities: ['Dolby Atmos'] },
    { id: 'c3', name: "Cinepolis Forum Shantiniketan", location: "Whitefield", amenities: ['4DX'] },
];

const mockShowtimes: { [cinemaId: string]: Showtime[] } = {
    'c1': [
        { time: "10:00 AM", format: "IMAX 2D", price: 450 },
        { time: "01:15 PM", format: "IMAX 2D", price: 450, isFillingFast: true },
        { time: "04:30 PM", format: "2D", price: 300 },
        { time: "07:45 PM", format: "IMAX 2D", price: 500, isAlmostFull: true },
        { time: "11:00 PM", format: "2D", price: 250 },
    ],
    'c2': [
        { time: "11:30 AM", format: "Dolby Atmos 2D", price: 350 },
        { time: "02:45 PM", format: "Dolby Atmos 2D", price: 350, isFillingFast: true },
        { time: "06:00 PM", format: "2D", price: 280 },
        { time: "09:15 PM", format: "Dolby Atmos 2D", price: 400 },
    ],
    'c3': [
        { time: "10:45 AM", format: "4DX 3D", price: 600 },
        { time: "01:50 PM", format: "2D", price: 250 },
        { time: "05:00 PM", format: "4DX 3D", price: 650, isFillingFast: true },
        { time: "08:10 PM", format: "2D", price: 300 },
    ],
};

interface Seat {
    id: string; // e.g., A1, G15
    row: string;
    number: number;
    type: 'Normal' | 'Premium' | 'Recliner';
    isAvailable: boolean;
    isAisle?: boolean; // Indicate if this position should be an aisle space
    price: number;
}

// Generate mock cinema seats with aisles
const generateCinemaSeats = (basePrice: number): { seats: Seat[], rows: string[], maxCols: number } => {
    const seats: Seat[] = [];
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']; // Rows H, G, F are often premium/recliner
    const totalSeatsPerRow = 18; // Total positions including potential aisles
    const aisleAfterSeat = [4, 14]; // Add an aisle gap after seat 4 and 14

    let seatCounter = 0;
    for (const row of rows) {
        seatCounter = 0; // Reset seat number for each row
        for (let pos = 1; pos <= totalSeatsPerRow; pos++) {
            if (aisleAfterSeat.includes(pos)) {
                 // Add an aisle placeholder (optional, styling can handle gaps)
                 seats.push({ id: `${row}-aisle-${pos}`, row, number: 0, type: 'Normal', isAvailable: false, isAisle: true, price: 0 });
            } else {
                seatCounter++;
                const seatNumber = seatCounter;
                 const id = `${row}${seatNumber}`;
                 let type: Seat['type'] = 'Normal';
                 let price = basePrice;
                 // Example: Rows F, G are premium, H is recliner
                 if (['F', 'G'].includes(row)) { type = 'Premium'; price = Math.round(basePrice * 1.2); }
                 if (row === 'H') { type = 'Recliner'; price = Math.round(basePrice * 1.5); }

                 seats.push({
                    id,
                    row,
                    number: seatNumber,
                    type,
                    isAvailable: Math.random() > 0.4, // 60% available
                    price,
                    isAisle: false,
                 });
            }
        }
    }
    return { seats, rows, maxCols: totalSeatsPerRow }; // Return total positions for grid layout
};


export default function MovieBookingPage() {
    const [selectedCity, setSelectedCity] = useState('Bangalore'); // Default city
    const [movies, setMovies] = useState<Movie[]>([]);
    const [isLoadingMovies, setIsLoadingMovies] = useState(true);
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
    const [cinemas, setCinemas] =useState<Cinema[]>([]);
    const [isLoadingCinemas, setIsLoadingCinemas] = useState(false);
    const [selectedCinema, setSelectedCinema] = useState<Cinema | null>(null);
    const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
    const [seatLayout, setSeatLayout] = useState<Seat[]>([]);
    const [seatRows, setSeatRows] = useState<string[]>([]);
    const [seatMaxCols, setSeatMaxCols] = useState(0);
    const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
    const [showSeatSelection, setShowSeatSelection] = useState(false);
    const [isBooking, setIsBooking] = useState(false);
    const { toast } = useToast();
    const router = useRouter(); // Initialize router

    // Fetch Movies on Load
    useEffect(() => {
        const fetchMovies = async () => {
            setIsLoadingMovies(true);
            try {
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1000));
                setMovies(mockMovies);
            } catch (error) {
                console.error("Failed to fetch movies:", error);
                toast({ variant: "destructive", title: "Error Loading Movies" });
            } finally {
                setIsLoadingMovies(false);
            }
        };
        fetchMovies();
    }, [selectedCity, toast]); // Refetch if city changes

    // Fetch Cinemas when a movie and date are selected
    useEffect(() => {
        if (selectedMovie && selectedDate) {
            const fetchCinemas = async () => {
                setIsLoadingCinemas(true);
                setCinemas([]); // Clear previous cinemas
                setSelectedCinema(null);
                setSelectedShowtime(null);
                try {
                    console.log(`Fetching cinemas for ${selectedMovie.title} on ${format(selectedDate, 'yyyy-MM-dd')}`);
                    // Simulate API call
                    await new Promise(resolve => setTimeout(resolve, 800));
                    setCinemas(mockCinemas.filter(() => Math.random() > 0.2)); // Simulate some cinemas showing the movie
                } catch (error) {
                    console.error("Failed to fetch cinemas:", error);
                    toast({ variant: "destructive", title: "Error Loading Cinemas" });
                } finally {
                    setIsLoadingCinemas(false);
                }
            };
            fetchCinemas();
        }
    }, [selectedMovie, selectedDate, toast]);

    const handleSelectMovie = (movie: Movie) => {
        setSelectedMovie(movie);
        setSelectedDate(startOfDay(new Date())); // Reset date to today when selecting a new movie
        setCinemas([]);
        setSelectedCinema(null);
        setSelectedShowtime(null);
        setShowSeatSelection(false); // Close seat selection if open
    };

     const handleDateSelect = (date: Date | undefined) => {
        if(date) {
            setSelectedDate(startOfDay(date));
            setSelectedCinema(null); // Reset cinema/showtime when date changes
            setSelectedShowtime(null);
        }
    };

    const handleSelectCinema = (cinema: Cinema) => {
        setSelectedCinema(prev => prev?.id === cinema.id ? null : cinema); // Toggle cinema selection
         setSelectedShowtime(null); // Reset showtime when cinema changes
    };

    const handleSelectShowtime = (showtime: Showtime) => {
        if (!selectedMovie || !selectedCinema) return;
        setSelectedShowtime(showtime);
        const { seats, rows, maxCols } = generateCinemaSeats(showtime.price); // Generate seats based on base showtime price
        setSeatLayout(seats);
        setSeatRows(rows);
        setSeatMaxCols(maxCols);
        setSelectedSeats([]);
        setShowSeatSelection(true); // Open seat selection modal/dialog
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
                 if (prev.length >= 10) { // Limit max seats selectable
                    toast({ description: "You can select a maximum of 10 seats." });
                    return prev;
                }
                return [...prev, seat];
            }
        });
    };

    const totalFare = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

     const handleConfirmBooking = async () => {
         if (selectedSeats.length === 0 || !selectedMovie || !selectedCinema || !selectedShowtime) {
             toast({ variant: "destructive", title: "Selection Incomplete", description: "Please select seats first." });
             return;
         }
         setIsBooking(true);
         try {
            const bookingData = {
                movieId: selectedMovie.id,
                movieName: selectedMovie.title, // Include name for logging/display
                cinemaId: selectedCinema.id,
                cinemaName: selectedCinema.name, // Include name for logging/display
                showtime: selectedShowtime.time,
                format: selectedShowtime.format,
                seats: selectedSeats.map(s => s.id),
                totalAmount: totalFare,
                // TODO: Add payment method selection if needed (e.g., 'wallet', 'upi')
                paymentMethod: 'wallet' // Default to wallet for now
            };
             console.log("Confirming movie booking via API:", bookingData);
              // Call the booking service API
             const result = await confirmBooking('movie', bookingData);

             if (result.status === 'Completed') {
                 toast({
                     title: "Booking Confirmed!",
                     description: `Your tickets for ${selectedMovie.title} are booked. Booking ID: ${result.bookingDetails?.bookingId || 'N/A'}. Total Fare: ₹${totalFare.toFixed(2)}`
                 });
                 // Reset state or navigate away
                 setShowSeatSelection(false);
                 setSelectedSeats([]);
                 // Optionally navigate to a tickets page or history
                 // router.push('/history');
             } else {
                  // Handle Pending or Failed status from backend
                 toast({
                    variant: "destructive",
                    title: `Booking ${result.status || 'Failed'}`,
                    description: result.message || "Could not confirm your booking."
                 });
             }

         } catch (error: any) {
             console.error("Movie booking failed:", error);
             toast({ variant: "destructive", title: "Booking Failed", description: error.message || "An unexpected error occurred." });
         } finally {
             setIsBooking(false);
         }
     };

    const availableDates = Array.from({ length: 7 }).map((_, i) => addDays(startOfDay(new Date()), i));

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Clapperboard className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Movie Tickets</h1>
                {/* City Selector */}
                 <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="w-auto h-8 ml-auto text-xs bg-primary/80 border-none text-primary-foreground">
                        <MapPin className="h-3 w-3 mr-1"/> <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {['Bangalore', 'Chennai', 'Mumbai', 'Delhi'].map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                    </SelectContent>
                </Select>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-0 sm:p-4 flex flex-col md:flex-row gap-4 pb-20">

                {/* Movie List (Left Side or Full Width on Mobile) */}
                 <div className={cn("w-full md:w-1/3 lg:w-1/4 p-4 md:p-0 space-y-4", selectedMovie ? "hidden md:block" : "block")}>
                     <h2 className="text-lg font-semibold px-4 md:px-0">Now Showing in {selectedCity}</h2>
                     {isLoadingMovies && <div className="flex justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}
                     {!isLoadingMovies && movies.length === 0 && <p className="text-muted-foreground text-center p-6">No movies found.</p>}
                     {!isLoadingMovies && (
                         <Tabs defaultValue="now_showing" className="w-full">
                             <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="now_showing">Now Showing</TabsTrigger>
                                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                             </TabsList>
                             <TabsContent value="now_showing" className="space-y-3">
                                {movies.filter(m => !m.isUpcoming).map(movie => (
                                    <Card key={movie.id} className={cn("shadow-sm cursor-pointer hover:shadow-md transition-shadow", selectedMovie?.id === movie.id && "border-primary ring-1 ring-primary")} onClick={() => handleSelectMovie(movie)}>
                                        <CardContent className="p-3 flex gap-3 items-start">
                                             <Image src={movie.imageUrl} alt={movie.title} width={80} height={120} className="rounded object-cover w-20 h-auto" data-ai-hint={movie.dataAiHint}/>
                                             <div>
                                                <p className="font-semibold text-sm">{movie.title}</p>
                                                <p className="text-xs text-muted-foreground">{movie.genre}</p>
                                                 <Badge variant="outline" className="mt-1 text-xs">{movie.language}</Badge> <Badge variant="secondary" className="mt-1 text-xs">{movie.rating}</Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                             </TabsContent>
                              <TabsContent value="upcoming" className="space-y-3">
                                 {movies.filter(m => m.isUpcoming).map(movie => (
                                    <Card key={movie.id} className="shadow-sm opacity-70 cursor-not-allowed">
                                        <CardContent className="p-3 flex gap-3 items-start">
                                             <Image src={movie.imageUrl} alt={movie.title} width={80} height={120} className="rounded object-cover w-20 h-auto" data-ai-hint={movie.dataAiHint}/>
                                             <div>
                                                <p className="font-semibold text-sm">{movie.title}</p>
                                                <p className="text-xs text-muted-foreground">{movie.genre}</p>
                                                 <Badge variant="outline" className="mt-1 text-xs">{movie.language}</Badge>
                                                 {movie.releaseDate && <p className="text-xs mt-1">Releasing {format(movie.releaseDate, 'MMM d')}</p>}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {movies.filter(m => m.isUpcoming).length === 0 && <p className="text-muted-foreground text-center py-4">No upcoming movies listed.</p>}
                             </TabsContent>
                         </Tabs>
                     )}
                </div>

                {/* Cinema & Showtime List (Right Side or Full Width on Mobile when movie selected) */}
                 <div className={cn("w-full md:flex-1 space-y-4 p-4 md:p-0", !selectedMovie ? "hidden md:block" : "block")}>
                    {selectedMovie ? (
                         <>
                            <Card className="shadow-md">
                                <CardHeader className="flex flex-row items-start gap-4 pb-2">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden -ml-2" onClick={() => setSelectedMovie(null)}><ArrowLeft className="h-4 w-4"/></Button>
                                     <Image src={selectedMovie.imageUrl} alt={selectedMovie.title} width={80} height={120} className="rounded object-cover w-20 h-auto" data-ai-hint={selectedMovie.dataAiHint}/>
                                     <div>
                                        <CardTitle>{selectedMovie.title}</CardTitle>
                                         <CardDescription>{selectedMovie.genre} | {selectedMovie.language} | {selectedMovie.rating} | {selectedMovie.duration}</CardDescription>
                                         {/* Add filters later */}
                                        {/* <Button variant="outline" size="sm" className="mt-2"><Filter className="mr-1 h-4 w-4"/> Filters</Button> */}
                                     </div>
                                </CardHeader>
                                <CardContent>
                                     <ScrollArea className="w-full pb-3">
                                        <div className="flex space-x-2">
                                             {availableDates.map(date => (
                                                <Button
                                                    key={date.toISOString()}
                                                    variant={format(selectedDate, 'yyyyMMdd') === format(date, 'yyyyMMdd') ? "default" : "outline"}
                                                    className="flex flex-col h-auto p-2 w-16"
                                                    onClick={() => handleDateSelect(date)}
                                                >
                                                     <span className="text-xs uppercase">{format(date, 'EEE')}</span>
                                                     <span className="text-lg font-semibold">{format(date, 'd')}</span>
                                                     <span className="text-xs uppercase">{format(date, 'MMM')}</span>
                                                </Button>
                                            ))}
                                        </div>
                                        <ScrollBar orientation="horizontal" />
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            {isLoadingCinemas && <div className="flex justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}
                             {!isLoadingCinemas && cinemas.length === 0 && selectedMovie && (
                                <Card className="shadow-md text-center">
                                    <CardContent className="p-6">
                                        <p className="text-muted-foreground">No cinemas found showing {selectedMovie.title} on {format(selectedDate, 'PPP')}.</p>
                                    </CardContent>
                                </Card>
                             )}
                             {!isLoadingCinemas && cinemas.map(cinema => (
                                <Card key={cinema.id} className="shadow-sm">
                                    <CardHeader className="pb-2 cursor-pointer" onClick={() => handleSelectCinema(cinema)}>
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-base">{cinema.name}</CardTitle>
                                             {selectedCinema?.id === cinema.id ? <ChevronUp className="h-5 w-5 text-primary"/> : <ChevronDown className="h-5 w-5 text-muted-foreground"/>}
                                        </div>
                                         <CardDescription>{cinema.location}</CardDescription>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {cinema.amenities.map(am => <Badge key={am} variant="secondary" className="text-xs">{am}</Badge>)}
                                          </div>
                                    </CardHeader>
                                     {selectedCinema?.id === cinema.id && (
                                        <CardContent>
                                             <Separator className="mb-3"/>
                                             <div className="flex flex-wrap gap-2">
                                                 {(mockShowtimes[cinema.id] || []).map(show => (
                                                    <Button
                                                        key={show.time}
                                                        variant={"outline"}
                                                        className={cn(
                                                            "border-green-500 text-green-700 hover:bg-green-50",
                                                            show.isFillingFast && "border-orange-500 text-orange-700 hover:bg-orange-50",
                                                            show.isAlmostFull && "border-red-500 text-red-700 hover:bg-red-50 cursor-not-allowed opacity-60" // Example: disable almost full
                                                        )}
                                                        onClick={() => !show.isAlmostFull && handleSelectShowtime(show)}
                                                        disabled={show.isAlmostFull}
                                                    >
                                                        {show.time}
                                                         <Badge variant="outline" className="ml-1 text-xs">{show.format}</Badge>
                                                         {show.isFillingFast && <Badge variant="outline" className="ml-1 text-xs text-orange-700 border-orange-500">Filling Fast</Badge>}
                                                         {show.isAlmostFull && <Badge variant="outline" className="ml-1 text-xs text-red-700 border-red-500">Almost Full</Badge>}
                                                    </Button>
                                                 ))}
                                                 {(mockShowtimes[cinema.id] || []).length === 0 && <p className="text-xs text-muted-foreground">No shows available for this selection.</p>}
                                             </div>
                                        </CardContent>
                                     )}
                                </Card>
                             ))}
                         </>
                    ) : (
                        <Card className="shadow-md h-full flex items-center justify-center text-center hidden md:flex">
                            <CardContent className="p-6">
                                <Clapperboard className="h-16 w-16 text-muted-foreground mx-auto mb-4"/>
                                <p className="text-muted-foreground">Select a movie from the list to see showtimes.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                 {/* Seat Selection Dialog */}
                 <Dialog open={showSeatSelection} onOpenChange={setShowSeatSelection}>
                     <DialogContent className="max-w-3xl p-0"> {/* Increased max-width */}
                         <DialogHeader className="p-4 border-b">
                             <DialogTitle>Select Seats</DialogTitle>
                             <DialogDescription>
                                 {selectedMovie?.title} at {selectedCinema?.name} - {selectedShowtime?.time} ({selectedShowtime?.format})
                             </DialogDescription>
                              <Button variant="ghost" size="icon" className="absolute right-4 top-4 h-7 w-7" onClick={() => setShowSeatSelection(false)}>
                                <X className="h-4 w-4"/>
                             </Button>
                         </DialogHeader>
                         <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                              {/* Screen Indicator */}
                              <div className="w-full pt-4 pb-8">
                                <div className="h-0.5 w-full bg-gray-300"></div>
                                <svg width="100%" height="30" viewBox="0 0 100 10" preserveAspectRatio="none">
                                    <path d="M 0 10 Q 50 -5 100 10" stroke="rgb(156 163 175)" strokeWidth="1" fill="none" />
                                </svg>
                                <div className="text-center text-xs text-muted-foreground -mt-3">Screen this way</div>
                             </div>

                               {/* Enhanced Seat Grid with Row Labels */}
                               <div className="flex flex-col items-center">
                                  {seatRows.map(row => (
                                     <div key={row} className="flex items-center gap-1 mb-1 w-full justify-center">
                                        <div className="w-6 text-center text-xs font-medium text-muted-foreground">{row}</div>
                                        <div className="flex flex-wrap justify-center gap-1.5 flex-grow">
                                           {seatLayout.filter(s => s.row === row).map(seat => (
                                              seat.isAisle ? (
                                                  <div key={seat.id} className="w-4"></div> // Aisle space
                                              ) : (
                                                  <Button
                                                      key={seat.id}
                                                      variant={selectedSeats.some(s => s.id === seat.id) ? "default" : "outline"}
                                                      size="icon"
                                                      className={cn(
                                                         "h-6 w-6 text-[10px] leading-none border rounded-sm", // Base style
                                                         !seat.isAvailable && "bg-gray-300 text-gray-500 cursor-not-allowed border-gray-400",
                                                         selectedSeats.some(s => s.id === seat.id) && "bg-primary text-primary-foreground",
                                                         seat.type === 'Premium' && !selectedSeats.some(s => s.id === seat.id) && seat.isAvailable && "border-yellow-500",
                                                         seat.type === 'Recliner' && !selectedSeats.some(s => s.id === seat.id) && seat.isAvailable && "border-blue-500",
                                                          seat.type === 'Recliner' && "w-8" // Make recliners slightly wider
                                                      )}
                                                      onClick={() => handleSeatSelect(seat)}
                                                      disabled={!seat.isAvailable}
                                                      title={`${seat.id} (${seat.type}) - ₹${seat.price}`}
                                                  >
                                                      {seat.number}
                                                  </Button>
                                              )
                                           ))}
                                        </div>
                                        <div className="w-6"></div> {/* Spacer for symmetry */}
                                     </div>
                                  ))}
                              </div>

                             {/* Legend */}
                             <Separator className="my-4"/>
                             <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
                                <div className="flex items-center gap-1.5"><div className="w-4 h-4 border border-gray-400 rounded-xs"></div> Available</div>
                                <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-primary rounded-xs"></div> Selected</div>
                                <div className="flex items-center gap-1.5"><div className="w-4 h-4 border border-yellow-500 rounded-xs"></div> Premium (₹+)</div>
                                <div className="flex items-center gap-1.5"><div className="w-4 h-4 border border-blue-500 rounded-xs"></div> Recliner (₹++)</div>
                                <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-gray-300 border border-gray-400 rounded-xs"></div> Booked</div>
                             </div>
                         </div>
                          <DialogFooter className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2">
                            <div className="text-left">
                                 <p className="text-sm text-muted-foreground">Seats: {selectedSeats.map(s => s.id).join(', ') || 'None'} ({selectedSeats.length})</p>
                                <p className="text-lg font-bold">Total: ₹{totalFare.toFixed(2)}</p>
                            </div>
                             <Button
                                 className="w-full sm:w-auto bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                 disabled={selectedSeats.length === 0 || isBooking}
                                 onClick={handleConfirmBooking} // Trigger booking on click
                            >
                                {isBooking ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                {isBooking ? 'Processing...' : `Pay ₹${totalFare.toFixed(2)}`}
                            </Button>
                         </DialogFooter>
                     </DialogContent>
                 </Dialog>

            </main>
        </div>
    );
}
