
'use client';

import { useState, useEffect } from 'react'; // Added useEffect
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, CalendarIcon, Search, Loader2, Sparkles, Wallet, User } from 'lucide-react';
import Link from 'next/link';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { mockTemplesData, mockPoojasData } from '@/mock-data'; // Import centralized mock data

export interface PoojaDetails { // Export for mock data file
    id: string;
    name: string;
    description: string;
    price: number;
    duration: string;
}

export default function VirtualPoojaPage() {
    const [selectedTemple, setSelectedTemple] = useState<string>('');
    const [availablePoojas, setAvailablePoojas] = useState<PoojaDetails[]>([]);
    const [selectedPooja, setSelectedPooja] = useState<PoojaDetails | null>(null);
    const [poojaDate, setPoojaDate] = useState<Date | undefined>(new Date());
    const [devoteeName, setDevoteeName] = useState<string>('');
    const [gotra, setGotra] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isBooking, setIsBooking] = useState(false);
    const { toast } = useToast();

    useEffect(() => { // Changed useState to useEffect
        if (selectedTemple) {
            setIsLoading(true);
            setSelectedPooja(null);
            setTimeout(() => {
                setAvailablePoojas(mockPoojasData[selectedTemple] || []);
                setIsLoading(false);
            }, 500);
        } else {
            setAvailablePoojas([]);
            setSelectedPooja(null);
        }
    }, [selectedTemple]);


    const handlePoojaSelect = (pooja: PoojaDetails) => {
        setSelectedPooja(pooja);
    }

    const handleConfirmBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPooja || !selectedTemple || !poojaDate || !devoteeName) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select pooja, date, and enter devotee name." });
            return;
        }

        setIsBooking(true);
        console.log("Confirming Virtual Pooja Booking:", {
            temple: selectedTemple,
            pooja: selectedPooja.name,
            date: format(poojaDate, 'yyyy-MM-dd'),
            devoteeName,
            gotra,
            amount: selectedPooja.price
        });
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            toast({ title: "Pooja Booked Successfully!", description: `${selectedPooja.name} booked for ${devoteeName} on ${format(poojaDate, 'PPP')}.` });
            setSelectedPooja(null);
            setDevoteeName('');
            setGotra('');
        } catch (error) {
            console.error("Pooja booking failed:", error);
            toast({ variant: "destructive", title: "Booking Failed" });
        } finally {
            setIsBooking(false);
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
                <Sparkles className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Virtual Pooja Booking</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Book a Virtual Pooja</CardTitle>
                        <CardDescription>Participate in sacred rituals remotely.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleConfirmBooking} className="space-y-4">
                             <div className="space-y-1">
                                <Label htmlFor="temple">Select Temple</Label>
                                <Select value={selectedTemple} onValueChange={setSelectedTemple} required>
                                    <SelectTrigger id="temple"><SelectValue placeholder="Select Temple" /></SelectTrigger>
                                    <SelectContent>
                                        {mockTemplesData.map(temple => <SelectItem key={temple.id} value={temple.id}>{temple.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                             {selectedTemple && (
                                <div className="space-y-1">
                                    <Label htmlFor="pooja">Select Pooja Service</Label>
                                    {isLoading && <p className="text-sm text-muted-foreground">Loading poojas...</p>}
                                    {!isLoading && availablePoojas.length === 0 && <p className="text-sm text-muted-foreground">No virtual poojas available for this temple.</p>}
                                    {!isLoading && availablePoojas.length > 0 && (
                                        <Select value={selectedPooja?.id || ''} onValueChange={(poojaId) => handlePoojaSelect(availablePoojas.find(p => p.id === poojaId)!)} required>
                                            <SelectTrigger id="pooja"><SelectValue placeholder="Select Pooja" /></SelectTrigger>
                                            <SelectContent>
                                                {availablePoojas.map(pooja => <SelectItem key={pooja.id} value={pooja.id}>{pooja.name} (₹{pooja.price}) - {pooja.duration}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            )}
                             {selectedPooja && <p className="text-xs text-muted-foreground pl-1">{selectedPooja.description}</p>}

                            {selectedPooja && (
                                <div className="space-y-1">
                                    <Label htmlFor="poojaDate">Select Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button id="poojaDate" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !poojaDate && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {poojaDate ? format(poojaDate, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={poojaDate} onSelect={setPoojaDate} initialFocus disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}/>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            )}

                            {selectedPooja && poojaDate && (
                                <>
                                    <Separator/>
                                    <div className="space-y-1">
                                        <Label htmlFor="devoteeName">Devotee Name</Label>
                                        <Input id="devoteeName" placeholder="Enter name for Pooja Sankalpam" value={devoteeName} onChange={(e) => setDevoteeName(e.target.value)} required/>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="gotra">Gotra (Optional)</Label>
                                        <Input id="gotra" placeholder="Enter Gotra if applicable" value={gotra} onChange={(e) => setGotra(e.target.value)}/>
                                    </div>
                                    <Separator/>
                                     <div className="flex justify-between items-center text-sm">
                                         <span className="text-muted-foreground">Total Pooja Amount:</span>
                                         <span className="font-bold text-lg">₹{selectedPooja.price.toFixed(2)}</span>
                                     </div>
                                    <Button type="submit" className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={isBooking || !devoteeName}>
                                        {isBooking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                        {isBooking ? 'Processing...' : 'Book Pooja Now'}
                                    </Button>
                                </>
                             )}
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
