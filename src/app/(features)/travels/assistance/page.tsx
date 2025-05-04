'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Siren, PhoneCall, CarCrash, Ambulance } from 'lucide-react'; // Using CarCrash as placeholder for Towing
import Link from 'next/link';

export default function EmergencyAssistancePage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Siren className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Emergency Assistance</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Travel Emergency Help</CardTitle>
            <CardDescription>Get roadside assistance or medical help quickly.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex justify-center gap-6 mb-6 text-destructive">
                <CarCrash className="h-12 w-12" /> {/* Towing */}
                <Ambulance className="h-12 w-12" /> {/* Medical */}
            </div>
            <p className="text-muted-foreground mb-4">
              Request immediate roadside assistance (towing, flat tire, fuel) or connect to emergency medical services while travelling. Your location will be shared with responders. Coming Soon!
            </p>
            <Button variant="destructive" disabled>Request Help Now (Coming Soon)</Button>
             <p className="text-xs text-muted-foreground mt-4">In case of immediate danger, please call emergency services directly.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
