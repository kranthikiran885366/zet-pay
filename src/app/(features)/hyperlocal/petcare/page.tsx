'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Dog, Stethoscope } from 'lucide-react'; // Use Dog and Stethoscope icons
import Link from 'next/link';

export default function PetCarePage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Dog className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Pet Services</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Book Pet Grooming & Vet</CardTitle>
            <CardDescription>Find and book appointments for your furry friends.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex justify-center gap-4 mb-6 text-primary">
                <Dog className="h-16 w-16" />
                <Stethoscope className="h-16 w-16" />
             </div>
            <p className="text-muted-foreground mb-4">
              Book appointments for pet grooming, vaccinations, or consultations with veterinarians near you. Coming Soon!
            </p>
             <Button disabled>Find Services (Coming Soon)</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
