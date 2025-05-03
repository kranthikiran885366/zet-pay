'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Hotel, Star, Loader2, Info, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';

// Mock Data (Replace with actual API calls or integration)
const mockTemples = [ // Reuse or fetch centrally
    { id: 'tirupati', name: 'Tirumala Tirupati Devasthanams (TTD)' },
    { id: 'shirdi', name: 'Shirdi Saibaba Sansthan Trust' },
    { id: 'vaishno-devi', name: 'Vaishno Devi Shrine Board' },
];

interface Accommodation {
    id: string;
    name: string;
    type: 'Dormitory' | 'Guest House' | 'Private Hotel' | 'Trust Accommodation';
    distance: string; // e.g., "500m from Temple", "2km from Katra Base Camp"
    priceRange: string; // e.g., "₹500 - ₹1500", "₹100 per bed"
    rating?: number;
    imageUrl: string;
    bookingLink?: string; // Link to official booking portal or third-party site
    contact?: string;
}

const mockAccommodations: { [templeId: string]: Accommodation[] } = {
    'tirupati': [
        { id: 'ttd-accom1', name: 'Srinivasam Complex', type: 'Trust Accommodation', distance: '1km from Tirupati Rly Stn', priceRange: '₹200 - ₹1000', imageUrl: '/images/accom/tirupati_srinivasam.jpg', bookingLink: 'https://tirupatibalaji.ap.gov.in/', contact: 'TTD Call Center' },
        { id: 'ttd-accom2', name: 'Madhavam Guest House', type: 'Trust Accommodation', distance: 'Near Bus Stand', priceRange: '₹800 - ₹1500', imageUrl: '/images/accom/tirupati_madhavam.jpg', bookingLink: 'https://tirupatibalaji.ap.gov.in/' },
        { id: 'hotel1', name: 'Hotel Bliss Tirupati', type: 'Private Hotel', distance: '1.5km from Temple', priceRange: '₹3000+', rating: 4.5, imageUrl: '/images/accom/hotel_bliss.jpg' },
    ],
    'shirdi': [
        { id: 'shirdi-accom1', name: 'Sai Ashram Bhaktiniwas', type: 'Trust Accommodation', distance: '1km from Temple', priceRange: '₹100 - ₹500 (Dorm/Room)', imageUrl: '/images/accom/shirdi_sai_ashram.jpg', bookingLink: 'https://online.sai.org.in/' },
        { id: 'shirdi-hotel1', name: 'Sun-n-Sand Shirdi', type: 'Private Hotel', distance: '500m from Temple', priceRange: '₹4000+', rating: 4.8, imageUrl: '/images/accom/shirdi_sunnsand.jpg' },
    ],
    'vaishno-devi': [
         { id: 'vd-accom1', name: 'Niharika Bhawan, Katra', type: 'Trust Accommodation', distance: 'Near Katra Bus Stand', priceRange: '₹800+', imageUrl: '/images/accom/vd_niharika.jpg', bookingLink: 'https://www.maavaishnodevi.org/' },
         { id: 'vd-accom2', name: 'Shakti Bhawan, Bhawan Complex', type: 'Trust Accommodation', distance: 'Near Main Bhawan', priceRange: 'Dormitory Beds', imageUrl: '/images/accom/vd_shakti.jpg', bookingLink: 'https://www.maavaishnodevi.org/' },
         { id: 'vd-hotel1', name: 'The White Hotel, Katra', type: 'Private Hotel', distance: '1.5km from Base Camp', priceRange: '₹5000+', rating: 4.6, imageUrl: '/images/accom/vd_whitehotel.jpg' },
    ]
};

export default function TempleAccommodationPage() {
    const [selectedTemple, setSelectedTemple] = useState<string>('');
    const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    // Fetch accommodations when temple changes
    useState(() => {
        if (selectedTemple) {
            setIsLoading(true);
            setAccommodations([]);
            // Simulate fetching
            setTimeout(() => {
                const results = mockAccommodations[selectedTemple] || [];
                setAccommodations(results);
                 if (results.length === 0) {
                     toast({ description: "Accommodation info not available for this temple yet." });
                 }
                setIsLoading(false);
            }, 800);
        } else {
            setAccommodations([]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTemple]);

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
                                {mockTemples.map(temple => <SelectItem key={temple.id} value={temple.id}>{temple.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </CardContent>
                 </Card>

                 {/* Accommodation Listing */}
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
                                        &lt;Image src={accom.imageUrl || '/images/accom/default.jpg'} alt={accom.name} layout="fill" objectFit="cover" data-ai-hint="hotel building accommodation exterior interior"/&gt;
                                    </div>
                                    <div className="flex-grow p-3">
                                         <CardTitle className="text-base">{accom.name}</CardTitle>
                                         <CardDescription className="text-xs mb-1">{accom.type}</CardDescription>
                                        &lt;Separator className="my-1"/&gt;
                                         <div className="text-xs text-muted-foreground space-y-0.5">
                                            &lt;p className="flex items-center gap-1"&gt;&lt;MapPin className="h-3 w-3"/&gt; {accom.distance}&lt;/p&gt;
                                            &lt;p&gt;Price: &lt;span className="font-medium text-foreground"&gt;{accom.priceRange}&lt;/span&gt;&lt;/p&gt;
                                             {accom.rating && &lt;p className="flex items-center gap-1"&gt;Rating: &lt;Star className="h-3 w-3 text-yellow-500 fill-current"/&gt; {accom.rating}/5&lt;/p&gt;}
                                             {accom.contact && &lt;p&gt;Contact: {accom.contact}&lt;/p&gt;}
                                         &lt;/div&gt;
                                         {accom.bookingLink && (
                                             &lt;Button size="sm" asChild className="mt-2 w-full sm:w-auto"&gt;
                                                 &lt;a href={accom.bookingLink} target="_blank" rel="noopener noreferrer"&gt;Book / View Details&lt;/a&gt;
                                             &lt;/Button&gt;
                                         )}
                                    </div>
                                </div>
                            &lt;/Card&gt;
                         ))}
                    </div>
                 )}
            </main>
        </div>
    );
}
