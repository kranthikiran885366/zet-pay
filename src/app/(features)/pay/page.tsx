
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Lock, Loader2, CheckCircle, XCircle, Info, Wallet } from 'lucide-react'; // Added Wallet
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { processUpiPayment, verifyUpiId, getLinkedAccounts, BankAccount } from '@/services/upi';
import { addTransaction, Transaction } from '@/services/transactions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { auth } from '@/lib/firebase'; // Import auth
import { format } from "date-fns"; // Import format

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
    const [isLoading, setIsLoading] = useState(false); // General loading state for async operations like verify/pay
    const [isVerifying, setIsVerifying] = useState(true); // Specifically for UPI ID verification
    const [paymentResult, setPaymentResult] = useState<Transaction | null>(null); // Store final transaction outcome
    const [error, setError] = useState<string | null>(null); // Store general error messages
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [selectedAccountUpiId, setSelectedAccountUpiId] = useState<string>('');
    const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
    const pinPromiseResolverRef = useRef<{ resolve: (pin: string | null) => void } | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const [userId, setUserId] = useState<string | null>(null); // Store user ID

    // Check login status
    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            const loggedIn = !!user;
            setIsLoggedIn(loggedIn);
            setUserId(user ? user.uid : null); // Store user ID
            if (!loggedIn) {
                setError("User not logged in. Please log in to make payments.");
                setIsLoading(false);
                setIsVerifying(false);
            } else {
                fetchUserAccounts();
            }
        });
        return () => unsubscribeAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only on mount

    // Fetch linked accounts
    const fetchUserAccounts = useCallback(async () => {
        // Check isLoggedIn state directly, as userId might not be set instantly
        if (!auth.currentUser) return;
        try {
            const userAccounts = await getLinkedAccounts();
            setAccounts(userAccounts);
            if (userAccounts.length > 0) {
                const defaultAccount = userAccounts.find(acc => acc.isDefault);
                setSelectedAccountUpiId(defaultAccount?.upiId || userAccounts[0]?.upiId || '');
            } else {
                setError("No linked bank accounts found. Please link an account first.");
            }
        } catch (accError) {
            console.error("Failed to fetch accounts for payment:", accError);
            setError("Could not load your payment accounts.");
            toast({ variant: "destructive", title: "Error", description: "Could not load payment accounts." });
        }
    }, [toast]); // Removed isLoggedIn dependency

    // Extract details from URL parameters and verify UPI ID
    useEffect(() => {
        if (!userId) return; // Don't run if not logged in (check userId)

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
            try {
                const parsed = parseUpiUrl(upiData);
                details = { ...details, ...parsed };
            } catch (parseError) {
                 setError("Invalid QR code data.");
                 setIsVerifying(false);
                 return;
            }
        }

        if (!details.payeeAddress) {
            setError("Recipient UPI ID is missing.");
            setIsVerifying(false);
            return;
        }

        setPayeeAddress(details.payeeAddress);
        setAmount(details.amount || '');
        setNote(details.note || '');
        setPayeeName(details.payeeName || 'Verifying Payee...');
        setError(null); // Clear previous errors

        // Verify UPI ID
        const verifyRecipient = async (address: string) => {
            setIsVerifying(true);
            setError(null); // Clear error before verification
            try {
                 const verifiedName = await verifyUpiId(address);
                 setPayeeName(verifiedName);
                 // Don't toast here, verification status is shown in UI
            } catch (verificationError: any) {
                 console.error("UPI ID Verification failed:", verificationError);
                 setPayeeName('Verification Failed');
                 setError(`Could not verify UPI ID: ${address}.`); // Set error message
            } finally {
                setIsVerifying(false);
            }
        };

        verifyRecipient(details.payeeAddress);

    }, [searchParams, userId, toast]); // Rerun if searchParams or userId changes

    // Function to show PIN dialog and return a Promise
    const promptForPin = (): Promise<string | null> => {
        return new Promise((resolve) => {
            setUpiPin(''); // Clear previous PIN
            pinPromiseResolverRef.current = { resolve }; // Store the resolver
            setIsPinDialogOpen(true);
        });
    };

    // Handle PIN submission from dialog
    const handlePinSubmit = () => {
        if ((upiPin.length === 4 || upiPin.length === 6) && pinPromiseResolverRef.current) {
            pinPromiseResolverRef.current.resolve(upiPin);
        } else {
            toast({ variant: "destructive", title: "Invalid PIN", description: "Please enter a 4 or 6 digit UPI PIN." });
            pinPromiseResolverRef.current?.resolve(null); // Resolve null on error
        }
        pinPromiseResolverRef.current = null;
        setIsPinDialogOpen(false);
    };

    // Handle PIN cancellation
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
            return;
        }
         if (!selectedAccountUpiId) {
             setError("Please select a bank account to pay from.");
             return;
         }
         if (payeeName === 'Verification Failed') {
             setError("Cannot proceed with unverified recipient.");
             return;
         }
         if (!userId) { // Added check for userId
             setError("User session expired. Please log in again.");
             return;
         }

        setError(null); // Clear previous errors
        setIsLoading(true);
        setPaymentResult(null);

        try {
             const enteredPin = await promptForPin();
             if (enteredPin === null) {
                 toast({ title: "Payment Cancelled", description: "PIN entry was cancelled." });
                 setIsLoading(false);
                 return;
             }

            // Pass userId to processUpiPayment for fallback check
            const result = await processUpiPayment(payeeAddress, Number(amount), enteredPin, note || `Payment to ${payeeName}`, userId);

            // Determine transaction type and description based on result
             const isSuccess = result.status === 'Completed' || result.status === 'FallbackSuccess';
             const transactionType = isSuccess ? 'Sent' : 'Failed';
             let transactionDescription = `${note || `Payment to ${payeeName}`}`;
             if (result.usedWalletFallback) {
                 transactionDescription += ` (Paid via Wallet)`;
             }
             if (!isSuccess && result.message) {
                 transactionDescription += ` (${result.status} - ${result.message})`;
             }

            // Add transaction to Firestore history
            const historyEntry = await addTransaction({
                type: transactionType,
                name: payeeName,
                description: transactionDescription,
                amount: -Number(amount),
                status: result.status as Transaction['status'], // Cast might be needed if FallbackSuccess isn't in Transaction['status'] initially
                upiId: payeeAddress,
                billerId: undefined,
                avatarSeed: payeeName.toLowerCase().replace(/\s+/g, '') || payeeAddress // Generate seed
            });

            setPaymentResult(historyEntry); // Show result view

            if (isSuccess) {
                 toast({
                     title: "Payment Successful!",
                     description: result.message || `₹${amount} sent to ${payeeName}.`, // Use message from result
                     duration: 5000
                 });
            } else {
                 setError(`Payment ${result.status.toLowerCase()}. ${result.message || ''}`);
                 toast({ variant: "destructive", title: `Payment ${result.status}`, description: result.message || `Failed to send ₹${amount} to ${payeeName}` });
            }
        } catch (err: any) {
             console.error("Payment processing error:", err);
             const message = err.message || "Payment failed due to an unexpected error.";
             setError(message);
             toast({ variant: "destructive", title: "Payment Failed", description: message });

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
                     avatarSeed: payeeName.toLowerCase().replace(/\s+/g, '') || payeeAddress // Generate seed
                 });
                  setPaymentResult(failedEntry); // Show result view even for failure
             } catch (historyError) {
                 console.error("Failed to log failed transaction:", historyError);
                 // Show a basic failure message if history logging also fails
                 setPaymentResult({
                     id: `local_${Date.now()}`,
                     type: 'Failed',
                     name: payeeName,
                     description: `Payment Failed - ${message} (History logging failed)`,
                     amount: -Number(amount),
                     status: 'Failed',
                     date: new Date(),
                     avatarSeed: payeeName.toLowerCase().replace(/\s+/g, '') || payeeAddress,
                     userId: 'local_error',
                     upiId: payeeAddress,
                 });
             }
        } finally {
            setIsLoading(false);
            setUpiPin(''); // Clear PIN field after attempt
        }
    };

    // Determine if the payment button should be disabled
    const isPayDisabled = isLoading || isVerifying || !!error || !payeeAddress || !amount || Number(amount) <= 0 || !selectedAccountUpiId || payeeName === 'Verification Failed' || accounts.length === 0;

    const renderContent = () => {
         if (paymentResult) {
             const isSuccess = paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess';
             const iconColor = isSuccess ? 'text-green-600' : 'text-destructive';
             const titleText = isSuccess ? 'Payment Successful' : 'Payment Failed';
             const amountText = `₹${Math.abs(paymentResult.amount).toFixed(2)}`;
             let descText = isSuccess
                 ? `Successfully sent ${amountText} to ${paymentResult.name}`
                 : `Failed to send ${amountText} to ${paymentResult.name}`;
             if (paymentResult.status === 'FallbackSuccess') {
                 descText += ` (via Wallet)`;
             }

             return (
                 <Card className={`shadow-md border-2 ${isSuccess ? 'border-green-500' : 'border-destructive'}`}>
                    <CardHeader className="items-center text-center">
                         <div className={`mb-4 ${iconColor}`}>
                             {isSuccess ? <CheckCircle className="h-16 w-16" /> : <XCircle className="h-16 w-16" />}
                         </div>
                         <CardTitle className={`text-2xl ${iconColor}`}>
                           {titleText}
                        </CardTitle>
                        <CardDescription>
                             {descText}
                        </CardDescription>
                    </CardHeader>
                     <CardContent className="text-center space-y-4">
                         <div className="text-xs text-muted-foreground space-y-1 bg-muted p-3 rounded-md">
                            <p><strong>Amount:</strong> {amountText}</p>
                            <p><strong>To:</strong> {paymentResult.name} ({paymentResult.upiId})</p>
                            <p><strong>Date:</strong> {format(paymentResult.date, 'PPp')}</p>
                             {paymentResult.status === 'FallbackSuccess' && (
                                <p className="font-medium text-blue-600 flex items-center justify-center gap-1"><Wallet className="h-3 w-3"/> Paid via Wallet (Recovery Scheduled)</p>
                             )}
                            {!isSuccess && <p><strong>Reason:</strong> {paymentResult.description.replace('Payment Failed - ', '')}</p>}
                            <p><strong>Transaction ID:</strong> {paymentResult.id}</p>
                         </div>

                         <Link href="/" passHref>
                             <Button className="w-full">Go to Home</Button>
                         </Link>
                          {!isSuccess && (
                              <Button variant="outline" className="w-full" onClick={() => { setPaymentResult(null); setError(null); /* Reset other fields? */ }}>Try Again</Button>
                          )}
                          <Link href="/history" passHref>
                                <Button variant="link" className="w-full">View Transaction History</Button>
                          </Link>
                     </CardContent>
                 </Card>
             );
        } else {
             // Payment Confirmation View
             return (
                 <Card className="shadow-md">
                    <CardHeader className="items-center text-center">
                        <Avatar className="h-16 w-16 mb-2 border">
                            <AvatarImage src={`https://picsum.photos/seed/${payeeAddress}/80/80`} alt={payeeName} data-ai-hint="payee avatar"/>
                            <AvatarFallback>{payeeName === 'Verification Failed' ? '!' : payeeName.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                         <CardTitle className="flex items-center gap-2">
                            Pay {payeeName}
                             {isVerifying && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                         </CardTitle>
                        <CardDescription>{payeeAddress}</CardDescription>
                         {/* Show permanent error if verification failed, otherwise show temporary process errors below button */}
                        {error && payeeName === 'Verification Failed' && (
                            <p className="text-sm text-destructive pt-2">{error}</p>
                         )}
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
                                            disabled={isLoading || isVerifying || payeeName === 'Verification Failed'} // Disable if verification failed
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
                                    disabled={isLoading || isVerifying || payeeName === 'Verification Failed'}
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
                                {accounts.length === 0 && !isLoading && <p className="text-xs text-destructive pt-1">Please link a bank account in Profile &gt; UPI Settings.</p>}
                            </div>

                             {/* Display error message (not verification error) */}
                             {error && payeeName !== 'Verification Failed' && (
                                <p className="text-sm text-destructive text-center">{error}</p>
                             )}

                            <Button type="submit" className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={isPayDisabled}>
                                {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                                </>
                                ) : isVerifying ? (
                                 <>
                                     <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying Payee...
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
             );
         }
    };

    return (
    <div className="min-h-screen bg-secondary flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
             {/* Conditionally render Link or disabled Button based on state */}
             {(isLoading || (paymentResult && paymentResult.status === 'Completed')) ? (
                 <Button variant="ghost" size="icon" className="text-primary-foreground opacity-50 cursor-not-allowed">
                     <ArrowLeft className="h-5 w-5" />
                 </Button>
             ) : (
                 <Link href="/" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
             )}
            <Send className="h-6 w-6" />
            <h1 className="text-lg font-semibold">Confirm Payment</h1>
        </header>

        {/* Main Content */}
        <main className="flex-grow p-4">
            {renderContent()}
        </main>

        {/* UPI PIN Dialog */}
        <AlertDialog open={isPinDialogOpen} onOpenChange={(open) => { if (!open) handlePinCancel(); }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Enter UPI PIN</AlertDialogTitle>
                    <AlertDialogDescription>
                         Enter your {accounts.find(acc => acc.upiId === selectedAccountUpiId)?.pinLength || '4 or 6'} digit UPI PIN for {accounts.find(acc => acc.upiId === selectedAccountUpiId)?.bankName || 'your account'} to authorize this payment of ₹{Number(amount).toFixed(2)} to {payeeName}.
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
