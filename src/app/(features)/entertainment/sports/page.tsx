
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Gamepad2 } from 'lucide-react'; // Using Gamepad2 as placeholder
import Link from 'next/link';

export default function SportsBookingPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/entertainment" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Gamepad2 className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Sports Tickets</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Book Sports Tickets</CardTitle>
            <CardDescription>Get tickets for IPL, ISL, and other sporting events.</CardDescription>
          </CardHeader>
          <CardContent>
             <Gamepad2 className="h-20 w-20 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Find schedules and book tickets for popular sports leagues and matches. Coming Soon!
            </p>
             <Button disabled>Find Matches (Coming Soon)</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

