'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Lock, Loader2, CheckCircle, XCircle, Info, Wallet, MessageCircle, Users, Landmark, Clock, HelpCircle, Ticket, CircleAlert, WifiOff, BadgeCheck, UserPlus, RefreshCw, Search as SearchIcon, ShieldQuestion, ShieldAlert } from 'lucide-react'; // Added icons
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { getContacts, savePayee, PayeeClient as Payee } from '@/services/contacts'; // Use client interface, use getContacts
import { processUpiPayment, verifyUpiId, getLinkedAccounts, BankAccount, UpiTransactionResult, getBankStatus } from '@/services/upi'; // Import processUpiPayment, verifyUpiId, BankAccount, getBankStatus
import type { Transaction } from '@/services/types'; // Import Transaction
import { payViaWallet, getWalletBalance } from '@/services/wallet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { auth } from '@/lib/firebase';
import { format } from "date-fns";
import { Badge } from '@/components/ui/badge'; // Import Badge
import { cn } from "@/lib/utils";
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area'; // Added ScrollArea

// Interface extending PayeeClient with additional properties for UI
interface DisplayPayee extends Payee {
    verificationStatus?: 'verified' | 'blacklisted' | 'unverified' | 'pending';
    verificationReason?: string; // Reason if blacklisted
    verifiedName?: string; // Name returned by verification API
}

// Debounce function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
      new Promise(resolve => {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => resolve(func(...args)), waitFor);
      });
}

export default function SendMoneyPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const type = typeof params.type === 'string' ? (params.type === 'bank' ? 'bank' : 'mobile') : 'mobile';

  const [allContacts, setAllContacts] = useState<DisplayPayee[]>([]); // Holds all user contacts
  const [filteredContacts, setFilteredContacts] = useState<DisplayPayee[]>([]); // Contacts displayed after filtering/search
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]); // Store recent transactions
  const [searchTerm, setSearchTerm] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedPayee, setSelectedPayee] = useState<DisplayPayee | null>(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isVerifyingUpi, setIsVerifyingUpi] = useState(false); // Track UPI verification loading
  const [hasError, setHasError] = useState(false);
  const [bankStatuses, setBankStatuses] = useState<Record<string, 'Active' | 'Slow' | 'Down'>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAccountUpiId, setSelectedAccountUpiId] = useState('');
  const [paymentResult, setPaymentResult] = useState<UpiTransactionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [upiPin, setUpiPin] = useState('');
  const pinPromiseResolverRef = useRef<{ resolve: (pin: string | null) => void } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [selectedPaymentSource, setSelectedPaymentSource] = useState<PaymentSource>('upi');


    // Fetch contacts and recent transactions on mount
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoadingContacts(true);
            setHasError(false);
            try {
                const [fetchedContacts, fetchedAccounts, fetchedWalletBalance] = await Promise.all([
                    getContacts(),
                    getLinkedAccounts(),
                    getWalletBalance()
                ]);
                 const displayContacts = fetchedContacts.map(c => ({...c, verificationStatus: 'pending'}) as DisplayPayee);
                 setAllContacts(displayContacts);
                 setFilteredContacts(displayContacts); // Initially show all
                 setAccounts(fetchedAccounts);
                 setWalletBalance(fetchedWalletBalance);

                if (fetchedAccounts.length > 0) {
                    const defaultAcc = fetchedAccounts.find(a => a.isDefault);
                    setSelectedAccountUpiId(defaultAcc?.upiId || fetchedAccounts[0].upiId);
                     fetchBankStatusesForAccounts(fetchedAccounts);
                } else if (fetchedWalletBalance <= 0) {
                    setError("No payment methods available.");
                } else {
                    setSelectedPaymentSource('wallet'); // Default to wallet if no bank accounts
                }
            } catch (err: any) {
                setHasError(true);
                console.error("Error loading initial data:", err);
                toast({ variant: "destructive", title: "Error Loading Data", description: err.message });
            } finally {
                setIsLoadingContacts(false);
            }
        };
        loadInitialData();
    }, [toast]);


     const fetchBankStatusesForAccounts = async (accountsToFetch: BankAccount[]) => {
        const statuses: Record<string, 'Active' | 'Slow' | 'Down'> = {};
        for (const acc of accountsToFetch) {
            const bankIdentifier = acc.upiId.split('@')[1];
            if (bankIdentifier) {
                statuses[acc.upiId] = await getBankStatus(bankIdentifier);
            }
        }
        setBankStatuses(statuses);
    };

    // Filter contacts based on search term
    useEffect(() => {
        if (!searchTerm) {
            setFilteredContacts(allContacts);
        } else {
            const lowerSearchTerm = searchTerm.toLowerCase();
            const results = allContacts.filter(contact =>
                contact.name.toLowerCase().includes(lowerSearchTerm) ||
                (contact.identifier && contact.identifier.toLowerCase().includes(lowerSearchTerm)) || // Check if identifier exists
                (contact.upiId && contact.upiId.toLowerCase().includes(lowerSearchTerm)) || // Check if upiId exists
                (contact.accountNumber && contact.accountNumber.includes(lowerSearchTerm)) // Check if accountNumber exists
            );
            setFilteredContacts(results);
        }
    }, [searchTerm, allContacts]);

  // Verify UPI ID when a contact is selected or typed
   const verifyAndSelectPayee = useCallback(async (payee: Payee | { upiId: string, name: string, identifier: string, type: 'bank' | 'mobile' }) => {
        const upiToVerify = payee.upiId || (payee.type === 'bank' || payee.type === 'mobile' ? payee.identifier : null); // Get UPI ID to verify

        if (!upiToVerify || !upiToVerify.includes('@')) {
            // If it's just a mobile number without UPI, select it directly (no verification needed here)
            if (payee.type === 'mobile' && !upiToVerify) {
                 setSelectedPayee({ ...payee, verificationStatus: 'unverified' }); // Mark mobile-only as unverified
                 setSearchTerm(payee.name);
                 return;
            }
            toast({ variant: "destructive", title: "Invalid UPI ID", description: "Please enter or select a valid UPI ID." });
            return;
        }

        setSelectedPayee({ ...payee, verificationStatus: 'pending' }); // Set immediately with pending status
        setSearchTerm(payee.name);
        setIsVerifyingUpi(true);
        setError(null); // Clear previous errors

        try {
             // Call backend verification which checks blacklist/verified list
             const validationResult = await apiClient<{
                verifiedName: string | null,
                isBlacklisted?: boolean,
                isVerifiedMerchant?: boolean,
                reason?: string
            }>(`/upi/verify?upiId=${encodeURIComponent(upiToVerify)}`);


            setSelectedPayee(prev => {
                if (prev?.id === payee.id || prev?.identifier === payee.identifier) { // Ensure update applies to the right payee
                    let status: DisplayPayee['verificationStatus'] = 'unverified';
                    if (validationResult.isBlacklisted) status = 'blacklisted';
                    else if (validationResult.isVerifiedMerchant) status = 'verified';
                    else if (validationResult.verifiedName) status = 'verified'; // Treat verified name as verified user

                    return {
                        ...payee,
                        verificationStatus: status,
                        verifiedName: validationResult.verifiedName || undefined,
                        verificationReason: validationResult.reason
                    };
                }
                return prev;
            });
        } catch (error: any) {
            console.error(`UPI verification failed for ${upiToVerify}:`, error);
            setSelectedPayee(prev => {
                 if (prev?.id === payee.id || prev?.identifier === payee.identifier) {
                    return { ...payee, verificationStatus: 'unverified', verificationReason: 'Verification failed' };
                 }
                 return prev;
            });
            toast({ variant: "destructive", title: "Verification Failed", description: `Could not verify ${upiToVerify}. Please check the ID.` });
        } finally {
            setIsVerifyingUpi(false);
        }
    }, [toast]);


  const handleClearSelection = () => {
    setSelectedPayee(null);
    setSearchTerm('');
    setFilteredContacts(allContacts); // Reset list
  };

  const handleSelectContact = (contact: DisplayPayee) => {
    verifyAndSelectPayee(contact);
  };

   const promptForPin = (): Promise<string | null> => {
        return new Promise((resolve) => {
            setUpiPin('');
            pinPromiseResolverRef.current = { resolve };
            setIsPinDialogOpen(true);
        });
    };

    const handlePinSubmit = () => {
        const expectedLength = accounts.find(acc => acc.upiId === selectedAccountUpiId)?.pinLength;
        const isValid = expectedLength ? upiPin.length === expectedLength : (upiPin.length === 4 || upiPin.length === 6);
        if (isValid && pinPromiseResolverRef.current) {
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
        }
        setIsPinDialogOpen(false);
    };


   const handleMakePayment = async () => {
       const payeeToPay = selectedPayee; // Use the selected payee state
       if (!payeeToPay || !payeeToPay.upiId) {
         toast({ variant: "destructive", title: "Recipient Missing", description: "Please select a valid contact with a UPI ID." });
         return;
       }
        if (payeeToPay.verificationStatus === 'blacklisted') {
            toast({ variant: "destructive", title: "Payment Blocked", description: `Cannot pay to blacklisted UPI ID (${payeeToPay.verificationReason || 'Suspicious Activity'}).` });
            return;
        }
        if (!amount || Number(amount) <= 0) {
          toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid amount." });
          return;
        }
        // Check payment source availability/balance
        if (selectedPaymentSource === 'upi' && (!selectedAccountUpiId || bankStatuses[selectedAccountUpiId] === 'Down')) {
            toast({ variant: "destructive", title: "Bank Unavailable", description: "Selected bank account is unavailable or server is down. Try another method." });
            return;
        }
        if (selectedPaymentSource === 'wallet' && walletBalance < Number(amount)) {
            toast({ variant: "destructive", title: "Insufficient Wallet Balance" });
            return;
        }


        setShowConfirmation(true);
        setIsProcessing(true);
        setPaymentResult(null);
        setError(null);

        try {
             let result: UpiTransactionResult | WalletTransactionResult;
             if (selectedPaymentSource === 'upi') {
                 const enteredPin = await promptForPin();
                 if (enteredPin === null) {
                     throw new Error("PIN entry cancelled.");
                 }
                  // Call UPI payment service
                 result = await processUpiPayment(
                     payeeToPay.upiId!,
                     Number(amount),
                     enteredPin,
                     note || `Payment to ${payeeToPay.name}`,
                     selectedAccountUpiId
                 );
             } else {
                  // Call Wallet payment service
                 result = await payViaWallet(
                    undefined, // Backend infers user
                    payeeToPay.upiId!,
                    Number(amount),
                    note || `Payment to ${payeeToPay.name}`
                 );
             }

            // Process result
            setPaymentResult(result as UpiTransactionResult); // Store result for confirmation screen
            if (result.success || result.status === 'Completed' || result.status === 'FallbackSuccess') {
                toast({ title: "Payment Successful!", description: `Sent ₹${amount} to ${payeeToPay.name}.`, duration: 5000 });
                 // Optionally reset form fields after success
                setSelectedPayee(null);
                setSearchTerm('');
                setAmount('');
                setNote('');
                 // Refresh balance if wallet was used or fallback occurred
                 if (selectedPaymentSource === 'wallet' || (result as UpiTransactionResult).usedWalletFallback) {
                    getWalletBalance().then(setWalletBalance);
                 }
            } else {
                // Handle Pending/Failed state
                throw new Error(result.message || `Payment ${result.status || 'Failed'}`);
            }

        } catch (err: any) {
            console.error("Payment failed:", err);
            setError(err.message || "Payment failed. Please try again.");
             setPaymentResult({ // Show failure on confirmation screen
                amount: Number(amount),
                recipientUpiId: payeeToPay.upiId!,
                status: 'Failed',
                message: err.message || "Payment processing failed."
             });
             toast({ variant: "destructive", title: "Payment Failed", description: err.message });
        } finally {
             setIsProcessing(false);
             // Keep confirmation screen open until closed by user or navigation
        }
    };

   const getVerificationIcon = (status: DisplayPayee['verificationStatus']) => {
     switch (status) {
        case 'verified': return <BadgeCheck className="h-4 w-4 text-green-600" title="Verified"/>;
        case 'blacklisted': return <ShieldAlert className="h-4 w-4 text-destructive" title="Suspicious Account"/>;
        case 'unverified': return <ShieldQuestion className="h-4 w-4 text-yellow-600" title="Unverified"/>;
        case 'pending': return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" title="Verifying..."/>;
        default: return null;
     }
   };

   const handleAddNewContact = () => {
      // TODO: Navigate to a dedicated "Add Contact" page or show a modal form
      alert("Add New Contact / Payee flow not implemented yet.");
      // Example navigation: router.push('/contacts/add');
   }

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Send className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Pay to {type === 'bank' ? 'Bank/UPI ID' : 'Mobile Contact'}</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-4">

        {/* Confirmation Screen */}
        {showConfirmation ? (
             paymentResult ? (
                 <Card className={cn("shadow-md",
                     paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess' ? "border-green-500" :
                     paymentResult.status === 'Pending' ? "border-yellow-500" : "border-destructive")}>
                    <CardHeader className="items-center text-center">
                        <div className={cn("mb-4",
                            paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess' ? 'text-green-600' :
                            paymentResult.status === 'Pending' ? 'text-yellow-600' : 'text-destructive'
                            )}>
                            {paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess' ? <CheckCircle className="h-16 w-16" /> :
                             paymentResult.status === 'Pending' ? <Clock className="h-16 w-16" /> :
                             <XCircle className="h-16 w-16" />}
                        </div>
                        <CardTitle className={cn("text-2xl",
                            paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess' ? 'text-green-600' :
                            paymentResult.status === 'Pending' ? 'text-yellow-600' : 'text-destructive'
                            )}>
                            Payment {paymentResult.status === 'FallbackSuccess' ? 'Successful' : paymentResult.status}
                        </CardTitle>
                        <CardDescription>
                            {paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess' ? `Successfully sent ₹${Math.abs(Number(amount)).toFixed(2)} to ${selectedPayee?.name || paymentResult.recipientUpiId}.` :
                             paymentResult.status === 'Pending' ? `Payment of ₹${Math.abs(Number(amount)).toFixed(2)} to ${selectedPayee?.name || paymentResult.recipientUpiId} is pending.` :
                             `Failed to send ₹${Math.abs(Number(amount)).toFixed(2)} to ${selectedPayee?.name || paymentResult.recipientUpiId}.`}
                        </CardDescription>
                        {paymentResult.message && <p className="text-sm mt-1">{paymentResult.message}</p>}
                         {paymentResult.status === 'FallbackSuccess' && <p className="text-sm mt-1 font-medium text-blue-600 flex items-center justify-center gap-1"><Wallet className="h-4 w-4"/> Paid via Wallet (Recovery Scheduled)</p>}
                    </CardHeader>
                    <CardContent className="text-center space-y-3">
                         <div className="text-xs text-muted-foreground space-y-1 bg-muted p-3 rounded-md">
                            <p><strong>Amount:</strong> ₹{Math.abs(Number(amount)).toFixed(2)}</p>
                            <p><strong>To:</strong> {selectedPayee?.name || paymentResult.recipientUpiId} ({paymentResult.recipientUpiId})</p>
                            <p><strong>Date:</strong> {format(new Date(), 'PPp')}</p> {/* Use current time */}
                             {paymentResult.transactionId && <p><strong>Transaction ID:</strong> {paymentResult.transactionId}</p>}
                             {paymentResult.ticketId && <p className="font-medium text-orange-600"><strong>Ticket ID:</strong> {paymentResult.ticketId}</p>}
                             {paymentResult.refundEta && <p className="text-xs"><strong>Refund ETA:</strong> {paymentResult.refundEta}</p>}
                         </div>
                         <Button className="w-full" onClick={() => router.push('/')}>Done</Button>
                         <Button variant="link" onClick={() => router.push('/history')}>View History</Button>
                          {(paymentResult.status === 'Failed' && paymentResult.ticketId) && (
                             <Button variant="link" className="w-full flex items-center gap-1 text-destructive"><HelpCircle className="h-4 w-4"/> Get Help</Button>
                         )}
                    </CardContent>
                 </Card>
             ) : (
                 // Show loading state while waiting for payment result
                 <Card className="shadow-md text-center">
                    <CardContent className="p-6">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4"/>
                        <p className="text-muted-foreground">Processing payment...</p>
                    </CardContent>
                 </Card>
             )
        ) : (
            // Initial Send Form
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Send Money</CardTitle>
                 <CardDescription>
                     {type === 'bank' ? 'Enter recipient UPI ID or select a saved bank contact.' : 'Search or select a mobile contact to pay.'}
                 </CardDescription>
              </CardHeader>
              <CardContent>
                    <div className="space-y-4">
                        {/* Contact Search/Input */}
                        <div className="space-y-2">
                            <Label htmlFor="payeeInput">{type === 'bank' ? 'Enter UPI ID or Search Bank Contact' : 'Search Mobile Contact'}</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="payeeInput"
                                    type={type === 'mobile' ? 'search' : 'text'}
                                    placeholder={type === 'bank' ? 'name@upi or Name' : 'Enter name or mobile number'}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="flex-grow"
                                    disabled={!!selectedPayee} // Disable input when payee is selected
                                />
                                {selectedPayee && (
                                    <Button variant="ghost" size="icon" onClick={handleClearSelection} title="Clear Selection">
                                        <XCircle className="h-5 w-5 text-muted-foreground" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Contact/UPI ID List */}
                         {isLoadingContacts ? (
                             <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-primary"/></div>
                         ) : searchTerm && !selectedPayee ? (
                             <ScrollArea className="max-h-40 border rounded-md">
                                 <div className="p-2 space-y-1">
                                    {filteredContacts.length === 0 && <p className="text-xs text-muted-foreground p-2 text-center">No matching contacts found.</p>}
                                     {filteredContacts.map((contact) => (
                                        <Button key={contact.id || contact.identifier} variant="ghost" className="w-full justify-start h-auto py-1.5 px-2" onClick={() => verifyAndSelectPayee(contact)}>
                                            <Avatar className="h-7 w-7 mr-2">
                                                <AvatarImage src={`https://picsum.photos/seed/${contact.avatarSeed}/30/30`} alt={contact.name} data-ai-hint="person avatar"/>
                                                <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="text-left">
                                                <p className="text-sm font-medium">{contact.name}</p>
                                                <p className="text-xs text-muted-foreground">{contact.upiId || contact.identifier}</p>
                                            </div>
                                        </Button>
                                     ))}
                                     {/* Option to add/pay entered UPI ID if not in contacts */}
                                     {type === 'bank' && searchTerm.includes('@') && !filteredContacts.some(c => c.upiId === searchTerm || c.identifier === searchTerm) && (
                                         <Button variant="ghost" className="w-full justify-start h-auto py-1.5 px-2" onClick={() => verifyAndSelectPayee({ name: searchTerm.split('@')[0], upiId: searchTerm, identifier: searchTerm, type: 'bank'})}>
                                             <UserPlus className="h-4 w-4 mr-2" /> Pay to <span className="font-medium ml-1">{searchTerm}</span>
                                         </Button>
                                     )}
                                 </div>
                            </ScrollArea>
                         ) : null}

                        {/* Selected Payee Display */}
                        {selectedPayee && (
                            <Card className="p-3 bg-muted/50 border">
                                 <div className="flex items-center justify-between">
                                     <div className="flex items-center gap-3 overflow-hidden">
                                         <Avatar className="h-9 w-9 flex-shrink-0">
                                             <AvatarImage src={`https://picsum.photos/seed/${selectedPayee.avatarSeed}/40/40`} alt={selectedPayee.name} data-ai-hint="person avatar"/>
                                             <AvatarFallback>{selectedPayee.name.charAt(0)}</AvatarFallback>
                                         </Avatar>
                                         <div className="overflow-hidden">
                                             <p className="text-sm font-medium truncate">{selectedPayee.verifiedName || selectedPayee.name}</p>
                                             <p className="text-xs text-muted-foreground truncate">{selectedPayee.upiId || selectedPayee.identifier}</p>
                                         </div>
                                     </div>
                                      {/* Verification Status Icon */}
                                      <div className="shrink-0">
                                        {getVerificationIcon(selectedPayee.verificationStatus)}
                                      </div>
                                 </div>
                                  {selectedPayee.verificationStatus === 'blacklisted' && <p className="text-xs text-destructive mt-1">{selectedPayee.verificationReason || 'Suspicious Activity Detected.'}</p>}
                                  {selectedPayee.verificationStatus === 'unverified' && selectedPayee.upiId && <p className="text-xs text-yellow-600 mt-1">UPI ID not verified. Proceed with caution.</p>}
                            </Card>
                        )}

                        {/* Amount Input */}
                        <div className="space-y-1">
                            <Label htmlFor="amount">Amount (₹)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-lg">₹</span>
                                <Input
                                    id="amount"
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                    min="1"
                                    step="0.01"
                                    className="pl-7 text-xl font-semibold h-12"
                                    disabled={!selectedPayee || isProcessing}
                                />
                            </div>
                        </div>

                        {/* Note Input */}
                         <div className="space-y-1">
                            <Label htmlFor="note">Note (Optional)</Label>
                            <Input
                                id="note"
                                type="text"
                                placeholder="Add a message"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                disabled={!selectedPayee || isProcessing}
                                maxLength={50}
                            />
                        </div>

                         {/* Payment Method */}
                         <div className="space-y-1">
                            <Label htmlFor="paymentSource">Pay Using</Label>
                            <Select value={selectedAccountUpiId || (selectedPaymentSource === 'wallet' ? 'wallet' : '')} onValueChange={(value) => {
                                if (value === 'wallet') {
                                    setSelectedPaymentSource('wallet');
                                    setSelectedAccountUpiId(''); // Clear bank selection
                                } else {
                                    setSelectedPaymentSource('upi');
                                    setSelectedAccountUpiId(value);
                                }
                                setError(null); // Clear error when method changes
                            }} disabled={isProcessing}>
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
                             {selectedPaymentSource === 'upi' && selectedAccountUpiId && bankStatuses[selectedAccountUpiId] === 'Down' && (
                                 <p className="text-xs text-destructive pt-1">Selected bank server is down. Please choose another method.</p>
                             )}
                              {selectedPaymentSource === 'upi' && selectedAccountUpiId && bankStatuses[selectedAccountUpiId] === 'Slow' && (
                                 <p className="text-xs text-yellow-600 pt-1">Selected bank server is slow. Payment might take longer.</p>
                             )}
                        </div>


                        {/* Error Display */}
                        {error && (
                            <p className="text-sm text-destructive text-center">{error}</p>
                        )}

                        <Button
                            type="button"
                            onClick={handleMakePayment}
                            className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                            disabled={!selectedPayee || !amount || Number(amount) <= 0 || isProcessing || selectedPayee.verificationStatus === 'blacklisted' || (selectedPaymentSource === 'upi' && !selectedAccountUpiId)}
                          >
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            {isProcessing ? 'Processing...' : 'Pay Now'}
                        </Button>
                        </div>
              </CardContent>
            </Card>
        )}

         {/* UPI PIN Dialog */}
         <AlertDialog open={isPinDialogOpen} onOpenChange={(open) => { if (!open) handlePinCancel(); }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Enter UPI PIN</AlertDialogTitle>
                     <AlertDialogDescription>
                         Enter your {accounts.find(acc => acc.upiId === selectedAccountUpiId)?.pinLength || '4 or 6'} digit UPI PIN for {accounts.find(acc => acc.upiId === selectedAccountUpiId)?.bankName || 'your account'} to authorize this payment of ₹{Number(amount).toFixed(2)} to {selectedPayee?.name}.
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
                        onChange={(e) => setUpiPin(e.target.value.replace(/\D/g, ''))}
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

      </main>
    </div>
  );
}

// Helper to get badge for bank status
 const getBankStatusBadge = (status: 'Active' | 'Slow' | 'Down' | undefined) => {
    switch(status) {
        // case 'Active': return <Badge variant="default" className="ml-2 text-xs bg-green-100 text-green-700">Active</Badge>; // Hide active for cleaner look
        case 'Slow': return <Badge variant="secondary" className="ml-2 text-xs bg-yellow-100 text-yellow-700">Slow</Badge>;
        case 'Down': return <Badge variant="destructive" className="ml-2 text-xs">Down</Badge>;
        default: return null;
    }
 };
