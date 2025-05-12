
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input"; // Added Input
import { Label } from "@/components/ui/label"; // Added Label
import { ArrowLeft, Map, CalendarDays, Users, Info, Wallet, Loader2, Check } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import Image from 'next/image';
import { mockTempleEventsData } from '@/mock-data'; // Import centralized mock data

export interface TempleEvent { // Export for mock data file
    id: string;
    name: string;
    description: string;
    location: string;
    startDate: Date;
    endDate: Date;
    pricePerPerson?: number;
    imageUrl: string;
    category: 'Yatra' | 'Special Pooja' | 'Festival' | 'Cultural Program';
    bookingRequired: boolean;
    slotsAvailable?: number;
}

export default function TempleEventsPage() {
    const [events] = useState<TempleEvent[]>(mockTempleEventsData);
    const [selectedEvent, setSelectedEvent] = useState<TempleEvent | null>(null);
    const [numberOfPersons, setNumberOfPersons] = useState<number>(1);
    const [isBooking, setIsBooking] = useState(false);
    const { toast } = useToast();

    const handleBookEvent = (event: TempleEvent) => {
        if (!event.bookingRequired) {
             toast({ title: "Booking Not Required", description: "You can attend this event directly." });
             return;
        }
         if (event.slotsAvailable !== undefined && event.slotsAvailable <= 0) {
             toast({ variant: "destructive", title: "Sold Out", description: "No slots available for this event." });
             return;
         }
        setSelectedEvent(event);
        setNumberOfPersons(1);
    };

    const handleConfirmBooking = async () => {
         if (!selectedEvent || numberOfPersons <= 0) return;
         if (selectedEvent.slotsAvailable !== undefined && numberOfPersons > selectedEvent.slotsAvailable) {
             toast({ variant: "destructive", title: "Not Enough Slots", description: `Only ${selectedEvent.slotsAvailable} slots remaining.` });
             return;
         }

        const totalAmount = (selectedEvent.pricePerPerson || 0) * numberOfPersons;

        setIsBooking(true);
        console.log("Booking Event:", {
            eventId: selectedEvent.id,
            eventName: selectedEvent.name,
            persons: numberOfPersons,
            totalAmount
        });
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast({ title: "Event Booking Confirmed!", description: `Successfully booked ${numberOfPersons} place(s) for ${selectedEvent.name}.` });
            setSelectedEvent(null);
        } catch (error) {
            console.error("Event booking failed:", error);
            toast({ variant: "destructive", title: "Booking Failed" });
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/temple" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Map className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Temple Events &amp; Yatras</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                 {events.map((event) => (
                    <Card key={event.id} className="shadow-md overflow-hidden">
                         <div className="relative w-full h-40">
                             <Image src={event.imageUrl || '/images/events/default.jpg'} alt={event.name} layout="fill" objectFit="cover" data-ai-hint="temple event yatra pilgrimage"/>
                             <div className="absolute top-2 right-2 bg-background/80 text-foreground text-xs px-2 py-0.5 rounded-full font-medium">{event.category}</div>
                         </div>
                        <CardHeader>
                             <CardTitle>{event.name}</CardTitle>
                             <CardDescription className="text-xs text-muted-foreground">{event.location}</CardDescription>
                         </CardHeader>
                         <CardContent className="space-y-2">
                             <p className="text-sm">{event.description}</p>
                             <div className="text-xs text-muted-foreground space-y-1">
                                 <p className="flex items-center gap-1"><CalendarDays className="h-3 w-3"/> Dates: {format(event.startDate, 'PPP')} - {format(event.endDate, 'PPP')}</p>
                                 {event.pricePerPerson !== undefined && <p className="flex items-center gap-1"><Wallet className="h-3 w-3"/> Price: ₹{event.pricePerPerson}/person</p>}
                                 {event.slotsAvailable !== undefined && <p className="flex items-center gap-1"><Users className="h-3 w-3"/> Slots Left: {event.slotsAvailable > 0 ? event.slotsAvailable : 'Sold Out'}</p>}
                             </div>
                              {event.bookingRequired ? (
                                 <Button className="w-full mt-3" onClick={() => handleBookEvent(event)} disabled={(event.slotsAvailable !== undefined && event.slotsAvailable <= 0) || isBooking}>
                                     {isBooking && selectedEvent?.id === event.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                     {event.slotsAvailable !== undefined && event.slotsAvailable <= 0 ? 'Sold Out' : (isBooking && selectedEvent?.id === event.id ? 'Processing...' : 'Book Now')}
                                 </Button>
                             ) : (
                                 <Button variant="outline" className="w-full mt-3" disabled>Booking Not Required</Button>
                             )}
                         </CardContent>
                    </Card>
                 ))}

                 {events.length === 0 && (
                     <Card className="shadow-md text-center">
                        <CardContent className="p-6">
                             <Map className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                             <p className="text-muted-foreground">No upcoming events or yatras found.</p>
                        </CardContent>
                     </Card>
                 )}

                 {selectedEvent && (
                     <Card className="shadow-lg border-primary mt-6 fixed bottom-4 left-4 right-4 z-50 bg-background p-4 rounded-lg animate-in slide-in-from-bottom-10 fade-in-50 duration-300">
                         <CardHeader className="p-0 pb-3">
                             <CardTitle className="text-lg">Book: {selectedEvent.name}</CardTitle>
                             <CardDescription>Confirm number of persons and proceed.</CardDescription>
                         </CardHeader>
                         <CardContent className="p-0 pb-3 space-y-3">
                             <div className="space-y-1">
                                 <Label htmlFor="event-persons">Number of Persons</Label>
                                 <Input
                                    id="event-persons"
                                    type="number"
                                    min="1"
                                    max={selectedEvent.slotsAvailable || 10}
                                    value={numberOfPersons}
                                    onChange={(e) => setNumberOfPersons(Number(e.target.value))}
                                />
                             </div>
                              {selectedEvent.pricePerPerson !== undefined && (
                                <div className="flex justify-between items-center text-sm font-semibold">
                                    <span>Total Amount:</span>
                                    <span>₹{((selectedEvent.pricePerPerson || 0) * numberOfPersons).toFixed(2)}</span>
                                </div>
                              )}
                         </CardContent>
                         <div className="flex gap-2">
                             <Button variant="outline" className="flex-1" onClick={() => setSelectedEvent(null)}>Cancel</Button>
                             <Button className="flex-1 bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={isBooking} onClick={handleConfirmBooking}>
                                 {isBooking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                 {isBooking ? 'Processing...' : 'Confirm Booking'}
                             </Button>
                         </div>
                     </Card>
                 )}
            </main>
        </div>
    );
}
