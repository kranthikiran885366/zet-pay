'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Ambulance, PhoneCall } from 'lucide-react';
import Link from 'next/link';

export default function AmbulanceBookingPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/healthcare" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Ambulance className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Emergency Ambulance</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Book Ambulance</CardTitle>
            <CardDescription>Quickly request emergency medical transport.</CardDescription>
          </CardHeader>
          <CardContent>
             <Ambulance className="h-20 w-20 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Book Basic Life Support (BLS) or Advanced Life Support (ALS) ambulances instantly. Your location will be used to dispatch the nearest available service. Coming Soon!
            </p>
             <Button variant="destructive" disabled>Book Now (Coming Soon)</Button>
             <p className="text-xs text-muted-foreground mt-4">In case of critical emergency, please call 108/102 directly.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
