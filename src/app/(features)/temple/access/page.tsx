'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, QrCode, Ticket, User, Info } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Mock Data (Replace with actual API calls for fetching passes)
interface AccessPass {
    passId: string;
    templeName: string;
    visitorName: string;
    visitDate: string;
    slotTime: string;
    qrCodeData: string; // Data to be encoded in the QR
}

const mockUserPasses: AccessPass[] = [
    {
        passId: 'PASS12345', templeName: 'Tirumala Tirupati Devasthanams', visitorName: 'Chandra Sekhar', visitDate: '2024-08-15', slotTime: '09:00 AM - 10:00 AM', qrCodeData: 'TTD_PASS_12345_0900_20240815'
    },
    // Add more booked passes if needed
];

export default function SmartAccessPage() {
    const [passes] = useState<AccessPass[]>(mockUserPasses); // Replace with fetched data
    const [selectedPass, setSelectedPass] = useState<AccessPass | null>(passes[0] || null); // Select first pass by default

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/temple" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <QrCode className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Smart Access Pass</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                {passes.length === 0 ? (
                    <Card className="shadow-md text-center">
                        &lt;CardHeader&gt;
                            &lt;CardTitle&gt;No Access Passes Found&lt;/CardTitle&gt;
                        &lt;/CardHeader&gt;
                         &lt;CardContent className="p-6"&gt;
                            &lt;Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4"/&gt;
                            &lt;p className="text-muted-foreground"&gt;You currently don't have any booked access passes.&lt;/p&gt;
                             &lt;Link href="/temple/darshan" passHref&gt;
                                &lt;Button variant="link" className="mt-2"&gt;Book Darshan Slot&lt;/Button&gt;
                             &lt;/Link&gt;
                        &lt;/CardContent&gt;
                    &lt;/Card&gt;
                ) : (
                    <Card className="shadow-md">
                         &lt;CardHeader&gt;
                             &lt;CardTitle&gt;Your Booked Pass&lt;/CardTitle&gt;
                              {/* Add a Select dropdown here if user can have multiple passes */}
                         &lt;/CardHeader&gt;
                         {selectedPass && (
                             &lt;CardContent className="flex flex-col items-center justify-center space-y-4"&gt;
                                 &lt;p className="text-center font-semibold text-lg"&gt;{selectedPass.templeName}&lt;/p&gt;
                                 &lt;div className="bg-white p-4 rounded-lg border border-border shadow-inner"&gt;
                                     {/* Generate QR Code from qrCodeData */}
                                     &lt;Image
                                         src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(selectedPass.qrCodeData)}`}
                                         alt="Access Pass QR Code"
                                         width={250}
                                         height={250}
                                         data-ai-hint="temple access QR code"
                                     /&gt;
                                 &lt;/div&gt;
                                  &lt;div className="text-center space-y-1"&gt;
                                    &lt;p&gt;&lt;span className="font-medium"&gt;Visitor:&lt;/span&gt; {selectedPass.visitorName}&lt;/p&gt;
                                    &lt;p&gt;&lt;span className="font-medium"&gt;Date:&lt;/span&gt; {format(new Date(selectedPass.visitDate), 'PPP')}&lt;/p&gt;
                                    &lt;p&gt;&lt;span className="font-medium"&gt;Slot:&lt;/span&gt; {selectedPass.slotTime}&lt;/p&gt;
                                    &lt;p className="text-xs text-muted-foreground"&gt;Pass ID: {selectedPass.passId}&lt;/p&gt;
                                &lt;/div&gt;
                                 &lt;Separator className="my-4"/&gt;
                                 &lt;div className="text-center text-muted-foreground text-sm space-y-1"&gt;
                                     &lt;p className='flex items-center justify-center gap-1'&gt;&lt;Info className="h-4 w-4"/&gt; Show this QR code at the entry gate.&lt;/p&gt;
                                     &lt;p&gt;Ensure screen brightness is high for scanning.&lt;/p&gt;
                                 &lt;/div&gt;
                             &lt;/CardContent&gt;
                         )}
                    &lt;/Card&gt;
                )}
            &lt;/main&gt;
        &lt;/div&gt;
    );
}

// Helper function to format date (already imported from date-fns)
// import { format } from 'date-fns';
