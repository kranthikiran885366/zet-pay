'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Loader2, ListFilter, Map as MapIconLucide, Search, Clock, Bus, Navigation, Info, Users, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';
import { mockNearbyBusStopsData, mockUpcomingBusArrivalsData, NearbyBusStop, UpcomingBusArrival } from '@/mock-data/liveTracking';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Extend NearbyBusStop to include coordinates if not already present
interface DisplayBusStop extends NearbyBusStop {
    latitude?: number;
    longitude?: number;
}

export default function NearbyBusStopsPage() {
    const { toast } = useToast();
    const [locationSearchTerm, setLocationSearchTerm] = useState('');
    const [nearbyStops, setNearbyStops] = useState<DisplayBusStop[]>([]);
    const [isLoadingNearbyStops, setIsLoadingNearbyStops] = useState(false);
    const [selectedStop, setSelectedStop] = useState<DisplayBusStop | null>(null);
    const [upcomingBuses, setUpcomingBuses] = useState<UpcomingBusArrival[]>([]);
    const [isLoadingUpcomingBuses, setIsLoadingUpcomingBuses] = useState(false);
    const [showStopDetailsDialog, setShowStopDetailsDialog] = useState(false);

    const [filters, setFilters] = useState({
        rtcOnly: false,
        acBuses: false,
        hasShelter: false,
    });
    const [busSortBy, setBusSortBy] = useState<'eta' | 'route' | 'type'>('eta');

    const handleFindNearbyStops = async (useGPS = false) => {
        setIsLoadingNearbyStops(true);
        setNearbyStops([]);
        setSelectedStop(null);
        setShowStopDetailsDialog(false);

        let query = locationSearchTerm;
        if (useGPS) {
            toast({ description: "Fetching your current location..." });
            try {
                // Simulate GPS fetch
                await new Promise(resolve => setTimeout(resolve, 1000));
                query = "Current GPS Location (Mocked)"; // Indicate GPS was used
                toast({ title: "Location Found (Mocked)", description: "Searching for stops near you." });
            } catch (error) {
                toast({ variant: "destructive", title: "GPS Error", description: "Could not get your location." });
                setIsLoadingNearbyStops(false);
                return;
            }
        }

        if (!query && !useGPS) {
            toast({ variant: "destructive", title: "Enter Location", description: "Please enter a location or use GPS." });
            setIsLoadingNearbyStops(false);
            return;
        }

        try {
            console.log("Searching for stops near:", query);
            await new Promise(resolve => setTimeout(resolve, 1200));
            // Simulate distance calculation and filtering for mock data
            let results = mockNearbyBusStopsData.map(stop => ({
                ...stop,
                distance: `${(Math.random() * 5).toFixed(1)} km`, // Recalculate mock distance
                latitude: stop.latitude || 12.9716, // Mock coords if not present
                longitude: stop.longitude || 77.5946,
            }));

            if (locationSearchTerm && !useGPS) {
                results = results.filter(s => s.name.toLowerCase().includes(locationSearchTerm.toLowerCase()) || s.city.toLowerCase().includes(locationSearchTerm.toLowerCase()));
            }

            setNearbyStops(results);
            if (results.length === 0) toast({ description: "No nearby stops found." });
        } catch (error) {
            toast({ variant: "destructive", title: "Error Finding Stops", description: "Could not fetch stops." });
        } finally {
            setIsLoadingNearbyStops(false);
        }
    };

    const handleStopClick = async (stop: DisplayBusStop) => {
        setSelectedStop(stop);
        setShowStopDetailsDialog(true);
        setIsLoadingUpcomingBuses(true);
        setUpcomingBuses([]);
        try {
            console.log("Fetching upcoming buses for stop:", stop.name);
            await new Promise(resolve => setTimeout(resolve, 800));
            const buses = mockUpcomingBusArrivalsData[stop.id] || [];
            setUpcomingBuses(buses);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not fetch bus arrivals." });
        } finally {
            setIsLoadingUpcomingBuses(false);
        }
    };

    const handleFilterChange = (filterName: keyof typeof filters, value: boolean) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
        // Re-apply filter to nearbyStops (client-side for this example)
        // In a real app, API might support these filters
    };

    const filteredNearbyStops = nearbyStops.filter(stop => {
        if (filters.rtcOnly && !stop.services?.some(s => s.toUpperCase().includes("RTC"))) return false;
        // Add more filter logic here based on future stop.type or amenities
        return true;
    });

    const sortedUpcomingBuses = [...upcomingBuses].sort((a, b) => {
        if (busSortBy === 'eta') {
            // Simple ETA sort (assumes ETA is like "X mins" or time string)
            const etaA = parseInt(a.eta);
            const etaB = parseInt(b.eta);
            if (!isNaN(etaA) && !isNaN(etaB)) return etaA - etaB;
            return a.eta.localeCompare(b.eta);
        }
        if (busSortBy === 'route') return a.routeNo.localeCompare(b.routeNo);
        if (busSortBy === 'type') return (a.type || '').localeCompare(b.type || '');
        return 0;
    });

    const getDirections = (stop: DisplayBusStop) => {
        if (stop.latitude && stop.longitude) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`;
            window.open(url, '_blank');
        } else {
            toast({ description: "Location coordinates not available for navigation." });
        }
    };

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-2 shadow-md">
                <Link href="/live/bus" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <MapPin className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Nearby Bus Stops</h1>
            </header>

            <main className="flex-grow p-4 space-y-4">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Find Bus Stops</CardTitle>
                        <CardDescription>Use GPS or search manually for nearby bus stops.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <form onSubmit={(e) => { e.preventDefault(); handleFindNearbyStops(); }} className="flex gap-2">
                            <Input
                                placeholder="Enter locality, landmark, or stop name"
                                value={locationSearchTerm}
                                onChange={(e) => setLocationSearchTerm(e.target.value)}
                                className="h-10"
                            />
                            <Button type="submit" className="h-10 px-3" disabled={isLoadingNearbyStops}>
                                {isLoadingNearbyStops && locationSearchTerm ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                            </Button>
                        </form>
                        <Button onClick={() => handleFindNearbyStops(true)} className="w-full h-10" variant="outline" disabled={isLoadingNearbyStops}>
                            {isLoadingNearbyStops && !locationSearchTerm ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <MapPin className="mr-2 h-5 w-5" />}
                            Use My Current Location
                        </Button>
                    </CardContent>
                </Card>

                <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground border mb-3">
                    <MapIconLucide className="h-8 w-8 mr-2" /> Map View (Coming Soon)
                </div>

                <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Stops Found ({filteredNearbyStops.length})</h3>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 px-2 text-xs"><ListFilter className="mr-1 h-3.5 w-3.5"/> Filters</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuLabel>Filter Stops</DropdownMenuLabel>
                            <DropdownMenuSeparator/>
                            <DropdownMenuCheckboxItem checked={filters.rtcOnly} onCheckedChange={(c) => handleFilterChange('rtcOnly', Boolean(c))}>RTC Buses Only</DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={filters.acBuses} onCheckedChange={(c) => handleFilterChange('acBuses', Boolean(c))}>AC Buses</DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={filters.hasShelter} onCheckedChange={(c) => handleFilterChange('hasShelter', Boolean(c))}>With Shelter</DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {isLoadingNearbyStops && <div className="flex justify-center py-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}

                {!isLoadingNearbyStops && filteredNearbyStops.length > 0 && (
                    <ScrollArea className="h-[calc(100vh-450px)]"> {/* Adjust height as needed */}
                        <div className="space-y-2 pr-2">
                            {filteredNearbyStops.map(stop => (
                                <Card key={stop.id} className="p-3 border rounded-lg shadow-sm hover:bg-accent transition-colors cursor-pointer" onClick={() => handleStopClick(stop)}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-sm">{stop.name}</p>
                                            <p className="text-xs text-muted-foreground">{stop.distance} • {stop.city}</p>
                                        </div>
                                        <Navigation className="h-4 w-4 text-blue-500 cursor-pointer" onClick={(e) => { e.stopPropagation(); getDirections(stop); }}/>
                                    </div>
                                    {stop.services && <p className="text-[10px] text-muted-foreground mt-1">Services: {stop.services.join(', ')}</p>}
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                )}
                {!isLoadingNearbyStops && filteredNearbyStops.length === 0 && (locationSearchTerm || Object.values(filters).some(f => f)) && (
                     <Card className="mt-4 text-center">
                         <CardContent className="p-6">
                             <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3"/>
                             <p className="text-muted-foreground">No bus stops match your current search/filters.</p>
                         </CardContent>
                     </Card>
                )}

                <Dialog open={showStopDetailsDialog} onOpenChange={(open) => { if(!open) setSelectedStop(null); setShowStopDetailsDialog(open); }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{selectedStop?.name}</DialogTitle>
                            <DialogDescription>{selectedStop?.distance} • {selectedStop?.city}</DialogDescription>
                        </DialogHeader>
                        <div className="py-2 max-h-[60vh] overflow-y-auto">
                            {isLoadingUpcomingBuses && <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
                            {!isLoadingUpcomingBuses && upcomingBuses.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No upcoming bus arrivals for this stop.</p>}
                            {!isLoadingUpcomingBuses && (
                                <>
                                    <div className="flex justify-end mb-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="xs" className="h-7 text-xs"><ListFilter className="mr-1 h-3 w-3"/> Sort by: {busSortBy}</Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuRadioGroup value={busSortBy} onValueChange={(val) => setBusSortBy(val as any)}>
                                                    <DropdownMenuRadioItem value="eta">ETA</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="route">Route No.</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="type">Bus Type</DropdownMenuRadioItem>
                                                </DropdownMenuRadioGroup>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <div className="space-y-2">
                                        {sortedUpcomingBuses.map(bus => (
                                            <Card key={`${bus.routeNo}-${bus.vehicleNo || Math.random()}`} className="p-2.5 border rounded-md shadow-sm">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-semibold text-sm">{bus.routeNo} <span className="text-xs text-muted-foreground">({bus.type || 'Regular'})</span></p>
                                                        <p className="text-xs text-muted-foreground">To: {bus.destination}</p>
                                                    </div>
                                                    <Badge variant={bus.eta.toLowerCase().includes('min') && parseInt(bus.eta) <= 5 ? 'destructive' : bus.eta.toLowerCase().includes('due') ? 'secondary' : 'outline'} className="text-xs">
                                                        ETA: {bus.eta}
                                                    </Badge>
                                                </div>
                                                {bus.vehicleNo && <p className="text-[10px] text-muted-foreground mt-0.5">Vehicle: {bus.vehicleNo} {bus.isLive && <span className="text-green-600">(Live)</span>}</p>}
                                            </Card>
                                        ))}
                                    </div>
                                </>
                            )}
                            <Separator className="my-3"/>
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle className="text-xs font-medium">Stop Amenities (Mock)</AlertTitle>
                                <AlertDescription className="text-xs">Shelter, Seating, Route Map. Ticket Counter: No.</AlertDescription>
                            </Alert>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => getDirections(selectedStop!)} disabled={!selectedStop?.latitude}>
                                <Navigation className="mr-2 h-4 w-4"/> Get Directions
                            </Button>
                            <DialogClose asChild>
                                <Button>Close</Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* AI Suggestion Placeholder */}
                <Alert className="border-blue-500">
                    <Users className="h-4 w-4 text-blue-700" />
                    <AlertTitle className="text-blue-700 text-sm">AI Suggestion (Example)</AlertTitle>
                    <AlertDescription className="text-xs">
                        "You usually board Route 218 around this time from 'MG Road Stop'. It's currently 2 stops away."
                    </AlertDescription>
                </Alert>
            </main>
        </div>
    );
}
