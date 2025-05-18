'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search as SearchIconLucide, Loader2, ArrowRightLeft, CalendarDays as CalendarIconLucide, Bus, Clock, Users, Filter, Ticket } from 'lucide-react';
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
import { format } from 'date-fns';
import { mockNbsCities, mockBusRoutesData, BusRoute } from '@/mock-data/liveTracking'; // Assuming BusRoute is defined in types or liveTracking mock
import Image from 'next/image';

export default function SearchBusesPage() {
    const { toast } = useToast();
    const [fromCity, setFromCity] = useState('');
    const [toCity, setToCity] = useState('');
    const [journeyDate, setJourneyDate] = useState<Date | undefined>(new Date());
    const [busSearchResults, setBusSearchResults] = useState<BusRoute[]>([]);
    const [isLoadingBusSearch, setIsLoadingBusSearch] = useState(false);

    const handleSearchBuses = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!fromCity || !toCity || !journeyDate) {
            toast({ variant: "destructive", title: "Missing Info", description: "Please select From, To, and Date." });
            return;
        }
        setIsLoadingBusSearch(true);
        setBusSearchResults([]);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
            const results = mockBusRoutesData.filter(
                route => route.from.toLowerCase().includes(fromCity.toLowerCase()) &&
                         route.to.toLowerCase().includes(toCity.toLowerCase()) &&
                         Math.random() > 0.3 // Simulate some results
            );
            setBusSearchResults(results);
            if (results.length === 0) toast({ description: "No buses found for this route/date." });
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
                            <Button type="submit" className="w-full h-10" disabled={isLoadingBusSearch}>
                                {isLoadingBusSearch ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <SearchIconLucide className="mr-2 h-5 w-5"/>} Search Buses
                            </Button>
                        </form>
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
                                        <p className="font-semibold text-sm text-primary">{route.operator} <span className="text-xs text-muted-foreground">({route.type})</span></p>
                                        <div className="text-xs text-muted-foreground mt-0.5">Amenities: {(route.amenities || ['N/A']).join(', ')}</div>
                                    </div>
                                    <Badge variant="outline" className="text-xs px-2 py-0.5">{route.rating} ★</Badge>
                                </div>
                                <div className="text-xs flex justify-between mt-1.5 items-center">
                                    <div className="flex flex-col"><span className="font-medium">{route.departureTime}</span><span className="text-muted-foreground text-[10px]">{route.from}</span></div>
                                    <div className="flex flex-col items-center text-muted-foreground"><Clock className="h-3 w-3 mb-0.5"/><span>{route.duration}</span></div>
                                    <div className="flex flex-col text-right"><span className="font-medium">{route.arrivalTime}</span> <span className="text-muted-foreground text-[10px]">{route.to}</span></div>
                                </div>
                                <div className="flex justify-between items-center mt-2.5">
                                    <p className="text-md font-bold">₹{route.price.toLocaleString()}</p>
                                    <Button size="xs" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => alert(`Booking ${route.operator}... (Not Implemented)`)}>
                                       <Ticket className="h-3 w-3 mr-1"/> Book Now
                                    </Button>
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
