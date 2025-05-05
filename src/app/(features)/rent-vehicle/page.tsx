
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Car, Bike, MapPin, Filter } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RentVehiclePage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Car className="h-6 w-6" /> {/* Use Car as main icon */}
        <h1 className="text-lg font-semibold">Rent a Vehicle</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-4 pb-20">
          <Tabs defaultValue="car" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="car">Rent a Car</TabsTrigger>
                <TabsTrigger value="bike">Rent a Bike</TabsTrigger>
            </TabsList>

            <TabsContent value="car">
                  <div className="flex gap-2 mb-4">
                     <Input placeholder="Search car models or locations..." className="flex-grow"/>
                     <Button variant="outline" size="icon"><Filter className="h-4 w-4"/></Button>
                  </div>
                  <Card className="shadow-md text-center">
                      <CardContent className="p-6">
                          <Car className="h-16 w-16 text-primary mx-auto mb-4" />
                          <p className="text-muted-foreground mb-4">
                             Rent self-drive or chauffeur-driven cars. Choose from various models and rental durations. Coming Soon!
                          </p>
                          <Button disabled>Search Cars (Coming Soon)</Button>
                      </CardContent>
                  </Card>
            </TabsContent>

            <TabsContent value="bike">
                  <div className="flex gap-2 mb-4">
                     <Input placeholder="Search bike models or locations..." className="flex-grow"/>
                     <Button variant="outline" size="icon"><Filter className="h-4 w-4"/></Button>
                  </div>
                 <Card className="shadow-md text-center">
                      <CardContent className="p-6">
                          <Bike className="h-16 w-16 text-primary mx-auto mb-4" />
                          <p className="text-muted-foreground mb-4">
                             Find and rent bikes for short commutes or longer durations. Check availability and unlock bikes easily. Coming Soon!
                          </p>
                          <Button disabled>Search Bikes (Coming Soon)</Button>
                      </CardContent>
                  </Card>
            </TabsContent>
          </Tabs>
      </main>
    </div>
  );
}
