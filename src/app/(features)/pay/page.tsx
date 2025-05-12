
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Lock, Loader2, CheckCircle, XCircle, Info, Wallet, Landmark, HelpCircle, Ticket, CircleAlert, WifiOff, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { processUpiPayment, verifyUpiId, getLinkedAccounts, BankAccount, UpiTransactionResult, getBankStatus } from '@/services/upi';
import type { Transaction } from '@/services/types';
import { payViaWallet as payViaWalletApiService, getWalletBalance as getWalletBalanceService } from '@/services/wallet'; // Use Wallet Service
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { auth } from '@/lib/firebase';
import { format } from "date-fns"; // Removed addBusinessDays as it's not used
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from '@/components/ui/separator';

type PaymentSourceOption = 'wallet' | string;

export default function PayPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [recipientUpiId, setRecipientUpiId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [qrData, setQrData] = useState<string | null>(null);
  const [isStealthScan, setIsStealthScan] = useState(false);

  const [upiPin, setUpiPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [paymentResult, setPaymentResult] = useState<UpiTransactionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const pinPromiseResolverRef = useRef<{ resolve: (pin: string | null) => void } | null>(null);

  const [linkedAccounts, setLinkedAccounts] = useState<BankAccount[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [selectedPaymentSource, setSelectedPaymentSource] = useState<PaymentSourceOption>('');
  const [isLoadingPaymentOptions, setIsLoadingPaymentOptions] = useState(true);
  const [bankStatuses, setBankStatuses] = useState<Record<string, 'Active' | 'Slow' | 'Down'>>({});


  useEffect(() => {
    const pa = searchParams.get('pa');
    const pn = searchParams.get('pn');
    const am = searchParams.get('am');
    const tn = searchParams.get('tn');
    const qr = searchParams.get('qrData');
    const stealth = searchParams.get('stealth') === 'true';
    const sourceUpi = searchParams.get('sourceAccountUpiId');

    if (pa) setRecipientUpiId(pa);
    if (pn) setRecipientName(pn);
    if (am) setAmount(am);
    if (tn) setNote(tn);
    if (qr) setQrData(qr);
    setIsStealthScan(stealth);

    const fetchPaymentOptions = async () => {
      if (!auth.currentUser) {
        toast({ variant: "destructive", title: "Not Logged In", description: "Please log in to make payments." });
        router.push('/login');
        setIsLoadingPaymentOptions(false);
        return;
      }
      setIsLoadingPaymentOptions(true);
      try {
        const [accounts, balance] = await Promise.all([
          getLinkedAccounts(),
          getWalletBalanceService() // Use Wallet Service
        ]);
        setLinkedAccounts(accounts);
        setWalletBalance(balance);

        const statuses: Record<string, 'Active' | 'Slow' | 'Down'> = {};
        for (const acc of accounts) {
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
        
        if (sourceUpi && accounts.find(acc => acc.upiId === sourceUpi)) {
          setSelectedPaymentSource(sourceUpi);
        } else if (accounts.length > 0) {
          const defaultAccount = accounts.find(acc => acc.isDefault) || accounts[0];
          setSelectedPaymentSource(defaultAccount.upiId);
        } else if (balance !== null && balance > 0) { // Check if balance is not null
          setSelectedPaymentSource('wallet');
        } else {
          setError("No payment methods available. Please link a bank account or add funds to your wallet.");
        }

      } catch (err: any) {
        setError(err.message || "Failed to load payment options.");
        toast({ variant: "destructive", title: "Error", description: "Could not load payment options." });
      } finally {
        setIsLoadingPaymentOptions(false);
      }
    };

    fetchPaymentOptions();
  }, [searchParams, router, toast]);

  const promptForPin = (): Promise<string | null> => {
    return new Promise((resolve) => {
      setUpiPin('');
      pinPromiseResolverRef.current = { resolve };
      setIsPinDialogOpen(true);
    });
  };

  const handlePinSubmit = () => {
    const account = linkedAccounts.find(acc => acc.upiId === selectedPaymentSource);
    const expectedLength = account?.pinLength;
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
    setIsPinDialogOpen(false);
    if (pinPromiseResolverRef.current) {
        pinPromiseResolverRef.current.resolve(null);
        pinPromiseResolverRef.current = null;
    }
    setIsProcessing(false);
    setShowConfirmation(false);
  };

  const handlePayment = async () => {
    if (!auth.currentUser) {
        toast({ variant: "destructive", title: "Not Logged In", description: "Please log in to proceed." });
        return;
    }
    if (!selectedPaymentSource) {
      toast({ variant: "destructive", title: "Payment Method Required", description: "Please select a payment method." });
      return;
    }
    if (!amount || Number(amount) <= 0) {
        toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid amount." });
        return;
    }
    if (selectedPaymentSource === 'wallet' && walletBalance !== null && walletBalance < Number(amount)) {
        toast({ variant: "destructive", title: "Insufficient Wallet Balance", description: "Please add funds to your wallet or choose another method." });
        return;
    }
     if (selectedPaymentSource !== 'wallet' && bankStatuses[selectedPaymentSource] === 'Down') {
        toast({ variant: "destructive", title: "Bank Server Down", description: "Selected bank is currently unavailable. Please try another method." });
        return;
    }

    setIsProcessing(true);
    setShowConfirmation(true);
    setPaymentResult(null);
    setError(null);

    try {
      let result: UpiTransactionResult;

      if (selectedPaymentSource === 'wallet') {
        const walletResult = await payViaWalletApiService(auth.currentUser.uid, recipientUpiId, Number(amount), note); // Use Wallet Service
        result = {
            success: walletResult.success,
            transactionId: walletResult.transactionId,
            amount: Number(amount),
            recipientUpiId: recipientUpiId,
            status: walletResult.success ? 'Completed' : 'Failed',
            message: walletResult.message,
        };
      } else {
        const enteredPin = await promptForPin();
        if (enteredPin === null) {
            setIsProcessing(false);
            setShowConfirmation(false);
            return;
        }
        result = await processUpiPayment(
          recipientUpiId,
          Number(amount),
          enteredPin,
          note,
          selectedPaymentSource,
          isStealthScan
        );
      }
      
      setPaymentResult(result);

      if (result.success || result.status === 'Completed' || result.status === 'FallbackSuccess') {
        toast({ title: "Payment Successful!", description: `Sent ₹${amount} to ${recipientName || recipientUpiId}.`, duration: 5000 });
        if (selectedPaymentSource === 'wallet' || result.usedWalletFallback) {
            getWalletBalanceService().then(setWalletBalance).catch(console.error); // Use Wallet Service
        }
      } else {
        setError(result.message || `Payment ${result.status || 'Failed'}`);
      }

    } catch (err: any) {
      console.error("Payment failed:", err);
      const errorMessage = err.message || "Payment failed. Please try again.";
      setError(errorMessage);
      setPaymentResult({
          amount: Number(amount),
          recipientUpiId: recipientUpiId,
          status: 'Failed',
          message: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getPaymentSourceDetails = () => {
    if (selectedPaymentSource === 'wallet') {
        return `Zet Pay Wallet (Balance: ₹${walletBalance?.toFixed(2) || '0.00'})`;
    }
    const account = linkedAccounts.find(acc => acc.upiId === selectedPaymentSource);
    return account ? `${account.bankName} - ${account.accountNumber}` : 'Unknown UPI Account';
  };

  const selectedAccountForPin = linkedAccounts.find(acc => acc.upiId === selectedPaymentSource);


  if (isLoadingPaymentOptions) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Send className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Confirm Payment</h1>
      </header>

      <main className="flex-grow p-4 space-y-4">
        {!showConfirmation ? (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Pay to {recipientName || recipientUpiId}</CardTitle>
              <CardDescription>{recipientUpiId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                        className="pl-7 text-2xl font-bold h-14"
                        disabled={searchParams.get('am') !== null || isProcessing}
                    />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="note">Note (Optional)</Label>
                <Input
                  id="note"
                  type="text"
                  placeholder="Add a message for recipient"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={isProcessing}
                  maxLength={50}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="paymentSource">Pay Using</Label>
                <Select value={selectedPaymentSource} onValueChange={(value) => setSelectedPaymentSource(value as PaymentSourceOption)} disabled={isLoadingPaymentOptions || linkedAccounts.length === 0}>
                    <SelectTrigger id="paymentSource" disabled={isLoadingPaymentOptions}>
                         <SelectValue placeholder={isLoadingPaymentOptions ? "Loading methods..." : "Select Payment Method"}/>
                    </SelectTrigger>
                    <SelectContent>
                        {linkedAccounts.map(acc => (
                            <SelectItem key={acc.upiId} value={acc.upiId} disabled={bankStatuses[acc.upiId] === 'Down'}>
                                <div className="flex items-center justify-between w-full">
                                    <span className="flex items-center gap-2">
                                        <Landmark className="h-4 w-4 text-muted-foreground"/>
                                        {acc.bankName} - {acc.accountNumber} {acc.isDefault && <Badge variant="outline" className="ml-1 text-xs">Primary</Badge>}
                                    </span>
                                    {bankStatuses[acc.upiId] === 'Slow' && <Badge variant="secondary" className="ml-2 text-xs bg-yellow-100 text-yellow-700">Slow</Badge>}
                                    {bankStatuses[acc.upiId] === 'Down' && <Badge variant="destructive" className="ml-2 text-xs">Down</Badge>}
                                </div>
                            </SelectItem>
                        ))}
                        {walletBalance !== null && walletBalance >= 0 && ( // Show wallet if balance is 0 or more
                             <SelectItem value="wallet">
                                <div className="flex items-center gap-2">
                                    <Wallet className="h-4 w-4 text-muted-foreground"/>
                                    <span>Zet Pay Wallet (Balance: ₹{walletBalance.toFixed(2)})</span>
                                </div>
                            </SelectItem>
                        )}
                        {linkedAccounts.length === 0 && (walletBalance === null || walletBalance <= 0) && (
                             <SelectItem value="none" disabled>No payment methods</SelectItem>
                        )}
                    </SelectContent>
                </Select>
                {selectedPaymentSource !== 'wallet' && bankStatuses[selectedPaymentSource] === 'Down' && (
                    <p className="text-xs text-destructive pt-1">Selected bank server is down. Please choose another method.</p>
                )}
                 {selectedPaymentSource !== 'wallet' && bankStatuses[selectedPaymentSource] === 'Slow' && (
                    <p className="text-xs text-yellow-600 pt-1">Selected bank server is slow. Payment might take longer.</p>
                 )}
              </div>

              {error && <Alert variant="destructive"><CircleAlert className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

              <Button
                onClick={handlePayment}
                className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                disabled={isProcessing || isLoadingPaymentOptions || !selectedPaymentSource || !amount || Number(amount) <=0 || (selectedPaymentSource !== 'wallet' && bankStatuses[selectedPaymentSource] === 'Down')}
              >
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isProcessing ? 'Processing...' : 'Pay Now'}
              </Button>
            </CardContent>
          </Card>
        ) : paymentResult ? (
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
                Payment {paymentResult.status === 'FallbackSuccess' ? 'Successful (via Wallet)' : paymentResult.status}
              </CardTitle>
              <CardDescription>
                {paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess' ? `Successfully sent ₹${Math.abs(Number(amount)).toFixed(2)} to ${recipientName || recipientUpiId}.` :
                 paymentResult.status === 'Pending' ? `Payment of ₹${Math.abs(Number(amount)).toFixed(2)} to ${recipientName || recipientUpiId} is pending.` :
                 `Failed to send ₹${Math.abs(Number(amount)).toFixed(2)} to ${recipientName || recipientUpiId}.`}
              </CardDescription>
              {paymentResult.message && <p className="text-sm mt-1">{paymentResult.message}</p>}
            </CardHeader>
            <CardContent className="text-center space-y-3">
              <div className="text-xs text-muted-foreground space-y-1 bg-muted p-3 rounded-md">
                <p><strong>Amount:</strong> ₹{Math.abs(Number(amount)).toFixed(2)}</p>
                <p><strong>To:</strong> {recipientName || recipientUpiId} ({recipientUpiId})</p>
                <p><strong>From:</strong> {getPaymentSourceDetails()}</p>
                <p><strong>Date:</strong> {format(new Date(), 'PPp')}</p>
                {paymentResult.transactionId && <p><strong>Transaction ID:</strong> {paymentResult.transactionId}</p>}
                 {paymentResult.walletTransactionId && <p><strong>Wallet TxID:</strong> {paymentResult.walletTransactionId}</p>}
                 {paymentResult.ticketId && <p className="font-medium text-orange-600">Support Ticket ID: {paymentResult.ticketId}</p>}
                 {paymentResult.refundEta && <p className="text-xs">Refund ETA: {paymentResult.refundEta}</p>}
              </div>
              <Button className="w-full" onClick={() => router.push('/')}>Done</Button>
              <Button variant="link" onClick={() => router.push('/history')}>View History</Button>
              {(paymentResult.status === 'Failed' || error) && (
                <Button variant="outline" className="w-full" onClick={()={() => { setShowConfirmation(false); setPaymentResult(null); setError(null); }}>Try Again</Button>
              )}
               {(paymentResult.status === 'Failed' && paymentResult.ticketId) && (
                    <Link href={`/support?ticketId=${paymentResult.ticketId}`} passHref>
                        <Button variant="link" className="w-full flex items-center gap-1 text-destructive"><HelpCircle className="h-4 w-4"/> Get Help with this Transaction</Button>
                    </Link>
                )}
            </CardContent>
          </Card>
        ) : (
            <Card className="shadow-md text-center">
                 <CardContent className="p-6">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4"/>
                    <p className="text-muted-foreground">Processing payment...</p>
                 </CardContent>
            </Card>
        )}
      </main>

      <AlertDialog open={isPinDialogOpen} onOpenChange={(open) => { if (!open) handlePinCancel(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enter UPI PIN</AlertDialogTitle>
            <AlertDialogDescription>
                Enter your {selectedAccountForPin?.pinLength || '4 or 6'} digit UPI PIN for {selectedAccountForPin?.bankName || 'your account'} to authorize payment of ₹{Number(amount).toFixed(2)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="pin-input-dialog" className="sr-only">UPI PIN</Label>
            <Input
              id="pin-input-dialog"
              type="password"
              inputMode="numeric"
              maxLength={selectedAccountForPin?.pinLength || 6}
              value={upiPin}
              onChange={(e) => setUpiPin(e.target.value.replace(/\D/g, ''))}
              className="text-center text-xl tracking-[0.3em]"
              placeholder={selectedAccountForPin?.pinLength === 4 ? "****" : "******"}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handlePinCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePinSubmit} 
                 disabled={!(
                    (selectedAccountForPin?.pinLength === 4 && upiPin.length === 4) ||
                    (selectedAccountForPin?.pinLength === 6 && upiPin.length === 6) ||
                    (!selectedAccountForPin?.pinLength && (upiPin.length === 4 || upiPin.length === 6))
                )}>
                <Lock className="mr-2 h-4 w-4" /> Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
