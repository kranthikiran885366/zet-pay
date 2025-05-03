'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Clock, Users, CalendarDays, Loader2, Info } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";

// Mock Data (Replace with actual API calls)
const mockTemples = [ // Reuse or fetch centrally
    { id: 'tirupati', name: 'Tirumala Tirupati Devasthanams (TTD)' },
    { id: 'shirdi', name: 'Shirdi Saibaba Sansthan Trust' },
    { id: 'vaishno-devi', name: 'Vaishno Devi Shrine Board' },
];

interface TempleInfo {
    timings: { day: string; darshan: string; general: string }[];
    queueStatus: {
        compartmentsFull: number;
        estimatedWaitTime: string; // e.g., "Approx. 6 hours", "Normal"
        lastUpdated: string; // e.g., "10:30 AM IST"
    };
    specialNotes?: string[];
}

const mockTempleInfo: { [templeId: string]: TempleInfo } = {
    'tirupati': {
        timings: [
            { day: 'Daily', darshan: '03:00 AM - 11:30 PM (Varies)', general: 'Open 24 hours (Queue Complex)' },
            // Add specific timings for different sevas if available
        ],
        queueStatus: {
            compartmentsFull: 18,
            estimatedWaitTime: 'Approx. 8-10 hours',
            lastUpdated: '11:15 AM IST',
        },
        specialNotes: [
            'Special entry darshan (₹300) queue has shorter wait times.',
            'Ensure you follow the dress code.',
            'Mobile phones are not allowed inside the temple.'
        ]
    },
    'shirdi': {
         timings: [
            { day: 'Daily', darshan: '04:00 AM - 11:00 PM', general: 'Open 24 hours' },
            { day: 'Aarti Timings', darshan: 'Kakad (4:30 AM), Madhyan (12 PM), Dhoop (Sunset), Shej (10:30 PM)', general: ''},
        ],
        queueStatus: {
            compartmentsFull: 0, // May not use compartments
            estimatedWaitTime: 'Approx. 1-2 hours (General Queue)',
            lastUpdated: '11:00 AM IST',
        },
         specialNotes: [
            'Paid Darshan (₹200) available for quicker access.',
            'Accommodation available through the trust website.'
        ]
    },
    'vaishno-devi': {
         timings: [
            { day: 'Daily', darshan: 'Open 24 hours (except during Aarti)', general: 'Open 24 hours' },
            { day: 'Aarti Timings', darshan: 'Approx. 6:20 AM &amp; 7:20 PM (Timings vary)', general: ''},
        ],
        queueStatus: {
            compartmentsFull: 0, // Uses a different system
            estimatedWaitTime: 'Normal rush',
            lastUpdated: '10:45 AM IST',
        },
         specialNotes: [
            'Yatra registration is mandatory.',
            'Helicopter and Battery Car services available.'
        ]
    }
};

export default function TempleInfoPage() {
    const [selectedTemple, setSelectedTemple] = useState<string>('');
    const [templeInfo, setTempleInfo] = useState<TempleInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    // Fetch info when temple changes
    useEffect(() => {
        if (selectedTemple) {
            setIsLoading(true);
            setTempleInfo(null);
            // Simulate fetching
            setTimeout(() => {
                const info = mockTempleInfo[selectedTemple];
                setTempleInfo(info || null);
                 if (!info) {
                     toast({ description: "Information not available for this temple yet." });
                 }
                setIsLoading(false);
            }, 800);
        } else {
            setTempleInfo(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTemple]);

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/temple" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Clock className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Temple Info</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                 <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Select Temple</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <Select value={selectedTemple} onValueChange={setSelectedTemple} required>
                            <SelectTrigger id="temple"><SelectValue placeholder="Select Temple for Information" /></SelectTrigger>
                            <SelectContent>
                                {mockTemples.map(temple => <SelectItem key={temple.id} value={temple.id}>{temple.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </CardContent>
                 </Card>

                 {/* Information Display */}
                 {isLoading && (
                     <div className="flex justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                 )}

                 {!isLoading && selectedTemple && !templeInfo && (
                     <Card className="shadow-md text-center">
                         <CardContent className="p-6">
                             <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                             <p className="text-muted-foreground">Detailed information not available for this temple at the moment.</p>
                         </CardContent>
                     </Card>
                 )}

                 {!isLoading && templeInfo && (
                     <div className='space-y-4'>
                        {/* Timings Card */}
                         <Card className="shadow-md">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary"/> Timings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1 text-sm">
                                 {templeInfo.timings.map((timing, index) => (
                                    <div key={index} className="grid grid-cols-[auto,1fr] gap-x-2">
                                         <span className="font-semibold">{timing.day}:</span>
                                         <div>
                                             {timing.darshan && <p>Darshan: {timing.darshan}</p>}
                                             {timing.general && <p>General: {timing.general}</p>}
                                         </div>
                                    </div>
                                ))}
                                <p className="text-xs text-muted-foreground pt-2">*Timings are indicative and subject to change.</p>
                            </CardContent>
                        </Card>

                         {/* Queue Status Card */}
                         <Card className="shadow-md">
                            <CardHeader>
                                 <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary"/> Live Queue Status</CardTitle>
                                 <CardDescription>Last Updated: {templeInfo.queueStatus.lastUpdated}</CardDescription>
                             </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                 {templeInfo.queueStatus.compartmentsFull > 0 && (
                                     <p><strong>Compartments Full:</strong> {templeInfo.queueStatus.compartmentsFull}</p>
                                 )}
                                <p><strong>Estimated Wait Time:</strong> <span className='font-semibold'>{templeInfo.queueStatus.estimatedWaitTime}</span></p>
                                 <p className="text-xs text-muted-foreground pt-2">*Wait time is an estimate and can vary significantly.</p>
                                 {/* Add AI Queue Prediction here later */}
                            </CardContent>
                        </Card>

                         {/* Special Notes Card */}
                        {templeInfo.specialNotes && templeInfo.specialNotes.length > 0 && (
                             <Card className="shadow-md">
                                <CardHeader>
                                     <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary"/> Important Notes</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                        {templeInfo.specialNotes.map((note, index) => <li key={index}>{note}</li>)}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                 )}
            </main>
        </div>
    );
}
