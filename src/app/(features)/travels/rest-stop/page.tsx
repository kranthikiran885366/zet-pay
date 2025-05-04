'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Store, Utensils, ParkingMeter, Bed } from 'lucide-react';
import Link from 'next/link';

export default function RestStopBookingPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Store className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Highway Rest Stops</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Rest Stop Services</CardTitle>
            <CardDescription>Find amenities and pre-book facilities on your route.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-4 mb-6 text-primary">
                <Utensils className="h-10 w-10" />
                <ParkingMeter className="h-10 w-10" />
                <Bed className="h-10 w-10" />
            </div>
            <p className="text-muted-foreground mb-4">
              Locate highway rest stops, view available amenities like food courts, restrooms, parking, and even pre-book short-stay rooms or meals. Coming Soon!
            </p>
            <Button disabled>Find Rest Stops (Coming Soon)</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
