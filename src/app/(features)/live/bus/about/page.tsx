'use client';

import Link from 'next/link';
import { ArrowLeft, BadgeInfo } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { nbsAboutText } from '@/mock-data/liveTracking';

export default function AboutNbsPage() {
    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-2 shadow-md">
                <Link href="/live/bus" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <BadgeInfo className="h-6 w-6" />
                <h1 className="text-lg font-semibold">About National Bus Services</h1>
            </header>

            <main className="flex-grow p-4">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="text-xl">National Bus Services (NBS)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[calc(100vh-200px)] pr-3"> {/* Adjust height as needed */}
                            <div
                                className="text-sm text-muted-foreground whitespace-pre-line space-y-3"
                                dangerouslySetInnerHTML={{ __html: nbsAboutText.replace(/\n\n/g, '<br/><br/>').replace(/\n- /g, '<br/>- ') }}
                            />
                        </ScrollArea>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
