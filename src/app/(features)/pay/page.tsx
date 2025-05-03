
'use client';

import { useSearchParams, useRouter } from 'next/navigation'; // Import useRouter
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Lock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { processUpiPayment, UpiTransaction, verifyUpiId } from '@/services/upi'; // Use actual service, added verifyUpiId
import { addTransaction, Transaction } from '@/services/transactions'; // Use transaction service

// Helper to parse UPI URL (basic example)
const parseUpiUrl = (url: string): { payeeName?: string; payeeAddress?: string; amount?: string, note?: string } => {
    try {
        const decodedUrl = decodeURIComponent(url); // Decode first
        const params = new URLSearchParams(decodedUrl.substring(decodedUrl.indexOf('?') + 1));
        return {
            payeeName: params.get('pn') || undefined,
            payeeAddress: params.get('pa') || undefined,
            amount: params.get('am') || undefined,
            note: params.get('tn') || undefined, // Transaction Note
        };
    } catch (error) {
        console.error("Failed to parse UPI URL:", error);
        return {};
    }
};

export default function PaymentConfirmationPage() {
    const searchParams = useSearchParams();
    const router = useRouter(); // Initialize useRouter
    const { toast } = useToast();

    // State for payment details
    const [payeeName, setPayeeName] = useState<string>('Verifying Payee...');
    const [payeeAddress, setPayeeAddress] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [note, setNote] = useState<string>(''); // State for transaction note
    const [upiPin, setUpiPin] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true); // State for initial verification
    const [paymentResult, setPaymentResult] = useState<Transaction | null>(null); // Use Transaction interface
    const [error, setError] = useState<string | null>(null);

    // Extract details from URL parameters and verify UPI ID
    useEffect(() => {
        const directPayeeId = searchParams.get('pa');
        const directPayeeName = searchParams.get('pn');
        const directAmount = searchParams.get('am');
        const directNote = searchParams.get('tn'); // Get note from direct params too
        const upiData = searchParams.get('data'); // For scanned QR data

        let details = {
            payeeName: directPayeeName,
            payeeAddress: directPayeeId,
            amount: directAmount,
            note: directNote,
        };

        if (upiData) {
            const parsed = parseUpiUrl(upiData);
            details = { ...details, ...parsed }; // Parsed data can override direct params
        }

        if (!details.payeeAddress) {
            setError("Recipient UPI ID is missing.");
            toast({ variant: "destructive", title: "Error", description: "Recipient details incomplete." });
            setIsVerifying(false);
            return;
        }

        setPayeeAddress(details.payeeAddress);
        setAmount(details.amount || ''); // Set amount or empty string if missing
        setNote(details.note || ''); // Set note or empty string if missing
        setPayeeName(details.payeeName || 'Verifying Payee...'); // Initial name

        // Verify UPI ID
        const verifyRecipient = async (address: string) => {
            setIsVerifying(true);
            setError(null); // Clear previous errors
            try {
                 const verifiedName = await verifyUpiId(address);
                 setPayeeName(verifiedName); // Update with verified name
                 toast({ title: "Payee Verified", description: `Paying ${verifiedName}` });
            } catch (verificationError: any) {
                 console.error("UPI ID Verification failed:", verificationError);
                 setPayeeName('Verification Failed');
                 setError(`Could not verify UPI ID: ${address}. Please check and try again.`);
                 toast({ variant: "destructive", title: "Verification Failed", description: `Could not verify UPI ID: ${address}` });
            } finally {
                setIsVerifying(false);
            }
        };

        verifyRecipient(details.payeeAddress);

    }, [searchParams, toast]);

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payeeAddress || !amount || Number(amount) <= 0) {
            setError("Please enter a valid amount.");
            toast({ variant: "destructive", title: "Invalid Amount" });
            return;
        }
        if (upiPin.length !== 4 && upiPin.length !== 6) {
            setError("Please enter your 4 or 6 digit UPI PIN.");
            toast({ variant: "destructive", title: "Invalid UPI PIN" });
            return;
        }
        setError(null);
        setIsLoading(true);
        setPaymentResult(null);

        try {
            // Call the actual UPI service
            const result = await processUpiPayment(payeeAddress, Number(amount), upiPin, note || `Payment to ${payeeName}`);

            // Add transaction to history using the transaction service
            const historyEntry = addTransaction({
                type: result.status === 'Completed' ? 'Sent' : 'Failed',
                name: payeeName,
                description: note || `Payment to ${payeeName}${result.status !== 'Completed' ? ` (${result.status})` : ''}`,
                amount: -Number(amount), // Negative for sent/failed payment attempts
                status: result.status as Transaction['status'],
                upiId: payeeAddress,
                 // Assuming processUpiPayment returns a similar structure or can be mapped
                 // id: result.transactionId, // This should be handled by addTransaction
                 // date: new Date(), // This should be handled by addTransaction
                 // avatarSeed: payeeName, // This should be handled by addTransaction
            });

            setPaymentResult(historyEntry); // Display result using the Transaction interface structure

            if (result.status === 'Completed') {
                 toast({ title: "Payment Successful!", description: `₹${amount} sent to ${payeeName}. Transaction ID: ${result.transactionId}` });
                 // Redirect to home after a delay
                 setTimeout(() => router.push('/'), 2000);
            } else {
                 // Error handled in catch block, but set status here
                 setError(`Payment ${result.status.toLowerCase()}. Transaction ID: ${result.transactionId || 'N/A'}`);
                 toast({ variant: "destructive", title: `Payment ${result.status}`, description: `Failed to send ₹${amount} to ${payeeName}` });
            }
        } catch (err: any) {
             console.error("Payment failed:", err);
             const message = err.message || "Payment failed due to an unexpected error.";
             setError(message);

              // Add failed transaction to history
            const failedEntry = addTransaction({
                 type: 'Failed',
                 name: payeeName,
                 description: `Payment Failed - ${message}`,
                 amount: -Number(amount),
                 status: 'Failed',
                 upiId: payeeAddress,
             });
             setPaymentResult(failedEntry);
             toast({ variant: "destructive", title: "Payment Failed", description: message });
        } finally {
            setIsLoading(false);
            setUpiPin(''); // Clear PIN field after attempt
        }
    };

    // Determine if the payment button should be disabled
    const isPayDisabled = isLoading || isVerifying || !!error || !payeeAddress || !amount || Number(amount) <= 0;


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
                 // Use a disabled button or just remove the Link/Button
                 <Button variant="ghost" size="icon" className="text-primary-foreground opacity-50 cursor-not-allowed">
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
                 <Card className={`shadow-md border-2 ${paymentResult.status === 'Completed' ? 'border-green-500' : 'border-destructive'}`}>
                    <CardHeader className="items-center text-center">
                         <CardTitle className={`text-2xl ${paymentResult.status === 'Completed' ? 'text-green-600' : 'text-destructive'}`}>
                           Payment {paymentResult.status}
                        </CardTitle>
                        <CardDescription>
                             {paymentResult.status === 'Completed' ? `Successfully sent ₹${Math.abs(paymentResult.amount).toFixed(2)} to ${paymentResult.name}` : `Failed to send ₹${Math.abs(paymentResult.amount).toFixed(2)} to ${paymentResult.name}`}
                        </CardDescription>
                    </CardHeader>
                     <CardContent className="text-center space-y-4">
                         {paymentResult.status !== 'Completed' && <p className="text-sm text-destructive">{paymentResult.description}</p>}
                         <p className="text-xs text-muted-foreground">Transaction ID: {paymentResult.id}</p>
                         <Link href="/" passHref>
                             <Button className="w-full">Go to Home</Button>
                         </Link>
                          {paymentResult.status !== 'Completed' && (
                              <Button variant="outline" className="w-full" onClick={() => { setPaymentResult(null); setError(null); }}>Try Again</Button>
                          )}
                     </CardContent>
                 </Card>
            ) : (
                // Payment Confirmation View
                 <Card className="shadow-md">
                    <CardHeader className="items-center text-center">
                        <Avatar className="h-16 w-16 mb-2 border">
                             {/* Use a generic avatar or one based on seed */}
                            <AvatarImage src={`https://picsum.photos/seed/${payeeAddress}/80/80`} alt={payeeName} data-ai-hint="payee avatar"/>
                            <AvatarFallback>{payeeName.charAt(0)}</AvatarFallback>
                        </Avatar>
                         <CardTitle className="flex items-center gap-2">
                            Pay {payeeName}
                             {isVerifying && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                         </CardTitle>
                        <CardDescription>{payeeAddress}</CardDescription>
                         {error && !isVerifying && <p className="text-sm text-destructive pt-2">{error}</p>}
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePayment} className="space-y-6">
                            {/* Amount Display/Input */}
                             <div className="space-y-2 text-center">
                                <Label htmlFor="amount" className="text-sm text-muted-foreground">Amount to Pay</Label>
                                <div className="text-4xl font-bold flex items-center justify-center">
                                    <span className="mr-1">₹</span>
                                     {searchParams.get('am') ? ( // If amount was in params, display it
                                         <span>{Number(amount).toFixed(2)}</span>
                                     ) : ( // Otherwise allow input
                                         <Input
                                            id="amount"
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            required
                                            min="1"
                                            step="0.01"
                                            className="text-4xl font-bold h-auto p-0 border-0 text-center bg-transparent focus-visible:ring-0 shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none flex-grow w-32" // Limit width slightly
                                            placeholder="0.00"
                                            disabled={isLoading || isVerifying}
                                        />
                                     )}
                                </div>
                            </div>

                            {/* Note Input */}
                            <div className="space-y-2">
                                <Label htmlFor="note">Note (Optional)</Label>
                                <Input
                                    id="note"
                                    type="text"
                                    placeholder="Add a message"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    disabled={isLoading || isVerifying}
                                    maxLength={50} // UPI note limit
                                />
                            </div>


                            {/* Bank Account Selection (If multiple linked) */}
                            {/* Placeholder - Add account selection dropdown if needed */}
                            {/* <div className="space-y-2">
                                <Label htmlFor="account">Pay From</Label>
                                <Select defaultValue={defaultAccount.upiId} disabled={isLoading || isVerifying}>
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
                                disabled={isLoading || isVerifying || !!error} // Disable if verifying or error
                                />
                            </div>

                            {/* Display error message if exists */}
                            {error && <p className="text-sm text-destructive text-center">{error}</p>}


                            <Button type="submit" className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={isPayDisabled}>
                                {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                                </>
                                ) : isVerifying ? (
                                 <>
                                     <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
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

