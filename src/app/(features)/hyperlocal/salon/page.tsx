'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, ScissorsLineDashed } from 'lucide-react'; // Use ScissorsLineDashed icon
import Link from 'next/link';

export default function SalonAppointmentPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <ScissorsLineDashed className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Salon & Barber</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Book Appointments</CardTitle>
            <CardDescription>Find salons and barbers near you and book slots.</CardDescription>
          </CardHeader>
          <CardContent>
             <ScissorsLineDashed className="h-20 w-20 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Discover nearby salons and barber shops, view services, check availability, and book your next appointment easily. Coming Soon!
            </p>
             <Button disabled>Find Salons (Coming Soon)</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
