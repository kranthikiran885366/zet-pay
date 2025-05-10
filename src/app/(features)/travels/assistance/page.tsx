'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Siren, PhoneCall, CarCrash, Ambulance, MapPin, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function EmergencyTravelAssistancePage() {
    const [isRequesting, setIsRequesting] = useState(false);
    const { toast } = useToast();

    const handleRequestHelp = async (serviceType: 'Roadside' | 'Medical') => {
        setIsRequesting(true);
        // Simulate API call to backend to dispatch help
        // Backend would use user's location (if permission granted)
        console.log(`Requesting ${serviceType} assistance...`);
        try {
            // TODO: Implement actual API call here
            // await requestEmergencyService(serviceType, userLocation);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
            toast({
                title: `${serviceType} Assistance Requested`,
                description: "Help is on the way. We will contact you shortly."
            });
        } catch (error) {
            console.error(`Failed to request ${serviceType} assistance:`, error);
            toast({ variant: "destructive", title: "Request Failed", description: "Could not process your request. Please try again or call emergency numbers directly."});
        } finally {
            setIsRequesting(false);
        }
    };

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/travels" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Siren className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Emergency Travel Assistance</h1>
      </header>

      <main className="flex-grow p-4 space-y-6">
        <Card className="shadow-md border-destructive">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive"><ShieldAlert className="h-6 w-6"/> Important Notice</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">This service connects you to third-party assistance providers. In case of immediate life-threatening emergencies, please dial national emergency numbers (108 for Ambulance, 100 for Police) directly.</p>
                <p className="text-xs text-muted-foreground mt-2">Your location will be shared with the service provider upon request.</p>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-md">
              <CardHeader className="items-center">
                <CarCrash className="h-12 w-12 text-orange-500 mb-2" />
                <CardTitle>Roadside Assistance</CardTitle>
                <CardDescription>Flat tire, towing, battery jumpstart, fuel delivery.</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button variant="outline" className="w-full border-orange-500 text-orange-600 hover:bg-orange-50" onClick={() => handleRequestHelp('Roadside')} disabled={isRequesting}>
                    {isRequesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PhoneCall className="mr-2 h-4 w-4"/>}
                    Request Roadside Help
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="items-center">
                <Ambulance className="h-12 w-12 text-red-600 mb-2" />
                <CardTitle>Medical Emergency</CardTitle>
                <CardDescription>Request an ambulance or medical support.</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button variant="destructive" className="w-full" onClick={() => handleRequestHelp('Medical')} disabled={isRequesting}>
                    {isRequesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Siren className="mr-2 h-4 w-4"/>}
                    Request Medical Help
                </Button>
              </CardContent>
            </Card>
        </div>

         <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5"/> Your Location</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Location sharing will be requested when you seek assistance. Ensure GPS is enabled for accuracy.</p>
                {/* Optionally display map if location is fetched */}
                <Button variant="link" size="sm" className="p-0 h-auto mt-1" onClick={() => alert("Show map / Re-fetch location")}>Refresh Location (Coming Soon)</Button>
            </CardContent>
         </Card>

      </main>
    </div>
  );
}
