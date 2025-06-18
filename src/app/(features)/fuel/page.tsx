'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Fuel as FuelIcon, Loader2, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { processFuelPayment } from '@/services/payments'; 
import type { Transaction } from '@/services/types';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';

export default function FuelPaymentPage() {
    const [amount, setAmount] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
         if (!auth.currentUser) {
            toast({ variant: "destructive", title: "Not Logged In", description: "Please log in to make payments." });
            return;
        }
        if (!amount || Number(amount) <= 0) {
            toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid amount for fuel payment." });
            return;
        }
        setIsProcessing(true);
        try {
            const result = await processFuelPayment(Number(amount));
            if (result && result.status === 'Completed') {
                toast({ title: "Fuel Payment Successful!", description: `Paid ₹${amount} for fuel. Transaction ID: ${result.id}` });
                setAmount('');
                router.push('/history');
            } else {
                throw new Error(result?.description || "Fuel payment failed. Please check history for details.");
            }
        } catch (err: any) {
            console.error("Fuel payment failed:", err);
            toast({ variant: "destructive", title: "Payment Failed", description: err.message || "Could not complete fuel payment." });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/services" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <FuelIcon className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Fuel Payment</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Pay for Fuel</CardTitle>
                        <CardDescription>Enter the amount to pay at the fuel station.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePayment} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="amount">Amount (₹)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder="Enter Fuel Amount"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        required
                                        min="1"
                                        step="0.01"
                                        className="pl-7 text-xl font-semibold h-12"
                                    />
                                </div>
                            </div>
                            {/* Add payment method selection here if needed in future */}
                            <div className="pt-4">
                                <Separator className="mb-4"/>
                                <Button
                                    type="submit"
                                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                                    disabled={isProcessing || !amount || Number(amount) <= 0}
                                >
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    {isProcessing ? 'Processing...' : `Pay for Fuel`}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
                 <Card className="shadow-md border-blue-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-700">How it works</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-1">
                        <p>1. Ask the fuel station attendant for the total amount.</p>
                        <p>2. Enter the amount above and tap "Pay for Fuel".</p>
                        <p>3. Show the confirmation screen to the attendant.</p>
                        <p className="text-xs mt-2">(This currently uses your default payment method. QR/Specific provider integration coming soon!)</p>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}