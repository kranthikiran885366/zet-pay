'use client';

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, HeartHandshake, Search, Filter, MapPin, CalendarIcon, Users, Wallet, Loader2, CheckCircle, Info, UserCircle, Mail, Phone, Heart, Star } from 'lucide-react';
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

    // Enhanced state: favorites, cart, selected dates, recurring, filters, gallery index
    const [favorites, setFavorites] = useState<string[]>([]);
    type CartItem = { venueId: string; name: string; date: string; amount?: number };
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCartModal, setShowCartModal] = useState(false);
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPct: number } | null>(null);

    const [selectedDates, setSelectedDates] = useState<string[]>([]); // store yyyy-MM-dd strings
    const [recurring, setRecurring] = useState<{ enabled: boolean; frequency: 'weekly' | 'monthly' | null; occurrences: number }>({ enabled: false, frequency: null, occurrences: 1 });

    // Filters for results
    const [showFilters, setShowFilters] = useState(false);
    const [filterMinPrice, setFilterMinPrice] = useState<number | undefined>(undefined);
    const [filterMaxPrice, setFilterMaxPrice] = useState<number | undefined>(undefined);
    const [filterMinCapacity, setFilterMinCapacity] = useState<number | undefined>(undefined);
    const [filterAmenities, setFilterAmenities] = useState<string[]>([]);
    const [filterMinRating, setFilterMinRating] = useState<number | undefined>(undefined);

    const [galleryIndex, setGalleryIndex] = useState(0);

    const { toast } = useToast();

    // Load favorites and cart from localStorage on mount
    useEffect(() => {
      try {
        const fav = typeof window !== 'undefined' ? window.localStorage.getItem('mf_favorites') : null;
        const cartRaw = typeof window !== 'undefined' ? window.localStorage.getItem('mf_cart') : null;
        if (fav) setFavorites(JSON.parse(fav));
        if (cartRaw) setCart(JSON.parse(cartRaw));
      } catch (e) {
        console.warn('Failed to load localStorage data for marriage booking.', e);
      }

      const currentUser = auth.currentUser;
      if (currentUser) {
        setUserName(currentUser.displayName || '');
        setUserEmail(currentUser.email || '');
        setUserContact(currentUser.phoneNumber || '');
      }
    }, []);

    // Persist favorites/cart
    useEffect(() => {
      try { if (typeof window !== 'undefined') window.localStorage.setItem('mf_favorites', JSON.stringify(favorites)); } catch (e) {}
    }, [favorites]);
    useEffect(() => {
      try { if (typeof window !== 'undefined') window.localStorage.setItem('mf_cart', JSON.stringify(cart)); } catch (e) {}
    }, [cart]);

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

    // --- Enhanced helpers ---
    const toggleFavorite = (venueId: string) => {
      setFavorites(prev => prev.includes(venueId) ? prev.filter(id => id !== venueId) : [...prev, venueId]);
    };

    const addToCart = (venue: MarriageVenue, dateStr?: string) => {
      const date = dateStr || (eventDate ? format(eventDate, 'yyyy-MM-dd') : '');
      const item: CartItem = { venueId: venue.id, name: venue.name, date, amount: venue.price || 0 };
      setCart(prev => [...prev, item]);
      toast({ title: 'Added to Cart', description: `${venue.name} (${date}) added to cart.` });
    };

    const removeFromCart = (index: number) => {
      setCart(prev => prev.filter((_, i) => i !== index));
    };

    const applyPromo = () => {
      if (!promoCode) {
        toast({ variant: 'destructive', title: 'No Promo', description: 'Enter a promo code to apply.' });
        return;
      }
      // Simple mock promo logic
      if (promoCode.toLowerCase() === 'SAVE10') {
        setAppliedPromo({ code: promoCode, discountPct: 10 });
        toast({ title: 'Promo Applied', description: '10% discount applied.' });
      } else {
        setAppliedPromo(null);
        toast({ variant: 'destructive', title: 'Invalid Promo' });
      }
    };

    const checkoutMock = () => {
      if (cart.length === 0) { toast({ description: 'Cart is empty.' }); return; }
      // Mock processing
      setShowCartModal(false);
      setTimeout(() => {
        const total = cart.reduce((s, c) => s + (c.amount || 0), 0);
        const discount = appliedPromo ? Math.round(total * (appliedPromo.discountPct / 100)) : 0;
        toast({ title: 'Payment Successful (Mock)', description: `Paid ₹${(total - discount).toLocaleString()}. Booking requests submitted.` });
        setCart([]);
        setAppliedPromo(null);
        setPromoCode('');
      }, 800);
    };

    const addSelectedDate = (date: Date | undefined) => {
      if (!date) return;
      const str = format(date, 'yyyy-MM-dd');
      setSelectedDates(prev => prev.includes(str) ? prev : [...prev, str].sort());
      toast({ title: 'Date Added', description: format(date, 'PPP') });
    };

    const exportAsICS = (venue: MarriageVenue | null, dateStr?: string) => {
      if (!venue) return;
      const date = dateStr || (eventDate ? format(eventDate, 'yyyyMMdd') : '');
      const dtstart = date.replace(/-/g, '') + 'T100000';
      const dtend = date.replace(/-/g, '') + 'T180000';
      const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:${venue.id}@example.com\nDTSTAMP:${dtstart}Z\nDTSTART:${dtstart}\nDTEND:${dtend}\nSUMMARY:Visit ${venue.name}\nDESCRIPTION:${venue.description || ''}\nLOCATION:${venue.location || ''}\nEND:VEVENT\nEND:VCALENDAR`;
      const blob = new Blob([ics], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${venue.name.replace(/\s+/g, '_')}_${date}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };

    const filteredResults = useMemo(() => {
      if (!searchResults || searchResults.length === 0) return [] as MarriageVenue[];
      return searchResults.filter(v => {
        if (filterMinPrice !== undefined && (v.price === undefined || v.price < filterMinPrice)) return false;
        if (filterMaxPrice !== undefined && (v.price === undefined || v.price > filterMaxPrice)) return false;
        if (filterMinCapacity !== undefined && (v.capacity === undefined || v.capacity < filterMinCapacity)) return false;
        if (filterMinRating !== undefined && (v.rating === undefined || v.rating < filterMinRating)) return false;
        if (filterAmenities.length > 0) {
          const lowerAmenities = (v.amenities || []).map(a => a.toLowerCase());
          for (const am of filterAmenities) {
            if (!lowerAmenities.includes(am.toLowerCase())) return false;
          }
        }
        return true;
      });
    }, [searchResults, filterMinPrice, filterMaxPrice, filterMinCapacity, filterAmenities, filterMinRating]);

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
                {/* Hero Banner using provided image */}
                <div className="w-full rounded-md overflow-hidden">
                  <Image src="https://cdn.builder.io/api/v1/image/assets%2F5b228b6b40054b888eba91b5099174c2%2F98b07d6e0c3f4166a28c875e397ea5bc?format=webp&width=800" alt="Marriage Hall Banner" width={1200} height={260} className="w-full h-auto object-cover rounded-md" />
                </div>
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
                            <h2 className="text-lg font-semibold">{filteredResults.length} Venue{filteredResults.length !== 1 ? 's' : ''} Found</h2>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={() => setShowFilters(prev => !prev)} aria-pressed={showFilters}><Filter className="mr-1 h-4 w-4"/> {showFilters ? 'Hide Filters' : 'Filter'}</Button>
                              <Button variant="secondary" size="sm" onClick={() => setShowCartModal(true)} className="relative">
                                  <Wallet className="mr-1 h-4 w-4"/> Cart
                                  {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-destructive text-white rounded-full text-xs px-1">{cart.length}</span>}
                              </Button>
                            </div>
                        </div>
                         {showFilters && (
                           <Card className="mb-4 shadow-sm">
                             <CardContent>
                               <div className="grid grid-cols-2 gap-3">
                                 <div>
                                   <Label>Min Price (₹)</Label>
                                   <Input type="number" value={filterMinPrice ?? ''} onChange={(e) => setFilterMinPrice(e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 50000" />
                                 </div>
                                 <div>
                                   <Label>Max Price (₹)</Label>
                                   <Input type="number" value={filterMaxPrice ?? ''} onChange={(e) => setFilterMaxPrice(e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 300000" />
                                 </div>
                                 <div>
                                   <Label>Min Capacity</Label>
                                   <Input type="number" value={filterMinCapacity ?? ''} onChange={(e) => setFilterMinCapacity(e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 200" />
                                 </div>
                                 <div>
                                   <Label>Min Rating</Label>
                                   <Input type="number" step="0.1" min="0" max="5" value={filterMinRating ?? ''} onChange={(e) => setFilterMinRating(e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g., 4.0" />
                                 </div>
                                 <div className="col-span-2">
                                   <Label>Amenities (comma separated)</Label>
                                   <Input value={filterAmenities.join(', ')} onChange={(e) => setFilterAmenities(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="e.g., Parking, AC, Stage" />
                                 </div>
                               </div>
                               <div className="flex justify-end mt-3 gap-2">
                                 <Button variant="outline" onClick={() => { setFilterMinPrice(undefined); setFilterMaxPrice(undefined); setFilterMinCapacity(undefined); setFilterAmenities([]); setFilterMinRating(undefined); }}>Clear</Button>
                                 <Button onClick={() => setShowFilters(false)}>Apply</Button>
                               </div>
                             </CardContent>
                           </Card>
                         )}

                         {filteredResults.map(venue => (
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
                                          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 mt-2">
                                            <Button className="w-full sm:w-auto h-8" onClick={() => handleViewDetails(venue)}>View Details & Book</Button>
                                            <Button variant="ghost" className="w-full sm:w-10 h-8" onClick={() => toggleFavorite(venue.id)} aria-pressed={favorites.includes(venue.id)}>
                                                <Heart className={cn('h-5 w-5', favorites.includes(venue.id) ? 'text-red-500' : '')} />
                                            </Button>
                                            <Button variant="outline" className="w-full sm:w-auto h-8" onClick={() => addToCart(venue)}>
                                              Add to Cart
                                            </Button>
                                            <Button variant="ghost" className="w-full sm:w-auto h-8" onClick={() => window.open(`https://www.openstreetmap.org/search?query=${encodeURIComponent(venue.location || venue.name)}`, '_blank') }>
                                              <MapPin className="mr-1 h-4 w-4"/> Map
                                            </Button>
                                         </div>
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
                                    {/* Gallery */}
                                    {(() => {
                                        const images = (detailedVenueInfo.images && detailedVenueInfo.images.length > 0) ? detailedVenueInfo.images : [detailedVenueInfo.imageUrl || '/images/venues/default.jpg'];
                                        return (
                                          <div className="relative w-full h-48 rounded-md overflow-hidden">
                                            <Image src={images[galleryIndex] || '/images/venues/default.jpg'} alt={detailedVenueInfo.name} layout="fill" objectFit="cover" data-ai-hint="venue large image"/>
                                            {images.length > 1 && (
                                              <div className="absolute inset-0 flex items-center justify-between px-2">
                                                <Button variant="ghost" className="bg-black/30 text-white" onClick={() => setGalleryIndex(i => (i - 1 + images.length) % images.length)}>&lt;</Button>
                                                <Button variant="ghost" className="bg-black/30 text-white" onClick={() => setGalleryIndex(i => (i + 1) % images.length)}>&gt;</Button>
                                              </div>
                                            )}
                                          </div>
                                        );
                                    })()}

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
                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                           <div>
                                             <Label>Select a Date</Label>
                                             <div className="flex gap-2 items-center">
                                               <Popover>
                                                 <PopoverTrigger asChild>
                                                   <Button variant="outline" className={cn(!eventDate && 'text-muted-foreground')}><CalendarIcon className="mr-1"/>{eventDate ? format(eventDate,'PPP') : 'Pick'}</Button>
                                                 </PopoverTrigger>
                                                 <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={eventDate} onSelect={setEventDate} initialFocus disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}/></PopoverContent>
                                               </Popover>
                                               <Button onClick={() => addSelectedDate(eventDate)}>Add Date</Button>
                                             </div>
                                             <div className="text-xs text-muted-foreground mt-2">Selected Dates: {selectedDates.length === 0 ? 'None' : selectedDates.join(', ')}</div>
                                           </div>
                                           <div>
                                             <Label>Recurring Booking</Label>
                                             <div className="flex gap-2 items-center">
                                                <input id="recurring" type="checkbox" checked={recurring.enabled} onChange={(e) => setRecurring(r => ({...r, enabled: e.target.checked}))} />
                                                <select value={recurring.frequency || ''} onChange={(e) => setRecurring(r => ({...r, frequency: (e.target.value as any) || null}))} disabled={!recurring.enabled} className="ml-2">
                                                  <option value="">Frequency</option>
                                                  <option value="weekly">Weekly</option>
                                                  <option value="monthly">Monthly</option>
                                                </select>
                                                <input type="number" min={1} value={recurring.occurrences} onChange={(e) => setRecurring(r => ({...r, occurrences: Number(e.target.value) || 1}))} disabled={!recurring.enabled} className="w-20 ml-2" />
                                             </div>
                                             <div className="text-xs text-muted-foreground mt-2">When recurring is enabled, multiple bookings will be simulated (mock).</div>
                                           </div>
                                         </div>
                                         <div className="space-y-1">
                                            <Label htmlFor="book-specialRequests">Special Requests (Optional)</Label>
                                            <Textarea id="book-specialRequests" value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder="e.g., specific decor, dietary needs"/>
                                         </div>
                                          {detailedVenueInfo.price > 0 && (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3"/> A booking fee/advance of ₹{detailedVenueInfo.price.toLocaleString()} may be applicable.</p>
                                          )}

                                          <div className="flex gap-2 mt-2">
                                            <Button onClick={() => { if (selectedDates.length>0) { selectedDates.forEach(d => addToCart(detailedVenueInfo, d)); } else addToCart(detailedVenueInfo); }}>Add Selected Dates to Cart</Button>
                                            <Button variant="outline" onClick={() => exportAsICS(detailedVenueInfo, selectedDates[0])}>Export .ics</Button>
                                            <Button variant="ghost" onClick={() => window.location.href = `mailto:${detailedVenueInfo.contactEmail || ''}?subject=Inquiry about ${encodeURIComponent(detailedVenueInfo.name)}` }><Mail className="mr-1"/>Contact</Button>
                                            <Button variant="ghost" onClick={() => window.navigator && (window.navigator as any).clipboard?.writeText(detailedVenueInfo.contactPhone || '')}><Phone className="mr-1"/>Copy Phone</Button>
                                          </div>

                                          {/* Reviews */}
                                          <Separator />
                                          <div>
                                            <h4 className="font-semibold">Reviews</h4>
                                            {(detailedVenueInfo.reviews && detailedVenueInfo.reviews.length>0) ? (
                                              detailedVenueInfo.reviews.map((r:any, idx:number) => (
                                                <div key={idx} className="text-sm mt-2">
                                                  <div className="flex items-center gap-2"><UserCircle className="h-5 w-5"/><strong>{r.user}</strong> <span className="text-xs text-muted-foreground">• {r.rating}/5</span></div>
                                                  <p className="text-xs text-muted-foreground">{r.comment}</p>
                                                </div>
                                              ))
                                            ) : (
                                              <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
                                            )}
                                          </div>

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

                <Dialog open={showCartModal} onOpenChange={setShowCartModal}>
                  <DialogContent className="sm:max-w-[600px]"><DialogHeader><DialogTitle>Your Booking Cart</DialogTitle><DialogDescription>Review items and checkout (mock).</DialogDescription></DialogHeader>
                    <div className="py-2">
                      {cart.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Your cart is empty.</p>
                      ) : (
                        <div className="space-y-2">
                          {cart.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">Date: {item.date}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">₹{(item.amount || 0).toLocaleString()}</p>
                                <Button variant="ghost" size="sm" onClick={() => removeFromCart(idx)}>Remove</Button>
                              </div>
                            </div>
                          ))}
                          <Separator />
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2"><Input placeholder="Promo code" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} /><Button onClick={applyPromo}>Apply</Button></div>
                            <div>
                              <p className="text-sm">Total: ₹{cart.reduce((s,c)=>s+(c.amount||0),0).toLocaleString()}</p>
                              {appliedPromo && <p className="text-xs text-green-600">{appliedPromo.code} applied ({appliedPromo.discountPct}%)</p>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter className="sm:justify-between">
                      <Button variant="outline" onClick={() => setShowCartModal(false)}>Continue Shopping</Button>
                      <Button onClick={checkoutMock} disabled={cart.length===0}>Pay Now (Mock)</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

      </main>
        </div>
    );
}
