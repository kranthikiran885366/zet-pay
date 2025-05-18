'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, TicketCheck, Search, Loader2, Bus, MapPin, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { mockReservationStatusData, ReservationStatus } from '@/mock-data/liveTracking';

export default function TrackReservationPage() {
    const { toast } = useToast();
    const [reservationId, setReservationId] = useState('');
    const [reservationStatusResult, setReservationStatusResult] = useState<ReservationStatus | null>(null);
    const [isLoadingReservationStatus, setIsLoadingReservationStatus] = useState(false);

    const handleTrackReservation = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!reservationId.trim()) {
            toast({ variant: "destructive", title: "Enter Reservation ID" });
            return;
        }
        setIsLoadingReservationStatus(true);
        setReservationStatusResult(null);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
            const result = mockReservationStatusData[reservationId.trim()];
            if (result) {
                setReservationStatusResult(result);
            } else {
                toast({ variant: "destructive", title: "Reservation Not Found", description: "No details found for this reservation ID." });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error Fetching Status", description: "Could not retrieve reservation status." });
        } finally {
            setIsLoadingReservationStatus(false);
        }
    };

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-2 shadow-md">
                <Link href="/live/bus" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <TicketCheck className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Track by Reservation ID</h1>
            </header>

            <main className="flex-grow p-4 space-y-4">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Track Your Booked Bus</CardTitle>
                        <CardDescription>Enter your PNR or Ticket ID to find its current status.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleTrackReservation} className="space-y-4 pt-2">
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    placeholder="Enter Reservation/Ticket ID"
                                    value={reservationId}
                                    onChange={e => setReservationId(e.target.value)}
                                    required
                                    className="h-10"
                                />
                                <Button type="submit" disabled={isLoadingReservationStatus} className="h-10 px-3">
                                    {isLoadingReservationStatus ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {isLoadingReservationStatus && <div className="flex justify-center py-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}
                
                {reservationStatusResult && (
                    <Card className="shadow-lg p-4 mt-4 border border-primary/30">
                        <CardTitle className="text-md mb-2">Reservation Status: {reservationStatusResult.reservationId}</CardTitle>
                        <div className="text-sm space-y-1">
                            <p><strong>Passenger:</strong> {reservationStatusResult.passengerName}</p>
                            <p><strong>Operator:</strong> {reservationStatusResult.operator}</p>
                            <p><strong>Route:</strong> {reservationStatusResult.from} to {reservationStatusResult.to}</p>
                            <p><strong>Date:</strong> {reservationStatusResult.journeyDate}</p>
                            <p><strong>Bus No:</strong> {reservationStatusResult.busNumber || 'Not Available'}</p>
                            <p className="mt-2 flex items-center gap-1.5"><Clock className="h-4 w-4 text-muted-foreground"/><strong>Current Status:</strong> <span className="font-semibold text-primary">{reservationStatusResult.currentStatus}</span></p>
                            <p className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted-foreground"/><strong>Location:</strong> {reservationStatusResult.liveLocation}</p>
                            <p><strong>ETA Destination:</strong> {reservationStatusResult.etaDestination}</p>
                        </div>
                    </Card>
                )}
                 {!isLoadingReservationStatus && !reservationStatusResult && reservationId && (
                    <Card className="mt-4 text-center">
                        <CardContent className="p-6">
                             <TicketCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3"/>
                             <p className="text-muted-foreground">No reservation found for ID: {reservationId}.</p>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
