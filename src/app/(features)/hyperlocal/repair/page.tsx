'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Wrench, Lightbulb } from 'lucide-react'; // Use Wrench and Lightbulb icons
import Link from 'next/link';

export default function HomeRepairPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Wrench className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Home Repairs</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Book Electrician / Plumber</CardTitle>
            <CardDescription>Find verified professionals for home repairs.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex justify-center gap-4 mb-6 text-primary">
                <Lightbulb className="h-16 w-16" />
                <Wrench className="h-16 w-16" />
            </div>
            <p className="text-muted-foreground mb-4">
              Book skilled electricians for wiring issues, installations, or plumbers for leaks, fixture repairs, and more. Coming Soon!
            </p>
             <Button disabled>Book Service (Coming Soon)</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}