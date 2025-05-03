'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Map, CalendarDays, Users, Info, Wallet, Loader2, Check } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import Image from 'next/image';

// Mock Data (Replace with actual API calls)
interface TempleEvent {
    id: string;
    name: string;
    description: string;
    location: string;
    startDate: Date;
    endDate: Date;
    pricePerPerson?: number; // Optional price
    imageUrl: string;
    category: 'Yatra' | 'Special Pooja' | 'Festival' | 'Cultural Program';
    bookingRequired: boolean;
    slotsAvailable?: number;
}

const mockEvents: TempleEvent[] = [
    {
        id: 'event1', name: 'Vaishno Devi Yatra Package', description: 'Guided pilgrimage tour including travel and accommodation.', location: 'Jammu & Kashmir', startDate: new Date(2024, 8, 10), endDate: new Date(2024, 8, 15), pricePerPerson: 15000, imageUrl: '/images/events/vaishno_devi_yatra.jpg', category: 'Yatra', bookingRequired: true, slotsAvailable: 50
    },
    {
        id: 'event2', name: 'Diwali Special Lakshmi Pooja at Tirupati', description: 'Participate in the grand Lakshmi Pooja during Diwali.', location: 'Tirupati', startDate: new Date(2024, 10, 1), endDate: new Date(2024, 10, 1), pricePerPerson: 1500, imageUrl: '/images/events/diwali_pooja.jpg', category: 'Special Pooja', bookingRequired: true, slotsAvailable: 100
    },
    {
        id: 'event3', name: 'Shirdi Ram Navami Celebrations', description: 'Join the special celebrations and processions.', location: 'Shirdi', startDate: new Date(2025, 3, 10), endDate: new Date(2025, 3, 12), imageUrl: '/images/events/ram_navami.jpg', category: 'Festival', bookingRequired: false
    },
];

export default function TempleEventsPage() {
    const [events] = useState<TempleEvent[]>(mockEvents); // Replace with fetched data
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
        setNumberOfPersons(1); // Reset persons count
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
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast({ title: "Event Booking Confirmed!", description: `Successfully booked ${numberOfPersons} place(s) for ${selectedEvent.name}.` });
            setSelectedEvent(null); // Close booking section
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
                                 <Button className="w-full mt-3" onClick={() => handleBookEvent(event)} disabled={event.slotsAvailable !== undefined && event.slotsAvailable <= 0}>
                                     {event.slotsAvailable !== undefined && event.slotsAvailable <= 0 ? 'Sold Out' : 'Book Now'}
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


                 {/* Booking Confirmation Section (Simplified Modal/Inline) */}
                 {selectedEvent && (
                     <Card className="shadow-lg border-primary mt-6 fixed bottom-4 left-4 right-4 z-50 bg-background p-4 rounded-lg animate-in slide-in-from-bottom-10 fade-in-50 duration-300">
                         <CardHeader className="p-0 pb-3">
                             <CardTitle className="text-lg">Book: {selectedEvent.name}</CardTitle>
                             <CardDescription>Confirm number of persons and proceed.</CardDescription>
                         </CardHeader>
                         <CardContent className="p-0 pb-3 space-y-3">
                             <div className="space-y-1">
                                 &lt;Label htmlFor="event-persons"&gt;Number of Persons&lt;/Label&gt;
                                 &lt;Input
                                    id="event-persons"
                                    type="number"
                                    min="1"
                                    max={selectedEvent.slotsAvailable || 10} // Max is available slots or a default
                                    value={numberOfPersons}
                                    onChange={(e) => setNumberOfPersons(Number(e.target.value))}
                                /&gt;
                             &lt;/div&gt;
                              {selectedEvent.pricePerPerson !== undefined && (
                                <div className="flex justify-between items-center text-sm font-semibold">
                                    <span>Total Amount:</span>
                                    <span>₹{((selectedEvent.pricePerPerson || 0) * numberOfPersons).toFixed(2)}</span>
                                </div>
                              )}
                         </CardContent>
                         <div className="flex gap-2">
                             &lt;Button variant="outline" className="flex-1" onClick={() => setSelectedEvent(null)}&gt;Cancel&lt;/Button&gt;
                             &lt;Button className="flex-1 bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={isBooking} onClick={handleConfirmBooking}&gt;
                                 {isBooking ? &lt;Loader2 className="mr-2 h-4 w-4 animate-spin" /&gt; : &lt;Check className="mr-2 h-4 w-4" /&gt;}
                                 {isBooking ? 'Processing...' : 'Confirm Booking'}
                             &lt;/Button&gt;
                         </div>
                     &lt;/Card&gt;
                 )}
            </main>
        </div>
    );
}

// Helper function to format date (already imported from date-fns)
// import { format } from 'date-fns';
