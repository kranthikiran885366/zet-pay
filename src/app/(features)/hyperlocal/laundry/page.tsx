'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, WashingMachine } from 'lucide-react'; // Use WashingMachine icon
import Link from 'next/link';

export default function LaundryPickupPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <WashingMachine className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Laundry Service</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Schedule Laundry Pickup</CardTitle>
            <CardDescription>Get your laundry washed, ironed, and delivered.</CardDescription>
          </CardHeader>
          <CardContent>
             <WashingMachine className="h-20 w-20 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Schedule a convenient pickup time for your laundry. Choose services like wash & fold, wash & iron, or dry cleaning. Coming Soon!
            </p>
             <Button disabled>Schedule Pickup (Coming Soon)</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
