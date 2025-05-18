'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bus, Search, MapPin, Timer, Star as StarIcon, Heart, Siren, MessageCircle, BadgeInfo, Edit, Trash2, Filter, Loader2, ArrowRightLeft, CalendarDays as CalendarIconLucide, CheckCircle, XCircle, MoreVertical, User, Mail, Phone, Map as MapIconLucide, ListFilter, Route, TicketCheck, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { format, addDays, differenceInDays, isValid } from 'date-fns';
import Image from 'next/image';
import { getBusLiveStatus as getBusLiveStatusService, BusLiveStatus, BusStopStatus } from '@/services/liveTracking';
import {
    mockBusRoutesData,
    mockNearbyBusStopsData,
    mockReservationStatusData,
    mockNbsEmergencyContacts,
    mockFeedbackCategories,
    nbsAboutText,
    mockNbsCities,
    mockNbsStates
} from '@/mock-data/liveTracking';
import type { BusRoute, NearbyBusStop, ReservationStatus, FavoriteRoute } from '@/mock-data/liveTracking';

interface FeatureCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    onClick: () => void;
    disabled?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon: Icon, onClick, disabled }) => (
    <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer text-center h-full flex flex-col" onClick={!disabled ? onClick : undefined} aria-disabled={disabled}>
        <CardHeader className="pb-3 items-center">
            <div className="bg-primary/10 text-primary p-3 rounded-full mb-2">
                <Icon className="h-7 w-7" />
            </div>
            <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
            <CardDescription className="text-xs">{description}</CardDescription>
        </CardContent>
    </Card>
);


export default function NationalBusServicesPage() {
    const { toast } = useToast();

    // Dialog states
    const [showTrackVehicleDialog, setShowTrackVehicleDialog] = useState(false);
    const [showSearchBusesDialog, setShowSearchBusesDialog] = useState(false);
    const [showTrackReservationDialog, setShowTrackReservationDialog] = useState(false);
    const [showNearbyStopsDialog, setShowNearbyStopsDialog] = useState(false);
    const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
    const [showFavoritesDialog, setShowFavoritesDialog] = useState(false);
    const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
    const [showAboutDialog, setShowAboutDialog] = useState(false);

    // States for Track by Vehicle Number
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [vehicleStatusResult, setVehicleStatusResult] = useState<BusLiveStatus | null>(null);
    const [isLoadingVehicleStatus, setIsLoadingVehicleStatus] = useState(false);

    // States for Search Buses (From-To)
    const [fromCity, setFromCity] = useState('');
    const [toCity, setToCity] = useState('');
    const [journeyDate, setJourneyDate] = useState<Date | undefined>(new Date());
    const [busSearchResults, setBusSearchResults] = useState<BusRoute[]>([]);
    const [isLoadingBusSearch, setIsLoadingBusSearch] = useState(false);

    // States for Track by Reservation ID
    const [reservationId, setReservationId] = useState('');
    const [reservationStatusResult, setReservationStatusResult] = useState<ReservationStatus | null>(null);
    const [isLoadingReservationStatus, setIsLoadingReservationStatus] = useState(false);

    // States for Nearby Bus Stops
    const [nearbyStops, setNearbyStops] = useState<NearbyBusStop[]>([]);
    const [isLoadingNearbyStops, setIsLoadingNearbyStops] = useState(false);

    // States for My Favourites
    const [favorites, setFavorites] = useState<FavoriteRoute[]>([]);

    // States for Customer Feedback
    const [feedbackCategory, setFeedbackCategory] = useState('');
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

    useEffect(() => {
        try {
            const storedFavorites = localStorage.getItem('nbsFavorites');
            if (storedFavorites) setFavorites(JSON.parse(storedFavorites));
        } catch (error) { console.error("Error loading favs:", error); }
    }, []);

    const saveFavorites = (updatedFavorites: FavoriteRoute[]) => {
        setFavorites(updatedFavorites);
        try { localStorage.setItem('nbsFavorites', JSON.stringify(updatedFavorites)); }
        catch (error) { console.error("Error saving favs:", error); }
    };

    const handleTrackVehicle = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!vehicleNumber.trim()) { toast({ variant: "destructive", title: "Please enter Vehicle Number" }); return; }
        setIsLoadingVehicleStatus(true); setVehicleStatusResult(null);
        try {
            const status = await getBusLiveStatusService(vehicleNumber);
            if (status) setVehicleStatusResult(status);
            else toast({ variant: "destructive", title: "Bus Not Found", description: "No live status for this vehicle." });
        } catch (error) { toast({ variant: "destructive", title: "Error Fetching Status" }); }
        finally { setIsLoadingVehicleStatus(false); }
    };

    const handleSearchBuses = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!fromCity || !toCity || !journeyDate) { toast({ variant: "destructive", title: "Missing Info", description: "Select From, To, and Date." }); return; }
        setIsLoadingBusSearch(true); setBusSearchResults([]);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const results = mockBusRoutesData.filter(route => route.from.toLowerCase().includes(fromCity.toLowerCase()) && route.to.toLowerCase().includes(toCity.toLowerCase()));
            setBusSearchResults(results);
            if (results.length === 0) toast({ description: "No buses found." });
        } catch (error) { toast({ variant: "destructive", title: "Bus Search Failed" }); }
        finally { setIsLoadingBusSearch(false); }
    };

    const handleTrackReservation = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!reservationId.trim()) { toast({ variant: "destructive", title: "Enter Reservation ID" }); return; }
        setIsLoadingReservationStatus(true); setReservationStatusResult(null);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const result = mockReservationStatusData[reservationId.trim()];
            if (result) setReservationStatusResult(result);
            else toast({ variant: "destructive", title: "Reservation Not Found" });
        } catch (error) { toast({ variant: "destructive", title: "Error Fetching Status" }); }
        finally { setIsLoadingReservationStatus(false); }
    };

    const handleFindNearbyStops = async () => {
        setIsLoadingNearbyStops(true); setNearbyStops([]);
        try {
            await new Promise(resolve => setTimeout(resolve, 1200));
            setNearbyStops(mockNearbyBusStopsData);
            if (mockNearbyBusStopsData.length === 0) toast({ description: "No nearby stops found." });
        } catch (error) { toast({ variant: "destructive", title: "Error Finding Stops" }); }
        finally { setIsLoadingNearbyStops(false); }
    };

    const toggleFavorite = (route: FavoriteRoute) => {
        const isFav = favorites.some(fav => fav.id === route.id);
        const updated = isFav ? favorites.filter(fav => fav.id !== route.id) : [...favorites, route];
        saveFavorites(updated);
        toast({ description: isFav ? "Removed from Favourites!" : "Added to Favourites!" });
    };

    const handleSubmitFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedbackCategory || !feedbackComment.trim()) { toast({ variant: "destructive", title: "Missing Info", description: "Select category and comment." }); return; }
        setIsSubmittingFeedback(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast({ title: "Feedback Submitted!", description: "Thank you!" });
            setFeedbackCategory(''); setFeedbackRating(0); setFeedbackComment(''); setShowFeedbackDialog(false);
        } catch (error) { toast({ variant: "destructive", title: "Submission Failed" }); }
        finally { setIsSubmittingFeedback(false); }
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
    
    const features = [
        { title: "Track by Vehicle No.", description: "Enter bus registration to find its live location.", icon: Route, action: () => setShowTrackVehicleDialog(true) },
        { title: "Search Buses", description: "Find buses between two locations for your journey.", icon: Search, action: () => setShowSearchBusesDialog(true) },
        { title: "Track Reservation", description: "Enter your PNR or Ticket ID to track your booked bus.", icon: TicketCheck, action: () => setShowTrackReservationDialog(true) },
        { title: "Nearby Bus Stops", description: "Discover bus stops around your current location.", icon: MapPin, action: () => setShowNearbyStopsDialog(true) },
        { title: "My Favourites", description: "Access your saved routes and bus stops quickly.", icon: Heart, action: () => setShowFavoritesDialog(true) },
        { title: "Emergency Help", description: "Quick access to helpline numbers.", icon: Siren, action: () => setShowEmergencyDialog(true) },
        { title: "Customer Feedback", description: "Share your experience or report issues.", icon: MessageCircle, action: () => setShowFeedbackDialog(true) },
        { title: "About NBS", description: "Learn more about National Bus Services.", icon: BadgeInfo, action: () => setShowAboutDialog(true) },
    ];

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                    <Link href="/travels" passHref>
                        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <Bus className="h-6 w-6" />
                    <h1 className="text-lg font-semibold">National Bus Services</h1>
                </div>
            </header>

            <main className="flex-grow p-4 space-y-4 pb-20">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {features.map(feature => (
                        <FeatureCard
                            key={feature.title}
                            title={feature.title}
                            description={feature.description}
                            icon={feature.icon}
                            onClick={feature.action}
                        />
                    ))}
                </div>

                {/* Track by Vehicle Number Dialog */}
                <Dialog open={showTrackVehicleDialog} onOpenChange={setShowTrackVehicleDialog}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2"><Route className="h-5 w-5 text-primary"/>Track Bus by Vehicle Number</DialogTitle>
                            <DialogDescription>Enter the bus registration number (e.g., AP28Z5566).</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleTrackVehicle} className="space-y-4 pt-2">
                            <div className="flex gap-2">
                                <Input type="text" placeholder="Enter Vehicle Number" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())} required className="h-10"/>
                                <Button type="submit" disabled={isLoadingVehicleStatus} className="h-10 px-3">
                                    {isLoadingVehicleStatus ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                </Button>
                            </div>
                        </form>
                        {isLoadingVehicleStatus && <div className="flex justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}
                        {vehicleStatusResult && (
                             <Card className="shadow-inner rounded-lg border border-border overflow-hidden mt-4">
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
                                    <ScrollArea className="h-40 mt-3 border rounded-md p-3 bg-background">
                                        <ul className="space-y-3">
                                            {vehicleStatusResult.stops.map((stop, index) => (
                                                <li key={index} className="flex items-center gap-3 text-xs relative pl-6">
                                                    {! (index === vehicleStatusResult.stops.length -1) && <div className="absolute left-[10px] top-[18px] bottom-[-12px] w-px bg-border"></div>}
                                                     <div className="absolute left-0 top-1 z-10 bg-background rounded-full p-0.5 border border-border">{getStatusIcon(stop.status)}</div>
                                                    <span className={cn("font-medium", stop.status === 'Departed' ? 'text-gray-500 line-through' : '')}>{stop.name}</span>
                                                    <span className="ml-auto font-semibold text-muted-foreground">{getEtaText(stop.eta, stop.status)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        )}
                        <DialogFooter className="pt-4"><DialogClose asChild><Button variant="outline" className="w-full">Close</Button></DialogClose></DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Search Buses Dialog */}
                <Dialog open={showSearchBusesDialog} onOpenChange={setShowSearchBusesDialog}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-primary"/>Search Buses Between Locations</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSearchBuses} className="space-y-4 pt-2">
                            <div className="flex items-center gap-2">
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="fromCityDialog" className="text-xs">From</Label>
                                    <Select value={fromCity} onValueChange={setFromCity} required>
                                        <SelectTrigger id="fromCityDialog" className="h-10"><SelectValue placeholder="Origin" /></SelectTrigger>
                                        <SelectContent>{mockNbsCities.map(c => <SelectItem key={`from-dialog-${c.id}`} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="mt-6 self-center" onClick={() => { const temp = fromCity; setFromCity(toCity); setToCity(temp);}}>
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
                                {isLoadingBusSearch ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Search className="mr-2 h-5 w-5"/>} Search Buses
                            </Button>
                        </form>
                         {isLoadingBusSearch && <div className="flex justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}
                         {busSearchResults.length > 0 && (
                            <div className="mt-4 space-y-3 max-h-60 overflow-y-auto pr-1">
                                <h3 className="font-semibold text-md">Available Buses ({busSearchResults.length})</h3>
                                {busSearchResults.map(route => (
                                    <Card key={route.id} className="p-3 shadow-sm rounded-lg border hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-sm text-primary">{route.operator} <span className="text-xs text-muted-foreground">({route.type})</span></p>
                                            </div>
                                            <Badge variant="outline" className="text-xs px-2 py-0.5">{route.rating} ★</Badge>
                                        </div>
                                        <div className="text-xs flex justify-between mt-1 items-center">
                                            <div className="flex flex-col"><span className="font-medium">{route.departureTime}</span><span className="text-muted-foreground text-[10px]">{route.from}</span></div>
                                            <div className="flex flex-col items-center text-muted-foreground"><Timer className="h-3 w-3 mb-0.5"/><span>{route.duration}</span></div>
                                            <div className="flex flex-col text-right"><span className="font-medium">{route.arrivalTime}</span> <span className="text-muted-foreground text-[10px]">{route.to}</span></div>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <p className="text-md font-bold">₹{route.price.toLocaleString()}</p>
                                            <Button size="xs" className="h-7 text-xs" onClick={() => alert(`Booking ${route.operator}...`)}>Book</Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                        <DialogFooter className="pt-4"><DialogClose asChild><Button variant="outline" className="w-full">Close</Button></DialogClose></DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Track by Reservation ID Dialog */}
                <Dialog open={showTrackReservationDialog} onOpenChange={setShowTrackReservationDialog}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2"><TicketCheck className="h-5 w-5 text-primary"/>Track by Reservation ID</DialogTitle>
                        </DialogHeader>
                         <form onSubmit={handleTrackReservation} className="space-y-4 pt-2">
                            <Input type="text" placeholder="Enter Reservation/Ticket ID" value={reservationId} onChange={e => setReservationId(e.target.value)} required className="h-10"/>
                            <Button type="submit" disabled={isLoadingReservationStatus} className="w-full h-10">{isLoadingReservationStatus ? <Loader2 className="h-5 w-5 animate-spin"/> : <Search className="h-5 w-5"/>} Track</Button>
                        </form>
                        {isLoadingReservationStatus && <div className="flex justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}
                        {reservationStatusResult && (
                            <Card className="shadow-inner p-3 text-xs space-y-1 bg-muted/30 rounded-lg border mt-4">
                                <p><strong>Operator:</strong> {reservationStatusResult.operator}</p>
                                <p><strong>Route:</strong> {reservationStatusResult.from} to {reservationStatusResult.to}</p>
                                <p><strong>Status:</strong> <span className="font-semibold">{reservationStatusResult.currentStatus}</span></p>
                                <p><strong>Live Location:</strong> {reservationStatusResult.liveLocation}</p>
                                <p><strong>ETA:</strong> {reservationStatusResult.etaDestination}</p>
                            </Card>
                        )}
                        <DialogFooter className="pt-4"><DialogClose asChild><Button variant="outline" className="w-full">Close</Button></DialogClose></DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Nearby Bus Stops Dialog */}
                <Dialog open={showNearbyStopsDialog} onOpenChange={setShowNearbyStopsDialog}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary"/>Nearby Bus Stops</DialogTitle>
                        </DialogHeader>
                         <Button onClick={handleFindNearbyStops} className="w-full my-3 h-10" disabled={isLoadingNearbyStops}>
                            {isLoadingNearbyStops ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <MapPin className="mr-2 h-5 w-5"/>} Find Stops Near Me (GPS)
                         </Button>
                        <div className="w-full h-40 bg-muted rounded-lg flex items-center justify-center text-muted-foreground border mb-3">
                            <MapIconLucide className="h-8 w-8 mr-2" /> Map View (Coming Soon)
                        </div>
                        {isLoadingNearbyStops && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
                        {nearbyStops.length > 0 && (
                            <ScrollArea className="max-h-48">
                                <div className="space-y-2">
                                {nearbyStops.map(stop => (
                                    <Card key={stop.id} className="p-2 border rounded-lg shadow-sm">
                                        <p className="font-semibold text-sm">{stop.name}</p>
                                        <p className="text-xs text-muted-foreground">{stop.distance}, {stop.city}</p>
                                        {stop.services && <p className="text-[10px] text-muted-foreground">Services: {stop.services.join(', ')}</p>}
                                    </Card>
                                ))}
                                </div>
                            </ScrollArea>
                        )}
                        <DialogFooter className="pt-4"><DialogClose asChild><Button variant="outline" className="w-full">Close</Button></DialogClose></DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Emergency Dialog */}
                <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
                    <DialogContent className="sm:max-w-xs">
                        <DialogHeader className="text-center">
                            <DialogTitle className="text-xl text-destructive flex items-center justify-center gap-2"><Siren className="h-6 w-6"/> Emergency Help</DialogTitle>
                            <DialogDescription>Call for immediate assistance.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-3">
                            {mockNbsEmergencyContacts.map(contact => (
                                <Button key={contact.name} variant="destructive" className="w-full justify-start gap-2 text-base h-11" onClick={() => window.location.href = `tel:${contact.number}`}>
                                    <Phone className="h-5 w-5"/> Call {contact.name} ({contact.number})
                                </Button>
                            ))}
                            <p className="text-xs text-muted-foreground text-center pt-2">For app-related issues, use Customer Feedback.</p>
                        </div>
                        <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Favorites Dialog */}
                <Dialog open={showFavoritesDialog} onOpenChange={setShowFavoritesDialog}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle className="text-lg flex items-center gap-2"><Heart className="h-5 w-5 text-primary"/>My Favourite Routes/Stops</DialogTitle></DialogHeader>
                        {favorites.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No favorites saved yet.</p> : (
                            <ScrollArea className="max-h-72 mt-2 pr-3">
                                {favorites.map(fav => (
                                    <div key={fav.id} className="flex justify-between items-center p-3 border-b last:border-none hover:bg-accent rounded-md">
                                        <div>
                                            <p className="text-sm font-semibold">{fav.name}</p>
                                            <p className="text-xs text-muted-foreground">{fav.type === 'route' ? `${fav.details.from} to ${fav.details.to}` : fav.details.address}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleFavorite(fav)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                ))}
                            </ScrollArea>
                        )}
                        <DialogFooter className="mt-4"><DialogClose asChild><Button variant="outline" className="w-full">Close</Button></DialogClose></DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Feedback Dialog */}
                <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader><DialogTitle className="text-lg flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary"/>Submit Feedback</DialogTitle><DialogDescription>Help us improve National Bus Services.</DialogDescription></DialogHeader>
                        <form onSubmit={handleSubmitFeedback} className="space-y-4 py-2">
                            <div className="space-y-1">
                                <Label htmlFor="feedback-category-dialog">Category</Label>
                                <Select value={feedbackCategory} onValueChange={setFeedbackCategory} required>
                                    <SelectTrigger id="feedback-category-dialog"><SelectValue placeholder="Select Feedback Category"/></SelectTrigger>
                                    <SelectContent>{mockFeedbackCategories.map(cat=><SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Rating</Label>
                                <div className="flex items-center justify-center space-x-1.5 py-1">{[1,2,3,4,5].map(r=><StarIcon key={r} className={cn("h-7 w-7 cursor-pointer", feedbackRating >=r ? "text-yellow-400 fill-yellow-400":"text-muted-foreground hover:text-yellow-300")} onClick={()=>setFeedbackRating(r)}/>)}</div>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="feedback-comment-dialog">Comments/Suggestions</Label>
                                <Textarea id="feedback-comment-dialog" placeholder="Enter comments (max 500 chars)" value={feedbackComment} onChange={e=>setFeedbackComment(e.target.value)} required maxLength={500} rows={4}/>
                            </div>
                            <DialogFooter className="pt-2">
                                <DialogClose asChild><Button variant="outline" type="button">Cancel</Button></DialogClose>
                                <Button type="submit" disabled={isSubmittingFeedback}>{isSubmittingFeedback ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null} Submit Feedback</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* About Dialog */}
                <Dialog open={showAboutDialog} onOpenChange={setShowAboutDialog}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader><DialogTitle className="text-xl flex items-center gap-2"><BadgeInfo className="h-5 w-5 text-primary"/>About National Bus Services (NBS)</DialogTitle></DialogHeader>
                        <ScrollArea className="max-h-[70vh] pr-4 py-2">
                            <div className="text-sm text-muted-foreground whitespace-pre-line" dangerouslySetInnerHTML={{ __html: nbsAboutText.replace(/\n\n/g, '<br/><br/>').replace(/\n- /g, '<br/>- ') }} />
                        </ScrollArea>
                        <DialogFooter className="pt-2"><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
                    </DialogContent>
                </Dialog>

            </main>
        </div>
    );
}
