'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIconLucide, ArrowLeft, Bus, Search, Loader2, Clock, MapPin, AlertCircle, CheckCircle, ArrowRightLeft, MoreVertical, XCircle, Timer, Star as StarIcon, Edit, Trash2, Phone, MessageCircle, BadgeInfo, Filter, User, Mail, MessageSquare, Map as MapIconLucide, Siren, Heart } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { getBusLiveStatus as getBusLiveStatusService, BusLiveStatus, BusStopStatus } from '@/services/liveTracking';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, addDays, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    mockBusRoutesData,
    mockNearbyBusStopsData,
    mockReservationStatusData,
    mockBusRoute,
    mockNearbyBusStop,
    mockReservationStatus,
    mockNbsEmergencyContacts,
    mockFeedbackCategories,
    nbsAboutText,
    mockNbsCities,
    mockNbsStates
} from '@/mock-data/liveTracking';
import type { BusRoute, NearbyBusStop, ReservationStatus, FavoriteRoute } from '@/mock-data/liveTracking';


export default function NationalBusServicesPage() {
    const [activeTab, setActiveTab] = useState('trackVehicle');
    const { toast } = useToast();

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
    const [showFavoritesDialog, setShowFavoritesDialog] = useState(false);

    // States for Customer Feedback
    const [feedbackCategory, setFeedbackCategory] = useState('');
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);

    // State for About Dialog
    const [showAboutDialog, setShowAboutDialog] = useState(false);
    const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);


    // Load favorites from localStorage on mount
    useEffect(() => {
        try {
            const storedFavorites = localStorage.getItem('nbsFavorites');
            if (storedFavorites) {
                setFavorites(JSON.parse(storedFavorites));
            }
        } catch (error) {
            console.error("Error loading favorites from localStorage:", error);
        }
    }, []);

    const saveFavorites = (updatedFavorites: FavoriteRoute[]) => {
        setFavorites(updatedFavorites);
        try {
            localStorage.setItem('nbsFavorites', JSON.stringify(updatedFavorites));
        } catch (error) {
            console.error("Error saving favorites to localStorage:", error);
        }
    };

    const handleTrackVehicle = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!vehicleNumber.trim()) {
            toast({ variant: "destructive", title: "Please enter a Vehicle Number" });
            return;
        }
        setIsLoadingVehicleStatus(true);
        setVehicleStatusResult(null);
        try {
            const status = await getBusLiveStatusService(vehicleNumber); // Using imported service
            if (status) {
                setVehicleStatusResult(status);
            } else {
                toast({ variant: "destructive", title: "Bus Not Found", description: "Could not find live status for the entered vehicle." });
            }
        } catch (error) {
            console.error("Failed to fetch vehicle status:", error);
            toast({ variant: "destructive", title: "Error Fetching Status" });
        } finally {
            setIsLoadingVehicleStatus(false);
        }
    };

    const handleSearchBuses = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!fromCity || !toCity || !journeyDate) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select From, To locations and Journey Date." });
            return;
        }
        setIsLoadingBusSearch(true);
        setBusSearchResults([]);
        try {
            console.log("Searching buses with params:", { fromCity, toCity, date: format(journeyDate, 'yyyy-MM-dd') });
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
            const results = mockBusRoutesData.filter(
                route => route.from.toLowerCase().includes(fromCity.toLowerCase()) &&
                         route.to.toLowerCase().includes(toCity.toLowerCase())
            );
            setBusSearchResults(results);
            if (results.length === 0) {
                toast({ description: "No buses found for this route on the selected date." });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Bus Search Failed" });
        } finally {
            setIsLoadingBusSearch(false);
        }
    };

    const handleTrackReservation = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!reservationId.trim()) {
            toast({ variant: "destructive", title: "Please enter Reservation ID" });
            return;
        }
        setIsLoadingReservationStatus(true);
        setReservationStatusResult(null);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const result = mockReservationStatusData[reservationId.trim()];
            if (result) {
                setReservationStatusResult(result);
            } else {
                toast({ variant: "destructive", title: "Reservation Not Found" });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error Fetching Reservation Status" });
        } finally {
            setIsLoadingReservationStatus(false);
        }
    };

    const handleFindNearbyStops = async () => {
        setIsLoadingNearbyStops(true);
        setNearbyStops([]);
        try {
            // Simulate GPS fetch and API call
            await new Promise(resolve => setTimeout(resolve, 1200));
            setNearbyStops(mockNearbyBusStopsData);
            if (mockNearbyBusStopsData.length === 0) {
                toast({ description: "No nearby bus stops found (or GPS disabled)." });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error Finding Stops" });
        } finally {
            setIsLoadingNearbyStops(false);
        }
    };

    const toggleFavorite = (route: FavoriteRoute) => {
        const isFavorited = favorites.some(fav => fav.id === route.id);
        let updatedFavorites;
        if (isFavorited) {
            updatedFavorites = favorites.filter(fav => fav.id !== route.id);
            toast({ description: "Removed from Favourites!" });
        } else {
            updatedFavorites = [...favorites, route];
            toast({ description: "Added to Favourites!" });
        }
        saveFavorites(updatedFavorites);
    };

    const handleSubmitFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedbackCategory || !feedbackComment.trim()) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select a category and enter your comment." });
            return;
        }
        setIsSubmittingFeedback(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast({ title: "Feedback Submitted!", description: "Thank you for your valuable feedback." });
            setFeedbackCategory('');
            setFeedbackRating(0);
            setFeedbackComment('');
            setShowFeedbackDialog(false);
        } catch (error) {
            toast({ variant: "destructive", title: "Feedback Submission Failed" });
        } finally {
            setIsSubmittingFeedback(false);
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
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                    <Link href="/" passHref>
                        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <Bus className="h-6 w-6" />
                    <h1 className="text-lg font-semibold">National Bus Services</h1>
                </div>
                <div className="flex items-center gap-1">
                     <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setShowFavoritesDialog(true)}><Heart className="h-4 w-4 mr-1"/> Favourites</Button>
                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowEmergencyDialog(true)} title="Emergency"><Siren className="h-4 w-4"/></Button>
                </div>
            </header>

            <main className="flex-grow p-4 space-y-4 pb-20">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                        <TabsTrigger value="trackVehicle">Track Vehicle</TabsTrigger>
                        <TabsTrigger value="searchBuses">Search Buses</TabsTrigger>
                        <TabsTrigger value="trackReservation">Track Reservation</TabsTrigger>
                        <TabsTrigger value="nearbyStops">Nearby Stops</TabsTrigger>
                    </TabsList>

                    {/* Track by Vehicle Number Tab */}
                    <TabsContent value="trackVehicle" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Track Bus by Vehicle Number</CardTitle>
                                <CardDescription>Enter the bus registration number (e.g., AP28Z5566).</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleTrackVehicle} className="flex gap-2 mb-4">
                                    <Input
                                        type="text"
                                        placeholder="Enter Vehicle Number"
                                        value={vehicleNumber}
                                        onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                                        required
                                    />
                                    <Button type="submit" disabled={isLoadingVehicleStatus}>
                                        {isLoadingVehicleStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    </Button>
                                </form>
                                {isLoadingVehicleStatus && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
                                {vehicleStatusResult && (
                                    <Card className="shadow-inner">
                                        <CardHeader className="bg-muted/50 border-b p-3">
                                            <CardTitle className="text-base flex justify-between items-center">
                                                <span>{vehicleStatusResult.operatorName || 'Bus'}: {vehicleStatusResult.busNumber}</span>
                                                <Badge variant={vehicleStatusResult.delayMinutes && vehicleStatusResult.delayMinutes > 0 ? "destructive" : "default"} className={cn("text-xs", vehicleStatusResult.delayMinutes && vehicleStatusResult.delayMinutes > 0 ? "" : "bg-green-100 text-green-700")}>
                                                    {vehicleStatusResult.delayMinutes && vehicleStatusResult.delayMinutes > 0 ? `Delayed ${vehicleStatusResult.delayMinutes} min` : 'On Time'}
                                                </Badge>
                                            </CardTitle>
                                            <CardDescription className="text-xs">{vehicleStatusResult.routeName}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-3 text-sm space-y-1">
                                            <p><strong>Current:</strong> {vehicleStatusResult.currentLocationDescription}</p>
                                            <p><strong>Next Stop:</strong> {vehicleStatusResult.nextStop} (ETA: {vehicleStatusResult.etaNextStop})</p>
                                            <p className="text-xs text-muted-foreground">Last updated: {format(vehicleStatusResult.lastUpdated, 'p')}</p>
                                            <ScrollArea className="h-40 mt-2 border rounded-md p-2">
                                                <ul className="space-y-2">
                                                    {vehicleStatusResult.stops.map((stop, index) => (
                                                        <li key={index} className="flex items-center gap-2 text-xs relative pl-5">
                                                            {! (index === vehicleStatusResult.stops.length -1) && <div className="absolute left-[7px] top-[14px] bottom-[-8px] w-px bg-border"></div>}
                                                             <div className="absolute left-0 top-0.5 z-10 bg-card rounded-full p-0.5">{getStatusIcon(stop.status)}</div>
                                                            <span className={cn(stop.status === 'Departed' ? 'text-gray-400 line-through' : '')}>{stop.name}</span>
                                                            <span className="ml-auto font-medium">{getEtaText(stop.eta, stop.status)}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Search Buses (From-To) Tab */}
                    <TabsContent value="searchBuses" className="mt-4">
                         <Card>
                            <CardHeader>
                                <CardTitle>Search Buses Between Locations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSearchBuses} className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 space-y-1">
                                            <Label htmlFor="fromCity">From</Label>
                                            <Select value={fromCity} onValueChange={setFromCity} required>
                                                <SelectTrigger id="fromCity"><SelectValue placeholder="Origin" /></SelectTrigger>
                                                <SelectContent>{mockNbsCities.map(c => <SelectItem key={`from-${c.id}`} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" className="mt-6 self-center" onClick={() => { const temp = fromCity; setFromCity(toCity); setToCity(temp);}}>
                                            <ArrowRightLeft className="h-4 w-4 text-primary"/>
                                        </Button>
                                        <div className="flex-1 space-y-1">
                                            <Label htmlFor="toCity">To</Label>
                                            <Select value={toCity} onValueChange={setToCity} required>
                                                <SelectTrigger id="toCity"><SelectValue placeholder="Destination" /></SelectTrigger>
                                                <SelectContent>{mockNbsCities.map(c => <SelectItem key={`to-${c.id}`} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="journeyDateSearch">Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button id="journeyDateSearch" variant="outline" className={cn("w-full justify-start text-left font-normal", !journeyDate && "text-muted-foreground")}>
                                                    <CalendarIconLucide className="mr-2 h-4 w-4"/>{journeyDate ? format(journeyDate, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={journeyDate} onSelect={setJourneyDate} initialFocus disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}/></PopoverContent>
                                        </Popover>
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoadingBusSearch}>
                                        {isLoadingBusSearch ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>} Search Buses
                                    </Button>
                                </form>
                                {isLoadingBusSearch && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
                                {busSearchResults.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        <h3 className="font-semibold text-sm">Available Buses ({busSearchResults.length})</h3>
                                        {busSearchResults.map(route => (
                                            <Card key={route.id} className="p-3 shadow-sm">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium text-primary">{route.operator}</p>
                                                        <p className="text-xs text-muted-foreground">{route.type}</p>
                                                    </div>
                                                    <Badge variant="outline" className="text-xs">{route.rating} ★</Badge>
                                                </div>
                                                <div className="text-xs flex justify-between mt-1">
                                                    <span>Dep: {route.departureTime}</span>
                                                    <span>Arr: {route.arrivalTime}</span>
                                                    <span>{route.duration}</span>
                                                </div>
                                                <div className="flex justify-between items-center mt-2">
                                                    <p className="text-sm font-bold">₹{route.price}</p>
                                                    <Button size="xs" variant="secondary" onClick={() => alert(`Booking ${route.operator}...`)}>Book Seats</Button>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                         </Card>
                    </TabsContent>

                    {/* Track by Reservation ID Tab */}
                    <TabsContent value="trackReservation" className="mt-4">
                        <Card>
                            <CardHeader><CardTitle>Track Bus by Reservation ID</CardTitle></CardHeader>
                            <CardContent>
                                <form onSubmit={handleTrackReservation} className="flex gap-2 mb-4">
                                    <Input type="text" placeholder="Enter Reservation/Ticket ID" value={reservationId} onChange={e => setReservationId(e.target.value)} required/>
                                    <Button type="submit" disabled={isLoadingReservationStatus}>{isLoadingReservationStatus ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4"/>}</Button>
                                </form>
                                {isLoadingReservationStatus && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
                                {reservationStatusResult && (
                                    <Card className="shadow-inner p-3 text-sm space-y-1 bg-muted/30">
                                        <p><strong>Operator:</strong> {reservationStatusResult.operator}</p>
                                        <p><strong>Route:</strong> {reservationStatusResult.from} to {reservationStatusResult.to}</p>
                                        <p><strong>Status:</strong> <span className="font-semibold">{reservationStatusResult.currentStatus}</span></p>
                                        <p><strong>Live Location:</strong> {reservationStatusResult.liveLocation}</p>
                                        <p><strong>ETA to Destination:</strong> {reservationStatusResult.etaDestination}</p>
                                    </Card>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Nearby Bus Stops Tab */}
                    <TabsContent value="nearbyStops" className="mt-4">
                        <Card>
                            <CardHeader><CardTitle>Nearby Bus Stops</CardTitle></CardHeader>
                            <CardContent>
                                <Button onClick={handleFindNearbyStops} className="w-full mb-4" disabled={isLoadingNearbyStops}>
                                    {isLoadingNearbyStops ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <MapPin className="mr-2 h-4 w-4"/>} Find Stops Near Me (GPS)
                                </Button>
                                <div className="w-full h-40 bg-muted rounded-md flex items-center justify-center text-muted-foreground border mb-4">
                                    <MapPin className="h-8 w-8 mr-2" /> Map View (Coming Soon)
                                </div>
                                {isLoadingNearbyStops && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
                                {nearbyStops.length > 0 && (
                                    <div className="space-y-2">
                                        {nearbyStops.map(stop => (
                                            <div key={stop.id} className="p-2 border rounded-md text-sm">
                                                <p className="font-medium">{stop.name}</p>
                                                <p className="text-xs text-muted-foreground">{stop.distance}, {stop.city}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Action Buttons: Feedback & About */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                    <Button variant="outline" onClick={() => setShowFeedbackDialog(true)}><MessageCircle className="mr-2 h-4 w-4"/>Customer Feedback</Button>
                    <Button variant="outline" onClick={() => setShowAboutDialog(true)}><BadgeInfo className="mr-2 h-4 w-4"/>About NBS</Button>
                </div>

                {/* Favorites Dialog */}
                <Dialog open={showFavoritesDialog} onOpenChange={setShowFavoritesDialog}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>My Favourite Routes/Stops</DialogTitle></DialogHeader>
                        {favorites.length === 0 ? <p className="text-sm text-muted-foreground py-4">No favorites saved yet.</p> : (
                            <ScrollArea className="max-h-60">
                                {favorites.map(fav => (
                                    <div key={fav.id} className="flex justify-between items-center p-2 border-b">
                                        <div>
                                            <p className="text-sm font-medium">{fav.name}</p>
                                            <p className="text-xs text-muted-foreground">{fav.type === 'route' ? `${fav.details.from} to ${fav.details.to}` : fav.details.address}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleFavorite(fav)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                ))}
                            </ScrollArea>
                        )}
                        <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Feedback Dialog */}
                <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Submit Feedback</DialogTitle><DialogDescription>Help us improve National Bus Services.</DialogDescription></DialogHeader>
                        <form onSubmit={handleSubmitFeedback} className="space-y-3 py-2">
                            <Select value={feedbackCategory} onValueChange={setFeedbackCategory} required>
                                <SelectTrigger><SelectValue placeholder="Select Category"/></SelectTrigger>
                                <SelectContent>{mockFeedbackCategories.map(cat=><SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                            </Select>
                            <div className="flex items-center justify-center space-x-1">{[1,2,3,4,5].map(r=><StarIcon key={r} className={cn("h-6 w-6 cursor-pointer", feedbackRating >=r ? "text-yellow-400 fill-yellow-400":"text-muted-foreground")} onClick={()=>setFeedbackRating(r)}/>)}</div>
                            <Textarea placeholder="Enter your comments or suggestions (max 500 chars)" value={feedbackComment} onChange={e=>setFeedbackComment(e.target.value)} required maxLength={500}/>
                            <DialogFooter>
                                <DialogClose asChild><Button variant="outline" type="button">Cancel</Button></DialogClose>
                                <Button type="submit" disabled={isSubmittingFeedback}>{isSubmittingFeedback ? <Loader2 className="h-4 w-4 animate-spin"/> : "Submit Feedback"}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* About Dialog */}
                <Dialog open={showAboutDialog} onOpenChange={setShowAboutDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader><DialogTitle className="text-lg">About National Bus Services (NBS)</DialogTitle></DialogHeader>
                        <ScrollArea className="max-h-[60vh] pr-3">
                            <div className="text-sm text-muted-foreground whitespace-pre-line" dangerouslySetInnerHTML={{ __html: nbsAboutText.replace(/\n/g, '<br />') }} />
                        </ScrollArea>
                        <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
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
                                <Button key={contact.name} variant="destructive" className="w-full justify-start gap-2" onClick={() => window.location.href = `tel:${contact.number}`}>
                                    <Phone className="h-4 w-4"/> Call {contact.name} ({contact.number})
                                </Button>
                            ))}
                            <p className="text-xs text-muted-foreground text-center pt-2">For app-related issues, use Customer Feedback.</p>
                        </div>
                        <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}
