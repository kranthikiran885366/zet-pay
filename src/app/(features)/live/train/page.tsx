
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Train, Search, Loader2, Clock, MapPin, AlertCircle, CheckCircle, ArrowRight, MoreVertical, MoveVertical, Ticket, Gauge } from 'lucide-react'; // Added Gauge
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { getTrainLiveStatus, TrainLiveStatus, TrainStopStatus } from '@/services/liveTracking'; // Import service
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns'; // For formatting last updated time

export default function LiveTrainTrackingPage() {
    const [trainIdentifier, setTrainIdentifier] = useState('');
    const [trainStatus, setTrainStatus] = useState<TrainLiveStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!trainIdentifier.trim()) {
            toast({ variant: "destructive", title: "Please enter a Train Number or Name" });
            return;
        }
        setIsLoading(true);
        setTrainStatus(null);
        try {
            const status = await getTrainLiveStatus(trainIdentifier);
            if (status) {
                setTrainStatus(status);
            } else {
                toast({ variant: "destructive", title: "Train Not Found", description: "Could not find live status for the entered train." });
            }
        } catch (error) {
            console.error("Failed to fetch train status:", error);
            toast({ variant: "destructive", title: "Error Fetching Status", description: "Could not retrieve live train information." });
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-refresh simulation (every 60 seconds)
    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        if (trainStatus) {
             intervalId = setInterval(() => {
                console.log("Simulating auto-refresh for train:", trainStatus.trainNumber);
                 // Simulate fetching updated data - replace with handleSearch() or dedicated refresh call
                 setTrainStatus(prev => prev ? ({ ...prev, lastUpdated: new Date(), currentLocationDescription: `Updated location at ${format(new Date(), 'p')}` }) : null);
             }, 60000); // Refresh every 60 seconds
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [trainStatus]);


    const getStatusIcon = (status: TrainStopStatus['status'], isCurrent: boolean) => {
        if (isCurrent && (status === 'Arrived' || status === 'Departed')) {
            return <Train className="h-4 w-4 text-green-600 animate-pulse" />; // Current location icon
        }
        switch (status) {
            case 'Departed': return <CheckCircle className="h-4 w-4 text-gray-400" />;
            case 'Arrived': return <CheckCircle className="h-4 w-4 text-green-500" />; // Arrived but not current
            case 'Upcoming': return <Clock className="h-4 w-4 text-blue-600" />;
            case 'Skipped': return <AlertCircle className="h-4 w-4 text-orange-500" />; // Example for skipped
            default: return <MoreVertical className="h-4 w-4 text-muted-foreground" />;
        }
    };

     const getDelayColor = (delay?: number) => {
        if (delay === undefined || delay === 0) return "text-green-600"; // On Time
        if (delay > 0 && delay <= 15) return "text-orange-500"; // Slightly Delayed
        if (delay > 15) return "text-red-600"; // Significantly Delayed
        return "text-muted-foreground"; // Should not happen
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
                <Train className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Live Train Status</h1>
            </header>

            {/* Search Bar */}
             <div className="p-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <Input
                        type="text"
                        placeholder="Enter Train Number or Name (e.g., 12658)"
                        value={trainIdentifier}
                        onChange={(e) => setTrainIdentifier(e.target.value)}
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
                        <p className="ml-2 text-muted-foreground">Searching for train...</p>
                    </div>
                )}

                 {!isLoading && !trainStatus && (
                     <Card className="shadow-md text-center">
                         <CardContent className="p-6">
                             <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                             <p className="text-muted-foreground">Enter a train number or name to track its live running status and ETA.</p>
                         </CardContent>
                     </Card>
                )}

                 {trainStatus && (
                    <Card className="shadow-md overflow-hidden">
                        <CardHeader className="bg-background border-b">
                             <CardTitle className="flex items-center justify-between flex-wrap gap-1">
                                <span>{trainStatus.trainName} ({trainStatus.trainNumber})</span>
                                 <Badge variant={trainStatus.delayMinutes && trainStatus.delayMinutes > 0 ? "destructive" : "default"} className={cn("text-xs", trainStatus.delayMinutes && trainStatus.delayMinutes > 0 ? "" : "bg-green-100 text-green-700")}>
                                     {trainStatus.currentStatus}
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-sm space-y-1">
                                <div><span className="font-medium">Current:</span> {trainStatus.currentLocationDescription}</div>
                                <div><span className="font-medium">Next Stop:</span> {trainStatus.nextStationName || trainStatus.nextStationCode} (ETA: {trainStatus.etaNextStation})</div>
                                 {trainStatus.averageSpeed !== undefined && (
                                     <div className="flex items-center gap-1 text-xs"><Gauge className="h-3 w-3"/> Speed: {trainStatus.averageSpeed} km/h</div>
                                 )}
                            </CardDescription>
                             <p className="text-xs text-muted-foreground mt-1">Last updated: {format(trainStatus.lastUpdated, 'p')}</p>
                        </CardHeader>
                        <CardContent className="p-0">
                             {/* Route / Station List */}
                             <div className="p-4">
                                 <h3 className="text-sm font-semibold mb-3">Route & Timings</h3>
                                 <ScrollArea className="h-80"> {/* Adjust height */}
                                    <ul className="space-y-4">
                                        {trainStatus.route.map((stop, index) => {
                                             const isCurrentStation = stop.stationCode === trainStatus.currentStationCode || (stop.status === 'Departed' && stop.stationCode === trainStatus.lastStationCode && trainStatus.currentStationCode === undefined); // Highlight if current or last departed
                                             const isLastStop = index === trainStatus.route.length - 1;

                                            return (
                                                <li key={index} className={cn("flex items-start gap-3 text-sm relative pl-7", isCurrentStation && "font-bold")}>
                                                    {/* Vertical line connector */}
                                                    {!isLastStop && <div className="absolute left-[11px] top-[20px] bottom-[-16px] w-px bg-border"></div>}

                                                    <div className="absolute left-0 top-1 z-10 bg-background rounded-full p-0.5">
                                                         {getStatusIcon(stop.status, isCurrentStation)}
                                                    </div>
                                                    <div className="flex-grow">
                                                         <p className={cn("font-medium", isCurrentStation ? 'text-primary' : '')}>
                                                             {stop.stationName || stop.stationCode} ({stop.stationCode}) {stop.dayOfJourney && stop.dayOfJourney > 1 && <span className="text-xs text-muted-foreground">(Day {stop.dayOfJourney})</span>}
                                                         </p>
                                                         {stop.platform && <p className="text-xs text-muted-foreground">Platform: {stop.platform}</p>}
                                                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                                                             {stop.scheduledArrival && <span>Sch Arr: {stop.scheduledArrival}</span>}
                                                             {stop.actualArrival && <span className={isCurrentStation && stop.status === 'Arrived' ? 'font-semibold text-foreground' : ''}>Act Arr: {stop.actualArrival}</span>}
                                                             {stop.scheduledDeparture && <span>Sch Dep: {stop.scheduledDeparture}</span>}
                                                             {stop.actualDeparture && <span className={isCurrentStation && stop.status === 'Departed' ? 'font-semibold text-foreground' : ''}>Act Dep: {stop.actualDeparture}</span>}
                                                        </div>
                                                         {stop.delayMinutes !== undefined && stop.delayMinutes !== null && (
                                                            <p className={cn("text-xs font-medium mt-0.5", getDelayColor(stop.delayMinutes))}>
                                                                 {stop.delayMinutes === 0 ? "On Time" : `Delayed by ${stop.delayMinutes} min`}
                                                            </p>
                                                         )}
                                                    </div>
                                                </li>
                                             )
                                        })}
                                    </ul>
                                </ScrollArea>
                             </div>
                        </CardContent>
                         {/* Optional Map Placeholder */}
                         {trainStatus.mapUrlPlaceholder && (
                            <div className="relative h-40 bg-muted flex items-center justify-center border-t">
                                <Image src={trainStatus.mapUrlPlaceholder} alt="Map Placeholder" layout="fill" objectFit="cover" data-ai-hint="map placeholder train route" />
                                <p className="absolute bottom-1 right-1 bg-background/80 backdrop-blur-sm p-1 rounded shadow-md text-xs text-muted-foreground">Map view (placeholder)</p>
                            </div>
                        )}
                    </Card>
                 )}
            </main>
        </div>
    );
}
