
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Flame, Loader2, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { processBillPayment } from '@/services/bills';
import { mockLpgProvidersData, LpgProvider } from '@/mock-data'; 
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import type { Transaction } from '@/services/types';

export default function LpgBookingPage() {
    const [providers, setProviders] = useState<LpgProvider[]>(mockLpgProvidersData);
    const [selectedProvider, setSelectedProvider] = useState<string>('');
    const [identifier, setIdentifier] = useState('');
    // Amount for LPG is usually fixed or fetched, let's assume a fixed example or future fetch.
    const [amount, setAmount] = useState<string>("1000"); // Example fixed amount
    const [isLoading, setIsLoading] = useState(false); // For potential future provider fetching
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const providerDetails = providers.find(p => p.id === selectedProvider);

    const handleBookCylinder = async (e: React.FormEvent) => {
        e.preventDefault();
         if (!auth.currentUser) {
            toast({ variant: "destructive", title: "Not Logged In", description: "Please log in to book cylinder." });
            return;
        }
        if (!selectedProvider || !identifier) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select provider and enter your identifier." });
            return;
        }
        // Amount check can be more sophisticated if it's fetched/variable
        const bookingAmount = Number(amount) || providerDetails?.fixedPrice || 1000; // Use fixed price or default
        if (bookingAmount <= 0) {
             toast({ variant: "destructive", title: "Invalid Amount", description: "Booking amount is not set correctly." });
            return;
        }


        setIsProcessing(true);
        const providerName = providerDetails?.name || 'LPG Booking';
        try {
            const paymentDetails = {
                billerId: selectedProvider,
                identifier: identifier,
                amount: bookingAmount,
                billerType: 'LPG', // Specific type for LPG
                billerName: `LPG Booking - ${providerName}`,
            };
            const transactionResult = await processBillPayment(paymentDetails) as Transaction;

            if (transactionResult.status === 'Completed') {
                toast({ title: "Booking Successful!", description: `LPG cylinder booked for ${identifier} with ${providerName}. Refill expected soon. Txn ID: ${transactionResult.id}` });
                setIdentifier('');
                // setAmount(''); // Keep amount if it's fixed from provider
                router.push('/history');
            } else {
                throw new Error(transactionResult.description || `Booking ${transactionResult.status}`);
            }
        } catch (err: any) {
            console.error("LPG booking failed:", err);
            toast({ variant: "destructive", title: "Booking Failed", description: err.message || "Could not complete LPG cylinder booking." });
        } finally {
            setIsProcessing(false);
        }
    };
    
    // Update amount if provider has a fixed price
    useEffect(() => {
        if (providerDetails?.fixedPrice) {
            setAmount(providerDetails.fixedPrice.toString());
        } else if (providerDetails) { // If provider is selected but no fixed price, let user enter or default
             setAmount("1000"); // Default example if not fixed
        }
    }, [providerDetails]);


    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/services" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Flame className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Book LPG Cylinder</h1>
            </header>

            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Book Your LPG Refill</CardTitle>
                        <CardDescription>Select your gas provider and enter details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleBookCylinder} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="provider">Gas Provider</Label>
                                <Select value={selectedProvider} onValueChange={setSelectedProvider} required disabled={isLoading}>
                                    <SelectTrigger id="provider">
                                        <SelectValue placeholder={isLoading ? "Loading..." : "Select Provider"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {providers.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.logoUrl && <Image src={p.logoUrl} alt={p.name} width={16} height={16} className="inline-block mr-2 h-4 w-4 object-contain" data-ai-hint="gas provider logo"/>}
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {providerDetails && (
                                <div className="space-y-1">
                                    <Label htmlFor="identifier">{providerDetails.identifierLabel}</Label>
                                    <Input
                                        id="identifier"
                                        type="text"
                                        placeholder={providerDetails.identifierPlaceholder}
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <Label htmlFor="amount">Refill Amount (₹)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder="Refill Amount"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        required
                                        readOnly={!!providerDetails?.fixedPrice} // Readonly if fixed price
                                        className={`pl-7 ${providerDetails?.fixedPrice ? 'bg-muted/50' : ''}`}
                                    />
                                </div>
                                {providerDetails?.fixedPrice && <p className="text-xs text-muted-foreground">Amount is fixed by the provider.</p>}
                            </div>


                            <div className="pt-4">
                                <Separator className="mb-4"/>
                                <Button
                                    type="submit"
                                    className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                    disabled={isProcessing || !selectedProvider || !identifier || !amount || Number(amount) <= 0}
                                >
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    {isProcessing ? 'Processing...' : `Book & Pay for Cylinder`}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
