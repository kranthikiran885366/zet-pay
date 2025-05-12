
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Clock, Users, CalendarDays, Loader2, Info } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { mockTemplesData, mockTempleInfoData } from '@/mock-data'; // Import centralized mock data

export interface TempleInfo { // Export for mock data file
    timings: { day: string; darshan: string; general: string }[];
    queueStatus: {
        compartmentsFull: number;
        estimatedWaitTime: string;
        lastUpdated: string;
    };
    specialNotes?: string[];
}

export default function TempleInfoPage() {
    const [selectedTemple, setSelectedTemple] = useState<string>('');
    const [templeInfo, setTempleInfo] = useState<TempleInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (selectedTemple) {
            setIsLoading(true);
            setTempleInfo(null);
            setTimeout(() => {
                const info = mockTempleInfoData[selectedTemple];
                setTempleInfo(info || null);
                 if (!info) {
                     toast({ description: "Information not available for this temple yet." });
                 }
                setIsLoading(false);
            }, 800);
        } else {
            setTempleInfo(null);
        }
    }, [selectedTemple, toast]); // Added toast to dependency array

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
                                {mockTemplesData.map(temple => <SelectItem key={temple.id} value={temple.id}>{temple.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </CardContent>
                 </Card>

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
                            </CardContent>
                        </Card>

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
