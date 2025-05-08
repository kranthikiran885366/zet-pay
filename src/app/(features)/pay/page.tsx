'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Lock, Loader2, CheckCircle, XCircle, Info, Wallet, MessageCircle, Users, Landmark, Clock, HelpCircle, Ticket, CircleAlert, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { processUpiPayment, verifyUpiId, getLinkedAccounts, BankAccount, UpiTransactionResult, getBankStatus } from '@/services/upi';
import { addTransaction } from '@/services/transactionLogger'; // Correct import
import type { Transaction } from '@/services/types'; // Import Transaction
import { payViaWallet, getWalletBalance } from '@/services/wallet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { auth } from '@/lib/firebase';
import { format } from "date-fns";
import { Badge } from '@/components/ui/badge';

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

    const [payeeName, setPayeeName] = useState<string>('Verifying Payee...');
    const [payeeAddress, setPayeeAddress] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [note, setNote] = useState<string>('');
    const [upiPin, setUpiPin] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    const [paymentResult, setPaymentResult] = useState<PaymentResultState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [selectedAccountUpiId, setSelectedAccountUpiId] = useState<string>('');
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [selectedPaymentSource, setSelectedPaymentSource] = useState<PaymentSource>('upi');
    const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
    const pinPromiseResolverRef = useRef<{ resolve: (pin: string | null) => void } | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [bankStatuses, setBankStatuses] = useState<Record<string, 'Active' | 'Slow' | 'Down'>>({});
    const [showRetryOptions, setShowRetryOptions] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            const loggedIn = !!user;
            setIsLoggedIn(loggedIn);
            setUserId(user ? user.uid : null);
            if (!loggedIn) {
                setError("User not logged in. Please log in to make payments.");
                setIsLoading(false);
                setIsVerifying(false);
            } else {
                fetchInitialData(user.uid);
            }
        });
        return () => unsubscribeAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

     const fetchInitialData = useCallback(async (currentUserId: string) => {
         setIsLoading(true);
         try {
             const [userAccounts, currentWalletBalance] = await Promise.all([
                 getLinkedAccounts(),
                 getWalletBalance() // No need to pass userId if apiClient handles auth
             ]);

             setAccounts(userAccounts);
             setWalletBalance(currentWalletBalance);

             if (userAccounts.length > 0) {
                 const defaultAccount = userAccounts.find(acc => acc.isDefault);
                 const initialAccountUpiId = defaultAccount?.upiId || userAccounts[0]?.upiId || '';
                 setSelectedAccountUpiId(initialAccountUpiId);
                 fetchBankStatuses(userAccounts); // Fetch statuses after getting accounts
                 setSelectedPaymentSource('upi'); // Default to UPI if accounts exist
             } else if (currentWalletBalance > 0) {
                  setSelectedPaymentSource('wallet');
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
     }, [toast]);

     const fetchBankStatuses = async (accountsToFetch: BankAccount[]) => {
         const statuses: Record<string, 'Active' | 'Slow' | 'Down'> = {};
         for (const acc of accountsToFetch) {
             const bankIdentifier = acc.upiId.split('@')[1];
             if (bankIdentifier) {
                 try {
                     statuses[acc.upiId] = await getBankStatus(bankIdentifier);
                 } catch (statusError) {
                      console.warn(`Failed to get status for ${acc.upiId}:`, statusError);
                      statuses[acc.upiId] = 'Active'; // Default to Active on error
                 }
             }
         }
         setBankStatuses(statuses);
     };


    useEffect(() => {
        if (!userId) return; // Don't process if no user

        const finalPayeeAddress = searchParams.get('pa') || searchParams.get('recipientUpiId'); // Accept both params
        const finalPayeeName = searchParams.get('pn');
        const finalAmount = searchParams.get('am');
        const finalNote = searchParams.get('tn');

        if (!finalPayeeAddress) {
            setError("Recipient UPI ID is missing.");
            setIsVerifying(false);
            return;
        }

        setPayeeAddress(finalPayeeAddress);
        setAmount(finalAmount || '');
        setNote(finalNote || '');
        setPayeeName(finalPayeeName || 'Verifying Payee...');
        setError(null);
        setShowRetryOptions(false);

        const verifyRecipient = async (address: string) => {
            setIsVerifying(true);
            setError(null);
            try {
                 const { verifiedName, isBlacklisted, reason } = await apiClient<{ verifiedName: string | null, isBlacklisted?: boolean, reason?: string }>(`/upi/verify?upiId=${encodeURIComponent(address)}`);
                 if (isBlacklisted) {
                     setPayeeName(`Suspicious Payee`);
                     setError(`Payment Blocked: ${reason || 'Recipient is flagged as suspicious.'}`);
                 } else if (verifiedName) {
                     setPayeeName(verifiedName);
                 } else {
                     setPayeeName('Unverified Payee');
                     setError(`Could not verify UPI ID: ${address}. Proceed with caution.`);
                 }
            } catch (verificationError: any) {
                 console.error("UPI ID Verification failed:", verificationError);
                 setPayeeName('Verification Failed');
                 setError(`Could not verify UPI ID: ${address}. Please check and try again.`);
            } finally {
                setIsVerifying(false);
            }
        };

        verifyRecipient(finalPayeeAddress);

    }, [searchParams, userId, toast, router]);

    const promptForPin = (): Promise<string | null> => {
        return new Promise((resolve) => {
            setUpiPin('');
            pinPromiseResolverRef.current = { resolve };
            setIsPinDialogOpen(true);
        });
    };

    const handlePinSubmit = () => {
        const expectedLength = accounts.find(acc => acc.upiId === selectedAccountUpiId)?.pinLength;
        if (expectedLength && upiPin.length === expectedLength && pinPromiseResolverRef.current) {
            pinPromiseResolverRef.current.resolve(upiPin);
        } else if (!expectedLength && (upiPin.length === 4 || upiPin.length === 6) && pinPromiseResolverRef.current) {
            pinPromiseResolverRef.current.resolve(upiPin);
        } else {
            toast({ variant: "destructive", title: "Invalid PIN", description: `Please enter your ${expectedLength || '4 or 6'} digit UPI PIN.` });
            pinPromiseResolverRef.current?.resolve(null);
        }
        pinPromiseResolverRef.current = null;
        setIsPinDialogOpen(false);
    };

    const handlePinCancel = () => {
        if (pinPromiseResolverRef.current) {
            pinPromiseResolverRef.current.resolve(null);
            pinPromiseResolverRef.current = null;
        }
        setIsPinDialogOpen(false);
    };

    const handlePayment = async (e?: React.FormEvent, paymentSrcOverride?: PaymentSource, accountUpiOverride?: string) => {
        e?.preventDefault();
        setShowRetryOptions(false);
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
          if (sourceToUse === 'upi' && bankStatuses[accountToUse] === 'Down') {
            setError(`Bank server for ${accountToUse} is currently down. Please try another account or Wallet.`);
            setShowRetryOptions(true);
            return;
          }
         if (sourceToUse === 'wallet' && walletBalance < currentAmount) {
             setError(`Insufficient wallet balance (Available: ₹${walletBalance.toFixed(2)}).`);
             toast({ variant: "destructive", title: "Insufficient Wallet Balance" });
             return;
         }
         if (payeeName === 'Verification Failed' || payeeName === 'Suspicious Payee') {
             setError("Cannot proceed with unverified or suspicious recipient.");
             return;
         }
         if (!userId) {
             setError("User session expired. Please log in again.");
             return;
         }

        setError(null);
        setIsLoading(true);
        setPaymentResult(null);

        let paymentSuccess = false;
        let resultMessage = "Payment Failed";
        let finalStatus: Transaction['status'] = 'Failed';
        let finalTransactionId: string | undefined = undefined; // Use the ID from the backend if possible
        let descriptionSuffix = '';
        let upiPaymentResult: UpiTransactionResult | null = null; // Store UPI specific result

        try {
             if (sourceToUse === 'upi') {
                 const enteredPin = await promptForPin();
                 if (enteredPin === null) {
                     toast({ title: "Payment Cancelled", description: "PIN entry was cancelled." });
                     setIsLoading(false);
                     return;
                 }

                 // Call service which calls backend
                 upiPaymentResult = await processUpiPayment(
                     payeeAddress,
                     currentAmount,
                     enteredPin,
                     note || `Payment to ${payeeName}`,
                     accountToUse // Pass selected account
                 );
                 finalTransactionId = upiPaymentResult.transactionId; // Backend provides the ID
                 paymentSuccess = upiPaymentResult.status === 'Completed' || upiPaymentResult.status === 'FallbackSuccess';
                 finalStatus = upiPaymentResult.status === 'FallbackSuccess' ? 'Completed' : upiPaymentResult.status;
                 resultMessage = upiPaymentResult.message || (paymentSuccess ? "Transaction Successful" : `Payment ${upiPaymentResult.status}`);
                 if (upiPaymentResult.usedWalletFallback) {
                     descriptionSuffix = ' (Paid via Wallet)';
                     // Refresh wallet balance after fallback
                     getWalletBalance().then(setWalletBalance);
                 }

             } else { // Wallet payment
                 const result = await payViaWallet(
                    undefined, // Backend infers user
                    payeeAddress,
                    currentAmount,
                    note || `Payment to ${payeeName}`
                 );
                 finalTransactionId = result.transactionId; // Backend provides the ID
                 paymentSuccess = result.success;
                 finalStatus = result.success ? 'Completed' : 'Failed';
                 resultMessage = result.message || (paymentSuccess ? "Transaction Successful" : "Payment Failed");
                 descriptionSuffix = ' (Paid via Wallet)';
                 if(paymentSuccess) {
                    setWalletBalance(prev => prev - currentAmount); // Optimistic update
                 }
             }

             // If a transaction ID was returned from the backend (success or failure), fetch the full details
             if (finalTransactionId) {
                // Assuming backend logged the transaction and we have its ID
                // Fetch the logged transaction details to display
                // This might be redundant if UPI/Wallet services already return the full Tx object
                // For now, we'll construct a partial result object
                 setPaymentResult({
                    id: finalTransactionId,
                    userId: userId, // Use client-side ID
                    type: paymentSuccess ? 'Sent' : 'Failed',
                    name: payeeName,
                    description: `${note || `Payment to ${payeeName}`}${descriptionSuffix}`,
                    amount: -currentAmount,
                    status: finalStatus,
                    date: new Date(), // Use current date as placeholder
                    upiId: payeeAddress,
                    paymentMethodUsed: sourceToUse === 'upi' ? 'UPI' : 'Wallet',
                    // Include ticket info if available from UPI failure
                    ticketId: upiPaymentResult?.ticketId,
                    refundEta: upiPaymentResult?.refundEta,
                 });

             } else {
                 // Handle case where backend didn't return an ID (shouldn't happen ideally)
                 throw new Error("Backend did not return transaction details.");
             }

             // Display success/failure based on the final status
            if (paymentSuccess) {
                 toast({
                     title: "Payment Successful!",
                     description: resultMessage,
                     duration: 5000
                 });
            } else {
                 setError(`Payment ${finalStatus}. ${resultMessage}`);
                 if (finalStatus === 'Failed') setShowRetryOptions(true);
                 toast({ // Show toast even for pending/failed
                    variant: finalStatus === 'Failed' ? "destructive" : "default",
                    title: `Payment ${finalStatus}`,
                    description: `${resultMessage} ${upiPaymentResult?.ticketId ? `(Ticket: ${upiPaymentResult.ticketId})` : ''}`,
                    duration: 7000
                 });
            }
        } catch (err: any) {
             // Catch errors from API client or pin prompt cancellation
             console.error("Payment processing error:", err);
             const message = err.message || "Payment failed due to an unexpected error.";
             setError(message);
             finalStatus = 'Failed';
             setShowRetryOptions(true);

             // Construct a minimal failure result for display
              setPaymentResult({
                 id: `local_fail_${Date.now()}`,
                 userId: userId,
                 type: 'Failed',
                 name: payeeName,
                 description: `Payment Failed - ${message}`,
                 amount: -currentAmount,
                 status: 'Failed',
                 date: new Date(),
                 upiId: payeeAddress,
                 paymentMethodUsed: sourceToUse === 'upi' ? 'UPI' : 'Wallet',
                 ticketId: upiPaymentResult?.ticketId,
                 refundEta: upiPaymentResult?.refundEta,
             });

              toast({
                 variant: "destructive",
                 title: "Payment Failed",
                 description: `${message} ${upiPaymentResult?.ticketId ? `(Ticket: ${upiPaymentResult.ticketId})` : ''}`
             });
        } finally {
            setIsLoading(false);
            setUpiPin('');
        }
    };

     const isPayDisabled = isLoading || isVerifying || !!error || !payeeAddress || !amount || Number(amount) <= 0 || payeeName === 'Verification Failed' || payeeName === 'Suspicious Payee' || (selectedPaymentSource === 'upi' && (!selectedAccountUpiId || bankStatuses[selectedAccountUpiId] === 'Down')) || (selectedPaymentSource === 'wallet' && walletBalance < Number(amount));

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
             const isSuccess = paymentResult.status === 'Completed';
             const isPending = paymentResult.status === 'Pending';
             const isFailed = !isSuccess && !isPending; // Covers Failed, Cancelled, etc.
             const iconColor = isSuccess ? 'text-green-600' : isPending ? 'text-yellow-600' : 'text-destructive';
             const titleText = isSuccess ? 'Payment Successful' : isPending ? 'Payment Pending' : 'Payment Failed';
             const IconComponent = isSuccess ? CheckCircle : isPending ? Clock : XCircle;
             const amountText = `₹${Math.abs(paymentResult.amount).toFixed(2)}`;
             let descText = isSuccess
                 ? `Successfully sent ${amountText} to ${paymentResult.name}`
                 : isPending
                 ? `Sending ${amountText} to ${paymentResult.name} is pending confirmation.`
                 : `Failed to send ${amountText} to ${paymentResult.name}`;

             if (paymentResult.description?.includes('(Paid via Wallet)')) {
                  descText += ` (via Wallet)`;
             }

             return (
                 <Card className={`shadow-md border-2 ${isSuccess ? 'border-green-500' : isPending ? 'border-yellow-500' : 'border-destructive'}`}>
                    <CardHeader className="items-center text-center">
                         <div className={`mb-4 ${iconColor}`}>
                             <IconComponent className="h-16 w-16" />
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
                            <p><strong>Date:</strong> {format(new Date(paymentResult.date), 'PPp')}</p>
                             {paymentResult.description?.includes('(Paid via Wallet)')) && (
                                <p className="font-medium text-blue-600 flex items-center justify-center gap-1"><Wallet className="h-3 w-3"/> Paid via Wallet (Recovery Scheduled)</p>
                             )}
                              {isFailed && paymentResult.description && !paymentResult.description.includes('(Paid via Wallet)') && <p><strong>Reason:</strong> {paymentResult.description.replace(/Payment Failed - |Payment Pending - /i, '')}</p>}
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
                          {!isSuccess && !isPending && ( // Show Try Again only for failed states
                              <Button variant="outline" className="w-full" onClick={() => { setPaymentResult(null); setError(null); setShowRetryOptions(false); }}>Try Again</Button>
                          )}
                           {(isFailed && paymentResult.ticketId) && ( // Show help only if ticket exists (failed, might be debited)
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
             return (
                 <Card className="shadow-md">
                    <CardHeader className="items-center text-center">
                        <Avatar className="h-16 w-16 mb-2 border">
                            <AvatarImage src={`https://picsum.photos/seed/${payeeAddress}/80/80`} alt={payeeName} data-ai-hint="payee avatar"/>
                            <AvatarFallback>{payeeName === 'Verification Failed' ? '!' : payeeName.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                         <CardTitle className="flex items-center gap-2 justify-center">
                            Pay {payeeName}
                             {isVerifying && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                         </CardTitle>
                        <CardDescription>{payeeAddress}</CardDescription>
                        {error && (payeeName === 'Verification Failed' || payeeName === 'Suspicious Payee') && (
                            <Badge variant="destructive" className="mt-1"><CircleAlert className="h-3 w-3 mr-1"/>{error}</Badge>
                        )}
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePayment} className="space-y-6">
                             <div className="space-y-2 text-center">
                                <Label htmlFor="amount" className="text-sm text-muted-foreground">Amount to Pay</Label>
                                <div className="text-4xl font-bold flex items-center justify-center">
                                    <span className="mr-1">₹</span>
                                     {searchParams.get('am') ? ( // If amount is from param, make it read-only
                                         <span className="px-2">{Number(amount).toFixed(2)}</span>
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
                                            disabled={isLoading || isVerifying || payeeName === 'Verification Failed' || payeeName === 'Suspicious Payee'}
                                        />
                                     )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="note">Note (Optional)</Label>
                                <Input
                                    id="note"
                                    type="text"
                                    placeholder="Add a message"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    disabled={isLoading || isVerifying || payeeName === 'Verification Failed' || payeeName === 'Suspicious Payee'}
                                    maxLength={50}
                                />
                            </div>

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

                             <div className="space-y-2">
                                <Label htmlFor="paymentSource">Pay Using</Label>
                                <Select value={selectedAccountUpiId || (selectedPaymentSource === 'wallet' ? 'wallet' : '')} onValueChange={(value) => {
                                    if (value === 'wallet') {
                                        setSelectedPaymentSource('wallet');
                                        setSelectedAccountUpiId(''); // Clear bank selection
                                    } else {
                                        setSelectedPaymentSource('upi');
                                        setSelectedAccountUpiId(value);
                                    }
                                    setError(null); setShowRetryOptions(false);
                                }} disabled={isLoading || isVerifying}>
                                     <SelectTrigger id="paymentSource">
                                         <SelectValue placeholder="Select payment method"/>
                                     </SelectTrigger>
                                     <SelectContent>
                                         {accounts.map(acc => (
                                            <SelectItem key={acc.upiId} value={acc.upiId} disabled={bankStatuses[acc.upiId] === 'Down'}>
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
                                {accounts.length === 0 && selectedPaymentSource === 'upi' && !isLoading && <p className="text-xs text-destructive pt-1">Please link a bank account in Profile &gt; UPI Settings.</p>}
                            </div>


                             {error && !(payeeName === 'Verification Failed' || payeeName === 'Suspicious Payee') && (
                                <p className="text-sm text-destructive text-center">{error}</p>
                             )}

                              {showRetryOptions && (
                                <Card className="bg-amber-50 border-amber-200 p-3">
                                    <p className="text-sm font-medium text-amber-800 mb-2">Payment Failed. Try:</p>
                                    <div className="space-y-2">
                                         {walletBalance >= currentAmount && (
                                            <Button type="button" variant="outline" size="sm" className="w-full justify-start" onClick={() => handlePayment(undefined, 'wallet')}>
                                                <Wallet className="mr-2 h-4 w-4"/> Pay via Wallet (Balance: ₹{walletBalance.toFixed(2)})
                                            </Button>
                                         )}
                                         {accounts.filter(acc => acc.upiId !== selectedAccountUpiId && bankStatuses[acc.upiId] !== 'Down').map(acc => (
                                             <Button key={acc.upiId} type="button" variant="outline" size="sm" className="w-full justify-start" onClick={() => handlePayment(undefined, 'upi', acc.upiId)}>
                                                 <Landmark className="mr-2 h-4 w-4"/> Pay via {acc.bankName} (...{acc.accountNumber.slice(-4)}) {getBankStatusBadge(bankStatuses[acc.upiId])}
                                             </Button>
                                         ))}
                                         <Button type="button" variant="outline" size="sm" className="w-full justify-start" onClick={() => alert("Offline SMS Pay: Feature coming soon!")}>
                                             <MessageCircle className="mr-2 h-4 w-4"/> Try Offline SMS Pay
                                         </Button>
                                    </div>
                                </Card>
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
                        </form>
                    </CardContent>
                 </Card>
             );
         }
    };

    return (
    <div className="min-h-screen bg-secondary flex flex-col">
        <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
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

        <main className="flex-grow p-4">
            {renderContent()}
        </main>

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
                        maxLength={accounts.find(acc => acc.upiId === selectedAccountUpiId)?.pinLength || 6}
                        value={upiPin}
                        onChange={(e) => setUpiPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="text-center text-xl tracking-[0.3em]"
                        placeholder={accounts.find(acc => acc.upiId === selectedAccountUpiId)?.pinLength === 4 ? "****" : "******"}
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
                            (!accounts.find(acc => acc.upiId === selectedAccountUpiId)?.pinLength && (upiPin.length === 4 || upiPin.length === 6))
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
