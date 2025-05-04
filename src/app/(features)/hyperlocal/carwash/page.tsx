'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Car } from 'lucide-react'; // Use Car icon
import Link from 'next/link';

export default function CarWashPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Car className="h-6 w-6" /> {/* Use Car icon */}
        <h1 className="text-lg font-semibold">Car Wash at Home</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Book Car Wash</CardTitle>
            <CardDescription>Get your car cleaned at your doorstep.</CardDescription>
          </CardHeader>
          <CardContent>
             <Car className="h-20 w-20 text-primary mx-auto mb-4" /> {/* Use Car icon */}
            <p className="text-muted-foreground mb-4">
              Schedule a professional car wash service at your preferred location and time. Coming Soon!
            </p>
             <Button disabled>Book Now (Coming Soon)</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
