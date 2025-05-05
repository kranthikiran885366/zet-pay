'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarIcon, Search, Loader2, Users, CalendarCheck, Wallet, Clock, Ticket } from 'lucide-react';
import Link from 'next/link';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { searchDarshanSlots as searchSlotsApi, bookDarshanSlot as bookSlotApi } from '@/services/temple'; // Use API service

// Mock Data (Keep for fallback or UI structure, API is primary)
const mockTemples = [
    { id: 'tirupati', name: 'Tirumala Tirupati Devasthanams (TTD)' },
    { id: 'shirdi', name: 'Shirdi Saibaba Sansthan Trust' },
    { id: 'vaishno-devi', name: 'Vaishno Devi Shrine Board' },
    { id: 'sabarimala', name: 'Sabarimala Temple' },
];

export interface DarshanSlot { // Export interface for API service consistency
    time: string; // e.g., "08:00 AM - 09:00 AM"
    availability: 'Available' | 'Filling Fast' | 'Full';
    quota: string; // e.g., "Free", "Special Entry (₹300)", "VIP"
    ticketsLeft?: number;
}

export default function DarshanBookingPage() {
    const [selectedTemple, setSelectedTemple] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [availableSlots, setAvailableSlots] = useState<DarshanSlot[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<DarshanSlot | null>(null);
    const [numberOfPersons, setNumberOfPersons] = useState<number>(1);
    const [isBooking, setIsBooking] = useState(false);
    const { toast } = useToast();

    const handleSearchSlots = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!selectedTemple || !selectedDate) {
            toast({ variant: "destructive", title: "Please select Temple and Date" });
            return;
        }
        setIsLoading(true);
        setSelectedSlot(null); // Reset selection
        setAvailableSlots([]); // Clear previous slots
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        console.log("Searching slots via API:", { selectedTemple, date: dateString });
        try {
            const slots = await searchSlotsApi(selectedTemple, dateString);
            setAvailableSlots(slots);
            if (slots.length === 0) {
                toast({ description: "No darshan slots found for the selected date." });
            }
        } catch (error: any) {
            console.error("Slot search failed:", error);
            toast({ variant: "destructive", title: "Search Failed", description: error.message || "Could not fetch available slots." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSlotSelect = (slot: DarshanSlot) => {
        if (slot.availability === 'Full') {
            toast({ description: "This slot is full." });
            return;
        }
        setSelectedSlot(slot);
    }

    const handleConfirmBooking = async () => {
        if (!selectedSlot || !selectedTemple || !selectedDate || numberOfPersons <= 0) {
            toast({ variant: "destructive", title: "Booking Error", description: "Please ensure slot, temple, date, and number of persons are selected." });
            return;
        }

        // Extract price if present in quota string (basic extraction)
        const quotaPriceMatch = selectedSlot.quota.match(/₹(\d+)/);
        const pricePerPerson = quotaPriceMatch ? parseInt(quotaPriceMatch[1], 10) : 0;
        const totalAmount = pricePerPerson * numberOfPersons;
        const templeName = mockTemples.find(t => t.id === selectedTemple)?.name || selectedTemple; // Get temple name for API

        setIsBooking(true);
        const bookingDetails = {
            templeId: selectedTemple,
            templeName: templeName,
            date: format(selectedDate, 'yyyy-MM-dd'),
            slotTime: selectedSlot.time,
            quota: selectedSlot.quota,
            persons: numberOfPersons,
            totalAmount
        };
        console.log("Confirming Darshan Booking via API:", bookingDetails);
        try {
            // Use the imported API function
            const result = await bookSlotApi(bookingDetails);
            if (result.success) {
                toast({ title: "Booking Confirmed!", description: `Booked ${numberOfPersons} slot(s) for ${selectedSlot.time} (${selectedSlot.quota}). Total: ₹${totalAmount}` });
                // Reset or navigate
                setSelectedSlot(null);
                setAvailableSlots([]);
                // router.push(`/temple/access?bookingId=${result.bookingId}`); // Example redirect to access pass page
            } else {
                 throw new Error(result.message || "Booking failed on server.");
            }
        } catch (error: any) {
            console.error("Booking failed:", error);
            toast({ variant: "destructive", title: "Booking Failed", description: error.message || "Could not complete booking." });
        } finally {
            setIsBooking(false);
        }
    }

     const getAvailabilityColor = (availability: DarshanSlot['availability']) => {
        switch (availability) {
            case 'Available': return 'text-green-600';
            case 'Filling Fast': return 'text-orange-600';
            case 'Full': return 'text-red-600';
            default: return 'text-muted-foreground';
        }
    }

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/temple" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <CalendarCheck className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Book Darshan Slot</h1>
            </header>

            {/* Search Form */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Find Darshan Slots</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearchSlots} className="space-y-4">
                            {/* Temple Selection */}
                             <div className="space-y-1">
                                <Label htmlFor="temple">Select Temple</Label>
                                <Select value={selectedTemple} onValueChange={setSelectedTemple} required>
                                    <SelectTrigger id="temple"><SelectValue placeholder="Select Temple" /></SelectTrigger>
                                    <SelectContent>
                                        {mockTemples.map(temple => <SelectItem key={temple.id} value={temple.id}>{temple.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Date Selection */}
                             <div className="space-y-1">
                                <Label htmlFor="darshanDate">Select Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="darshanDate" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}/>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                {isLoading ? 'Searching...' : 'Search Slots'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Slot Results */}
                {!isLoading && availableSlots.length > 0 && (
                    <Card className="shadow-md mt-4">
                        <CardHeader>
                            <CardTitle>Available Slots for {format(selectedDate!, 'PPP')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                             {availableSlots.map((slot, index) => (
                                <Card
                                    key={index}
                                    className={cn(
                                        "p-3 cursor-pointer hover:bg-accent transition-colors border",
                                        selectedSlot?.time === slot.time && selectedSlot?.quota === slot.quota ? "border-primary ring-1 ring-primary" : "",
                                        slot.availability === 'Full' && "opacity-50 cursor-not-allowed"
                                    )}
                                    onClick={() => handleSlotSelect(slot)}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold flex items-center gap-1"><Clock className="h-4 w-4"/> {slot.time}</p>
                                            <p className="text-sm text-muted-foreground">{slot.quota}</p>
                                        </div>
                                        <div className="text-right">
                                             <Badge variant={slot.availability === 'Available' ? 'default' : slot.availability === 'Filling Fast' ? 'secondary' : 'destructive'} className={cn(getAvailabilityColor(slot.availability), slot.availability === 'Available' ? 'bg-green-100' : slot.availability === 'Filling Fast' ? 'bg-orange-100' : 'bg-red-100' )}>
                                                {slot.availability}
                                            </Badge>
                                            {slot.ticketsLeft !== undefined && <p className="text-xs text-muted-foreground mt-1">{slot.ticketsLeft} tickets left</p>}
                                        </div>
                                    </div>
                                </Card>
                             ))}
                        </CardContent>
                    </Card>
                )}

                 {/* Booking Confirmation Section */}
                {selectedSlot && (
                    <Card className="shadow-md mt-4">
                         <CardHeader>
                             <CardTitle>Confirm Booking</CardTitle>
                             <CardDescription>
                                 You have selected the {selectedSlot.time} slot under the "{selectedSlot.quota}" quota.
                             </CardDescription>
                         </CardHeader>
                        <CardContent className="space-y-4">
                             <Separator/>
                            <div className="space-y-2">
                                <Label htmlFor="persons">Number of Persons</Label>
                                <Input
                                    id="persons"
                                    type="number"
                                    min="1"
                                    max="10" // Set a reasonable max
                                    value={numberOfPersons}
                                    onChange={(e) => setNumberOfPersons(Number(e.target.value))}
                                />
                            </div>
                             {/* Display Total Amount */}
                            {selectedSlot.quota.includes('₹') && (
                                <div className="flex justify-between items-center text-sm">
                                     <span className="text-muted-foreground">Total Amount:</span>
                                     <span className="font-bold text-lg">
                                        ₹{( (parseInt(selectedSlot.quota.match(/₹(\d+)/)?.[1] || '0', 10)) * numberOfPersons).toFixed(2)}
                                     </span>
                                </div>
                            )}

                             <Button className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={isBooking} onClick={handleConfirmBooking}>
                                {isBooking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ticket className="mr-2 h-4 w-4" />}
                                {isBooking ? 'Booking...' : 'Confirm and Pay'}
                            </Button>
                        </CardContent>
                    </Card>
                )}

            </main>
        </div>
    );
}

