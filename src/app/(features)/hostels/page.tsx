
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, BedSingle, MapPin, Filter } from 'lucide-react'; // Use BedSingle icon
import Link from 'next/link';
import { Input } from '@/components/ui/input';

export default function HostelBookingPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <BedSingle className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Hostel Booking</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-4 pb-20">
          <div className="flex gap-2">
             <Input placeholder="Search hostels by city, location, or name..." className="flex-grow"/>
             <Button variant="outline" size="icon"><Filter className="h-4 w-4"/></Button>
          </div>

          <Card className="shadow-md text-center">
              <CardContent className="p-6">
                  <BedSingle className="h-16 w-16 text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Find and book budget-friendly hostels for your travels. Filter by location, price, and amenities. Coming Soon!
                  </p>
                  <Button disabled>Search Hostels (Coming Soon)</Button>
              </CardContent>
          </Card>
      </main>
    </div>
  );
}
