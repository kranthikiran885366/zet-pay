'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Lock, Loader2, CheckCircle, XCircle, Info, Wallet, MessageSquare, Users, Landmark, Clock, HelpCircle, Ticket, CircleAlert, WifiOff, BadgeCheck, UserPlus, RefreshCw, Search as SearchIcon, ShieldQuestion, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { getContacts, savePayee, PayeeClient as Payee } from '@/services/contacts'; // Use client interface
import { processUpiPayment, verifyUpiId as verifyUpiIdService, getLinkedAccounts, BankAccount, UpiTransactionResult, getBankStatus } from '@/services/upi'; // Import processUpiPayment
import type { Transaction } from '@/services/types';
import { payViaWallet, getWalletBalance } from '@/services/wallet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { auth } from '@/lib/firebase';
import { format } from "date-fns";
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils";
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiClient } from '@/lib/apiClient';
import { ZetChat } from '@/components/zet-chat'; // Import ZetChat

// Interface extending PayeeClient with additional properties for UI
interface DisplayPayee extends Payee {
    verificationStatus?: 'verified' | 'blacklisted' | 'unverified' | 'pending';
    verificationReason?: string; // Reason if blacklisted
    verifiedName?: string; // Name returned by verification API
}

type PaymentSource = 'upi' | 'wallet';


// Debounce function
function debounce&lt;F extends (...args: any[]) =&gt; any&gt;(func: F, waitFor: number) {
    let timeout: ReturnType&lt;typeof setTimeout&gt; | null = null;

    return (...args: Parameters&lt;F&gt;): Promise&lt;ReturnType&lt;F&gt;&gt; =&gt;
      new Promise(resolve =&gt; {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() =&gt; resolve(func(...args)), waitFor);
      });
}

export default function SendMoneyPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const type = typeof params.type === 'string' ? (params.type === 'bank' ? 'bank' : 'mobile') : 'mobile';

  const [allContacts, setAllContacts] = useState&lt;DisplayPayee[]&gt;([]);
  const [filteredContacts, setFilteredContacts] = useState&lt;DisplayPayee[]&gt;([]);
  const [recentTransactions, setRecentTransactions] = useState&lt;Transaction[]&gt;([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [accounts, setAccounts] = useState&lt;BankAccount[]&gt;([]);
  const [selectedPayee, setSelectedPayee] = useState&lt;DisplayPayee | null&gt;(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isVerifyingUpi, setIsVerifyingUpi] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [bankStatuses, setBankStatuses] = useState&lt;Record&lt;string, 'Active' | 'Slow' | 'Down'&gt;&gt;({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAccountUpiId, setSelectedAccountUpiId] = useState('');
  const [paymentResult, setPaymentResult] = useState&lt;UpiTransactionResult | null&gt;(null);
  const [error, setError] = useState&lt;string | null&gt;(null);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [upiPin, setUpiPin] = useState('');
  const pinPromiseResolverRef = useRef&lt;{ resolve: (pin: string | null) =&gt; void } | null&gt;(null);
  const [walletBalance, setWalletBalance] = useState&lt;number&gt;(0);
  const [selectedPaymentSource, setSelectedPaymentSource] = useState&lt;PaymentSource&gt;('upi');
  const [isLoggedIn, setIsLoggedIn] = useState&lt;boolean | null&gt;(null);

  // Zet Chat states
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatRecipient, setChatRecipient] = useState&lt;{ id: string; name: string; avatar?: string } | null&gt;(null);


    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user =&gt; {
            setIsLoggedIn(!!user);
            if (user) {
                loadInitialData();
            } else {
                setIsLoadingContacts(false);
                setAllContacts([]);
                setFilteredContacts([]);
                setAccounts([]);
                setWalletBalance(0);
                setError("Please log in to send money.");
            }
        });
        return () =&gt; unsubscribeAuth();
    }, []);

    const loadInitialData = useCallback(async () => {
        setIsLoadingContacts(true);
        setHasError(false);
        try {
            const [fetchedContacts, fetchedAccounts, fetchedWalletBalance] = await Promise.all([
                getContacts(),
                getLinkedAccounts(),
                getWalletBalance()
            ]);
             const displayContacts = fetchedContacts.map(c =&gt; ({...c, verificationStatus: 'pending', isZetChatUser: Math.random() &gt; 0.5}) as DisplayPayee); // Simulate isZetChatUser
             setAllContacts(displayContacts);
             setFilteredContacts(displayContacts);
             setAccounts(fetchedAccounts);
             setWalletBalance(fetchedWalletBalance);

            if (fetchedAccounts.length &gt; 0) {
                const defaultAcc = fetchedAccounts.find(a =&gt; a.isDefault);
                setSelectedAccountUpiId(defaultAcc?.upiId || fetchedAccounts[0].upiId);
                 fetchBankStatusesForAccounts(fetchedAccounts);
                 setSelectedPaymentSource('upi');
            } else if (fetchedWalletBalance &lt;= 0) {
                setError("No payment methods available. Please link a bank account or add funds to your wallet.");
            } else {
                setSelectedPaymentSource('wallet');
            }
        } catch (err: any) {
            setHasError(true);
            console.error("Error loading initial data:", err);
            toast({ variant: "destructive", title: "Error Loading Data", description: err.message });
        } finally {
            setIsLoadingContacts(false);
        }
    }, [toast]);


     const fetchBankStatusesForAccounts = async (accountsToFetch: BankAccount[]) => {
        const statuses: Record&lt;string, 'Active' | 'Slow' | 'Down'&gt; = {};
        for (const acc of accountsToFetch) {
            const bankIdentifier = acc.upiId.split('@')[1];
            if (bankIdentifier) {
                 try {
                    statuses[acc.upiId] = await getBankStatus(bankIdentifier);
                 } catch (statusError) {
                      console.warn(`Failed to get status for ${acc.upiId}:`, statusError);
                      statuses[acc.upiId] = 'Active'; 
                 }
            }
        }
        setBankStatuses(statuses);
    };

    useEffect(() => {
        if (!searchTerm) {
            setFilteredContacts(allContacts);
        } else {
            const lowerSearchTerm = searchTerm.toLowerCase();
            const results = allContacts.filter(contact =&gt;
                contact.name.toLowerCase().includes(lowerSearchTerm) ||
                (contact.identifier && contact.identifier.toLowerCase().includes(lowerSearchTerm)) ||
                (contact.upiId && contact.upiId.toLowerCase().includes(lowerSearchTerm)) ||
                (contact.accountNumber && contact.accountNumber.includes(lowerSearchTerm))
            );
            setFilteredContacts(results);
        }
    }, [searchTerm, allContacts]);

   const verifyAndSelectPayee = useCallback(async (payee: Payee | { upiId: string, name: string, identifier: string, type: 'bank' | 'mobile', isZetChatUser?: boolean }) =&gt; {
        const upiToVerify = payee.upiId || (payee.type === 'bank' ? payee.identifier : null);
        const isZetChatUser = 'isZetChatUser' in payee ? payee.isZetChatUser : Math.random() &gt; 0.5; // Use existing or simulate

        if (!upiToVerify || !upiToVerify.includes('@')) {
            if (payee.type === 'mobile' && !upiToVerify) {
                 setSelectedPayee({ ...payee, verificationStatus: 'unverified', verificationReason: 'Mobile Number Only', isZetChatUser });
                 setSearchTerm(payee.name);
                 setIsVerifyingUpi(false);
                 setError(null);
                 return;
            }
            if (payee.type === 'bank' && !upiToVerify) {
                setSelectedPayee({...payee, verificationStatus: 'unverified', verificationReason: 'Bank Account Only', isZetChatUser });
                setSearchTerm(payee.name);
                setIsVerifyingUpi(false);
                setError(null);
                return;
            }
             toast({ variant: "destructive", title: "Invalid UPI ID", description: "Please enter or select a valid UPI ID (@ included)." });
             setSelectedPayee({...payee, verificationStatus: 'unverified', verificationReason: 'Invalid Format', isZetChatUser });
             setSearchTerm(payee.name);
             setIsVerifyingUpi(false);
             return;
        }

        setSelectedPayee({ ...payee, upiId: upiToVerify, verificationStatus: 'pending', isZetChatUser });
        setSearchTerm(payee.name);
        setIsVerifyingUpi(true);
        setError(null);

        try {
             const validationResult = await verifyUpiIdService(upiToVerify);

            setSelectedPayee(prev =&gt; {
                if (prev?.upiId === upiToVerify || prev?.identifier === payee.identifier) {
                    let status: DisplayPayee['verificationStatus'] = 'unverified';
                    if (validationResult.isBlacklisted) status = 'blacklisted';
                    else if ((validationResult.verifiedName && validationResult.verifiedName === prev.name) || validationResult.isVerifiedMerchant) status = 'verified';
                    else if (validationResult.verifiedName) status = 'verified';

                    return {
                        ...prev,
                        upiId: upiToVerify,
                        verificationStatus: status,
                        verifiedName: validationResult.verifiedName || undefined,
                        verificationReason: validationResult.reason || (status === 'unverified' ? 'Name mismatch or not found' : undefined),
                        isZetChatUser: isZetChatUser ?? prev.isZetChatUser // Preserve if already set
                    };
                }
                return prev;
            });

            if (validationResult.isBlacklisted) {
                setError(`Payment Blocked: ${validationResult.reason || 'Recipient is flagged as suspicious.'}`);
            } else if (validationResult.verifiedName && validationResult.verifiedName !== payee.name) {
                 toast({ title: "Name Verification", description: `Registered name: ${validationResult.verifiedName}` });
            }

        } catch (error: any) {
            console.error(`UPI verification failed for ${upiToVerify}:`, error);
            setSelectedPayee(prev =&gt; {
                 if (prev?.upiId === upiToVerify || prev?.identifier === payee.identifier) {
                    return { ...prev, upiId: upiToVerify, verificationStatus: 'unverified', verificationReason: 'Verification failed', isZetChatUser };
                 }
                 return prev;
            });
            if (!error.message?.includes('404')) {
                 toast({ variant: "destructive", title: "Verification Failed", description: `Could not verify ${upiToVerify}. Please check the ID.` });
            }
        } finally {
            setIsVerifyingUpi(false);
        }
    }, [toast]);


  const handleClearSelection = () => {
    setSelectedPayee(null);
    setSearchTerm('');
    setError(null);
    setFilteredContacts(allContacts);
  };

  const handleSelectContact = (contact: DisplayPayee) => {
    verifyAndSelectPayee(contact);
  };

   const promptForPin = (): Promise&lt;string | null&gt; =&gt; {
        return new Promise((resolve) =&gt; {
            setUpiPin('');
            pinPromiseResolverRef.current = { resolve };
            setIsPinDialogOpen(true);
        });
    };

    const handlePinSubmit = () => {
        const expectedLength = accounts.find(acc =&gt; acc.upiId === selectedAccountUpiId)?.pinLength;
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
       const payeeToPay = selectedPayee;
       if (!isLoggedIn) {
           toast({ variant: "destructive", title: "Not Logged In", description: "Please log in to make payments." });
           return;
       }
       if (!payeeToPay || !payeeToPay.upiId) {
         toast({ variant: "destructive", title: "Recipient Missing", description: "Please select a valid contact with a UPI ID." });
         return;
       }
        if (payeeToPay.verificationStatus === 'blacklisted') {
            toast({ variant: "destructive", title: "Payment Blocked", description: `Cannot pay to blacklisted UPI ID (${payeeToPay.verificationReason || 'Suspicious Activity'}).` });
            return;
        }
        if (!amount || Number(amount) &lt;= 0) {
          toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid amount." });
          return;
        }
        if (selectedPaymentSource === 'upi' && (!selectedAccountUpiId || bankStatuses[selectedAccountUpiId] === 'Down')) {
            toast({ variant: "destructive", title: "Bank Unavailable", description: "Selected bank account is unavailable or server is down. Try another method." });
            return;
        }
        if (selectedPaymentSource === 'wallet' && walletBalance &lt; Number(amount)) {
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
                 result = await processUpiPayment(
                     payeeToPay.upiId!,
                     Number(amount),
                     enteredPin,
                     note || `Payment to ${payeeToPay.name}`,
                     selectedAccountUpiId
                 );
             } else {
                 result = await payViaWallet(
                    auth.currentUser?.uid,
                    payeeToPay.upiId!,
                    Number(amount),
                    note || `Payment to ${payeeToPay.name}`
                 );
             }

            setPaymentResult(result as UpiTransactionResult);
            if (result.success || result.status === 'Completed' || result.status === 'FallbackSuccess') {
                toast({ title: "Payment Successful!", description: `Sent ₹${amount} to ${payeeToPay.verifiedName || payeeToPay.name}.`, duration: 5000 });
                 if (selectedPaymentSource === 'wallet' || (result as UpiTransactionResult).usedWalletFallback) {
                    getWalletBalance().then(setWalletBalance);
                 }
            } else {
                throw new Error(result.message || `Payment ${result.status || 'Failed'}`);
            }

        } catch (err: any) {
            console.error("Payment failed:", err);
            const errorMessage = err.message || "Payment failed. Please try again.";
            setError(errorMessage);
             setPaymentResult({
                amount: Number(amount),
                recipientUpiId: payeeToPay.upiId!,
                status: 'Failed',
                message: errorMessage
             });
        } finally {
             setIsProcessing(false);
              if (error && error !== "PIN entry cancelled.") {
                 toast({ variant: "destructive", title: "Payment Failed", description: error });
              } else if (paymentResult && !(paymentResult.success || paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess')) {
                 toast({ variant: "destructive", title: `Payment ${paymentResult.status || 'Failed'}`, description: paymentResult.message || "An error occurred." });
              }
        }
    };

    const getVerificationIcon = (status: DisplayPayee['verificationStatus']) => {
        switch (status) {
            case 'verified': return &lt;BadgeCheck className="h-4 w-4 text-green-600" title="Verified"/&gt;;
            case 'blacklisted': return &lt;ShieldAlert className="h-4 w-4 text-destructive" title="Suspicious Account"/&gt;;
            case 'unverified': return &lt;ShieldQuestion className="h-4 w-4 text-yellow-600" title="Unverified"/&gt;;
            case 'pending': return &lt;Loader2 className="h-4 w-4 animate-spin text-muted-foreground" title="Verifying..."/&gt;;
            default: return &lt;ShieldQuestion className="h-4 w-4 text-gray-400" title="Status Unknown"/&gt;;
        }
    };

   const handleAddNewContact = () => {
      alert("Add New Contact / Payee flow not implemented yet.");
   }

   const handlePayToUpiId = () => {
        if (searchTerm.includes('@') && !filteredContacts.some(c =&gt; c.upiId === searchTerm || c.identifier === searchTerm)) {
             verifyAndSelectPayee({ name: searchTerm.split('@')[0], upiId: searchTerm, identifier: searchTerm, type: 'bank' });
        } else if (searchTerm.match(/^[6-9]\d{9}$/) && !filteredContacts.some(c =&gt; c.identifier === searchTerm)) {
             verifyAndSelectPayee({ name: searchTerm, identifier: searchTerm, type: 'mobile' });
        } else {
            toast({ variant: "destructive", title: "Invalid Input", description: "Enter a valid UPI ID or mobile number to pay." });
        }
   }

   const openChatWithPayee = () => {
       if (selectedPayee && selectedPayee.isZetChatUser && selectedPayee.upiId) {
           setChatRecipient({
               id: selectedPayee.upiId, // Using UPI ID as chat identifier
               name: selectedPayee.verifiedName || selectedPayee.name,
               avatar: selectedPayee.avatarSeed ? `https://picsum.photos/seed/${selectedPayee.avatarSeed}/40/40` : undefined,
           });
           setShowChatModal(true);
       } else {
           toast({ description: "Chat is only available with verified Zet Pay users." });
       }
   };


  return (
    &lt;div className="min-h-screen bg-secondary flex flex-col"&gt;
      &lt;header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md"&gt;
        &lt;Link href="/" passHref&gt;
          &lt;Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80"&gt;
            &lt;ArrowLeft className="h-5 w-5" /&gt;
          &lt;/Button&gt;
        &lt;/Link&gt;
        &lt;Send className="h-6 w-6" /&gt;
        &lt;h1 className="text-lg font-semibold"&gt;Pay to {type === 'bank' ? 'Bank/UPI ID' : 'Mobile Contact'}&lt;/h1&gt;
      &lt;/header&gt;

      &lt;main className="flex-grow p-4 space-y-4 pb-20"&gt;

        {showConfirmation ? (
             paymentResult ? (
                 &lt;Card className={cn("shadow-md",
                     paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess' ? "border-green-500" :
                     paymentResult.status === 'Pending' ? "border-yellow-500" : "border-destructive")}&gt;
                    &lt;CardHeader className="items-center text-center"&gt;
                        &lt;div className={cn("mb-4",
                            paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess' ? 'text-green-600' :
                            paymentResult.status === 'Pending' ? 'text-yellow-600' : 'text-destructive'
                            )}&gt;
                            {paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess' ? &lt;CheckCircle className="h-16 w-16" /&gt; :
                             paymentResult.status === 'Pending' ? &lt;Clock className="h-16 w-16" /&gt; :
                             &lt;XCircle className="h-16 w-16" /&gt;}
                        &lt;/div&gt;
                        &lt;CardTitle className={cn("text-2xl",
                            paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess' ? 'text-green-600' :
                            paymentResult.status === 'Pending' ? 'text-yellow-600' : 'text-destructive'
                            )}&gt;
                            Payment {paymentResult.status === 'FallbackSuccess' ? 'Successful' : paymentResult.status}
                        &lt;/CardTitle&gt;
                        &lt;CardDescription&gt;
                            {paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess' ? `Successfully sent ₹${Math.abs(Number(amount)).toFixed(2)} to ${selectedPayee?.verifiedName || selectedPayee?.name || paymentResult.recipientUpiId}.` :
                             paymentResult.status === 'Pending' ? `Payment of ₹${Math.abs(Number(amount)).toFixed(2)} to ${selectedPayee?.verifiedName || selectedPayee?.name || paymentResult.recipientUpiId} is pending.` :
                             `Failed to send ₹${Math.abs(Number(amount)).toFixed(2)} to ${selectedPayee?.verifiedName || selectedPayee?.name || paymentResult.recipientUpiId}.`}
                        &lt;/CardDescription&gt;
                        {paymentResult.message && &lt;p className="text-sm mt-1"&gt;{paymentResult.message}&lt;/p&gt;}
                         {paymentResult.status === 'FallbackSuccess' && &lt;p className="text-sm mt-1 font-medium text-blue-600 flex items-center justify-center gap-1"&gt;&lt;Wallet className="h-4 w-4"/&gt; Paid via Wallet (Recovery Scheduled)&lt;/p&gt;}
                    &lt;/CardHeader&gt;
                    &lt;CardContent className="text-center space-y-3"&gt;
                         &lt;div className="text-xs text-muted-foreground space-y-1 bg-muted p-3 rounded-md"&gt;
                            &lt;p&gt;&lt;strong&gt;Amount:&lt;/strong&gt; ₹{Math.abs(Number(amount)).toFixed(2)}&lt;/p&gt;
                            &lt;p&gt;&lt;strong&gt;To:&lt;/strong&gt; {selectedPayee?.verifiedName || selectedPayee?.name || paymentResult.recipientUpiId} ({paymentResult.recipientUpiId})&lt;/p&gt;
                            &lt;p&gt;&lt;strong&gt;Date:&lt;/strong&gt; {format(new Date(), 'PPp')}&lt;/p&gt;
                             {paymentResult.transactionId && &lt;p&gt;&lt;strong&gt;Transaction ID:&lt;/strong&gt; {paymentResult.transactionId}&lt;/p&gt;}
                             {paymentResult.ticketId && &lt;p className="font-medium text-orange-600"&gt;&lt;strong&gt;Ticket ID:&lt;/strong&gt; {paymentResult.ticketId}&lt;/p&gt;}
                             {paymentResult.refundEta && &lt;p className="text-xs"&gt;&lt;strong&gt;Refund ETA:&lt;/strong&gt; {paymentResult.refundEta}&lt;/p&gt;}
                         &lt;/div&gt;
                         &lt;Button className="w-full" onClick={() =&gt; router.push('/')}&gt;Done&lt;/Button&gt;
                         &lt;Button variant="link" onClick={() =&gt; router.push('/history')}&gt;View History&lt;/Button&gt;
                          {paymentResult.status === 'Failed' && (
                             &lt;Button variant="outline" className="w-full" onClick={() =&gt; { setShowConfirmation(false); setPaymentResult(null); setError(null); }}&gt;Try Again&lt;/Button&gt;
                          )}
                           {(paymentResult.status === 'Failed' && paymentResult.ticketId) && (
                                &lt;Link href={`/support?ticketId=${paymentResult.ticketId}`} passHref&gt;
                                    &lt;Button variant="link" className="w-full flex items-center gap-1 text-destructive"&gt;&lt;HelpCircle className="h-4 w-4"/&gt; Get Help&lt;/Button&gt;
                                &lt;/Link&gt;
                            )}
                    &lt;/CardContent&gt;
                 &lt;/Card&gt;
             ) : (
                 &lt;Card className="shadow-md text-center"&gt;
                    &lt;CardContent className="p-6"&gt;
                        &lt;Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4"/&gt;
                        &lt;p className="text-muted-foreground"&gt;Processing payment...&lt;/p&gt;
                    &lt;/CardContent&gt;
                 &lt;/Card&gt;
             )
        ) : (
            &lt;Card className="shadow-md"&gt;
              &lt;CardHeader&gt;
                &lt;CardTitle&gt;Send Money&lt;/CardTitle&gt;
                 &lt;CardDescription&gt;
                     {type === 'bank' ? 'Enter recipient UPI ID or select a saved bank contact.' : 'Search or select a mobile contact to pay.'}
                 &lt;/CardDescription&gt;
              &lt;/CardHeader&gt;
              &lt;CardContent&gt;
                    &lt;div className="space-y-4"&gt;
                        &lt;div className="space-y-2"&gt;
                            &lt;Label htmlFor="payeeInput"&gt;{type === 'bank' ? 'Enter UPI ID or Search Bank Contact' : 'Search Mobile Contact'}&lt;/Label&gt;
                            &lt;div className="flex gap-2 relative"&gt;
                                &lt;SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/&gt;
                                &lt;Input
                                    id="payeeInput"
                                    type={type === 'mobile' ? 'search' : 'text'}
                                    placeholder={type === 'bank' ? 'name@upi or Name' : 'Enter name or mobile number'}
                                    value={searchTerm}
                                    onChange={(e) =&gt; setSearchTerm(e.target.value)}
                                    className="pl-8 flex-grow"
                                    disabled={!!selectedPayee}
                                /&gt;
                                {selectedPayee && (
                                    &lt;Button variant="ghost" size="icon" onClick={handleClearSelection} title="Clear Selection" className="h-auto px-2"&gt;
                                        &lt;XCircle className="h-5 w-5 text-muted-foreground" /&gt;
                                    &lt;/Button&gt;
                                )}
                            &lt;/div&gt;
                        &lt;/div&gt;

                         {isLoadingContacts ? (
                             &lt;div className="flex justify-center p-4"&gt;&lt;Loader2 className="h-5 w-5 animate-spin text-primary"/&gt;&lt;/div&gt;
                         ) : !selectedPayee && searchTerm ? (
                             &lt;ScrollArea className="max-h-40 border rounded-md"&gt;
                                 &lt;div className="p-2 space-y-1"&gt;
                                    {filteredContacts.length === 0 && !(searchTerm.includes('@') || searchTerm.match(/^[6-9]\d{9}$/)) && &lt;p className="text-xs text-muted-foreground p-2 text-center"&gt;No matching contacts found.&lt;/p&gt;}
                                     {filteredContacts.map((contact) =&gt; (
                                        &lt;Button key={contact.id || contact.identifier} variant="ghost" className="w-full justify-start h-auto py-1.5 px-2" onClick={() =&gt; handleSelectContact(contact)}&gt;
                                            &lt;Avatar className="h-7 w-7 mr-2"&gt;
                                                &lt;AvatarImage src={`https://picsum.photos/seed/${contact.avatarSeed}/30/30`} alt={contact.name} data-ai-hint="person avatar"/&gt;
                                                &lt;AvatarFallback&gt;{contact.name.charAt(0)}&lt;/AvatarFallback&gt;
                                            &lt;/Avatar&gt;
                                            &lt;div className="text-left"&gt;
                                                &lt;p className="text-sm font-medium"&gt;{contact.name}&lt;/p&gt;
                                                &lt;p className="text-xs text-muted-foreground"&gt;{contact.upiId || contact.identifier}&lt;/p&gt;
                                            &lt;/div&gt;
                                        &lt;/Button&gt;
                                     ))}
                                     {filteredContacts.length === 0 && (searchTerm.includes('@') || searchTerm.match(/^[6-9]\d{9}$/)) && (
                                         &lt;Button variant="ghost" className="w-full justify-start h-auto py-1.5 px-2" onClick={handlePayToUpiId}&gt;
                                             &lt;UserPlus className="h-4 w-4 mr-2" /&gt; Pay to &lt;span className="font-medium ml-1"&gt;{searchTerm}&lt;/span&gt;
                                         &lt;/Button&gt;
                                     )}
                                     {filteredContacts.length === 0 && !searchTerm.includes('@') && !searchTerm.match(/^[6-9]\d{9}$/) && (
                                        &lt;Button variant="link" size="sm" onClick={handleAddNewContact} className="w-full justify-center text-xs h-auto py-1"&gt;
                                            &lt;UserPlus className="h-3 w-3 mr-1"/&gt; Add New Contact
                                        &lt;/Button&gt;
                                     )}
                                 &lt;/div&gt;
                            &lt;/ScrollArea&gt;
                         ) : !selectedPayee && !searchTerm ? (
                             &lt;p className="text-xs text-muted-foreground text-center py-2"&gt;Search or select a contact to begin.&lt;/p&gt;
                         ) : null}


                        {selectedPayee && (
                            &lt;Card className="p-3 bg-muted/50 border"&gt;
                                 &lt;div className="flex items-center justify-between"&gt;
                                     &lt;div className="flex items-center gap-3 overflow-hidden"&gt;
                                         &lt;Avatar className="h-9 w-9 flex-shrink-0"&gt;
                                             &lt;AvatarImage src={`https://picsum.photos/seed/${selectedPayee.avatarSeed}/40/40`} alt={selectedPayee.name} data-ai-hint="person avatar"/&gt;
                                             &lt;AvatarFallback&gt;{selectedPayee.name.charAt(0)}&lt;/AvatarFallback&gt;
                                         &lt;/Avatar&gt;
                                         &lt;div className="overflow-hidden"&gt;
                                             &lt;p className="text-sm font-medium truncate"&gt;{selectedPayee.verifiedName || selectedPayee.name}&lt;/p&gt;
                                             &lt;p className="text-xs text-muted-foreground truncate"&gt;{selectedPayee.upiId || selectedPayee.identifier}&lt;/p&gt;
                                         &lt;/div&gt;
                                     &lt;/div&gt;
                                      &lt;div className="shrink-0 flex items-center gap-1"&gt;
                                        {getVerificationIcon(selectedPayee.verificationStatus)}
                                        {selectedPayee.isZetChatUser && (
                                            &lt;Button variant="ghost" size="icon" className="h-6 w-6 text-primary hover:bg-primary/10" onClick={openChatWithPayee} title="Chat with payee"&gt;
                                                &lt;MessageSquare className="h-4 w-4"/&gt;
                                            &lt;/Button&gt;
                                        )}
                                      &lt;/div&gt;
                                 &lt;/div&gt;
                                  {selectedPayee.verificationStatus === 'blacklisted' && &lt;p className="text-xs text-destructive mt-1"&gt;{selectedPayee.verificationReason || 'Suspicious Activity Detected.'}&lt;/p&gt;}
                                   {selectedPayee.verificationStatus === 'unverified' && selectedPayee.upiId && &lt;p className="text-xs text-yellow-600 mt-1"&gt;{selectedPayee.verificationReason || 'UPI ID not verified. Proceed with caution.'}&lt;/p&gt;}
                                   {selectedPayee.verificationStatus === 'unverified' && !selectedPayee.upiId && selectedPayee.type === 'mobile' && &lt;p className="text-xs text-yellow-600 mt-1"&gt;Mobile number only, no UPI ID found for verification.&lt;/p&gt;}
                            &lt;/Card&gt;
                        )}

                        &lt;div className="space-y-1"&gt;
                            &lt;Label htmlFor="amount"&gt;Amount (₹)&lt;/Label&gt;
                            &lt;div className="relative"&gt;
                                &lt;span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-lg"&gt;₹&lt;/span&gt;
                                &lt;Input
                                    id="amount"
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) =&gt; setAmount(e.target.value)}
                                    required
                                    min="1"
                                    step="0.01"
                                    className="pl-7 text-xl font-semibold h-12"
                                    disabled={!selectedPayee || isProcessing || isVerifyingUpi}
                                /&gt;
                            &lt;/div&gt;
                        &lt;/div&gt;

                         &lt;div className="space-y-1"&gt;
                            &lt;Label htmlFor="note"&gt;Note (Optional)&lt;/Label&gt;
                            &lt;Input
                                id="note"
                                type="text"
                                placeholder="Add a message"
                                value={note}
                                onChange={(e) =&gt; setNote(e.target.value)}
                                disabled={!selectedPayee || isProcessing || isVerifyingUpi}
                                maxLength={50}
                            /&gt;
                        &lt;/div&gt;

                         &lt;div className="space-y-1"&gt;
                            &lt;Label htmlFor="paymentSource"&gt;Pay Using&lt;/Label&gt;
                            &lt;Select value={selectedAccountUpiId || (selectedPaymentSource === 'wallet' ? 'wallet' : '')} onValueChange={(value) =&gt; {
                                if (value === 'wallet') {
                                    setSelectedPaymentSource('wallet');
                                    setSelectedAccountUpiId('');
                                } else {
                                    setSelectedPaymentSource('upi');
                                    setSelectedAccountUpiId(value);
                                }
                                setError(null);
                            }} disabled={isProcessing || !selectedPayee}&gt;
                                 &lt;SelectTrigger id="paymentSource"&gt;
                                     &lt;SelectValue placeholder="Select payment method"/&gt;
                                 &lt;/SelectTrigger&gt;
                                 &lt;SelectContent&gt;
                                     {accounts.map(acc =&gt; (
                                        &lt;SelectItem key={acc.upiId} value={acc.upiId} disabled={bankStatuses[acc.upiId] === 'Down'}&gt;
                                             &lt;div className="flex items-center justify-between w-full"&gt;
                                                 &lt;span className="flex items-center gap-2"&gt;
                                                     &lt;Landmark className="h-4 w-4 text-muted-foreground"/&gt;
                                                      {acc.bankName} - {acc.accountNumber}
                                                 &lt;/span&gt;
                                                 {getBankStatusBadge(bankStatuses[acc.upiId])}
                                             &lt;/div&gt;
                                        &lt;/SelectItem&gt;
                                     ))}
                                     {walletBalance &gt; 0 && (
                                         &lt;SelectItem value="wallet"&gt;
                                              &lt;div className="flex items-center gap-2"&gt;
                                                 &lt;Wallet className="h-4 w-4 text-muted-foreground"/&gt;
                                                 &lt;span&gt;Zet Pay Wallet (Balance: ₹{walletBalance.toFixed(2)})&lt;/span&gt;
                                             &lt;/div&gt;
                                         &lt;/SelectItem&gt;
                                     )}
                                      {accounts.length === 0 && walletBalance === 0 && (
                                         &lt;SelectItem value="none" disabled&gt;No payment methods available&lt;/SelectItem&gt;
                                     )}
                                 &lt;/SelectContent&gt;
                             &lt;/Select&gt;
                             {selectedPaymentSource === 'upi' && selectedAccountUpiId && bankStatuses[selectedAccountUpiId] === 'Down' && (
                                 &lt;p className="text-xs text-destructive pt-1"&gt;Selected bank server is down. Please choose another method.&lt;/p&gt;
                             )}
                              {selectedPaymentSource === 'upi' && selectedAccountUpiId && bankStatuses[selectedAccountUpiId] === 'Slow' && (
                                 &lt;p className="text-xs text-yellow-600 pt-1"&gt;Selected bank server is slow. Payment might take longer.&lt;/p&gt;
                             )}
                        &lt;/div&gt;


                        {error && (
                            &lt;p className="text-sm text-destructive text-center"&gt;{error}&lt;/p&gt;
                        )}

                        &lt;Button
                            type="button"
                            onClick={handleMakePayment}
                            className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                            disabled={!selectedPayee || !amount || Number(amount) &lt;= 0 || isProcessing || isVerifyingUpi || selectedPayee.verificationStatus === 'blacklisted' || (selectedPaymentSource === 'upi' && (!selectedAccountUpiId || bankStatuses[selectedAccountUpiId] === 'Down')) || (selectedPaymentSource === 'wallet' && walletBalance &lt; Number(amount))}&gt;
                            {isProcessing ? &lt;Loader2 className="mr-2 h-4 w-4 animate-spin" /&gt; : &lt;Send className="mr-2 h-4 w-4" /&gt;}
                            {isProcessing ? 'Processing...' : 'Pay Now'}&lt;/Button&gt;
                        &lt;/div&gt;
              &lt;/CardContent&gt;
            &lt;/Card&gt;
        )}

         &lt;AlertDialog open={isPinDialogOpen} onOpenChange={(open) =&gt; { if (!open) handlePinCancel(); }}&gt;
            &lt;AlertDialogContent&gt;
                &lt;AlertDialogHeader&gt;
                    &lt;AlertDialogTitle&gt;Enter UPI PIN&lt;/AlertDialogTitle&gt;
                     &lt;AlertDialogDescription&gt;
                         Enter your {accounts.find(acc =&gt; acc.upiId === selectedAccountUpiId)?.pinLength || '4 or 6'} digit UPI PIN for {accounts.find(acc =&gt; acc.upiId === selectedAccountUpiId)?.bankName || 'your account'} to authorize this payment of ₹{Number(amount).toFixed(2)} to {selectedPayee?.verifiedName || selectedPayee?.name}.
                     &lt;/AlertDialogDescription&gt;
                &lt;/AlertDialogHeader&gt;
                &lt;div className="py-4"&gt;
                    &lt;Label htmlFor="pin-input-dialog" className="sr-only"&gt;UPI PIN&lt;/Label&gt;
                    &lt;Input
                        id="pin-input-dialog"
                        type="password"
                        inputMode="numeric"
                        maxLength={accounts.find(acc =&gt; acc.upiId === selectedAccountUpiId)?.pinLength || 6}
                        value={upiPin}
                        onChange={(e) =&gt; setUpiPin(e.target.value.replace(/\D/g, ''))}
                        className="text-center text-xl tracking-[0.3em]"
                        placeholder={accounts.find(acc =&gt; acc.upiId === selectedAccountUpiId)?.pinLength === 4 ? "****" : "******"}
                        autoFocus
                    /&gt;
                &lt;/div&gt;
                &lt;AlertDialogFooter&gt;
                    &lt;AlertDialogCancel onClick={handlePinCancel}&gt;Cancel&lt;/AlertDialogCancel&gt;
                     &lt;AlertDialogAction
                        onClick={handlePinSubmit}
                        disabled={!(
                            (accounts.find(acc =&gt; acc.upiId === selectedAccountUpiId)?.pinLength === 4 && upiPin.length === 4) ||
                            (accounts.find(acc =&gt; acc.upiId === selectedAccountUpiId)?.pinLength === 6 && upiPin.length === 6) ||
                            (!accounts.find(acc =&gt; acc.upiId === selectedAccountUpiId)?.pinLength && (upiPin.length === 4 || upiPin.length === 6))
                        )}
                    &gt;
                        &lt;Lock className="mr-2 h-4 w-4" /&gt; Confirm Payment
                    &lt;/AlertDialogAction&gt;
                &lt;/AlertDialogFooter&gt;
            &lt;/AlertDialogContent&gt;
        &lt;/AlertDialog&gt;

        &lt;!-- Zet Chat Modal --&gt;
        {chatRecipient && (
             &lt;ZetChat
                isOpen={showChatModal}
                onClose={() =&gt; setShowChatModal(false)}
                recipientId={chatRecipient.id}
                recipientName={chatRecipient.name}
                recipientAvatar={chatRecipient.avatar}
             /&gt;
        )}

      &lt;/main&gt;
    &lt;/div&gt;
  );
}

 const getBankStatusBadge = (status: 'Active' | 'Slow' | 'Down' | undefined) =&gt; {
    switch(status) {
        case 'Slow': return &lt;Badge variant="secondary" className="ml-2 text-xs bg-yellow-100 text-yellow-700"&gt;Slow&lt;/Badge&gt;;
        case 'Down': return &lt;Badge variant="destructive" className="ml-2 text-xs"&gt;Down&lt;/Badge&gt;;
        default: return null;
    }
 };
