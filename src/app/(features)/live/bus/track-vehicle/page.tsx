'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bus, Search, Loader2, MapPin, Clock, CheckCircle, XCircle, MoreVertical, Route } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getBusLiveStatus as getBusLiveStatusService, BusLiveStatus, BusStopStatus } from '@/services/liveTracking';

export default function TrackBusByVehiclePage() {
    const { toast } = useToast();
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [vehicleStatusResult, setVehicleStatusResult] = useState<BusLiveStatus | null>(null);
    const [isLoadingVehicleStatus, setIsLoadingVehicleStatus] = useState(false);

    const handleTrackVehicle = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!vehicleNumber.trim()) {
            toast({ variant: "destructive", title: "Please enter Vehicle Number" });
            return;
        }
        setIsLoadingVehicleStatus(true);
        setVehicleStatusResult(null);
        try {
            const status = await getBusLiveStatusService(vehicleNumber);
            if (status) {
                setVehicleStatusResult(status);
            } else {
                toast({ variant: "destructive", title: "Bus Not Found", description: "No live status found for this vehicle." });
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error Fetching Status", description: error.message || "Could not retrieve bus status." });
        } finally {
            setIsLoadingVehicleStatus(false);
        }
    };
    
    const getStatusIcon = (status: BusStopStatus['status']) => {
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
         return eta;
     };

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-2 shadow-md">
                <Link href="/live/bus" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Route className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Track by Vehicle Number</h1>
            </header>

            <main className="flex-grow p-4 space-y-4">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Track Bus Live Location</CardTitle>
                        <CardDescription>Enter the bus registration number (e.g., AP28Z5566).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleTrackVehicle} className="space-y-4 pt-2">
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    placeholder="Enter Vehicle Number"
                                    value={vehicleNumber}
                                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                                    required
                                    className="h-10"
                                />
                                <Button type="submit" disabled={isLoadingVehicleStatus} className="h-10 px-3">
                                    {isLoadingVehicleStatus ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {isLoadingVehicleStatus && (
                    <div className="flex justify-center py-6">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}

                {vehicleStatusResult && (
                     <Card className="shadow-lg rounded-lg border border-border overflow-hidden mt-4">
                        <CardHeader className="bg-muted/30 border-b p-4">
                            <CardTitle className="text-md flex justify-between items-center">
                                <span className="flex items-center gap-2"><Bus className="h-5 w-5"/>{vehicleStatusResult.operatorName || 'Bus'}: {vehicleStatusResult.busNumber}</span>
                                <Badge variant={vehicleStatusResult.delayMinutes && vehicleStatusResult.delayMinutes > 0 ? "destructive" : "default"} className={cn("text-xs px-2 py-1", vehicleStatusResult.delayMinutes && vehicleStatusResult.delayMinutes > 0 ? "" : "bg-green-100 text-green-700")}>
                                    {vehicleStatusResult.delayMinutes && vehicleStatusResult.delayMinutes > 0 ? `Delayed ${vehicleStatusResult.delayMinutes} min` : 'On Time'}
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs pt-1">{vehicleStatusResult.routeName}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 text-sm space-y-2">
                            <p className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted-foreground"/><strong>Current:</strong> {vehicleStatusResult.currentLocationDescription}</p>
                            <p className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-muted-foreground"/><strong>Next Stop:</strong> {vehicleStatusResult.nextStop} (ETA: {vehicleStatusResult.etaNextStop})</p>
                            <p className="text-xs text-muted-foreground">Last updated: {format(vehicleStatusResult.lastUpdated, 'p')}</p>
                            
                            <div className="w-full h-40 bg-muted rounded-md flex items-center justify-center text-muted-foreground border my-3">
                                <MapPin className="h-6 w-6 mr-2" /> Map View (Coming Soon)
                            </div>

                            <ScrollArea className="h-60 mt-3 border rounded-md p-3 bg-background">
                                <h4 className="font-semibold text-xs mb-2 text-muted-foreground">ROUTE STOPS:</h4>
                                <ul className="space-y-3">
                                    {vehicleStatusResult.stops.map((stop, index) => (
                                        <li key={index} className="flex items-center gap-3 text-xs relative pl-6">
                                            {!(index === vehicleStatusResult.stops.length -1) && <div className="absolute left-[7px] top-[18px] bottom-[-12px] w-px bg-border"></div>}
                                             <div className="absolute left-0 top-1 z-10 bg-background rounded-full p-0.5 border border-border">{getStatusIcon(stop.status)}</div>
                                            <div className="flex-grow">
                                                <span className={cn("font-medium", stop.status === 'Departed' ? 'text-gray-500 line-through' : '')}>{stop.name}</span>
                                                {stop.scheduledTime && <span className="text-muted-foreground text-[10px] ml-1">(Sch: {stop.scheduledTime})</span>}
                                            </div>
                                            <span className="ml-auto font-semibold text-muted-foreground">{getEtaText(stop.eta, stop.status)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
