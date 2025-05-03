
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react'; // Import useRef
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Lock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { processUpiPayment, UpiTransaction, verifyUpiId, getLinkedAccounts, BankAccount } from '@/services/upi'; // Use actual service
import { addTransaction, Transaction } from '@/services/transactions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"; // For PIN prompt


// Helper to parse UPI URL (basic example)
const parseUpiUrl = (url: string): { payeeName?: string; payeeAddress?: string; amount?: string, note?: string } => {
    try {
        const decodedUrl = decodeURIComponent(url);
        const params = new URLSearchParams(decodedUrl.substring(decodedUrl.indexOf('?') + 1));
        return {
            payeeName: params.get('pn') || undefined,
            payeeAddress: params.get('pa') || undefined,
            amount: params.get('am') || undefined,
            note: params.get('tn') || undefined,
        };
    } catch (error) {
        console.error("Failed to parse UPI URL:", error);
        return {};
    }
};

export default function PaymentConfirmationPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    // State for payment details
    const [payeeName, setPayeeName] = useState<string>('Verifying Payee...');
    const [payeeAddress, setPayeeAddress] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [note, setNote] = useState<string>('');
    const [upiPin, setUpiPin] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    const [paymentResult, setPaymentResult] = useState<Transaction | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<BankAccount[]>([]); // State for linked accounts
    const [selectedAccountUpiId, setSelectedAccountUpiId] = useState<string>(''); // State for selected account
    const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
    const pinPromiseResolverRef = useRef<{ resolve: (pin: string | null) => void } | null>(null);

    // Fetch linked accounts and set default
    useEffect(() => {
        const fetchUserAccounts = async () => {
             try {
                 const userAccounts = await getLinkedAccounts();
                 setAccounts(userAccounts);
                 const defaultAccount = userAccounts.find(acc => acc.isDefault);
                 setSelectedAccountUpiId(defaultAccount?.upiId || userAccounts[0]?.upiId || '');
             } catch (accError) {
                 console.error("Failed to fetch accounts for payment:", accError);
                 setError("Could not load your payment accounts.");
                 toast({ variant: "destructive", title: "Error", description: "Could not load payment accounts." });
             }
         };
         fetchUserAccounts();
    }, [toast]);


    // Extract details from URL parameters and verify UPI ID
    useEffect(() => {
        const directPayeeId = searchParams.get('pa');
        const directPayeeName = searchParams.get('pn');
        const directAmount = searchParams.get('am');
        const directNote = searchParams.get('tn');
        const upiData = searchParams.get('data');

        let details = {
            payeeName: directPayeeName,
            payeeAddress: directPayeeId,
            amount: directAmount,
            note: directNote,
        };

        if (upiData) {
            const parsed = parseUpiUrl(upiData);
            details = { ...details, ...parsed };
        }

        if (!details.payeeAddress) {
            setError("Recipient UPI ID is missing.");
            toast({ variant: "destructive", title: "Error", description: "Recipient details incomplete." });
            setIsVerifying(false);
            return;
        }

        setPayeeAddress(details.payeeAddress);
        setAmount(details.amount || '');
        setNote(details.note || '');
        setPayeeName(details.payeeName || 'Verifying Payee...');

        // Verify UPI ID
        const verifyRecipient = async (address: string) => {
            setIsVerifying(true);
            setError(null);
            try {
                 const verifiedName = await verifyUpiId(address);
                 setPayeeName(verifiedName);
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

    // Function to show PIN dialog and return a Promise
    const promptForPin = (): Promise<string | null> => {
        return new Promise((resolve) => {
            setUpiPin(''); // Clear previous PIN
            pinPromiseResolverRef.current = { resolve }; // Store the resolver
            setIsPinDialogOpen(true);
        });
    };

    const handlePinSubmit = () => {
        if ((upiPin.length === 4 || upiPin.length === 6) && pinPromiseResolverRef.current) {
            pinPromiseResolverRef.current.resolve(upiPin);
            pinPromiseResolverRef.current = null;
            setIsPinDialogOpen(false);
        } else {
            toast({ variant: "destructive", title: "Invalid PIN", description: "Please enter a 4 or 6 digit UPI PIN." });
        }
    };

    const handlePinCancel = () => {
        if (pinPromiseResolverRef.current) {
            pinPromiseResolverRef.current.resolve(null); // Resolve with null on cancel
            pinPromiseResolverRef.current = null;
        }
        setIsPinDialogOpen(false);
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payeeAddress || !amount || Number(amount) <= 0) {
            setError("Please enter a valid amount.");
            toast({ variant: "destructive", title: "Invalid Amount" });
            return;
        }
         if (!selectedAccountUpiId) {
             setError("Please select a bank account to pay from.");
             toast({ variant: "destructive", title: "Account Not Selected" });
             return;
         }

        setError(null);
        setIsLoading(true);
        setPaymentResult(null);

        try {
             // Prompt for PIN
             const enteredPin = await promptForPin();
             if (enteredPin === null) {
                 toast({ title: "Payment Cancelled", description: "PIN entry was cancelled." });
                 setIsLoading(false);
                 return;
             }

            // Call the actual UPI service with selected account (implicitly handled by SDK usually)
            const result = await processUpiPayment(payeeAddress, Number(amount), enteredPin, note || `Payment to ${payeeName}`);

            // Add transaction to Firestore history using the transaction service
            const historyEntry = await addTransaction({
                type: result.status === 'Completed' ? 'Sent' : 'Failed',
                name: payeeName,
                description: note || `Payment to ${payeeName}${result.status !== 'Completed' ? ` (${result.status} - ${result.message || ''})` : ''}`,
                amount: -Number(amount),
                status: result.status as Transaction['status'],
                upiId: payeeAddress,
                billerId: undefined, // Not applicable
            });

            setPaymentResult(historyEntry);

            if (result.status === 'Completed') {
                 toast({ title: "Payment Successful!", description: `₹${amount} sent to ${payeeName}. Transaction ID: ${result.transactionId}` });
                 setTimeout(() => router.push('/'), 2000);
            } else {
                 setError(`Payment ${result.status.toLowerCase()}. ${result.message || ''}`);
                 toast({ variant: "destructive", title: `Payment ${result.status}`, description: result.message || `Failed to send ₹${amount} to ${payeeName}` });
            }
        } catch (err: any) {
             console.error("Payment failed:", err);
             const message = err.message || "Payment failed due to an unexpected error.";
             setError(message);

             // Add failed transaction to history
              try {
                const failedEntry = await addTransaction({
                     type: 'Failed',
                     name: payeeName,
                     description: `Payment Failed - ${message}`,
                     amount: -Number(amount),
                     status: 'Failed',
                     upiId: payeeAddress,
                     billerId: undefined,
                 });
                  setPaymentResult(failedEntry);
             } catch (historyError) {
                 console.error("Failed to log failed transaction:", historyError);
                 setPaymentResult({ // Fallback local result display
                     id: `local_${Date.now()}`,
                     type: 'Failed',
                     name: payeeName,
                     description: `Payment Failed - ${message} (History logging failed)`,
                     amount: -Number(amount),
                     status: 'Failed',
                     date: new Date(),
                     avatarSeed: payeeName,
                     userId: 'local', // Indicate it wasn't saved properly
                     upiId: payeeAddress,
                 })
             }

             toast({ variant: "destructive", title: "Payment Failed", description: message });
        } finally {
            setIsLoading(false);
            setUpiPin(''); // Clear PIN field after attempt
        }
    };

    // Determine if the payment button should be disabled
    const isPayDisabled = isLoading || isVerifying || !!error || !payeeAddress || !amount || Number(amount) <= 0 || !selectedAccountUpiId;


    return (
    <div className="min-h-screen bg-secondary flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
            { !isLoading && paymentResult?.status !== 'Completed' ? (
                 <Link href="/" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
            ) : (
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
                            <AvatarImage src={`https://picsum.photos/seed/${payeeAddress}/80/80`} alt={payeeName} data-ai-hint="payee avatar"/>
                            <AvatarFallback>{payeeName.charAt(0) || '?'}</AvatarFallback>
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
                                     {searchParams.get('am') ? (
                                         <span>{Number(amount).toFixed(2)}</span>
                                     ) : (
                                         <Input
                                            id="amount"
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            required
                                            min="1"
                                            step="0.01"
                                            className="text-4xl font-bold h-auto p-0 border-0 text-center bg-transparent focus-visible:ring-0 shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none flex-grow w-32"
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
                                    maxLength={50}
                                />
                            </div>


                            {/* Bank Account Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="account">Pay From</Label>
                                <Select value={selectedAccountUpiId} onValueChange={setSelectedAccountUpiId} disabled={isLoading || isVerifying || accounts.length === 0}>
                                    <SelectTrigger id="account">
                                        <SelectValue placeholder={accounts.length > 0 ? "Select account" : "No accounts linked"}/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.map(acc => (
                                             <SelectItem key={acc.upiId} value={acc.upiId}>
                                                 {acc.bankName} - {acc.accountNumber}
                                             </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>


                             {/* UPI PIN Input is now in a dialog triggered by the button */}
                            {/* <div className="space-y-2">
                                <Label htmlFor="upi-pin">Enter UPI PIN</Label>
                                <Input ... />
                            </div> */}

                            {/* Display error message if exists */}
                            {error && !isVerifying && <p className="text-sm text-destructive text-center">{error}</p>}


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

        {/* UPI PIN Dialog */}
        <AlertDialog open={isPinDialogOpen} onOpenChange={(open) => { if (!open) handlePinCancel(); }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Enter UPI PIN</AlertDialogTitle>
                    <AlertDialogDescription>
                        Enter your 4 or 6 digit UPI PIN to authorize this payment of ₹{Number(amount).toFixed(2)} to {payeeName}.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                    <Label htmlFor="pin-input-dialog" className="sr-only">UPI PIN</Label>
                    <Input
                        id="pin-input-dialog"
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={upiPin}
                        onChange={(e) => setUpiPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="text-center text-xl tracking-[0.3em]"
                        placeholder="****"
                        autoFocus
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handlePinCancel}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePinSubmit} disabled={upiPin.length !== 4 && upiPin.length !== 6}>
                        <Lock className="mr-2 h-4 w-4" /> Confirm Payment
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
    );
}

      