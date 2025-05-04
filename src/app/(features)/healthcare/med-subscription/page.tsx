'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Repeat, Upload, ListPlus } from 'lucide-react';
import Link from 'next/link';

export default function MedicineSubscriptionPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/healthcare" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Repeat className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Medicine Subscription</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Automatic Medicine Refills</CardTitle>
            <CardDescription>Set up subscriptions for your regular medicines.</CardDescription>
          </CardHeader>
          <CardContent>
             <Repeat className="h-20 w-20 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Never run out of essential medicines. Upload your prescription and set up recurring orders with automatic payments. Coming Soon!
            </p>
             <div className="flex flex-col gap-2">
                <Button disabled><Upload className="mr-2 h-4 w-4"/> Upload Prescription (Coming Soon)</Button>
                <Button variant="outline" disabled><ListPlus className="mr-2 h-4 w-4"/> Create Subscription (Coming Soon)</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
