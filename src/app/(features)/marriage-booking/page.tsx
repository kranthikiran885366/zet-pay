'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, HeartHandshake, Search, Filter, MapPin, CalendarIcon, Users, Wallet, Loader2, CheckCircle, Info, UserCircle, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import { format, differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Separator } from '@/components/ui/separator';
import { searchMarriageVenues as searchVenuesApi, getMarriageVenueDetails as getVenueDetailsApi, confirmMarriageVenueBooking as confirmBookingApi, MarriageVenue, MarriageBookingDetails } from '@/services/booking';
import type { BookingConfirmation } from '@/services/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { auth } from '@/lib/firebase';
import { Textarea } from "@/components/ui/textarea";


const mockCities = ['Bangalore', 'Hyderabad', 'Chennai', 'Mumbai', 'Delhi', 'Pune'];
const mockGuestCounts = ['50-100', '100-200', '200-500', '500-1000', '1000+'];

export default function MarriageBookingPage() {
    const [pickupCity, setSelectedCity] = useState('');
    const [eventDate, setEventDate] = useState<Date | undefined>(new Date());
    const [guestCountRange, setGuestCountRange] = useState('');
    const [searchResults, setSearchResults] = useState<MarriageVenue[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedVenue, setSelectedVenue] = useState<MarriageVenue | null>(null);
    const [detailedVenueInfo, setDetailedVenueInfo] = useState<MarriageVenue | null>(null); // For modal
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [isBooking, setIsBooking] = useState(false);
    const [isFetchingDetails, setIsFetchingDetails] = useState(false);

    // Booking Form State
    const [userName, setUserName] = useState('');
    const [userContact, setUserContact] = useState('');
    const [userEmail, setUserEmail] = useState(''); // Added email for booking form
    const [specialRequests, setSpecialRequests] = useState('');


    const { toast } = useToast();

    useEffect(() => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        setUserName(currentUser.displayName || '');
        setUserEmail(currentUser.email || '');
        setUserContact(currentUser.phoneNumber || '');
      }
    }, []);

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!pickupCity || !eventDate) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select city and event date." });
            return;
        }
        setIsLoading(true);
        setShowResults(false);
        setSearchResults([]);
        setSelectedVenue(null);
        setDetailedVenueInfo(null);

        const searchParams = {
            city: pickupCity,
            date: format(eventDate, 'yyyy-MM-dd'),
            guests: guestCountRange,
        };
        console.log("Searching Marriage Venues via API:", searchParams);

        try {
            const results = await searchVenuesApi(searchParams);
            setSearchResults(results);
            setShowResults(true);
            if (results.length === 0) {
                toast({ description: "No venues found matching your criteria." });
            }
        } catch (error: any) {
            console.error("Venue search failed:", error);
            toast({ variant: "destructive", title: "Search Failed", description: error.message || "Could not fetch venues." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewDetails = async (venue: MarriageVenue) => {
        setIsFetchingDetails(true);
        setSelectedVenue(venue); // Set basic info immediately for modal title
        setDetailedVenueInfo(null); // Clear previous detailed info
        setShowDetailsModal(true);
        try {
            const details = await getVenueDetailsApi(venue.id);
            if (details) {
                setDetailedVenueInfo(details);
            } else {
                toast({ variant: "destructive", title: "Details Not Found", description: "Could not fetch complete details for this venue." });
                setDetailedVenueInfo(venue); // Fallback to basic info
            }
        } catch (error: any) {
            console.error("Error fetching venue details:", error);
            toast({ variant: "destructive", title: "Error Fetching Details", description: error.message });
            setDetailedVenueInfo(venue); // Fallback to basic info
        } finally {
            setIsFetchingDetails(false);
        }
    };

    const handleBookVenue = async () => {
        if (!detailedVenueInfo || !eventDate || !pickupCity || !userName || !userContact || !userEmail) {
            toast({ variant: "destructive", title: "Booking Error", description: "Venue details or user information are incomplete." });
            return;
        }
        if (auth.currentUser === null) {
            toast({ variant: "destructive", title: "Login Required", description: "Please log in to make a booking." });
            return;
        }

        setIsBooking(true);
        const bookingPayload: MarriageBookingDetails = {
            venueId: detailedVenueInfo.id,
            venueName: detailedVenueInfo.name,
            city: pickupCity,
            date: format(eventDate, 'yyyy-MM-dd'),
            guestCount: guestCountRange || 'Not Specified',
            userName,
            userContact,
            userEmail, // Include email
            specialRequests, // Include special requests
            totalAmount: detailedVenueInfo.price, // Assuming base price for booking fee, or specific bookingFee field
        };

        try {
            const result: BookingConfirmation = await confirmBookingApi(detailedVenueInfo.id, bookingPayload);
            if (result.status === 'Completed' || result.status === 'Pending') {
                toast({
                    title: `Booking ${result.status}!`,
                    description: result.message || `Your request for ${detailedVenueInfo.name} has been submitted. Transaction ID: ${result.transactionId}`,
                    duration: 7000,
                });
                setShowDetailsModal(false);
                setSelectedVenue(null);
                setDetailedVenueInfo(null);
                // Reset form or redirect
            } else {
                throw new Error(result.message || "Booking failed at the venue.");
            }
        } catch (error: any) {
            console.error("Venue booking failed:", error);
            toast({ variant: "destructive", title: "Booking Failed", description: error.message });
        } finally {
            setIsBooking(false);
        }
    };


    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/services" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <HeartHandshake className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Marriage Hall Booking</h1>
            </header>

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
                                    <Select value={pickupCity} onValueChange={setSelectedCity} required>
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
                                        <Label htmlFor="guests">Number of Guests</Label>
                                         <Select value={guestCountRange} onValueChange={setGuestCountRange}>
                                            <SelectTrigger id="guests"><SelectValue placeholder="Select Guest Range" /></SelectTrigger>
                                            <SelectContent>
                                                {mockGuestCounts.map(count => <SelectItem key={count} value={count}>{count}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
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
                     <div className="space-y-4">
                         <Button variant="outline" onClick={() => { setShowResults(false); setSearchResults([]);}} className="mb-4">
                             <ArrowLeft className="mr-2 h-4 w-4"/> Modify Search
                         </Button>
                         <div className="flex justify-between items-center mb-2">
                             <h2 className="text-lg font-semibold">{searchResults.length} Venue{searchResults.length !== 1 ? 's' : ''} Found</h2>
                              <Button variant="ghost" size="sm"><Filter className="mr-1 h-4 w-4"/> Filter</Button>
                         </div>
                         {searchResults.map(venue => (
                            <Card key={venue.id} className="shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
                                <div className="flex flex-col sm:flex-row">
                                    <div className="relative w-full sm:w-1/3 h-40 sm:h-auto">
                                        <Image src={venue.imageUrl || '/images/venues/default.jpg'} alt={venue.name} layout="fill" objectFit="cover" className="sm:rounded-l-lg sm:rounded-tr-none" data-ai-hint="wedding venue hall exterior interior"/>
                                    </div>
                                    <div className="flex-grow p-4">
                                         <CardTitle className="text-base mb-1">{venue.name}</CardTitle>
                                         <CardDescription className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><MapPin className="inline h-3 w-3"/>{venue.location}</CardDescription>
                                         <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
                                             <Badge variant="secondary" className="text-xs">Capacity: {venue.capacity} Guests</Badge>
                                             {venue.priceRange && <Badge variant="secondary" className="text-xs">Est. Price: {venue.priceRange}</Badge>}
                                             {venue.rating && <Badge variant="outline" className="text-xs flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500 fill-current"/>{venue.rating}/5</Badge>}
                                         </div>
                                         {venue.amenities && venue.amenities.length > 0 && (
                                             <div className="mt-1 mb-2">
                                                {venue.amenities.slice(0,3).map(am => <Badge key={am} variant="outline" className="mr-1 mb-1 text-[10px]">{am}</Badge>)}
                                                 {venue.amenities.length > 3 && <Badge variant="outline" className="text-[10px]">+{venue.amenities.length - 3} more</Badge>}
                                             </div>
                                         )}
                                          <Button className="mt-2 w-full sm:w-auto h-8" onClick={() => handleViewDetails(venue)}>View Details & Book</Button>
                                    </div>
                                </div>
                            </Card>
                         ))}
                    </div>
                )}

                <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                             <DialogTitle className="text-xl">{selectedVenue?.name}</DialogTitle>
                             <DialogDescription className="flex items-center gap-1"><MapPin className="h-4 w-4"/>{selectedVenue?.location}</DialogDescription>
                        </DialogHeader>
                        {isFetchingDetails && (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}
                        {!isFetchingDetails && detailedVenueInfo && (
                            <ScrollArea className="max-h-[60vh] pr-2">
                                <div className="py-4 space-y-4">
                                    <div className="relative w-full h-48 rounded-md overflow-hidden">
                                        <Image src={detailedVenueInfo.imageUrl || '/images/venues/default.jpg'} alt={detailedVenueInfo.name} layout="fill" objectFit="cover" data-ai-hint="venue large image"/>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{detailedVenueInfo.description || "No additional description available."}</p>
                                     <Separator />
                                     <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><span className="font-semibold">Capacity:</span> {detailedVenueInfo.capacity} Guests</div>
                                        {detailedVenueInfo.price && <div><span className="font-semibold">Starting Price:</span> ₹{detailedVenueInfo.price.toLocaleString()}</div>}
                                        {detailedVenueInfo.priceRange && <div><span className="font-semibold">Est. Price:</span> {detailedVenueInfo.priceRange}</div>}
                                        {detailedVenueInfo.rating && <div><span className="font-semibold">Rating:</span> {detailedVenueInfo.rating}/5 ★</div>}
                                     </div>
                                     {detailedVenueInfo.amenities && detailedVenueInfo.amenities.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-sm mb-1">Amenities:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {detailedVenueInfo.amenities.map(am => <Badge key={am} variant="secondary">{am}</Badge>)}
                                            </div>
                                        </div>
                                     )}
                                     <Separator />
                                     {/* Booking Form within Modal */}
                                     <div className="space-y-3 pt-2">
                                         <p className="text-sm font-medium">Booking Details for {eventDate ? format(eventDate, 'PPP') : 'your selected date'}:</p>
                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                              <div className="space-y-1">
                                                <Label htmlFor="book-userName">Your Name</Label>
                                                <Input id="book-userName" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Full Name" required/>
                                              </div>
                                               <div className="space-y-1">
                                                <Label htmlFor="book-userContact">Contact Number</Label>
                                                <Input id="book-userContact" type="tel" value={userContact} onChange={(e) => setUserContact(e.target.value)} placeholder="Mobile Number" required/>
                                               </div>
                                         </div>
                                         <div className="space-y-1">
                                            <Label htmlFor="book-userEmail">Email Address</Label>
                                            <Input id="book-userEmail" type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="Email ID" required/>
                                         </div>
                                         <div className="space-y-1">
                                            <Label htmlFor="book-specialRequests">Special Requests (Optional)</Label>
                                            <Textarea id="book-specialRequests" value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder="e.g., specific decor, dietary needs"/>
                                         </div>
                                          {detailedVenueInfo.price > 0 && (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3"/> A booking fee/advance of ₹{detailedVenueInfo.price.toLocaleString()} may be applicable.</p>
                                          )}
                                     </div>
                                </div>
                            </ScrollArea>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>Cancel</Button>
                            <Button
                                className="bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                disabled={isBooking || isFetchingDetails || !detailedVenueInfo || !userName || !userContact || !userEmail}
                                onClick={handleBookVenue}
                            >
                                {isBooking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                {isBooking ? 'Processing...' : 'Enquire / Book Now'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}

