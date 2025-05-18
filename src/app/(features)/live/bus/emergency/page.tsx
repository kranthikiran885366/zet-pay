'use client';

import Link from 'next/link';
import { ArrowLeft, Siren, Phone } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { mockNbsEmergencyContacts } from '@/mock-data/liveTracking';

export default function EmergencyContactsPage() {
    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-2 shadow-md">
                <Link href="/live/bus" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Siren className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Emergency Helplines</h1>
            </header>

            <main className="flex-grow p-4 space-y-4">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Emergency Contact Numbers</CardTitle>
                        <CardDescription>Tap to call the respective helpline.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {mockNbsEmergencyContacts.map(contact => (
                            <Button
                                key={contact.name}
                                variant="outline"
                                className="w-full justify-start gap-3 text-base h-12 border-destructive text-destructive hover:bg-destructive/10"
                                onClick={() => window.location.href = `tel:${contact.number}`}
                            >
                                <Phone className="h-5 w-5"/> Call {contact.name} ({contact.number})
                            </Button>
                        ))}
                        <Separator className="my-4"/>
                        <p className="text-xs text-muted-foreground text-center">
                            For app-related issues, please use the Customer Feedback option.
                        </p>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
