
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search as SearchIconLucide, Loader2, ArrowRightLeft, CalendarDays as CalendarIconLucide, Bus, Clock, Users, Filter as FilterIcon, Ticket, RefreshCcw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { mockNbsCities, mockBusRoutesData, BusRoute as MockBusRoute } from '@/mock-data/liveTracking';
import Image from 'next/image';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

// Extend BusRoute to include serviceType for filtering
interface BusRoute extends MockBusRoute {
    serviceType?: string; // e.g., 'Volvo AC', 'Non-AC Seater', 'AC Sleeper'
    hasLiveTracking?: boolean;
}

const serviceTypes = ["All", "AC Sleeper", "Non-AC Sleeper", "AC Seater", "Non-AC Seater", "Volvo", "Ordinary", "Express", "Deluxe", "Super Luxury"];
const timeFilters = [
    { label: "Any Time", value: "any" },
    { label: "Morning (6AM-12PM)", value: "morning" },
    { label: "Afternoon (12PM-6PM)", value: "afternoon" },
    { label: "Evening (6PM-10PM)", value: "evening" },
    { label: "Night (10PM-6AM)", value: "night" },
];

interface RecentSearch {
    from: string;
    to: string;
}

const RECENT_SEARCHES_KEY = 'nbsRecentBusSearches';
const MAX_RECENT_SEARCHES = 5;

export default function SearchBusesPage() {
    const { toast } = useToast();
    const [fromCity, setFromCity] = useState('');
    const [toCity, setToCity] = useState('');
    const [journeyDate, setJourneyDate] = useState<Date | undefined>(new Date());
    const [returnDate, setReturnDate] = useState<Date | undefined>();
    const [tripType, setTripType] = useState<'oneWay' | 'roundTrip'>('oneWay');
    const [selectedTimeFilter, setSelectedTimeFilter] = useState<string>('any');
    const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>(["All"]);

    const [busSearchResults, setBusSearchResults] = useState<BusRoute[]>([]);
    const [isLoadingBusSearch, setIsLoadingBusSearch] = useState(false);
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

    useEffect(() => {
        try {
            const storedSearches = localStorage.getItem(RECENT_SEARCHES_KEY);
            if (storedSearches) {
                setRecentSearches(JSON.parse(storedSearches));
            }
        } catch (error) {
            console.error("Error loading recent searches from localStorage:", error);
        }
    }, []);

    const addRecentSearch = (from: string, to: string) => {
        if(!from || !to) return;
        setRecentSearches(prev => {
            const newSearch = { from, to };
            const filtered = prev.filter(s => !(s.from === from && s.to === to));
            const updated = [newSearch, ...filtered].slice(0, MAX_RECENT_SEARCHES);
            try {
                localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
            } catch (error) {
                 console.error("Error saving recent searches to localStorage:", error);
            }
            return updated;
        });
    };
    
    const handleRecentSearchClick = (search: RecentSearch) => {
        setFromCity(search.from);
        setToCity(search.to);
        handleSearchBuses(); // Optionally trigger search immediately
    };


    const handleSearchBuses = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!fromCity || !toCity || !journeyDate) {
            toast({ variant: "destructive", title: "Missing Info", description: "Please select From, To, and Date." });
            return;
        }
         if (tripType === 'roundTrip' && returnDate && journeyDate && differenceInDays(returnDate, journeyDate) < 0) {
            toast({ variant: "destructive", title: "Invalid Return Date", description: "Return date must be after departure date." });
            return;
        }

        setIsLoadingBusSearch(true);
        setBusSearchResults([]);
        try {
            addRecentSearch(fromCity, toCity);
            await new Promise(resolve => setTimeout(resolve, 1500));

            let results = mockBusRoutesData.filter(
                route => route.from.toLowerCase().includes(fromCity.toLowerCase()) &&
                         route.to.toLowerCase().includes(toCity.toLowerCase())
            );

            // Apply Service Type Filter
            if (!selectedServiceTypes.includes("All") && selectedServiceTypes.length > 0) {
                results = results.filter(route =>
                    selectedServiceTypes.some(st => route.serviceType?.toLowerCase().includes(st.toLowerCase()))
                );
            }

            // Apply Time Filter (simplified)
            if (selectedTimeFilter !== 'any') {
                results = results.filter(route => {
                    const departureHour = parseInt(route.departureTime.split(':')[0]);
                    if (selectedTimeFilter === 'morning' && (departureHour < 6 || departureHour >= 12)) return false;
                    if (selectedTimeFilter === 'afternoon' && (departureHour < 12 || departureHour >= 18)) return false;
                    if (selectedTimeFilter === 'evening' && (departureHour < 18 || departureHour >= 22)) return false;
                    if (selectedTimeFilter === 'night' && (departureHour < 22 && departureHour >= 6)) return false; // Corrected night logic
                    return true;
                });
            }

            setBusSearchResults(results);
            if (results.length === 0) toast({ description: "No buses found for this route/date/filters." });
        } catch (error) {
            toast({ variant: "destructive", title: "Bus Search Failed", description: "Could not fetch bus routes." });
        } finally {
            setIsLoadingBusSearch(false);
        }
    };

    const swapCities = () => {
        const temp = fromCity;
        setFromCity(toCity);
        setToCity(temp);
    };

    const handleServiceTypeChange = (type: string) => {
        setSelectedServiceTypes(prev => {
            if (type === "All") return ["All"];
            const newSelection = prev.filter(s => s !== "All");
            if (newSelection.includes(type)) {
                return newSelection.filter(s => s !== type);
            } else {
                return [...newSelection, type];
            }
        });
    };

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-2 shadow-md">
                <Link href="/live/bus" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <SearchIconLucide className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Search Buses</h1>
            </header>

            <main className="flex-grow p-4 space-y-4">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Find Buses Between Locations</CardTitle>
                        <CardDescription>Enter your travel details to find available buses.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearchBuses} className="space-y-4 pt-2">
                            <RadioGroup defaultValue="oneWay" value={tripType} onValueChange={(value) => setTripType(value as 'oneWay' | 'roundTrip')} className="flex space-x-4 mb-3">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="oneWay" id="oneWay"/><Label htmlFor="oneWay">One Way</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="roundTrip" id="roundTrip"/><Label htmlFor="roundTrip">Round Trip</Label></div>
                            </RadioGroup>

                            <div className="flex items-center gap-2">
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="fromCityDialog" className="text-xs">From</Label>
                                    <Select value={fromCity} onValueChange={setFromCity} required>
                                        <SelectTrigger id="fromCityDialog" className="h-10"><SelectValue placeholder="Origin" /></SelectTrigger>
                                        <SelectContent>{mockNbsCities.map(c => <SelectItem key={`from-dialog-${c.id}`} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="mt-6 self-center" onClick={swapCities}>
                                    <ArrowRightLeft className="h-4 w-4 text-primary"/>
                                </Button>
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="toCityDialog" className="text-xs">To</Label>
                                    <Select value={toCity} onValueChange={setToCity} required>
                                        <SelectTrigger id="toCityDialog" className="h-10"><SelectValue placeholder="Destination" /></SelectTrigger>
                                        <SelectContent>{mockNbsCities.map(c => <SelectItem key={`to-dialog-${c.id}`} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="journeyDateDialog" className="text-xs">Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button id="journeyDateDialog" variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !journeyDate && "text-muted-foreground")}>
                                                <CalendarIconLucide className="mr-2 h-4 w-4"/>{journeyDate ? format(journeyDate, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={journeyDate} onSelect={setJourneyDate} initialFocus disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}/></PopoverContent>
                                    </Popover>
                                </div>
                                {tripType === 'roundTrip' && (
                                    <div className="space-y-1">
                                        <Label htmlFor="returnDateDialog" className="text-xs">Return Date (Optional)</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button id="returnDateDialog" variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !returnDate && "text-muted-foreground")}>
                                                    <CalendarIconLucide className="mr-2 h-4 w-4"/>{returnDate ? format(returnDate, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={returnDate} onSelect={setReturnDate} initialFocus disabled={(date) => journeyDate ? date < journeyDate : date < new Date(new Date().setHours(0,0,0,0))}/></PopoverContent>
                                        </Popover>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2 items-center">
                                <div className="space-y-1 flex-grow">
                                    <Label htmlFor="timeFilter" className="text-xs">Time Filter</Label>
                                    <Select value={selectedTimeFilter} onValueChange={setSelectedTimeFilter}>
                                        <SelectTrigger id="timeFilter" className="h-9 text-xs"><SelectValue placeholder="Any Time"/></SelectTrigger>
                                        <SelectContent>{timeFilters.map(tf => <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1 flex-grow">
                                    <Label className="text-xs">Bus Type</Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full h-9 text-xs justify-between">
                                                {selectedServiceTypes.length === 0 || selectedServiceTypes.includes("All") ? "All Types" : selectedServiceTypes.join(', ')}
                                                <FilterIcon className="ml-2 h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-56">
                                            <DropdownMenuLabel>Filter Bus Types</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {serviceTypes.map((type) => (
                                                <DropdownMenuCheckboxItem
                                                    key={type}
                                                    checked={selectedServiceTypes.includes(type)}
                                                    onCheckedChange={() => handleServiceTypeChange(type)}
                                                >
                                                    {type}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            <Button type="submit" className="w-full h-10" disabled={isLoadingBusSearch}>
                                {isLoadingBusSearch ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <SearchIconLucide className="mr-2 h-5 w-5"/>} Search Buses
                            </Button>
                        </form>
                         {recentSearches.length > 0 && (
                            <div className="mt-4 pt-3 border-t">
                                <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Recent Searches:</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {recentSearches.map((search, index) => (
                                        <Button key={index} variant="ghost" size="xs" className="h-6 px-1.5 text-xs bg-muted/50 hover:bg-muted" onClick={() => handleRecentSearchClick(search)}>
                                            <RefreshCcw className="h-3 w-3 mr-1"/> {search.from} to {search.to}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {isLoadingBusSearch && <div className="flex justify-center py-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}
                
                {!isLoadingBusSearch && busSearchResults.length > 0 && (
                    <div className="mt-6 space-y-3">
                        <h3 className="font-semibold text-lg">Available Buses ({busSearchResults.length})</h3>
                        {busSearchResults.map(route => (
                            <Card key={route.id} className="p-3 shadow-sm rounded-lg border hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-sm text-primary">{route.operator} <span className="text-xs text-muted-foreground">({route.serviceType || route.type})</span></p>
                                        <div className="text-xs text-muted-foreground mt-0.5">Amenities: {(route.amenities || ['N/A']).slice(0,2).join(', ')}{route.amenities && route.amenities.length > 2 ? '...' : ''}</div>
                                         {route.hasLiveTracking && <Badge variant="secondary" className="text-xs mt-1 bg-blue-100 text-blue-700">Live Tracking Available</Badge>}
                                    </div>
                                    <Badge variant="outline" className="text-xs px-2 py-0.5">{route.rating} ★</Badge>
                                </div>
                                <Separator className="my-1.5"/>
                                <div className="text-xs grid grid-cols-3 items-center my-1">
                                    <div className="flex flex-col"><span className="font-medium">{route.departureTime}</span><span className="text-muted-foreground text-[10px] truncate">{route.from}</span></div>
                                    <div className="flex flex-col items-center text-muted-foreground"><Clock className="h-3 w-3 mb-0.5"/><span>{route.duration}</span></div>
                                    <div className="flex flex-col text-right"><span className="font-medium">{route.arrivalTime}</span> <span className="text-muted-foreground text-[10px] truncate">{route.to}</span></div>
                                </div>
                                <div className="text-xs text-muted-foreground">Boarding: {route.boardingPoints?.slice(0,1).join(', ')}{route.boardingPoints && route.boardingPoints.length > 1 ? '...' : ''}</div>
                                <div className="flex justify-between items-center mt-2">
                                    <p className="text-md font-bold">₹{route.price.toLocaleString()} <span className="text-xs text-muted-foreground">({route.seatsAvailable} seats left)</span></p>
                                    <div className="flex gap-2">
                                         {route.hasLiveTracking && <Button size="xs" variant="outline" className="h-7 text-xs"><MapPin className="h-3 w-3 mr-1"/> Track</Button>}
                                        <Button size="xs" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => alert(`Booking ${route.operator}... (Not Implemented)`)}>
                                           <Ticket className="h-3 w-3 mr-1"/> Book Now
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
                 {!isLoadingBusSearch && busSearchResults.length === 0 && fromCity && toCity && journeyDate && (
                    <Card className="mt-6 text-center">
                        <CardContent className="p-6">
                            <Bus className="h-12 w-12 text-muted-foreground mx-auto mb-3"/>
                            <p className="text-muted-foreground">No buses found for {fromCity} to {toCity} on {format(journeyDate, 'PP')}.</p>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
