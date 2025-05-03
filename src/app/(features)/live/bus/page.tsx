
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Bus, Search, Loader2, Clock, MapPin, AlertCircle, CheckCircle, ArrowRight, MoreVertical, XCircle, UserCircle, Timer } from 'lucide-react'; // Added XCircle, UserCircle, Timer
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { getBusLiveStatus, BusLiveStatus, BusStopStatus } from '@/services/liveTracking'; // Import service
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns'; // Import format
import { cn } from '@/lib/utils';

export default function LiveBusTrackingPage() {
    const [busIdentifier, setBusIdentifier] = useState('');
    const [busStatus, setBusStatus] = useState<BusLiveStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!busIdentifier.trim()) {
            toast({ variant: "destructive", title: "Please enter a Bus Number or Service ID" });
            return;
        }
        setIsLoading(true);
        setBusStatus(null);
        try {
            const status = await getBusLiveStatus(busIdentifier);
            if (status) {
                setBusStatus(status);
            } else {
                toast({ variant: "destructive", title: "Bus Not Found", description: "Could not find live status for the entered bus." });
            }
        } catch (error) {
            console.error("Failed to fetch bus status:", error);
            toast({ variant: "destructive", title: "Error Fetching Status", description: "Could not retrieve live bus information." });
        } finally {
            setIsLoading(false);
        }
    };

     // Auto-refresh simulation (every 30 seconds)
    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        if (busStatus) {
             intervalId = setInterval(() => {
                console.log("Simulating auto-refresh for bus:", busStatus.busNumber);
                // Re-fetch status here in a real app
                // For simulation, just update the last updated time and maybe ETA slightly
                 setBusStatus(prev => prev ? ({ ...prev, lastUpdated: new Date(), etaNextStop: `${Math.max(1, parseInt(prev.etaNextStop.split(' ')[0], 10) - 1)} mins` }) : null);
             }, 30000); // Refresh every 30 seconds
        }
        return () => {
            if (intervalId) clearInterval(intervalId); // Clear interval on component unmount or when busStatus becomes null
        };
    }, [busStatus]);


    const getStatusIcon = (status: BusStopStatus['status'], eta: string) => {
        switch (status) {
            case 'Departed': return <CheckCircle className="h-4 w-4 text-gray-400" />;
            case 'Arriving': return <Bus className="h-4 w-4 text-green-600 animate-pulse" />;
            case 'Upcoming': return <Clock className="h-4 w-4 text-blue-600" />;
            case 'Skipped': return <XCircle className="h-4 w-4 text-orange-500" />;
            default: return <MoreVertical className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getEtaText = (eta: string, status: BusStopStatus['status']) => {
         if (status === 'Arriving') return 'Arriving Now';
         if (status === 'Departed') return 'Departed';
         if (status === 'Skipped') return 'Skipped';
         return eta; // Display the raw ETA string (e.g., "5 mins", "10:30 AM")
     }


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
                <h1 className="text-lg font-semibold">Live Bus Tracking</h1>
            </header>

            {/* Search Bar */}
            <div className="p-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <Input
                        type="text"
                        placeholder="Enter Bus Number / Service ID (e.g., 500D)"
                        value={busIdentifier}
                        onChange={(e) => setBusIdentifier(e.target.value)}
                        required
                    />
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                </form>
            </div>

            {/* Main Content */}
            <main className="flex-grow p-4 pt-0 space-y-4 pb-20">
                {isLoading && (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-2 text-muted-foreground">Searching for bus...</p>
                    </div>
                )}

                {!isLoading && !busStatus && (
                     <Card className="shadow-md text-center">
                         <CardContent className="p-6">
                             <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                             <p className="text-muted-foreground">Enter a bus number or service ID to track its live location and ETA.</p>
                         </CardContent>
                     </Card>
                )}

                {busStatus && (
                    <Card className="shadow-md overflow-hidden">
                        <CardHeader className="bg-background border-b">
                            <CardTitle className="flex items-center justify-between">
                                <span>{busStatus.operatorName || 'Bus'}: {busStatus.busNumber}</span>
                                <Badge variant={busStatus.delayMinutes && busStatus.delayMinutes > 0 ? "destructive" : "default"} className={cn("text-xs", busStatus.delayMinutes && busStatus.delayMinutes > 0 ? "" : "bg-green-100 text-green-700")}>
                                    {busStatus.delayMinutes && busStatus.delayMinutes > 0 ? `Delayed ${busStatus.delayMinutes} min` : 'On Time'}
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-sm">
                                <div>{busStatus.routeName}</div>
                                {busStatus.vehicleType && <div className="text-xs text-muted-foreground">{busStatus.vehicleType}</div>}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                             {/* Map Placeholder */}
                             <div className="relative h-48 bg-muted flex items-center justify-center border-b">
                                {busStatus.mapUrlPlaceholder ? (
                                    <Image src={busStatus.mapUrlPlaceholder} alt="Map Placeholder" layout="fill" objectFit="cover" data-ai-hint="map placeholder view"/>
                                ) : (
                                    <p className="text-muted-foreground text-sm">Map view unavailable</p>
                                )}
                                <div className="absolute bottom-2 left-2 right-2 bg-background/80 backdrop-blur-sm p-2 rounded shadow-md text-sm space-y-1">
                                    <div className="font-semibold">Current Location:</div>
                                    <div>{busStatus.currentLocationDescription}</div>
                                     <div className="text-xs text-muted-foreground flex items-center justify-between">
                                         <span>Last updated: {format(busStatus.lastUpdated, 'p')}</span>
                                         <span className="flex items-center gap-1"><Timer className="h-3 w-3"/> Next Stop: {busStatus.nextStop} ({busStatus.etaNextStop})</span>
                                     </div>
                                </div>
                            </div>

                            {/* Stop List */}
                             <div className="p-4">
                                <h3 className="text-sm font-semibold mb-3">Route & ETA</h3>
                                <ScrollArea className="h-64"> {/* Adjust height as needed */}
                                    <ul className="space-y-3">
                                        {busStatus.stops.map((stop, index) => {
                                            const isLastStop = index === busStatus.stops.length - 1;
                                            const isArriving = stop.status === 'Arriving';
                                            return (
                                                <li key={index} className="flex items-center gap-3 text-sm relative pl-6">
                                                    {/* Vertical line connector */}
                                                    {!isLastStop && <div className="absolute left-[8px] top-[18px] bottom-[-12px] w-px bg-border"></div>}

                                                    <div className="absolute left-0 top-1 z-10 bg-background rounded-full p-0.5">
                                                        {getStatusIcon(stop.status, stop.eta)}
                                                    </div>
                                                    <div className="flex-grow">
                                                        <p className={cn("font-medium", isArriving ? 'text-primary font-bold' : '', stop.status === 'Departed' ? 'text-gray-400' : '')}>{stop.name}</p>
                                                         {stop.scheduledTime && stop.status !== 'Departed' && <p className="text-xs text-muted-foreground">Sch: {stop.scheduledTime}</p>}
                                                    </div>
                                                    <p className={cn("text-xs font-medium text-right", isArriving ? 'text-primary' : 'text-muted-foreground', stop.status === 'Departed' ? 'line-through text-gray-400' : '')}>
                                                        {getEtaText(stop.eta, stop.status)}
                                                    </p>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </ScrollArea>
                             </div>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
