'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, HeartHandshake, Search, Filter, MapPin, CalendarIcon, Users, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';

// Mock Data
const mockVenues = [
    { id: 'v1', name: 'Grand Celebration Hall', location: 'Koramangala, Bangalore', capacity: 500, priceRange: '₹1 Lakh+', rating: 4.8, imageUrl: '/images/venues/venue1.jpg' },
    { id: 'v2', name: 'Star Convention Center', location: 'Hitech City, Hyderabad', capacity: 1000, priceRange: '₹2 Lakh+', rating: 4.5, imageUrl: '/images/venues/venue2.jpg' },
    { id: 'v3', name: 'Palace Grounds Banquet', location: 'Palace Grounds, Bangalore', capacity: 800, priceRange: '₹1.5 Lakh+', rating: 4.6, imageUrl: '/images/venues/venue3.jpg' },
];
const mockCities = ['Bangalore', 'Hyderabad', 'Chennai', 'Mumbai', 'Delhi'];

export default function MarriageBookingPage() {
    const [selectedCity, setSelectedCity] = useState('');
    const [eventDate, setEventDate] = useState<Date | undefined>();
    const [guests, setGuests] = useState<string>('');
    const [searchResults, setSearchResults] = useState<typeof mockVenues>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const { toast } = useToast();

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!selectedCity || !eventDate) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select city and event date." });
            return;
        }
        setIsLoading(true);
        setShowResults(false);
        setSearchResults([]);
        console.log("Searching Marriage Venues:", { city: selectedCity, date: format(eventDate, 'yyyy-MM-dd'), guests });
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Filter mock data (replace with actual API)
            const results = mockVenues.filter(v => v.location.toLowerCase().includes(selectedCity.toLowerCase()));
            setSearchResults(results);
            setShowResults(true);
            if (results.length === 0) {
                 toast({ description: "No venues found matching your criteria." });
            }
        } catch (error) {
            console.error("Venue search failed:", error);
            toast({ variant: "destructive", title: "Search Failed" });
        } finally {
            setIsLoading(false);
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
                <HeartHandshake className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Marriage Hall Booking</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                {!showResults ? (
                     <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle>Find Wedding Venues</CardTitle>
                            <CardDescription>Search for marriage halls, banquet halls, and other event venues.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSearch} className="space-y-4">
                                 <div className="space-y-1">
                                    <Label htmlFor="city">City</Label>
                                    <Select value={selectedCity} onValueChange={setSelectedCity} required>
                                        <SelectTrigger id="city"><SelectValue placeholder="Select City" /></SelectTrigger>
                                        <SelectContent>
                                            {mockCities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="eventDate">Event Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button id="eventDate" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !eventDate && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {eventDate ? format(eventDate, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar mode="single" selected={eventDate} onSelect={setEventDate} initialFocus disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}/>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="guests">Number of Guests (Optional)</Label>
                                        <Input id="guests" type="number" placeholder="e.g., 500" value={guests} onChange={(e) => setGuests(e.target.value)} />
                                    </div>
                                </div>
                                 <Button type="submit" className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                    {isLoading ? 'Searching...' : 'Search Venues'}
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
                             <h2 className="text-lg font-semibold">{searchResults.length} Venues Found</h2>
                              <Button variant="ghost" size="sm"><Filter className="mr-1 h-4 w-4"/> Filter</Button> {/* Add Filter functionality */}
                         </div>
                         {searchResults.map(venue => (
                            <Card key={venue.id} className="shadow-sm overflow-hidden">
                                <div className="flex flex-col sm:flex-row">
                                    <div className="relative w-full sm:w-1/3 h-32 sm:h-auto">
                                        <Image src={venue.imageUrl || '/images/venues/default.jpg'} alt={venue.name} layout="fill" objectFit="cover" className="sm:rounded-l-lg sm:rounded-tr-none" data-ai-hint="wedding venue banquet hall"/>
                                    </div>
                                    <div className="flex-grow p-3">
                                         <CardTitle className="text-base mb-1">{venue.name}</CardTitle>
                                         <CardDescription className="text-xs text-muted-foreground mb-2"><MapPin className="inline h-3 w-3 mr-1"/>{venue.location}</CardDescription>
                                         <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
                                             <span className="flex items-center gap-1"><Users className="h-3 w-3"/>Capacity: {venue.capacity}</span>
                                             <span className="flex items-center gap-1"><Wallet className="h-3 w-3"/>Est. Price: {venue.priceRange}</span>
                                             {venue.rating && <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500 fill-current"/>{venue.rating}/5</span>}
                                         </div>
                                          <Button className="mt-2 w-full sm:w-auto h-8" onClick={() => alert(`Enquire/Book ${venue.name}`)}>Enquire / Book</Button>
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
