
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Ticket, Download, RefreshCw, Loader2, Info, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { mockPurchasedPassesData, PurchasedPass } from '@/mock-data'; // Import centralized mock data

export default function MyBusPassesPage() {
    const [passes, setPasses] = useState<PurchasedPass[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchPasses = async () => {
        setIsLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const sortedPasses = mockPurchasedPassesData.sort((a, b) => {
                const statusOrder = { 'Active': 1, 'Pending Verification': 2, 'Rejected': 3, 'Expired': 4 };
                if (statusOrder[a.status] !== statusOrder[b.status]) {
                    return statusOrder[a.status] - statusOrder[b.status];
                }
                return new Date(b.validUntil).getTime() - new Date(a.validUntil).getTime();
            });
            setPasses(sortedPasses);
        } catch (error) {
            console.error("Failed to fetch passes:", error);
            toast({ variant: "destructive", title: "Could not load your passes." });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPasses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDownloadPass = (pass: PurchasedPass) => {
        if (!pass.downloadUrl) {
            toast({ variant: "destructive", title: "Download Not Available" });
            return;
        }
        window.open(pass.downloadUrl, '_blank');
        toast({ title: "Downloading Pass...", description: `${pass.passName} for ${pass.passengerName}` });
    };

    const getStatusBadgeVariant = (status: PurchasedPass['status']): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'Active': return 'default';
            case 'Pending Verification': return 'secondary';
            case 'Expired': return 'outline';
            case 'Rejected': return 'destructive';
            default: return 'outline';
        }
    }

    const getStatusBadgeColor = (status: PurchasedPass['status']): string => {
         switch (status) {
            case 'Active': return 'bg-green-100 text-green-700';
            case 'Pending Verification': return 'bg-yellow-100 text-yellow-700';
            case 'Expired': return 'text-muted-foreground';
            case 'Rejected': return 'bg-red-100 text-red-700';
            default: return '';
        }
    }

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/passes/bus" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Ticket className="h-6 w-6" />
                <h1 className="text-lg font-semibold">My Bus Passes</h1>
                 <Button variant="ghost" size="icon" className="ml-auto text-primary-foreground hover:bg-primary/80" onClick={fetchPasses} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                 </Button>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                {isLoading && (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-2 text-muted-foreground">Loading passes...</p>
                    </div>
                )}
                
                 {!isLoading && passes.length === 0 && (
                    <Card className="shadow-md text-center">
                         <CardContent className="p-6">
                             <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                             <p className="text-muted-foreground mb-4">You don't have any bus passes yet.</p>
                             <Link href="/passes/bus" passHref>
                                <Button>Apply for a New Pass</Button>
                            </Link>
                         </CardContent>
                     </Card>
                )}
                
                {!isLoading && passes.map((pass) => (
                    <Card key={pass.purchaseId} className="shadow-md overflow-hidden">
                        <CardHeader className="flex flex-row items-start justify-between gap-4 bg-background p-4 border-b">
                            <div className="flex items-center gap-3">
                                {pass.operatorLogo ? (
                                    <Image src={pass.operatorLogo} alt={pass.operatorName} width={40} height={40} className="h-10 w-10 rounded-full object-contain border bg-white p-0.5" />
                                ) : (
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                        <Ticket className="h-5 w-5" />
                                    </div>
                                )}
                                <div>
                                    <CardTitle className="text-base">{pass.operatorName} - {pass.passName}</CardTitle>
                                     <CardDescription className="text-xs">For: {pass.passengerName}</CardDescription>
                                </div>
                            </div>
                             <Badge variant={getStatusBadgeVariant(pass.status)} className={`text-xs ${getStatusBadgeColor(pass.status)}`}>{pass.status}</Badge>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                             <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Valid From:</span>
                                <span className="font-medium">{format(new Date(pass.validFrom), 'PPP')}</span>
                            </div>
                             <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Valid Until:</span>
                                <span className="font-medium">{format(new Date(pass.validUntil), 'PPP')}</span>
                            </div>
                             {pass.status === 'Pending Verification' && (
                                <div className="text-xs text-yellow-700 flex items-center gap-1"><Info className="h-3 w-3"/>Verification may take 1-2 working days.</div>
                            )}
                             {pass.status === 'Rejected' && (
                                <div className="text-xs text-destructive flex items-center gap-1"><Info className="h-3 w-3"/>Application rejected. Please check details and re-apply.</div>
                            )}
                             
                            <div className="flex gap-2 mt-3">
                                 <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    disabled={pass.status !== 'Active' || !pass.qrCodeData}
                                    onClick={() => alert(`Showing QR Code for pass ${pass.purchaseId}`)}
                                >
                                    Show QR Code
                                </Button>
                                 <Button
                                    variant="secondary"
                                    size="sm"
                                    className="flex-1"
                                    disabled={!pass.downloadUrl || pass.status === 'Pending Verification'}
                                    onClick={() => handleDownloadPass(pass)}
                                >
                                    <Download className="mr-2 h-4 w-4" /> Download Pass
                                </Button>
                            </div>
                            
                        </CardContent>
                    </Card>
                ))}
            </main>
        </div>
    );
}
