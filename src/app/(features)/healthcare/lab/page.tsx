'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, FlaskConical, Home, Search } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

export default function LabTestBookingPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/healthcare" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <FlaskConical className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Book Lab Tests</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-4 pb-20">
           <Input placeholder="Search lab tests (e.g., CBC, Lipid Profile)..."/>

           <Card className="shadow-md text-center">
              <CardContent className="p-6">
                  <FlaskConical className="h-16 w-16 text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Book diagnostic tests from certified labs. Opt for home sample collection for convenience. View reports directly in the app. Coming Soon!
                  </p>
                  <div className="flex gap-4 justify-center">
                      <Button disabled><Search className="mr-2 h-4 w-4"/>Find Tests (Coming Soon)</Button>
                       <Button variant="outline" disabled><Home className="mr-2 h-4 w-4"/>Home Collection (Coming Soon)</Button>
                  </div>
              </CardContent>
          </Card>
      </main>
    </div>
  );
}
