
'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Lock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { processUpiPayment, UpiTransaction } from '@/services/upi'; // Use actual service

// Helper to parse UPI URL (basic example)
const parseUpiUrl = (url: string): { payeeName?: string; payeeAddress?: string; amount?: string } => {
    try {
        const params = new URLSearchParams(url.substring(url.indexOf('?') + 1));
        return {
            payeeName: params.get('pn') || undefined,
            payeeAddress: params.get('pa') || undefined,
            amount: params.get('am') || undefined,
        };
    } catch (error) {
        console.error("Failed to parse UPI URL:", error);
        return {};
    }
};

export default function PaymentConfirmationPage() {
    const searchParams = useSearchParams();
    const { toast } = useToast();

    // State for payment details
    const [payeeName, setPayeeName] = useState<string>('Unknown Payee');
    const [payeeAddress, setPayeeAddress] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [upiPin, setUpiPin] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [paymentResult, setPaymentResult] = useState<UpiTransaction | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Extract details from URL parameters
    useEffect(() => {
        // Priority: payeeId, payeeName, amount can come directly
        const directPayeeId = searchParams.get('pa');
        const directPayeeName = searchParams.get('pn');
        const directAmount = searchParams.get('am');
        const upiData = searchParams.get('data'); // For scanned QR data

        let details = {
            payeeName: directPayeeName,
            payeeAddress: directPayeeId,
            amount: directAmount,
        };

        if (upiData) {
            const parsed = parseUpiUrl(decodeURIComponent(upiData));
            details = { ...details, ...parsed }; // Parsed data can override direct params if present in QR
        }

        if (!details.payeeAddress) {
            setError("Recipient UPI ID is missing.");
            toast({ variant: "destructive", title: "Error", description: "Recipient details incomplete." });
            // Consider redirecting back or showing a more prominent error
        } else {
             setPayeeAddress(details.payeeAddress);
             setPayeeName(details.payeeName || 'Payee'); // Fallback name
        }


        if (details.amount) {
            setAmount(details.amount);
        } else {
             // If amount is not in params, it might need manual entry (though less common for QR/direct sends)
             // For now, assume amount is required from the source
             // setError("Amount is missing.");
             // toast({ variant: "destructive", title: "Error", description: "Payment amount not specified." });
        }

    }, [searchParams, toast]);

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payeeAddress || !amount || Number(amount) <= 0 || upiPin.length !== 4 && upiPin.length !== 6) { // Basic PIN length validation
            setError("Please enter a valid amount and your 4 or 6 digit UPI PIN.");
            toast({ variant: "destructive", title: "Invalid Input" });
            return;
        }
        setError(null);
        setIsLoading(true);
        setPaymentResult(null);

        try {
            const result = await processUpiPayment(payeeAddress, Number(amount), upiPin);
            setPaymentResult(result);
            if (result.status === 'Completed') {
                 toast({ title: "Payment Successful!", description: `₹${amount} sent to ${payeeName}. Transaction ID: ${result.transactionId}` });
                 // Optionally redirect to a success screen after a delay
                 // setTimeout(() => router.push('/'), 3000);
            } else {
                throw new Error(`Payment ${result.status.toLowerCase()}. Transaction ID: ${result.transactionId}`);
            }
        } catch (err: any) {
             console.error("Payment failed:", err);
             const message = err.message || "Payment failed due to an unexpected error.";
             setError(message);
             setPaymentResult({ // Mock failed result for UI display
                 transactionId: 'N/A',
                 amount: Number(amount),
                 recipientUpiId: payeeAddress,
                 status: 'Failed'
             });
             toast({ variant: "destructive", title: "Payment Failed", description: message });
        } finally {
            setIsLoading(false);
            setUpiPin(''); // Clear PIN field after attempt
        }
    };

    return (
    <div className="min-h-screen bg-secondary flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
            {/* Allow going back only if payment not attempted/successful */}
            { !isLoading && paymentResult?.status !== 'Completed' ? (
                 <Link href="/" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
            ) : (
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80 opacity-50 cursor-not-allowed">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            )}

            <Send className="h-6 w-6" />
            <h1 className="text-lg font-semibold">Confirm Payment</h1>
        </header>

        {/* Main Content */}
        <main className="flex-grow p-4">
            {paymentResult ? (
                // Payment Result View
                 <Card className={`shadow-md ${paymentResult.status === 'Completed' ? 'border-green-500' : 'border-destructive'}`}>
                    <CardHeader className="items-center text-center">
                         <CardTitle className={`text-2xl ${paymentResult.status === 'Completed' ? 'text-green-600' : 'text-destructive'}`}>
                           Payment {paymentResult.status}
                        </CardTitle>
                        <CardDescription>
                             {paymentResult.status === 'Completed' ? `Successfully sent ₹${paymentResult.amount.toFixed(2)} to ${payeeName}` : `Failed to send ₹${paymentResult.amount.toFixed(2)} to ${payeeName}`}
                        </CardDescription>
                    </CardHeader>
                     <CardContent className="text-center space-y-4">
                         {paymentResult.status === 'Failed' && error && <p className="text-sm text-destructive">{error}</p>}
                         <p className="text-xs text-muted-foreground">Transaction ID: {paymentResult.transactionId}</p>
                         <Link href="/" passHref>
                             <Button className="w-full">Go to Home</Button>
                         </Link>
                          {paymentResult.status === 'Failed' && (
                              <Button variant="outline" className="w-full" onClick={() => { setPaymentResult(null); setError(null); }}>Try Again</Button>
                          )}
                     </CardContent>
                 </Card>
            ) : (
                // Payment Confirmation View
                 <Card className="shadow-md">
                    <CardHeader className="items-center text-center">
                        <Avatar className="h-16 w-16 mb-2">
                            {/* Placeholder Avatar - could fetch logo based on UPI ID domain */}
                            <AvatarImage src={`https://picsum.photos/seed/${payeeAddress}/80/80`} alt={payeeName} data-ai-hint="payee avatar"/>
                            <AvatarFallback>{payeeName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <CardTitle>Pay {payeeName}</CardTitle>
                        <CardDescription>{payeeAddress}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePayment} className="space-y-6">
                            {/* Amount Display/Input */}
                             <div className="space-y-2 text-center">
                                <Label htmlFor="amount" className="text-sm text-muted-foreground">Amount to Pay</Label>
                                <div className="text-4xl font-bold">
                                    ₹
                                     {searchParams.get('am') ? ( // If amount was in params, display it
                                         <span>{Number(amount).toFixed(2)}</span>
                                     ) : ( // Otherwise allow input (though this flow might be less common)
                                         <Input
                                            id="amount"
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            required
                                            min="1"
                                            step="0.01"
                                            className="text-4xl font-bold h-auto p-0 border-0 text-center bg-transparent focus-visible:ring-0 shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            placeholder="0.00"
                                            disabled={isLoading}
                                        />
                                     )}
                                </div>
                            </div>

                            {/* Bank Account Selection (If multiple linked) */}
                            {/* TODO: Add account selection dropdown if needed */}
                            {/* <div className="space-y-2">
                                <Label htmlFor="account">Pay From</Label>
                                <Select defaultValue={defaultAccount.upiId}>
                                    <SelectTrigger id="account"> <SelectValue placeholder="Select account"/> </SelectTrigger>
                                    <SelectContent> ... options ... </SelectContent>
                                </Select>
                            </div> */}

                            {/* UPI PIN Input */}
                            <div className="space-y-2">
                                <Label htmlFor="upi-pin">Enter UPI PIN</Label>
                                <Input
                                id="upi-pin"
                                type="password" // Use password for masking
                                inputMode="numeric" // Hint for numeric keyboard
                                value={upiPin}
                                onChange={(e) => setUpiPin(e.target.value.replace(/\D/g, '').slice(0, 6))} // Allow only digits, max 6
                                placeholder="Enter 4 or 6 digit PIN"
                                required
                                maxLength={6}
                                className="text-center tracking-[0.3em]" // Center and add spacing for PIN look
                                disabled={isLoading}
                                />
                            </div>

                            {error && <p className="text-sm text-destructive text-center">{error}</p>}

                            <Button type="submit" className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={isLoading || !payeeAddress || !amount || Number(amount) <= 0}>
                                {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                                </>
                                ) : (
                                <>
                                    <Lock className="mr-2 h-4 w-4" /> Proceed to Pay
                                </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}
        </main>
    </div>
    );
}
