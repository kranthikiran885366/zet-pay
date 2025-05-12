
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Store, Utensils, ParkingMeter, Bed, Fuel, Search, Filter, MapPin } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { mockRestStopsData, RestStop } from '@/mock-data'; // Import centralized mock data

export default function RestStopInfoPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [stops, setStops] = useState<RestStop[]>(mockRestStopsData);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        const filtered = mockRestStopsData.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.highway.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.locationDesc.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setStops(filtered);
         if(filtered.length === 0) {
            toast({ description: "No rest stops found matching your search."});
        }
        setIsLoading(false);
    }

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/travels" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Store className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Highway Rest Stops</h1>
      </header>

      <main className="flex-grow p-4 space-y-4 pb-20">
        <form onSubmit={handleSearch} className="flex gap-2">
            <Input
                type="search"
                placeholder="Search by highway (NH48), city, or name..."
                className="flex-grow"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
             <Button type="submit" disabled={isLoading}>{isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4"/>}</Button>
             <Button variant="outline" size="icon" disabled><Filter className="h-4 w-4"/></Button>
        </form>

        <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground border mb-4">
            <MapPin className="h-8 w-8 mr-2" /> Map View with Rest Stops (Coming Soon)
        </div>

        {isLoading && <div className="flex justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}

        {!isLoading && stops.length === 0 && searchTerm && (
             <Card className="shadow-md text-center">
                <CardContent className="p-6">
                    <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No rest stops found for "{searchTerm}".</p>
                </CardContent>
            </Card>
        )}

         {!isLoading && stops.length > 0 && (
            <div className="space-y-3">
                {stops.map(stop => (
                    <Card key={stop.id} className="shadow-sm overflow-hidden">
                         <div className="flex">
                            {stop.imageUrl && (
                                <div className="relative w-1/3 sm:w-1/4 flex-shrink-0">
                                    <Image src={stop.imageUrl} alt={stop.name} layout="fill" objectFit="cover" data-ai-hint="highway rest stop food court exterior"/>
                                </div>
                            )}
                            <div className="p-3 flex-grow">
                                <CardTitle className="text-base">{stop.name}</CardTitle>
                                <CardDescription className="text-xs mb-1">{stop.highway} - {stop.locationDesc}</CardDescription>
                                {stop.rating && <Badge variant="outline" className="text-xs mb-1">{stop.rating} ★</Badge>}
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {stop.amenities.map(amenity => (
                                        <Badge key={amenity} variant="secondary" className="text-[10px]">{amenity}</Badge>
                                    ))}
                                </div>
                                 {stop.services && stop.services.length > 0 && (
                                    <div className="mt-1">
                                        {stop.services.map(service => (
                                            <Badge key={service.name} variant={service.available ? "default" : "outline"} className={`text-[10px] mr-1 ${service.available ? 'bg-green-100 text-green-700' : 'text-muted-foreground'}`}>
                                                {service.name}: {service.available ? 'Yes' : 'No'}
                                            </Badge>
                                        ))}
                                    </div>
                                 )}
                                 <Button size="xs" variant="link" className="p-0 h-auto text-xs mt-2" onClick={() => alert(`Viewing details for ${stop.name}`)}>View Details / Book Facility</Button>
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
