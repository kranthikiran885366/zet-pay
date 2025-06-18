
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, CarTaxiFront, MapPin, CalendarDays, Clock, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label"; // Added import for Label
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const mockLocations = ["Airport", "Railway Station", "Koramangala", "Indiranagar", "Whitefield"];

export default function CabBookingPage() {
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [pickupDate, setPickupDate] = useState<Date | undefined>(new Date());
  const [pickupTime, setPickupTime] = useState('');

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <CarTaxiFront className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Book a Cab</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-4 pb-20">
          <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Book Local & Outstation Cabs</CardTitle>
                <CardDescription>Enter your pickup and drop details to find available rides.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-1">
                    <Label htmlFor="pickup">Pickup Location</Label>
                    <Input id="pickup" placeholder="Enter pickup address or landmark" value={pickupLocation} onChange={e => setPickupLocation(e.target.value)}/>
                </div>
                 <div className="space-y-1">
                    <Label htmlFor="drop">Drop Location</Label>
                    <Input id="drop" placeholder="Enter drop address or landmark" value={dropLocation} onChange={e => setDropLocation(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="pickupDate">Pickup Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button id="pickupDate" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !pickupDate && "text-muted-foreground")}>
                                    <CalendarDays className="mr-2 h-4 w-4" />
                                    {pickupDate ? format(pickupDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={pickupDate} onSelect={setPickupDate} initialFocus disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}/>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="pickupTime">Pickup Time</Label>
                        <Input id="pickupTime" type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} />
                    </div>
                </div>
                 <Button className="w-full" disabled>
                    <Search className="mr-2 h-4 w-4"/> Find Cabs (Coming Soon)
                </Button>
            </CardContent>
          </Card>

          <Card className="shadow-md text-center">
              <CardContent className="p-6">
                  <CarTaxiFront className="h-16 w-16 text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Cab booking integration with major providers like Ola and Uber is coming soon.
                  </p>
              </CardContent>
          </Card>
      </main>
    </div>
  );
}

