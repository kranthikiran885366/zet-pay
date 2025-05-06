'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Wrench, ThermometerSnowflake, Info } from 'lucide-react'; // Use Wrench and ThermometerSnowflake icons
import Link from 'next/link';

export default function AcRepairPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <ThermometerSnowflake className="h-6 w-6" />
        <h1 className="text-lg font-semibold">AC Service & Repair</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Book AC Service</CardTitle>
            <CardDescription>Schedule AC installation, servicing, or repairs.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex justify-center gap-4 mb-6 text-primary">
                <ThermometerSnowflake className="h-16 w-16" />
                <Wrench className="h-16 w-16" />
            </div>
            <p className="text-muted-foreground mb-4">
              Get reliable AC service, repair, or installation from verified professionals at your doorstep. Coming Soon!
            </p>
             <Button disabled>Book Service (Coming Soon)</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}