'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Video, WifiOff } from 'lucide-react';
import Link from 'next/link';

// Mock Data (Replace with actual API integration)
const mockLiveStreams = [
    { id: 'tirupati-live', templeId: 'tirupati', name: 'TTD Live Darshan (SVBC)', streamUrl: 'https://www.youtube.com/embed/live_stream?channel=UCsTjX_QIOXHr4n6I-vK2-ZA', description: 'Official live feed from Tirumala.' },
    { id: 'shirdi-live', templeId: 'shirdi', name: 'Shirdi Saibaba Live Darshan', streamUrl: 'https://www.youtube.com/embed/live_stream?channel=UCK50s3NQRrF-4-_LrX6SnVQ', description: 'Live broadcast from Shirdi.' },
    { id: 'vaishno-devi-aarti', templeId: 'vaishno-devi', name: 'Vaishno Devi Aarti (Live)', streamUrl: 'https://www.youtube.com/embed/live_stream?channel=UCLpjK3zmJkT_ZGYP5n0f07Q', description: 'Live Aarti broadcast from the shrine.' },
];
const mockTemples = [ // Reuse or fetch from a shared source
    { id: 'tirupati', name: 'Tirumala Tirupati Devasthanams (TTD)' },
    { id: 'shirdi', name: 'Shirdi Saibaba Sansthan Trust' },
    { id: 'vaishno-devi', name: 'Vaishno Devi Shrine Board' },
    { id: 'sabarimala', name: 'Sabarimala Temple (No Live Stream)' },
];

export default function LiveDarshanPage() {
    const [selectedTemple, setSelectedTemple] = useState<string>('');
    const liveStream = mockLiveStreams.find(stream => stream.templeId === selectedTemple);

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/temple" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Video className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Live Darshan</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Select Temple for Live Feed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select value={selectedTemple} onValueChange={setSelectedTemple} required>
                            <SelectTrigger><SelectValue placeholder="Select Temple" /></SelectTrigger>
                            <SelectContent>
                                {mockTemples.map(temple => <SelectItem key={temple.id} value={temple.id}>{temple.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {/* Live Stream Display */}
                {selectedTemple && (
                    <Card className="shadow-md mt-4">
                        <CardHeader>
                            <CardTitle>{liveStream ? liveStream.name : 'Live Stream'}</CardTitle>
                             <CardDescription>{liveStream ? liveStream.description : 'Select a temple to view the live feed.'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {liveStream ? (
                                <div className="aspect-video bg-black rounded-md overflow-hidden">
                                    {/* Embed YouTube Live Stream */}
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={liveStream.streamUrl}
                                        title="YouTube video player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        referrerPolicy="strict-origin-when-cross-origin"
                                        allowFullScreen>
                                    </iframe>
                                </div>
                            ) : (
                                <div className="aspect-video bg-muted rounded-md flex flex-col items-center justify-center text-center p-4">
                                     <WifiOff className="h-12 w-12 text-muted-foreground mb-2" />
                                     <p className="text-muted-foreground">Live stream not available for the selected temple.</p>
                                     <p className="text-xs text-muted-foreground mt-1">Please check the official temple website for updates.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
