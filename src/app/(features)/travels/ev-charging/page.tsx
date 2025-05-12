
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Zap, MapPin, Search, Filter, Info, Clock, Power } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { mockEVStations, EVStation } from '@/mock-data'; // Import centralized mock data

export default function EvChargingPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [stations, setStations] = useState<EVStation[]>(mockEVStations);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        const filtered = mockEVStations.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.address.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setStations(filtered);
        if(filtered.length === 0) {
            toast({ description: "No stations found matching your search."});
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
        <Zap className="h-6 w-6" />
        <h1 className="text-lg font-semibold">EV Charging Stations</h1>
      </header>

      <main className="flex-grow p-4 space-y-4 pb-20">
         <form onSubmit={handleSearch} className="flex gap-2">
            <Input
                type="search"
                placeholder="Search by location, Pincode, or station name..."
                className="flex-grow"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
             <Button type="submit" disabled={isLoading}>{isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4"/>}</Button>
             <Button variant="outline" size="icon" disabled><Filter className="h-4 w-4"/></Button>
        </form>

        <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground border mb-4">
            <MapPin className="h-8 w-8 mr-2" /> Map View (Coming Soon)
        </div>

        {isLoading && <div className="flex justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}

        {!isLoading && stations.length === 0 && searchTerm && (
             <Card className="shadow-md text-center">
                <CardContent className="p-6">
                    <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No EV charging stations found for "{searchTerm}". Try a different location or search term.</p>
                </CardContent>
            </Card>
        )}

        {!isLoading && stations.length > 0 && (
            <div className="space-y-3">
                {stations.map(station => (
                    <Card key={station.id} className="shadow-sm overflow-hidden">
                        <div className="flex">
                            {station.imageUrl && (
                                <div className="relative w-1/3 sm:w-1/4 flex-shrink-0">
                                    <Image src={station.imageUrl} alt={station.name} layout="fill" objectFit="cover" data-ai-hint="ev charging station photo"/>
                                </div>
                            )}
                            <div className="p-3 flex-grow">
                                <CardTitle className="text-base">{station.name}</CardTitle>
                                <CardDescription className="text-xs mb-1 flex items-center gap-1"><MapPin className="h-3 w-3"/> {station.address} ({station.distance})</CardDescription>
                                {station.price && <Badge variant="secondary" className="text-xs mb-1">Price: {station.price}</Badge>}
                                <div className="mt-2 space-y-1">
                                    {station.connectors.map(conn => (
                                        <div key={conn.type} className="flex justify-between items-center text-xs">
                                            <span className="flex items-center gap-1"><Power className="h-3 w-3"/> {conn.type} ({conn.power})</span>
                                            <Badge variant={conn.status === 'Available' ? 'default' : conn.status === 'In Use' ? 'outline' : 'destructive'}
                                                className={conn.status === 'Available' ? 'bg-green-100 text-green-700' : conn.status === 'In Use' ? 'bg-yellow-100 text-yellow-700' : ''}>
                                                {conn.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                                {station.amenities && station.amenities.length > 0 && (
                                    <p className="text-[10px] text-muted-foreground mt-1">Amenities: {station.amenities.join(', ')}</p>
                                )}
                                <Button size="sm" className="w-full mt-2 h-8 text-xs" onClick={() => alert(`Booking slot at ${station.name}... (Not Implemented)`)} disabled={station.connectors.every(c => c.status !== 'Available')}>
                                    {station.connectors.every(c => c.status !== 'Available') ? 'Currently Unavailable' : 'Book Slot / Navigate'}
                                </Button>
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
