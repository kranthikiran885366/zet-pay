
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Sparkles } from 'lucide-react'; // Using Sparkles as placeholder
import Link from 'next/link';

export default function ArVrEventsPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/entertainment" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Sparkles className="h-6 w-6" />
        <h1 className="text-lg font-semibold">AR/VR Events</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Immersive Event Viewing</CardTitle>
            <CardDescription>Experience events in Augmented or Virtual Reality.</CardDescription>
          </CardHeader>
          <CardContent>
             <Sparkles className="h-20 w-20 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Integrate with AR/VR platforms to view select events in an immersive format. 

              Imagine exploring a 3D model of a hotel room before booking, viewing a virtual temple queue, or even previewing a dish in AR before ordering!  Coming Soon!
            </p>
             <Button disabled>Explore AR/VR Events (Coming Soon)</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


