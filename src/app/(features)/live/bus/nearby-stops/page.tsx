'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Loader2, ListFilter, Map as MapIconLucide } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/hooks/use-toast";
import { mockNearbyBusStopsData, NearbyBusStop } from '@/mock-data/liveTracking';

export default function NearbyBusStopsPage() {
    const { toast } = useToast();
    const [nearbyStops, setNearbyStops] = useState<NearbyBusStop[]>([]);
    const [isLoadingNearbyStops, setIsLoadingNearbyStops] = useState(false);

    const handleFindNearbyStops = async () => {
        setIsLoadingNearbyStops(true);
        setNearbyStops([]);
        try {
            // Simulate fetching GPS location and then API call
            await new Promise(resolve => setTimeout(resolve, 1200));
            // In a real app, get actual GPS location here
            // const location = await navigator.geolocation.getCurrentPosition(success, error);
            setNearbyStops(mockNearbyBusStopsData);
            if (mockNearbyBusStopsData.length === 0) toast({ description: "No nearby stops found using current location." });
        } catch (error) {
            toast({ variant: "destructive", title: "Error Finding Stops", description: "Could not determine location or fetch stops." });
        } finally {
            setIsLoadingNearbyStops(false);
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
                <Button onClick={handleFindNearbyStops} className="w-full my-3 h-10" disabled={isLoadingNearbyStops}>
                    {isLoadingNearbyStops ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <MapPin className="mr-2 h-5 w-5"/>} Find Stops Near Me (Use GPS)
                </Button>
                
                <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground border mb-3">
                    <MapIconLucide className="h-8 w-8 mr-2" /> Map View (Coming Soon)
                </div>

                {isLoadingNearbyStops && <div className="flex justify-center py-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}
                
                {!isLoadingNearbyStops && nearbyStops.length > 0 && (
                    <Card className="shadow-md">
                        <CardHeader>
                             <CardTitle>Bus Stops Near You</CardTitle>
                             <CardDescription>List of bus stops found around your current location.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="max-h-80 pr-2">
                                <div className="space-y-2">
                                {nearbyStops.map(stop => (
                                    <Card key={stop.id} className="p-3 border rounded-lg shadow-sm hover:bg-accent transition-colors cursor-pointer" onClick={() => alert(`Viewing details for ${stop.name}`)}>
                                        <p className="font-semibold text-sm">{stop.name}</p>
                                        <p className="text-xs text-muted-foreground">{stop.distance}, {stop.city}</p>
                                        {stop.services && <p className="text-[10px] text-muted-foreground">Services: {stop.services.join(', ')}</p>}
                                    </Card>
                                ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}
                {!isLoadingNearbyStops && nearbyStops.length === 0 && (
                    <Card className="mt-4 text-center">
                        <CardContent className="p-6">
                             <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3"/>
                             <p className="text-muted-foreground">Click "Find Stops Near Me" to discover bus stops.</p>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
