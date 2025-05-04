'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Lock, Loader2, CheckCircle, XCircle, Info, Wallet, MessageCircle, Users, Landmark, Clock, HelpCircle, Ticket, CircleAlert, WifiOff } from 'lucide-react'; // Added CircleAlert, WifiOff
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { processUpiPayment, verifyUpiId, getLinkedAccounts, BankAccount, UpiTransactionResult, getBankStatus } from '@/services/upi'; // Import getBankStatus
import { addTransaction, Transaction } from '@/services/transactions';
import { payViaWallet, getWalletBalance } from '@/services/wallet'; // Import wallet services
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { auth } from '@/lib/firebase'; // Import auth
import { format } from "date-fns"; // Import format
import { Badge } from '@/components/ui/badge'; // Import Badge

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

type PaymentSource = 'upi' | 'wallet';

// Combine Transaction and UpiTransactionResult for the result state
type PaymentResultState = (Transaction & { ticketId?: string; refundEta?: string });

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
    const [paymentResult, setPaymentResult] = useState<PaymentResultState | null>(null); // Store final transaction outcome including potential failure details
    const [error, setError] = useState<string | null>(null); // Store general error messages
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [selectedAccountUpiId, setSelectedAccountUpiId] = useState<string>('');
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [selectedPaymentSource, setSelectedPaymentSource] = useState<PaymentSource>('upi');
    const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
    const pinPromiseResolverRef = useRef<{ resolve: (pin: string | null) => void } | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const [userId, setUserId] = useState<string | null>(null); // Store user ID
    const [bankStatuses, setBankStatuses] = useState<Record<string, 'Active' | 'Slow' | 'Down'>>({}); // Bank status state
    const [showRetryOptions, setShowRetryOptions] = useState(false); // State to show retry/fallback options

    // Check login status and fetch initial data
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
                fetchInitialData(user.uid); // Pass UID directly
            }
        });
        return () => unsubscribeAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only on mount

     // Fetch linked accounts, wallet balance, and bank statuses
     const fetchInitialData = useCallback(async (currentUserId: string) => {
         setIsLoading(true);
         try {
             const [userAccounts, currentWalletBalance] = await Promise.all([
                 getLinkedAccounts(),
                 getWalletBalance(currentUserId)
             ]);

             setAccounts(userAccounts);
             setWalletBalance(currentWalletBalance);

             if (userAccounts.length > 0) {
                 const defaultAccount = userAccounts.find(acc => acc.isDefault);
                 const initialAccountUpiId = defaultAccount?.upiId || userAccounts[0]?.upiId || '';
                 setSelectedAccountUpiId(initialAccountUpiId);
                 // Fetch statuses for all linked accounts
                 fetchBankStatuses(userAccounts);
                  // Default to UPI if accounts exist, otherwise Wallet if balance > 0
                 setSelectedPaymentSource(userAccounts.length > 0 ? 'upi' : (currentWalletBalance > 0 ? 'wallet' : 'upi'));
             } else if (currentWalletBalance > 0) {
                  setSelectedPaymentSource('wallet'); // Default to wallet if no bank accounts but has balance
             } else {
                  setError("No linked bank accounts or wallet balance found. Please link an account or add funds.");
             }

         } catch (fetchError: any) {
             console.error("Failed to fetch accounts/wallet for payment:", fetchError);
             setError("Could not load your payment methods.");
             toast({ variant: "destructive", title: "Error", description: "Could not load payment methods." });
         } finally {
             setIsLoading(false);
         }
     }, [toast]); // Keep toast dependency

     // Function to fetch bank statuses
     const fetchBankStatuses = async (accountsToFetch: BankAccount[]) => {
         const statuses: Record<string, 'Active' | 'Slow' | 'Down'> = {};
         for (const acc of accountsToFetch) {
             // In a real app, you might extract the bank identifier from the UPI ID
             const bankIdentifier = acc.upiId.split('@')[1]; // Simplified example
             if (bankIdentifier) {
                 statuses[acc.upiId] = await getBankStatus(bankIdentifier); // Fetch status for each bank
             }
         }
         setBankStatuses(statuses);
     };


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
        setShowRetryOptions(false); // Reset retry options

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
                 setError(`Could not verify UPI ID: ${address}. Please check and try again.`); // Set error message
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
        const expectedLength = accounts.find(acc => acc.upiId === selectedAccountUpiId)?.pinLength;
        if (expectedLength && upiPin.length === expectedLength && pinPromiseResolverRef.current) {
            pinPromiseResolverRef.current.resolve(upiPin);
        } else if (!expectedLength && (upiPin.length === 4 || upiPin.length === 6) && pinPromiseResolverRef.current) {
            // Fallback if length not specified
            pinPromiseResolverRef.current.resolve(upiPin);
        } else {
            toast({ variant: "destructive", title: "Invalid PIN", description: `Please enter your ${expectedLength || '4 or 6'} digit UPI PIN.` });
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

    const handlePayment = async (e?: React.FormEvent, paymentSrcOverride?: PaymentSource, accountUpiOverride?: string) => {
        e?.preventDefault();
        setShowRetryOptions(false); // Hide retry options when initiating payment
        const currentAmount = Number(amount);
        const sourceToUse = paymentSrcOverride || selectedPaymentSource;
        const accountToUse = accountUpiOverride || selectedAccountUpiId;

        if (!payeeAddress || !amount || currentAmount <= 0) {
            setError("Please enter a valid amount.");
            return;
        }
         if (sourceToUse === 'upi' && !accountToUse) {
             setError("Please select a bank account to pay from.");
             return;
         }
          // Check bank status before UPI payment
          if (sourceToUse === 'upi' && bankStatuses[accountToUse] === 'Down') {
            setError(`Bank server for ${accountToUse} is currently down. Please try another account or Wallet.`);
            setShowRetryOptions(true); // Show options if bank is down
            return;
          }
         if (sourceToUse === 'wallet' && walletBalance < currentAmount) {
             setError(`Insufficient wallet balance (Available: ₹${walletBalance.toFixed(2)}).`);
             toast({ variant: "destructive", title: "Insufficient Wallet Balance" });
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

        let paymentSuccess = false;
        let resultMessage = "Payment Failed";
        let finalStatus: Transaction['status'] = 'Failed';
        let transactionId: string | undefined = undefined;
        let descriptionSuffix = '';
        let upiPaymentResult: UpiTransactionResult | null = null; // Store the full UPI result

        try {
             if (sourceToUse === 'upi') {
                 const enteredPin = await promptForPin();
                 if (enteredPin === null) {
                     toast({ title: "Payment Cancelled", description: "PIN entry was cancelled." });
                     setIsLoading(false);
                     return;
                 }

                 // Pass userId to processUpiPayment for fallback check
                 upiPaymentResult = await processUpiPayment(payeeAddress, currentAmount, enteredPin, note || `Payment to ${payeeName}`, userId, accountToUse); // Pass accountToUse
                 paymentSuccess = upiPaymentResult.status === 'Completed' || upiPaymentResult.status === 'FallbackSuccess';
                 finalStatus = upiPaymentResult.status === 'FallbackSuccess' ? 'Completed' : upiPaymentResult.status; // Map FallbackSuccess to Completed for history
                 resultMessage = upiPaymentResult.message || (paymentSuccess ? "Transaction Successful" : `Payment ${upiPaymentResult.status}`);
                 transactionId = upiPaymentResult.transactionId || upiPaymentResult.walletTransactionId; // Use wallet txn ID if fallback used
                 if(upiPaymentResult.usedWalletFallback) descriptionSuffix = ' (Paid via Wallet)';

             } else { // Paying via Wallet
                 const result = await payViaWallet(userId, payeeAddress, currentAmount, note || `Payment to ${payeeName}`);
                 paymentSuccess = result.success;
                 finalStatus = result.success ? 'Completed' : 'Failed';
                 resultMessage = result.message || (paymentSuccess ? "Transaction Successful" : "Payment Failed");
                 transactionId = result.transactionId;
                 descriptionSuffix = ' (Paid via Wallet)';
             }


            // Add transaction to Firestore history
             const historyEntry = await addTransaction({
                type: finalStatus === 'Completed' ? 'Sent' : finalStatus, // Use Sent for success, Failed for failure
                name: payeeName,
                description: `${note || `Payment to ${payeeName}`}${descriptionSuffix}${!paymentSuccess ? ` (${finalStatus} - ${resultMessage})` : ''}`,
                amount: -currentAmount,
                status: finalStatus,
                upiId: payeeAddress,
                billerId: undefined,
                // avatarSeed is now handled within addTransaction
            });

            // Combine history entry with potential ticket/ETA from UPI result
            setPaymentResult({
                ...historyEntry,
                id: transactionId || historyEntry.id, // Use payment system ID if available
                ticketId: upiPaymentResult?.ticketId,
                refundEta: upiPaymentResult?.refundEta,
             });


            if (paymentSuccess) {
                 toast({
                     title: "Payment Successful!",
                     description: resultMessage,
                     duration: 5000
                 });
            } else {
                 // Error toast now shown in the catch block to include ticket info
                 setError(`Payment ${finalStatus}. ${resultMessage}`);
                 if (finalStatus === 'Failed') setShowRetryOptions(true); // Show retry options on failure
            }
        } catch (err: any) {
             console.error("Payment processing error:", err);
             const message = err.message || "Payment failed due to an unexpected error.";
             setError(message);
             finalStatus = 'Failed'; // Ensure status is Failed
             setShowRetryOptions(true); // Show retry options on error

             // Check if UPI result contains ticket info (only if UPI was attempted)
             const ticketInfo = upiPaymentResult && upiPaymentResult.status === 'Failed'
                 ? { ticketId: upiPaymentResult.ticketId, refundEta: upiPaymentResult.refundEta }
                 : {};

             toast({
                 variant: "destructive",
                 title: "Payment Failed",
                 description: `${message} ${ticketInfo.ticketId ? `(Ticket: ${ticketInfo.ticketId})` : ''}`
             });


             // Add failed transaction to history
             try {
                 const failedEntry = await addTransaction({
                     type: 'Failed',
                     name: payeeName,
                     description: `Payment Failed - ${message}`,
                     amount: -currentAmount,
                     status: 'Failed',
                     upiId: payeeAddress,
                     billerId: undefined,
                     // avatarSeed handled by addTransaction
                 });
                  // Show result view even for failure, including ticket info
                  setPaymentResult({
                      ...failedEntry,
                      ticketId: ticketInfo.ticketId,
                      refundEta: ticketInfo.refundEta,
                  });
             } catch (historyError) {
                 console.error("Failed to log failed transaction:", historyError);
                 // Show a basic failure message if history logging also fails
                 setPaymentResult({
                     id: `local_${Date.now()}`,
                     type: 'Failed',
                     name: payeeName,
                     description: `Payment Failed - ${message} (History logging failed)`,
                     amount: -currentAmount,
                     status: 'Failed',
                     date: new Date(),
                     avatarSeed: payeeName.toLowerCase().replace(/\s+/g, '') || payeeAddress, // Manual seed generation
                     userId: userId || 'local_error', // Use userId if available
                     upiId: payeeAddress,
                     ticketId: ticketInfo.ticketId, // Include ticket info even if logging fails
                     refundEta: ticketInfo.refundEta,
                 });
             }
        } finally {
            setIsLoading(false);
            setUpiPin(''); // Clear PIN field after attempt
        }
    };

     // Determine if the payment button should be disabled
     const isPayDisabled = isLoading || isVerifying || !!error || !payeeAddress || !amount || Number(amount) <= 0 || payeeName === 'Verification Failed' || (selectedPaymentSource === 'upi' && (!selectedAccountUpiId || bankStatuses[selectedAccountUpiId] === 'Down')) || (selectedPaymentSource === 'wallet' && walletBalance < Number(amount));

     const getBankStatusBadge = (status: 'Active' | 'Slow' | 'Down' | undefined) => {
         switch(status) {
             case 'Active': return <Badge variant="default" className="ml-2 text-xs bg-green-100 text-green-700">Active</Badge>;
             case 'Slow': return <Badge variant="secondary" className="ml-2 text-xs bg-yellow-100 text-yellow-700">Slow</Badge>;
             case 'Down': return <Badge variant="destructive" className="ml-2 text-xs">Server Down</Badge>;
             default: return null;
         }
     };


    const renderContent = () => {
         if (paymentResult) {
             const isSuccess = paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess';
             const iconColor = isSuccess ? 'text-green-600' : 'text-destructive';
             const titleText = isSuccess ? 'Payment Successful' : 'Payment Failed';
             const amountText = `₹${Math.abs(paymentResult.amount).toFixed(2)}`;
             let descText = isSuccess
                 ? `Successfully sent ${amountText} to ${paymentResult.name}`
                 : `Failed to send ${amountText} to ${paymentResult.name}`;
             if (paymentResult.status === 'FallbackSuccess') { // Should not happen if mapping status correctly, but keep for safety
                 descText += ` (via Wallet)`;
             }
             if (paymentResult.description?.includes('(Paid via Wallet)')) {
                  descText += ` (via Wallet)`; // Ensure fallback info is shown if present in description
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
                             {paymentResult.description?.includes('(Paid via Wallet)') && (
                                <p className="font-medium text-blue-600 flex items-center justify-center gap-1"><Wallet className="h-3 w-3"/> Paid via Wallet (Recovery Scheduled)</p>
                             )}
                              {!isSuccess && paymentResult.description && <p><strong>Reason:</strong> {paymentResult.description.replace('Payment Failed - ', '')}</p>}
                              {paymentResult.ticketId && (
                                  <p className='font-medium text-orange-600'>
                                      <span className="flex items-center justify-center gap-1">
                                         <Ticket className="h-3 w-3"/> Ticket ID: {paymentResult.ticketId}
                                      </span>
                                      {paymentResult.refundEta && <span className="text-xs block">(Refund ETA: {paymentResult.refundEta})</span>}
                                  </p>
                              )}
                            <p><strong>Transaction ID:</strong> {paymentResult.id}</p>
                         </div>

                         <Link href="/" passHref>
                             <Button className="w-full">Go to Home</Button>
                         </Link>
                          {!isSuccess && (
                              <Button variant="outline" className="w-full" onClick={() => { setPaymentResult(null); setError(null); setShowRetryOptions(false); /* Reset other fields? */ }}>Try Again</Button>
                          )}
                           {paymentResult.ticketId && ( // Show support link only if ticket generated
                                <Link href={`/support?ticketId=${paymentResult.ticketId}`} passHref>
                                    <Button variant="link" className="w-full flex items-center gap-1"><HelpCircle className="h-4 w-4"/> Get Help</Button>
                                </Link>
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
                         {/* Show permanent error if verification failed */}
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

                             {/* Bank Status Info (if UPI selected) */}
                             {selectedPaymentSource === 'upi' && selectedAccountUpiId && bankStatuses[selectedAccountUpiId] && bankStatuses[selectedAccountUpiId] !== 'Active' && (
                                <Alert variant={bankStatuses[selectedAccountUpiId] === 'Down' ? "destructive" : "default"} className={`${bankStatuses[selectedAccountUpiId] === 'Slow' ? 'bg-yellow-50 border-yellow-200' : ''}`}>
                                     <AlertTitle className="flex items-center gap-1 text-sm">
                                         {bankStatuses[selectedAccountUpiId] === 'Down' ? <WifiOff className="h-4 w-4"/> : <Clock className="h-4 w-4"/>}
                                         Bank Server Status
                                     </AlertTitle>
                                    <AlertDescription className="text-xs">
                                        {accounts.find(a => a.upiId === selectedAccountUpiId)?.bankName} server is currently {bankStatuses[selectedAccountUpiId]}. Payments may be delayed or fail.
                                    </AlertDescription>
                                </Alert>
                             )}

                            {/* Payment Source Selection */}
                             <div className="space-y-2">
                                <Label htmlFor="paymentSource">Pay Using</Label>
                                <Select value={selectedPaymentSource} onValueChange={(value) => { setSelectedPaymentSource(value as PaymentSource); setError(null); setShowRetryOptions(false);}} disabled={isLoading || isVerifying}>
                                     <SelectTrigger id="paymentSource">
                                         <SelectValue placeholder="Select payment method"/>
                                     </SelectTrigger>
                                     <SelectContent>
                                         {accounts.map(acc => (
                                            <SelectItem key={acc.upiId} value={acc.upiId}>
                                                 <div className="flex items-center justify-between w-full">
                                                     <span className="flex items-center gap-2">
                                                         <Landmark className="h-4 w-4 text-muted-foreground"/>
                                                          {acc.bankName} - {acc.accountNumber}
                                                     </span>
                                                     {getBankStatusBadge(bankStatuses[acc.upiId])}
                                                 </div>
                                            </SelectItem>
                                         ))}
                                         {walletBalance > 0 && (
                                             <SelectItem value="wallet">
                                                  <div className="flex items-center gap-2">
                                                     <Wallet className="h-4 w-4 text-muted-foreground"/>
                                                     <span>Zet Pay Wallet (Balance: ₹{walletBalance.toFixed(2)})</span>
                                                 </div>
                                             </SelectItem>
                                         )}
                                         {accounts.length === 0 && walletBalance === 0 && (
                                             <SelectItem value="none" disabled>No payment methods available</SelectItem>
                                         )}
                                     </SelectContent>
                                 </Select>

                                 {/* Show specific bank account selector only if UPI is chosen and multiple accounts exist */}
                                 {/* {selectedPaymentSource === 'upi' && accounts.length > 1 && (
                                     <Select value={selectedAccountUpiId} onValueChange={(upiId) => {setSelectedAccountUpiId(upiId); setError(null); setShowRetryOptions(false);}} disabled={isLoading || isVerifying || accounts.length === 0}>
                                        <SelectTrigger id="account" className="mt-2">
                                            <SelectValue placeholder={accounts.length > 0 ? "Select account" : "No accounts linked"}/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accounts.map(acc => (
                                                 <SelectItem key={acc.upiId} value={acc.upiId}>
                                                    <div className="flex items-center justify-between w-full">
                                                         <span>{acc.bankName} - {acc.accountNumber}</span>
                                                         {getBankStatusBadge(bankStatuses[acc.upiId])}
                                                    </div>
                                                 </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                 )} */}
                                {accounts.length === 0 && selectedPaymentSource === 'upi' && !isLoading && <p className="text-xs text-destructive pt-1">Please link a bank account in Profile &gt; UPI Settings.</p>}
                            </div>


                             {/* Display error message (not verification error) */}
                             {error && payeeName !== 'Verification Failed' && (
                                <p className="text-sm text-destructive text-center">{error}</p>
                             )}

                              {/* Retry/Fallback Options */}
                              {showRetryOptions && (
                                <Card className="bg-amber-50 border-amber-200 p-3">
                                    <p className="text-sm font-medium text-amber-800 mb-2">Payment Failed. Try:</p>
                                    <div className="space-y-2">
                                         {/* Retry with Wallet */}
                                         {walletBalance >= currentAmount && (
                                            <Button type="button" variant="outline" size="sm" className="w-full justify-start" onClick={() => handlePayment(undefined, 'wallet')}>
                                                <Wallet className="mr-2 h-4 w-4"/> Pay via Wallet (Balance: ₹{walletBalance.toFixed(2)})
                                            </Button>
                                         )}
                                         {/* Retry with another Bank */}
                                         {accounts.filter(acc => acc.upiId !== selectedAccountUpiId && bankStatuses[acc.upiId] !== 'Down').map(acc => (
                                             <Button key={acc.upiId} type="button" variant="outline" size="sm" className="w-full justify-start" onClick={() => handlePayment(undefined, 'upi', acc.upiId)}>
                                                 <Landmark className="mr-2 h-4 w-4"/> Pay via {acc.bankName} (...{acc.accountNumber.slice(-4)}) {getBankStatusBadge(bankStatuses[acc.upiId])}
                                             </Button>
                                         ))}
                                         {/* TODO: Add Offline SMS Pay option here if desired */}
                                         <Button type="button" variant="outline" size="sm" className="w-full justify-start" onClick={() => alert("Offline SMS Pay: Feature coming soon!")}>
                                             <MessageCircle className="mr-2 h-4 w-4"/> Try Offline SMS Pay
                                         </Button>
                                    </div>
                                </Card>
                              )}


                            {/* Primary Action Button */}
                            <Button type="submit" className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={isPayDisabled}>
                                {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                                </>
                                ) : isVerifying ? (
                                 <>
                                     <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying Payee...
                                 </>
                                ) : selectedPaymentSource === 'upi' ? (
                                <>
                                    <Lock className="mr-2 h-4 w-4" /> Proceed to Pay (UPI)
                                </>
                                ) : (
                                <>
                                     <Wallet className="mr-2 h-4 w-4" /> Pay via Wallet
                                </>
                                )}
                            </Button>

                             {/* Emergency / Offline Payment Options (Removed from here, shown in retry options) */}
                             {/* ... */}
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
             {(isLoading || paymentResult) ? (
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
                        maxLength={accounts.find(acc => acc.upiId === selectedAccountUpiId)?.pinLength || 6} // Use dynamic length or default 6
                        value={upiPin}
                        onChange={(e) => setUpiPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="text-center text-xl tracking-[0.3em]"
                        placeholder={accounts.find(acc => acc.upiId === selectedAccountUpiId)?.pinLength === 4 ? "****" : "******"} // Dynamic placeholder
                        autoFocus
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handlePinCancel}>Cancel</AlertDialogCancel>
                     <AlertDialogAction
                        onClick={handlePinSubmit}
                        disabled={!(
                            (accounts.find(acc => acc.upiId === selectedAccountUpiId)?.pinLength === 4 && upiPin.length === 4) ||
                            (accounts.find(acc => acc.upiId === selectedAccountUpiId)?.pinLength === 6 && upiPin.length === 6) ||
                            (!accounts.find(acc => acc.upiId === selectedAccountUpiId)?.pinLength && (upiPin.length === 4 || upiPin.length === 6)) // Fallback check
                        )}
                    >
                        <Lock className="mr-2 h-4 w-4" /> Confirm Payment
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
    );
}
