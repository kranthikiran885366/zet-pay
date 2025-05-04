'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Coins } from 'lucide-react';
import Link from 'next/link';

export default function DigitalGoldPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Coins className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Digital Gold</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Invest in Digital Gold</CardTitle>
            <CardDescription>Buy, sell, and redeem 24K Digital Gold securely.</CardDescription>
          </CardHeader>
          <CardContent>
             <Coins className="h-20 w-20 text-yellow-500 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Invest in pure 24 Karat Gold digitally, starting from just ₹1. Track your gold portfolio easily. Coming Soon!
            </p>
             <Button disabled>Buy Gold (Coming Soon)</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
