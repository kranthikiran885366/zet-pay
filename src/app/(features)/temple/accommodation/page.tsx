
'use client';

import { useState, useEffect } from 'react'; // Added useEffect
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Hotel, Star, Loader2, Info, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Separator } from '@/components/ui/separator'; // Added Separator
import { mockTemplesData, mockAccommodationsData } from '@/mock-data'; // Import centralized mock data

export interface Accommodation { // Export for mock data file
    id: string;
    name: string;
    type: 'Dormitory' | 'Guest House' | 'Private Hotel' | 'Trust Accommodation';
    distance: string;
    priceRange: string;
    rating?: number;
    imageUrl: string;
    bookingLink?: string;
    contact?: string;
}

export default function TempleAccommodationPage() {
    const [selectedTemple, setSelectedTemple] = useState<string>('');
    const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => { // Changed useState to useEffect
        if (selectedTemple) {
            setIsLoading(true);
            setAccommodations([]);
            setTimeout(() => {
                const results = mockAccommodationsData[selectedTemple] || [];
                setAccommodations(results);
                 if (results.length === 0) {
                     toast({ description: "Accommodation info not available for this temple yet." });
                 }
                setIsLoading(false);
            }, 800);
        } else {
            setAccommodations([]);
        }
    }, [selectedTemple, toast]); // Added toast to dependency array

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/temple" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Hotel className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Nearby Accommodation</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                 <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Find Accommodation Near Temple</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <Select value={selectedTemple} onValueChange={setSelectedTemple} required>
                            <SelectTrigger id="temple"><SelectValue placeholder="Select Temple" /></SelectTrigger>
                            <SelectContent>
                                {mockTemplesData.map(temple => <SelectItem key={temple.id} value={temple.id}>{temple.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </CardContent>
                 </Card>

                 {isLoading && (
                     <div className="flex justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                 )}

                 {!isLoading && selectedTemple && accommodations.length === 0 && (
                     <Card className="shadow-md text-center">
                         <CardContent className="p-6">
                             <Hotel className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                             <p className="text-muted-foreground">No accommodation listings found for this temple.</p>
                         </CardContent>
                     </Card>
                 )}

                 {!isLoading && accommodations.length > 0 && (
                    <div className="space-y-4">
                         {accommodations.map((accom) => (
                            <Card key={accom.id} className="shadow-sm overflow-hidden">
                                 <div className="flex flex-col sm:flex-row">
                                     <div className="relative w-full sm:w-1/3 h-32 sm:h-auto">
                                        <Image src={accom.imageUrl || '/images/accom/default.jpg'} alt={accom.name} layout="fill" objectFit="cover" data-ai-hint="hotel building accommodation exterior interior"/>
                                    </div>
                                    <div className="flex-grow p-3">
                                         <CardTitle className="text-base">{accom.name}</CardTitle>
                                         <CardDescription className="text-xs mb-1">{accom.type}</CardDescription>
                                        <Separator className="my-1"/>
                                         <div className="text-xs text-muted-foreground space-y-0.5">
                                            <p className="flex items-center gap-1"><MapPin className="h-3 w-3"/> {accom.distance}</p>
                                            <p>Price: <span className="font-medium text-foreground">{accom.priceRange}</span></p>
                                             {accom.rating && <p className="flex items-center gap-1">Rating: <Star className="h-3 w-3 text-yellow-500 fill-current"/> {accom.rating}/5</p>}
                                             {accom.contact && <p>Contact: {accom.contact}</p>}
                                         </div>
                                         {accom.bookingLink && (
                                             <Button size="sm" asChild className="mt-2 w-full sm:w-auto">
                                                 <a href={accom.bookingLink} target="_blank" rel="noopener noreferrer">Book / View Details</a>
                                             </Button>
                                         )}
                                    </div>
                                </div>
                            </Card>
                         ))}
                    </div>
                 )}
            </main>
        </div>
    );
}
