'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, ParkingMeter, MapPin } from 'lucide-react'; // Use ParkingMeter icon
import Link from 'next/link';
import Image from 'next/image';

export default function ParkingPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <ParkingMeter className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Parking Payments & Booking</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex flex-col items-center justify-center">
         {/* Placeholder Map Area */}
        <div className="w-full h-64 bg-muted rounded-lg mb-6 flex items-center justify-center text-muted-foreground border">
            <MapPin className="h-10 w-10 mr-2" /> Map Area (Coming Soon)
        </div>

        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Find & Book Parking</CardTitle>
            <CardDescription>Locate nearby parking spots and pre-book.</CardDescription>
          </CardHeader>
          <CardContent>
            <ParkingMeter className="h-20 w-20 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Find available parking spots in malls, streets, or private lots. View pricing, check availability in real-time, and pre-book your spot. Pay seamlessly via the app. Coming Soon!
            </p>
            <Button disabled>Find Parking (Coming Soon)</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
