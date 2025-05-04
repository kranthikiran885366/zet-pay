'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Siren, PhoneCall, MapPin, Wallet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Mock Emergency Contacts (replace with actual contacts service)
const emergencyContacts = {
    ambulance: '108',
    police: '100',
    // Add user-defined emergency contacts later
};

export default function EmergencyModePage() {
    const [isEmergencyActive, setIsEmergencyActive] = useState(false);
    const [locationStatus, setLocationStatus] = useState<'Idle' | 'Fetching' | 'Shared' | 'Error'>('Idle');
    const [callStatus, setCallStatus] = useState<'Idle' | 'Calling' | 'Connected' | 'Error'>('Idle');
    const [paymentStatus, setPaymentStatus] = useState<'Idle' | 'Ready'>('Idle');
    const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
    const { toast } = useToast();

    // Function to get user location
    const getUserLocation = (): Promise<{ lat: number; lon: number }> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation is not supported by your browser."));
            } else {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            lat: position.coords.latitude,
                            lon: position.coords.longitude,
                        });
                    },
                    (error) => {
                        reject(new Error(`Failed to get location: ${error.message}`));
                    }
                );
            }
        });
    };

    // Function to initiate emergency call
    const initiateEmergencyCall = (number: string) => {
        setCallStatus('Calling');
        try {
            // Use tel: protocol to trigger phone dialer
            window.location.href = `tel:${number}`;
            // Note: We can't reliably track if the call connected from the browser.
            // We'll assume it initiated successfully for the UI.
             setTimeout(() => {
                // Update status after a short delay to simulate call initiation
                setCallStatus('Connected'); // Or 'Idle' if we can't confirm
                 toast({ title: "Call Initiated", description: `Dialing ${number}... Please complete the call.` });
             }, 1000);

        } catch (error) {
            console.error("Failed to initiate call:", error);
            setCallStatus('Error');
            toast({ variant: "destructive", title: "Call Failed", description: "Could not initiate emergency call." });
        }
    };

    // Function to handle Emergency Mode activation
    const activateEmergencyMode = async () => {
        setIsEmergencyActive(true);
        setLocationStatus('Fetching');
        setCallStatus('Idle');
        setPaymentStatus('Idle');

        try {
            // 1. Get Location & Share (Simulated Sharing)
            const location = await getUserLocation();
            setUserLocation(location);
            setLocationStatus('Shared');
            console.log("Location fetched & shared (simulated):", location);
             toast({ title: "Location Shared (Simulated)", description: "Your location has been shared with emergency services." });


            // 2. Initiate Call to Ambulance
             // Adding a slight delay before initiating the call
             await new Promise(resolve => setTimeout(resolve, 500));
            initiateEmergencyCall(emergencyContacts.ambulance);

            // 3. Prepare Wallet (Concept)
            // In a real app, this might prioritize emergency payment options
            // or pre-fill some details if possible.
            setPaymentStatus('Ready');
             toast({ title: "Wallet Ready", description: "Payment options are ready if needed." });


        } catch (error: any) {
            console.error("Error activating emergency mode:", error);
            setLocationStatus('Error');
            toast({ variant: "destructive", title: "Emergency Mode Failed", description: error.message });
            setIsEmergencyActive(false); // Deactivate on error
        }
    };

    return (
        <div className="min-h-screen bg-destructive/90 flex flex-col">
            {/* Header */}
            <header className="bg-destructive text-destructive-foreground p-3 flex items-center gap-4 shadow-md">
                {/* No back button in emergency mode? Or make it less prominent? */}
                <Siren className="h-6 w-6 animate-pulse" />
                <h1 className="text-lg font-semibold">EMERGENCY MODE</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 flex flex-col items-center justify-center text-center space-y-6">
                {!isEmergencyActive ? (
                    <>
                        <Siren className="h-24 w-24 text-destructive-foreground animate-ping" />
                        <h2 className="text-2xl font-bold text-destructive-foreground">Activate Emergency Mode?</h2>
                        <p className="text-destructive-foreground/90">
                            This will attempt to:
                        </p>
                        <ul className="list-disc list-inside text-destructive-foreground/80 text-left mx-auto max-w-xs">
                            <li>Share your current location</li>
                            <li>Call emergency services (e.g., Ambulance)</li>
                            <li>Prepare your wallet for quick payments</li>
                        </ul>

                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="lg" className="bg-white text-destructive hover:bg-gray-200 scale-110 animate-pulse py-6 px-8 text-lg font-bold">
                                    ACTIVATE NOW
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Emergency Activation</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to activate Emergency Mode? This will contact emergency services and share your location. Use only in a genuine emergency.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={activateEmergencyMode} className="bg-destructive hover:bg-destructive/90">Activate Emergency</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Link href="/" passHref>
                            <Button variant="link" className="text-destructive-foreground/70 hover:text-destructive-foreground">Cancel / Exit</Button>
                        </Link>
                    </>
                ) : (
                     // Active Emergency Mode UI
                     <Card className="w-full max-w-md shadow-xl bg-background text-foreground">
                         <CardHeader>
                             <CardTitle className="text-destructive text-center text-xl">Emergency Mode Active</CardTitle>
                             <CardDescription className="text-center">Actions initiated. Stay calm.</CardDescription>
                         </CardHeader>
                         <CardContent className="space-y-4">
                            {/* Location Status */}
                             <div className="flex items-center gap-3 p-3 border rounded-md">
                                <MapPin className={`h-6 w-6 ${locationStatus === 'Shared' ? 'text-green-600' : locationStatus === 'Error' ? 'text-destructive' : 'text-muted-foreground'}`} />
                                <div>
                                    <p className="font-medium">Location Status</p>
                                     <p className={`text-sm ${locationStatus === 'Shared' ? 'text-green-600' : locationStatus === 'Error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                                        {locationStatus === 'Fetching' && <Loader2 className="inline h-4 w-4 animate-spin mr-1" />}
                                        {locationStatus === 'Fetching' ? 'Getting location...' :
                                         locationStatus === 'Shared' ? `Shared (${userLocation?.lat.toFixed(4)}, ${userLocation?.lon.toFixed(4)})` :
                                         locationStatus === 'Error' ? 'Failed to share location' : 'Idle'}
                                    </p>
                                </div>
                             </div>
                            {/* Call Status */}
                             <div className="flex items-center gap-3 p-3 border rounded-md">
                                 <PhoneCall className={`h-6 w-6 ${callStatus === 'Connected' ? 'text-green-600' : callStatus === 'Error' ? 'text-destructive' : 'text-muted-foreground'}`} />
                                 <div>
                                    <p className="font-medium">Emergency Call</p>
                                     <p className={`text-sm ${callStatus === 'Connected' ? 'text-green-600' : callStatus === 'Error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                                         {callStatus === 'Calling' && <Loader2 className="inline h-4 w-4 animate-spin mr-1" />}
                                         {callStatus === 'Calling' ? `Calling ${emergencyContacts.ambulance}...` :
                                          callStatus === 'Connected' ? `Call to ${emergencyContacts.ambulance} initiated` :
                                          callStatus === 'Error' ? 'Call failed' : 'Idle'}
                                    </p>
                                </div>
                             </div>
                             {/* Wallet Status */}
                             <div className="flex items-center gap-3 p-3 border rounded-md">
                                 <Wallet className={`h-6 w-6 ${paymentStatus === 'Ready' ? 'text-blue-600' : 'text-muted-foreground'}`} />
                                 <div>
                                    <p className="font-medium">Quick Payments</p>
                                     <p className={`text-sm ${paymentStatus === 'Ready' ? 'text-blue-600' : 'text-muted-foreground'}`}>
                                         {paymentStatus === 'Ready' ? 'Wallet/UPI ready for payments' : 'Preparing...'}
                                     </p>
                                </div>
                             </div>

                             <Link href="/" passHref>
                                 <Button variant="destructive" className="w-full mt-4">
                                    Deactivate Emergency Mode
                                 </Button>
                             </Link>
                         </CardContent>
                     </Card>
                )}
            </main>
        </div>
    );
}
