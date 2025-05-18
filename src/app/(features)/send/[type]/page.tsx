
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Lock, Loader2, CheckCircle, XCircle, Info, Wallet, MessageSquare, Users, Landmark, Clock, HelpCircle, Ticket, CircleAlert, WifiOff, BadgeCheck, UserPlus, RefreshCw, Search as SearchIcon, ShieldQuestion, ShieldAlert, X as CloseIcon, ChevronRight, BookUser, Keypad } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { getContacts, savePayee, PayeeClient } from '@/services/contacts';
import { processUpiPayment, verifyUpiId as verifyUpiIdService, getLinkedAccounts, BankAccount, UpiTransactionResult, getBankStatus } from '@/services/upi';
import { auth } from '@/lib/firebase';
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { apiClient } from '@/lib/apiClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ZetChat } from '@/components/zet-chat';
import Image from 'next/image'; // Import Image for logos

interface DisplayPayee extends PayeeClient {
    verificationStatus?: 'verified' | 'blacklisted' | 'unverified' | 'pending';
    verificationReason?: string;
    verifiedName?: string;
    isZetChatUser?: boolean;
}

type PaymentSource = 'upi' | 'wallet';

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

  const [allContacts, setAllContacts] = useState<DisplayPayee[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<DisplayPayee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedPayee, setSelectedPayee] = useState<DisplayPayee | null>(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isVerifyingUpi, setIsVerifyingUpi] = useState(false);
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
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatRecipient, setChatRecipient] = useState<{ id: string; name: string; avatar?: string } | null>(null);

  const loadInitialData = useCallback(async () => {
    setIsLoadingContacts(true);
    setHasError(false);
    try {
      const [fetchedContacts, fetchedAccounts, fetchedWalletBalanceData] = await Promise.all([
        getContacts(),
        getLinkedAccounts(),
        apiClient<{ balance: number }>('/wallet/balance')
      ]);
      const displayContacts = fetchedContacts.map(c => ({ ...c, verificationStatus: 'pending', isZetChatUser: Math.random() > 0.5 }) as DisplayPayee);
      setAllContacts(displayContacts);
      setFilteredContacts(displayContacts);
      setAccounts(fetchedAccounts);
      setWalletBalance(fetchedWalletBalanceData.balance);

      if (fetchedAccounts.length > 0) {
        const defaultAcc = fetchedAccounts.find(a => a.isDefault);
        setSelectedAccountUpiId(defaultAcc?.upiId || fetchedAccounts[0].upiId);
        fetchBankStatusesForAccounts(fetchedAccounts);
        setSelectedPaymentSource('upi');
      } else if (fetchedWalletBalanceData.balance <= 0) {
        setError("No payment methods available. Link a bank account or add funds to your wallet.");
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

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
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
    return () => unsubscribeAuth();
  }, [loadInitialData]);

  const fetchBankStatusesForAccounts = async (accountsToFetch: BankAccount[]) => {
    const statuses: Record<string, 'Active' | 'Slow' | 'Down'> = {};
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
      const results = allContacts.filter(contact =>
        contact.name.toLowerCase().includes(lowerSearchTerm) ||
        (contact.identifier && contact.identifier.toLowerCase().includes(lowerSearchTerm)) ||
        (contact.upiId && contact.upiId.toLowerCase().includes(lowerSearchTerm)) ||
        (contact.accountNumber && contact.accountNumber.includes(lowerSearchTerm))
      );
      setFilteredContacts(results);
    }
  }, [searchTerm, allContacts]);

  const verifyAndSelectPayee = useCallback(async (payee: PayeeClient | { upiId: string, name: string, identifier: string, type: 'bank' | 'mobile', isZetChatUser?: boolean }) => {
    const upiToVerify = payee.upiId || (payee.type === 'bank' ? payee.identifier : null);
    const isZetChatUser = 'isZetChatUser' in payee ? payee.isZetChatUser : Math.random() > 0.5;

    if (!upiToVerify || !upiToVerify.includes('@')) {
      if (payee.type === 'mobile' && !upiToVerify) {
        setSelectedPayee({ ...payee, verificationStatus: 'unverified', verificationReason: 'Mobile Number Only', isZetChatUser });
        setSearchTerm(payee.name);
        setIsVerifyingUpi(false);
        setError(null);
        return;
      }
      if (payee.type === 'bank' && !upiToVerify) {
        setSelectedPayee({ ...payee, verificationStatus: 'unverified', verificationReason: 'Bank Account Only', isZetChatUser });
        setSearchTerm(payee.name);
        setIsVerifyingUpi(false);
        setError(null);
        return;
      }
      toast({ variant: "destructive", title: "Invalid UPI ID", description: "Please enter or select a valid UPI ID (@ included)." });
      setSelectedPayee({ ...payee, verificationStatus: 'unverified', verificationReason: 'Invalid Format', isZetChatUser });
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
      setSelectedPayee(prev => {
        if (prev?.upiId === upiToVerify || prev?.identifier === payee.identifier) {
          let status: DisplayPayee['verificationStatus'] = 'unverified';
          if (validationResult.isBlacklisted) status = 'blacklisted';
          else if ((validationResult.verifiedName && validationResult.verifiedName === prev.name) || validationResult.isVerifiedMerchant) status = 'verified';
          else if (validationResult.verifiedName) status = 'verified';
          return { ...prev, upiId: upiToVerify, verificationStatus: status, verifiedName: validationResult.verifiedName || undefined, verificationReason: validationResult.reason || (status === 'unverified' ? 'Name mismatch or not found' : undefined), isZetChatUser: isZetChatUser ?? prev.isZetChatUser };
        }
        return prev;
      });
      if (validationResult.isBlacklisted) setError(`Payment Blocked: ${validationResult.reason || 'Recipient is flagged as suspicious.'}`);
      else if (validationResult.verifiedName && validationResult.verifiedName !== payee.name) toast({ title: "Name Verification", description: `Registered name: ${validationResult.verifiedName}` });
    } catch (error: any) {
      console.error(`UPI verification failed for ${upiToVerify}:`, error);
      setSelectedPayee(prev => {
        if (prev?.upiId === upiToVerify || prev?.identifier === payee.identifier) return { ...prev, upiId: upiToVerify, verificationStatus: 'unverified', verificationReason: 'Verification failed', isZetChatUser };
        return prev;
      });
      if (!error.message?.includes('404')) toast({ variant: "destructive", title: "Verification Failed", description: `Could not verify ${upiToVerify}. Please check the ID.` });
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

  const handleSelectContact = (contact: DisplayPayee) => verifyAndSelectPayee(contact);

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
    if (isValid && pinPromiseResolverRef.current) pinPromiseResolverRef.current.resolve(upiPin);
    else {
      toast({ variant: "destructive", title: "Invalid PIN", description: `Please enter your ${expectedLength || '4 or 6'} digit UPI PIN.` });
      pinPromiseResolverRef.current?.resolve(null);
    }
    pinPromiseResolverRef.current = null;
    setIsPinDialogOpen(false);
  };

  const handlePinCancel = () => {
    if (pinPromiseResolverRef.current) pinPromiseResolverRef.current.resolve(null);
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
    if (!amount || Number(amount) <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid amount." });
      return;
    }
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
      let result: UpiTransactionResult;
      if (selectedPaymentSource === 'upi') {
        const enteredPin = await promptForPin();
        if (enteredPin === null) throw new Error("PIN entry cancelled.");
        result = await processUpiPayment(payeeToPay.upiId!, Number(amount), enteredPin, note || `Payment to ${payeeToPay.name}`, selectedAccountUpiId);
      } else {
        const walletResult = await apiClient<WalletTransactionResult>('/wallet/pay', {
          method: 'POST',
          body: JSON.stringify({ recipientIdentifier: payeeToPay.upiId!, amount: Number(amount), note: note || `Payment to ${payeeToPay.name}` }),
        });
        result = { ...walletResult, amount: Number(amount), recipientUpiId: payeeToPay.upiId!, status: walletResult.success ? 'Completed' : 'Failed' };
      }
      setPaymentResult(result);
      if (result.success || result.status === 'Completed' || result.status === 'FallbackSuccess') {
        toast({ title: "Payment Successful!", description: `Sent ₹${amount} to ${payeeToPay.verifiedName || payeeToPay.name}.`, duration: 5000 });
        if (selectedPaymentSource === 'wallet' || result.usedWalletFallback) apiClient<{ balance: number }>('/wallet/balance').then(res => setWalletBalance(res.balance));
      } else {
        throw new Error(result.message || `Payment ${result.status || 'Failed'}`);
      }
    } catch (err: any) {
      console.error("Payment failed:", err);
      const errorMessage = err.message || "Payment failed. Please try again.";
      setError(errorMessage);
      setPaymentResult({ amount: Number(amount), recipientUpiId: payeeToPay.upiId!, status: 'Failed', message: errorMessage });
       if (errorMessage !== "PIN entry cancelled.") {
           toast({ variant: "destructive", title: "Payment Failed", description: errorMessage });
       }
    } finally {
      setIsProcessing(false);
    }
  };

  const getVerificationIcon = (status: DisplayPayee['verificationStatus']) => {
    switch (status) {
      case 'verified': return <BadgeCheck className="h-4 w-4 text-green-600" title="Verified"/>;
      case 'blacklisted': return <ShieldAlert className="h-4 w-4 text-destructive" title="Suspicious Account"/>;
      case 'unverified': return <ShieldQuestion className="h-4 w-4 text-yellow-600" title="Unverified"/>;
      case 'pending': return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" title="Verifying..."/>;
      default: return <ShieldQuestion className="h-4 w-4 text-gray-400" title="Status Unknown"/>;
    }
  };

  const handleAddNewContact = () => alert("Add New Contact / Payee flow not implemented yet.");

  const handlePayToUpiId = () => {
    if (searchTerm.includes('@') && !filteredContacts.some(c => c.upiId === searchTerm || c.identifier === searchTerm)) verifyAndSelectPayee({ name: searchTerm.split('@')[0], upiId: searchTerm, identifier: searchTerm, type: 'bank' });
    else if (searchTerm.match(/^[6-9]\d{9}$/) && !filteredContacts.some(c => c.identifier === searchTerm)) verifyAndSelectPayee({ name: searchTerm, identifier: searchTerm, type: 'mobile' });
    else toast({ variant: "destructive", title: "Invalid Input", description: "Enter a valid UPI ID or mobile number to pay." });
  };

  const openChatWithPayee = () => {
    if (selectedPayee && selectedPayee.isZetChatUser && selectedPayee.upiId) {
      setChatRecipient({ id: selectedPayee.upiId, name: selectedPayee.verifiedName || selectedPayee.name, avatar: selectedPayee.avatarSeed ? `https://picsum.photos/seed/${selectedPayee.avatarSeed}/40/40` : undefined });
      setShowChatModal(true);
    } else toast({ description: "Chat is only available with verified Zet Pay users." });
  };

  const recentAndFrequentContacts = useMemo(() => {
    // Combine all contacts and add a 'lastPaidSortKey' and 'frequencySortKey'
    // This is a simplified mock for now, real logic would involve transaction history
    return allContacts
      .map(c => ({ ...c, lastPaidSortKey: Math.random(), frequencySortKey: Math.random() }))
      .sort((a, b) => b.frequencySortKey - a.lastPaidSortKey) // Mock sort: recents/frequent first
      .slice(0, 6); // Show top 6
  }, [allContacts]);

  const headerTitle = type === 'bank' ? "UPI Money Transfer" : "Pay to Mobile Contact";
  const searchPlaceholder = type === 'bank' ? "Enter UPI ID, Name or Account No." : "Enter Name or Mobile Number";
  const showUPIApps = type === 'bank';

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => router.back()}>
            <CloseIcon className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
             <h1 className="text-lg font-semibold">{headerTitle}</h1>
             {showUPIApps && (
                <div className="text-xs opacity-80 flex items-center gap-1">
                    Pay to any UPI App
                    <Image src="/logos/upi-sm.png" alt="UPI" width={16} height={16} className="inline" data-ai-hint="upi logo small"/>
                    <Image src="/logos/gpay-sm.png" alt="Google Pay" width={16} height={16} className="inline" data-ai-hint="gpay logo small"/>
                    <Image src="/logos/phonepe-sm.png" alt="PhonePe" width={16} height={16} className="inline" data-ai-hint="phonepe logo small"/>
                    <Image src="/logos/paytm-sm.png" alt="Paytm" width={16} height={16} className="inline" data-ai-hint="paytm logo small"/>
                </div>
             )}
          </div>
        </div>
        <Button variant="link" className="text-primary-foreground/80 hover:text-primary-foreground text-xs p-0 h-auto">Help?</Button>
      </header>

      <main className="flex-grow p-4 space-y-4">
        {showConfirmation ? (
          paymentResult ? (
            <Card className={cn("shadow-md", paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess' ? "border-green-500" : paymentResult.status === 'Pending' ? "border-yellow-500" : "border-destructive")}>
              <CardHeader className="items-center text-center">
                <div className={cn("mb-4", paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess' ? 'text-green-600' : paymentResult.status === 'Pending' ? 'text-yellow-600' : 'text-destructive')}>
                  {paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess' ? <CheckCircle className="h-16 w-16" /> : paymentResult.status === 'Pending' ? <Clock className="h-16 w-16" /> : <XCircle className="h-16 w-16" />}
                </div>
                <CardTitle className={cn("text-2xl", paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess' ? 'text-green-600' : paymentResult.status === 'Pending' ? 'text-yellow-600' : 'text-destructive')}>Payment {paymentResult.status === 'FallbackSuccess' ? 'Successful' : paymentResult.status}</CardTitle>
                <CardDescription>
                  {paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess' ? `Successfully sent ₹${Math.abs(Number(amount)).toFixed(2)} to ${selectedPayee?.verifiedName || selectedPayee?.name || paymentResult.recipientUpiId}.` : paymentResult.status === 'Pending' ? `Payment of ₹${Math.abs(Number(amount)).toFixed(2)} to ${selectedPayee?.verifiedName || selectedPayee?.name || paymentResult.recipientUpiId} is pending.` : `Failed to send ₹${Math.abs(Number(amount)).toFixed(2)} to ${selectedPayee?.verifiedName || selectedPayee?.name || paymentResult.recipientUpiId}.`}
                </CardDescription>
                {paymentResult.message && <p className="text-sm mt-1">{paymentResult.message}</p>}
                {paymentResult.status === 'FallbackSuccess' && <p className="text-sm mt-1 font-medium text-blue-600 flex items-center justify-center gap-1"><Wallet className="h-4 w-4"/> Paid via Wallet (Recovery Scheduled)</p>}
              </CardHeader>
              <CardContent className="text-center space-y-3">
                <div className="text-xs text-muted-foreground space-y-1 bg-muted p-3 rounded-md">
                  <p><strong>Amount:</strong> ₹{Math.abs(Number(amount)).toFixed(2)}</p>
                  <p><strong>To:</strong> {selectedPayee?.verifiedName || selectedPayee?.name || paymentResult.recipientUpiId} ({paymentResult.recipientUpiId})</p>
                  <p><strong>Date:</strong> {format(new Date(), 'PPp')}</p>
                  {paymentResult.transactionId && <p><strong>Transaction ID:</strong> {paymentResult.transactionId}</p>}
                  {paymentResult.ticketId && <p className="font-medium text-orange-600"><strong>Ticket ID:</strong> {paymentResult.ticketId}</p>}
                  {paymentResult.refundEta && <p className="text-xs"><strong>Refund ETA:</strong> {paymentResult.refundEta}</p>}
                </div>
                <Button className="w-full" onClick={() => router.push('/')}>Done</Button>
                <Button variant="link" onClick={() => router.push('/history')}>View History</Button>
                {paymentResult.status === 'Failed' && (<Button variant="outline" className="w-full" onClick={() => { setShowConfirmation(false); setPaymentResult(null); setError(null); }}>Try Again</Button>)}
                {(paymentResult.status === 'Failed' && paymentResult.ticketId) && (<Link href={`/support?ticketId=${paymentResult.ticketId}`} passHref><Button variant="link" className="w-full flex items-center gap-1 text-destructive"><HelpCircle className="h-4 w-4"/> Get Help</Button></Link>)}
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-md text-center"><CardContent className="p-6"><Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4"/><p className="text-muted-foreground">Processing payment...</p></CardContent></Card>
          )
        ) : (
          <Card className="shadow-md">
            <CardContent className="p-4 space-y-3">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="payeeInput" type="search" placeholder={searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-11" disabled={!!selectedPayee} />
                {selectedPayee ? (
                  <Button variant="ghost" size="icon" onClick={handleClearSelection} title="Clear Selection" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"><XCircle className="h-5 w-5 text-muted-foreground" /></Button>
                ) : (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => toast({description: "Direct UPI ID input coming soon."})}><Keypad className="h-5 w-5"/></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => toast({description: "Phone contacts access coming soon."})}><BookUser className="h-5 w-5"/></Button>
                  </div>
                )}
              </div>

              {isLoadingContacts && !selectedPayee ? (
                <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-primary"/></div>
              ) : !selectedPayee && searchTerm ? (
                <ScrollArea className="max-h-32 border rounded-md">
                  <div className="p-1 space-y-0.5">
                    {filteredContacts.length === 0 && !(searchTerm.includes('@') || searchTerm.match(/^[6-9]\d{9}$/)) && <p className="text-xs text-muted-foreground p-2 text-center">No contacts found.</p>}
                    {filteredContacts.map((contact) => (
                      <Button key={contact.id || contact.identifier} variant="ghost" className="w-full justify-start h-auto py-1.5 px-2 text-left" onClick={() => handleSelectContact(contact)}>
                        <Avatar className="h-7 w-7 mr-2"><AvatarImage src={`https://picsum.photos/seed/${contact.avatarSeed}/30/30`} alt={contact.name} data-ai-hint="person avatar"/><AvatarFallback>{contact.name.charAt(0)}</AvatarFallback></Avatar>
                        <div><p className="text-sm font-medium">{contact.name}</p><p className="text-xs text-muted-foreground">{contact.upiId || contact.identifier}</p></div>
                      </Button>
                    ))}
                    {filteredContacts.length === 0 && (searchTerm.includes('@') || searchTerm.match(/^[6-9]\d{9}$/)) && (
                      <Button variant="ghost" className="w-full justify-start h-auto py-1.5 px-2" onClick={handlePayToUpiId}><UserPlus className="h-4 w-4 mr-2" /> Pay to <span className="font-medium ml-1">{searchTerm}</span></Button>
                    )}
                  </div>
                </ScrollArea>
              ) : !selectedPayee && !searchTerm && recentAndFrequentContacts.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Recent & Frequent</Label>
                  <ScrollArea className="w-full whitespace-nowrap pb-2">
                    <div className="flex space-x-3">
                      {recentAndFrequentContacts.map(contact => (
                        <button key={contact.id} onClick={() => handleSelectContact(contact)} className="flex flex-col items-center w-16 text-center hover:opacity-80 transition-opacity">
                          <Avatar className="h-10 w-10 mb-1 border"><AvatarImage src={`https://picsum.photos/seed/${contact.avatarSeed}/40/40`} alt={contact.name} data-ai-hint="person avatar"/><AvatarFallback>{contact.name.charAt(0)}</AvatarFallback></Avatar>
                          <span className="text-xs font-medium text-foreground truncate w-full">{contact.name}</span>
                        </button>
                      ))}
                       <button onClick={handleAddNewContact} className="flex flex-col items-center justify-center w-16 text-center text-muted-foreground hover:text-primary transition-colors">
                        <div className="h-10 w-10 mb-1 border-2 border-dashed border-muted-foreground rounded-full flex items-center justify-center bg-secondary"><PlusCircle className="h-5 w-5"/></div>
                        <span className="text-xs font-medium">Add New</span>
                      </button>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              ) : null}

              {selectedPayee && (
                <div className="mt-3 p-3 bg-muted rounded-md border space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Avatar className="h-10 w-10 flex-shrink-0"><AvatarImage src={`https://picsum.photos/seed/${selectedPayee.avatarSeed}/40/40`} alt={selectedPayee.name} data-ai-hint="person avatar"/><AvatarFallback>{selectedPayee.name.charAt(0)}</AvatarFallback></Avatar>
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold truncate">{selectedPayee.verifiedName || selectedPayee.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{selectedPayee.upiId || selectedPayee.identifier}</p>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      {getVerificationIcon(selectedPayee.verificationStatus)}
                      {selectedPayee.isZetChatUser && (<Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10" onClick={openChatWithPayee} title="Chat"><MessageSquare className="h-4 w-4"/></Button>)}
                    </div>
                  </div>
                  {selectedPayee.verificationStatus === 'blacklisted' && <p className="text-xs text-destructive">{selectedPayee.verificationReason || 'Suspicious Activity Detected.'}</p>}
                  {selectedPayee.verificationStatus === 'unverified' && selectedPayee.upiId && <p className="text-xs text-yellow-600">{selectedPayee.verificationReason || 'UPI ID not verified. Proceed with caution.'}</p>}
                  {selectedPayee.verificationStatus === 'unverified' && !selectedPayee.upiId && selectedPayee.type === 'mobile' && <p className="text-xs text-yellow-600">Mobile number only, no UPI ID found for verification.</p>}
                  
                  <Separator/>
                  <div className="space-y-1">
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">₹</span><Input id="amount" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required min="1" step="0.01" className="pl-7 text-xl font-semibold h-12" disabled={isProcessing || isVerifyingUpi}/></div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="note">Note (Optional)</Label>
                    <Input id="note" type="text" placeholder="Add a message" value={note} onChange={(e) => setNote(e.target.value)} disabled={isProcessing || isVerifyingUpi} maxLength={50}/>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="paymentSource">Pay Using</Label>
                    <Select value={selectedAccountUpiId || (selectedPaymentSource === 'wallet' ? 'wallet' : '')} onValueChange={(value) => { if (value === 'wallet') { setSelectedPaymentSource('wallet'); setSelectedAccountUpiId(''); } else { setSelectedPaymentSource('upi'); setSelectedAccountUpiId(value); } setError(null); }} disabled={isProcessing || isVerifyingUpi}>
                      <SelectTrigger id="paymentSource"><SelectValue placeholder="Select payment method"/></SelectTrigger>
                      <SelectContent>
                        {accounts.map(acc => (<SelectItem key={acc.upiId} value={acc.upiId} disabled={bankStatuses[acc.upiId] === 'Down'}><div className="flex items-center justify-between w-full"><span className="flex items-center gap-2"><Landmark className="h-4 w-4 text-muted-foreground"/> {acc.bankName} ...{acc.accountNumber.slice(-4)}</span>{getBankStatusBadge(bankStatuses[acc.upiId])}</div></SelectItem>))}
                        {walletBalance > 0 && (<SelectItem value="wallet"><div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-muted-foreground"/>Zet Pay Wallet (₹{walletBalance.toFixed(2)})</div></SelectItem>)}
                        {accounts.length === 0 && walletBalance === 0 && (<SelectItem value="none" disabled>No payment methods</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {selectedPaymentSource === 'upi' && selectedAccountUpiId && bankStatuses[selectedAccountUpiId] === 'Down' && (<p className="text-xs text-destructive pt-1">Selected bank server is down. Please choose another method.</p>)}
                  </div>
                  {error && (<p className="text-sm text-destructive text-center">{error}</p>)}
                  <Button type="button" onClick={handleMakePayment} className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={!selectedPayee || !amount || Number(amount) <= 0 || isProcessing || isVerifyingUpi || selectedPayee.verificationStatus === 'blacklisted' || (selectedPaymentSource === 'upi' && (!selectedAccountUpiId || bankStatuses[selectedAccountUpiId] === 'Down')) || (selectedPaymentSource === 'wallet' && walletBalance < Number(amount))}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Pay Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        <AlertDialog open={isPinDialogOpen} onOpenChange={(open) => { if (!open) handlePinCancel(); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Enter UPI PIN</AlertDialogTitle>
              <AlertDialogDescription>Enter your {accounts.find(acc => acc.upiId === selectedAccountUpiId)?.pinLength || '4 or 6'} digit UPI PIN for {accounts.find(acc => acc.upiId === selectedAccountUpiId)?.bankName || 'your account'} to authorize payment of ₹{Number(amount).toFixed(2)} to {selectedPayee?.verifiedName || selectedPayee?.name}.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="pin-input-dialog" className="sr-only">UPI PIN</Label>
              <Input id="pin-input-dialog" type="password" inputMode="numeric" maxLength={accounts.find(acc => acc.upiId === selectedAccountUpiId)?.pinLength || 6} value={upiPin} onChange={(e) => setUpiPin(e.target.value.replace(/\D/g, ''))} className="text-center text-xl tracking-[0.3em]" placeholder={accounts.find(acc => acc.upiId === selectedAccountUpiId)?.pinLength === 4 ? "****" : "******"} autoFocus/>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handlePinCancel}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handlePinSubmit} disabled={!(((accounts.find(acc => acc.upiId === selectedAccountUpiId)?.pinLength === 4 && upiPin.length === 4) || (accounts.find(acc => acc.upiId === selectedAccountUpiId)?.pinLength === 6 && upiPin.length === 6) || (!accounts.find(acc => acc.upiId === selectedAccountUpiId)?.pinLength && (upiPin.length === 4 || upiPin.length === 6))))}><Lock className="mr-2 h-4 w-4" /> Confirm Payment</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {chatRecipient && (<ZetChat isOpen={showChatModal} onClose={() => setShowChatModal(false)} recipientId={chatRecipient.id} recipientName={chatRecipient.name} recipientAvatar={chatRecipient.avatar}/>)}
      </main>
    </div>
  );
}

const getBankStatusBadge = (status: 'Active' | 'Slow' | 'Down' | undefined) => {
  switch(status) {
    case 'Slow': return <Badge variant="secondary" className="ml-2 text-xs bg-yellow-100 text-yellow-700">Slow</Badge>;
    case 'Down': return <Badge variant="destructive" className="ml-2 text-xs">Down</Badge>;
    default: return null;
  }
};
