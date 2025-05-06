'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, ListChecks, BellRing, Settings, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function SubscriptionManagerPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <ListChecks className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Subscription Manager</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Manage Your Subscriptions</CardTitle>
            <CardDescription>View, track, and manage all your recurring payments.</CardDescription>
          </CardHeader>
          <CardContent>
             <ListChecks className="h-20 w-20 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Connect your accounts to automatically detect subscriptions (OTT, Bills, EMIs). Get reminders, pause/resume (where supported), or get AI assistance in cancelling unwanted services. Coming Soon!
            </p>
             <div className="flex flex-col gap-2">
                <Button disabled><BellRing className="mr-2 h-4 w-4"/> View & Manage (Coming Soon)</Button>
                <Button variant="outline" disabled><XCircle className="mr-2 h-4 w-4"/> Cancellation Help (Coming Soon)</Button>
             </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
