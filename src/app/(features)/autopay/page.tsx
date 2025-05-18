'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Repeat, PlusCircle, Trash2, Loader2, Info, Banknote, CalendarDays, AlertCircle, UserLock } from 'lucide-react'; // Added UserLock
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { getMandates, cancelMandate, Mandate } from '@/services/autopay'; // Import service
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { auth } from '@/lib/firebase'; // Import auth

export default function AutopayPage() {
    const [mandates, setMandates] = useState<Mandate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCancelling, setIsCancelling] = useState<string | null>(null); // Track which mandate is being cancelled
    const [authError, setAuthError] = useState<string | null>(null); // State for auth-specific errors
    const { toast } = useToast();

    // Fetch mandates on mount
    useEffect(() => {
        const fetchMandates = async () => {
            setIsLoading(true);
            setAuthError(null); // Reset auth error

            if (!auth.currentUser) {
                console.log("[AutopayPage] User not logged in. Skipping mandate fetch.");
                setAuthError("Please log in to view your Autopay mandates.");
                setIsLoading(false);
                setMandates([]);
                return;
            }

            try {
                const fetchedMandates = await getMandates();
                setMandates(fetchedMandates);
            } catch (error: any) {
                console.error("Failed to fetch mandates:", error);
                if (error.message === "User not authenticated.") {
                    setAuthError("Authentication error. Please log in again.");
                } else {
                    toast({ variant: "destructive", title: "Error Loading Mandates", description: error.message || "Could not load autopay mandates." });
                }
                setMandates([]); // Clear mandates on error
            } finally {
                setIsLoading(false);
            }
        };
        fetchMandates();
    }, [toast]);

    const handleCancelMandate = async (mandateId: string) => {
        setIsCancelling(mandateId);
        try {
            // No need to call cancelMandate from service if it's just a placeholder
            // const success = await cancelMandate(mandateId); 
            // Simulate backend call
            await new Promise(resolve => setTimeout(resolve, 1000));
            const success = true; // Assume success for mock

            if (success) {
                setMandates(prev => prev.map(m => m.id === mandateId ? { ...m, status: 'Cancelled' } : m));
                toast({ title: "Mandate Cancelled", description: `Mandate ID ${mandateId} has been cancelled.` });
            } else {
                throw new Error("Cancellation failed via service.");
            }
        } catch (error: any) {
            console.error("Failed to cancel mandate:", error);
            toast({ variant: "destructive", title: "Cancellation Failed", description: error.message || "Could not cancel the mandate." });
        } finally {
            setIsCancelling(null);
        }
    };

     const getStatusBadgeVariant = (status: Mandate['status']): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'Active': return 'default';
            case 'Paused': return 'secondary';
            case 'Cancelled': return 'outline';
            case 'Failed': return 'destructive';
            default: return 'secondary';
        }
    }

    const getStatusBadgeColor = (status: Mandate['status']): string => {
         switch (status) {
            case 'Active': return 'bg-green-100 text-green-700';
            case 'Paused': return 'bg-yellow-100 text-yellow-700';
            case 'Cancelled': return 'text-muted-foreground';
            case 'Failed': return 'bg-red-100 text-red-700';
            case 'Pending Approval': return 'bg-blue-100 text-blue-700';
            default: return '';
        }
    }


    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/profile/upi" passHref> {/* Or link back to profile */}
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Repeat className="h-6 w-6" />
                <h1 className="text-lg font-semibold">UPI Autopay Mandates</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-6 pb-20">
                 <Button className="w-full" variant="outline" onClick={() => alert("Setup New Mandate Flow (Not Implemented)")}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Setup New Autopay
                </Button>

                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Your Active &amp; Past Mandates</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoading && (
                            <div className="flex justify-center p-6">
                                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                            </div>
                        )}

                        {!isLoading && authError && (
                            <div className="text-center py-6 text-muted-foreground">
                                <UserLock className="h-12 w-12 mx-auto mb-3 text-destructive" />
                                <p>{authError}</p>
                                <Link href="/login" passHref>
                                    <Button variant="link" className="mt-2">Login Now</Button>
                                </Link>
                            </div>
                        )}

                        {!isLoading && !authError && mandates.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-6">You have no active or past Autopay mandates.</p>
                        )}

                        {!isLoading && !authError && mandates.map(mandate => (
                             <Card key={mandate.id} className="p-4 border shadow-sm relative overflow-hidden">
                                <div className="flex justify-between items-start mb-2">
                                     <div>
                                        <p className="font-semibold">{mandate.merchantName}</p>
                                        <p className="text-xs text-muted-foreground">Mandate ID: {mandate.mandateUrn || mandate.id}</p>
                                     </div>
                                     <Badge variant={getStatusBadgeVariant(mandate.status)} className={`text-xs ${getStatusBadgeColor(mandate.status)}`}>{mandate.status}</Badge>
                                </div>

                                <Separator className="my-2"/>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                     <div className="flex items-center gap-1"><Banknote className="h-4 w-4 text-muted-foreground"/> Max Amount:</div>
                                     <div className="font-medium text-right">₹{mandate.maxAmount.toLocaleString()}</div>

                                     <div className="flex items-center gap-1"><Repeat className="h-4 w-4 text-muted-foreground"/> Frequency:</div>
                                     <div className="font-medium text-right capitalize">{mandate.frequency.toLowerCase()}</div>

                                     <div className="flex items-center gap-1"><CalendarDays className="h-4 w-4 text-muted-foreground"/> Valid Until:</div>
                                      <div className="font-medium text-right">{format(new Date(mandate.validUntil), 'PPP')}</div>

                                       <div className="flex items-center gap-1"><Info className="h-4 w-4 text-muted-foreground"/> UPI ID:</div>
                                      <div className="font-medium text-right truncate">{mandate.upiId}</div>
                                 </div>

                                 {mandate.status === 'Active' && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button
                                                variant="destructive"
                                                size="sm"
                                                className="w-full mt-4 h-8 text-xs"
                                                disabled={isCancelling === mandate.id}
                                             >
                                                {isCancelling === mandate.id ? <Loader2 className="h-4 w-4 animate-spin mr-1"/> : <Trash2 className="h-4 w-4 mr-1"/>}
                                                Cancel Mandate
                                             </Button>
                                        </AlertDialogTrigger>
                                         <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Cancel Autopay Mandate?</AlertDialogTitle>
                                                 <AlertDialogDescription>
                                                     Are you sure you want to cancel the autopay mandate for "{mandate.merchantName}" (ID: {mandate.mandateUrn || mandate.id})? Payments will no longer be automatically debited.
                                                 </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Keep Mandate</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleCancelMandate(mandate.id!)} className="bg-destructive hover:bg-destructive/90">Confirm Cancellation</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                 )}

                                {isCancelling === mandate.id && (
                                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                 )}

                            </Card>
                        ))}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
