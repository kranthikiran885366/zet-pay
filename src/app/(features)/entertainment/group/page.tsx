
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';

export default function GroupMovieBookingPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/entertainment" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Users className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Group Movie Booking</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Book Movies Together</CardTitle>
            <CardDescription>Split the cost and invite friends for a movie outing.</CardDescription>
          </CardHeader>
          <CardContent>
             <Users className="h-20 w-20 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Book movie tickets for your group, easily split the payment, and send invites to friends. Coming Soon!
            </p>
             <Button disabled>Start Group Booking (Coming Soon)</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
