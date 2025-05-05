
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Building, ReceiptText, Milestone } from 'lucide-react';
import Link from 'next/link';

export default function MunicipalServicesPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Building className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Municipal Services</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Pay Municipal Taxes & Fees</CardTitle>
            <CardDescription>Access various municipal services online.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex justify-center gap-4 mb-6 text-primary">
                <ReceiptText className="h-10 w-10" /> {/* Placeholder for tax */}
                <Milestone className="h-10 w-10" /> {/* Placeholder for certificates */}
            </div>
            <p className="text-muted-foreground mb-4">
              Pay property tax, water tax, apply for birth/death certificates, and access other local government services conveniently. Integration varies by municipality. Coming Soon!
            </p>
             <Button disabled>Explore Services (Coming Soon)</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
