'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Pill, Upload, Search } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

export default function PharmacyPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/healthcare" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Pill className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Order Medicines</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-4 pb-20">
           <Input placeholder="Search medicines and health products..."/>

           <Card className="shadow-md text-center">
              <CardContent className="p-6">
                  <Pill className="h-16 w-16 text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Order medicines online from trusted pharmacies. Upload your prescription for easy ordering and get medicines delivered to your doorstep. Coming Soon!
                  </p>
                   <div className="flex flex-col sm:flex-row gap-2 justify-center">
                     <Button disabled><Upload className="mr-2 h-4 w-4"/> Upload Prescription (Coming Soon)</Button>
                     <Button variant="outline" disabled><Search className="mr-2 h-4 w-4"/> Browse Products (Coming Soon)</Button>
                  </div>
              </CardContent>
          </Card>
      </main>
    </div>
  );
}
