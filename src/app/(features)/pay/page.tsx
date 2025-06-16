'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Lock, Loader2, CheckCircle, XCircle, Info, Wallet, Landmark, HelpCircle, Ticket, CircleAlert, WifiOff, BadgeCheck, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { processUpiPayment, verifyUpiId, getLinkedAccounts, BankAccount, UpiTransactionResult, getBankStatus } from '@/services/upi';
import type { Transaction } from '@/services/types';
import { payViaWallet as payViaWalletApiService, getWalletBalance as getWalletBalanceService } from '@/services/wallet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { auth } from '@/lib/firebase';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from '@/components/ui/separator';

// Define the types of payment options
interface PaymentOption {
  id: string; // 'wallet', upiId for bank, or 'new_card'
  type: 'wallet' | 'upi' | 'card';
  name: string;
  details?: string; // e.g., Masked account number or "Balance: X"
  icon: React.ElementType;
  disabled?: boolean;
  bankStatus?: 'Active' | 'Slow' | 'Down';
  pinLength?: number;
  isDefault?: boolean;
}

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

  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([]);
  const [selectedPaymentOptionId, setSelectedPaymentOptionId] = useState<string | null>(null);
  const [isLoadingPaymentOptions, setIsLoadingPaymentOptions] = useState(true);


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
          getWalletBalanceService()
        ]);

        const options: PaymentOption[] = [];

        if (balance !== null && balance >= 0) {
          options.push({
            id: 'wallet',
            type: 'wallet',
            name: 'Zet Pay Wallet',
            details: `Balance: ₹${balance.toFixed(2)}`,
            icon: Wallet,
            disabled: balance < Number(amount || 0) && Number(amount || 0) > 0, // Disable if insufficient balance for current amount
          });
        }

        const statuses: Record<string, 'Active' | 'Slow' | 'Down'> = {};
        for (const acc of accounts) {
            const bankIdentifier = acc.upiId.split('@')[1];
            let status: 'Active' | 'Slow' | 'Down' = 'Active';
            if (bankIdentifier) {
                try {
                    status = await getBankStatus(bankIdentifier);
                } catch (statusError) {
                    console.warn(`Failed to get status for ${acc.upiId}:`, statusError);
                }
            }
            statuses[acc.upiId] = status;
            options.push({
              id: acc.upiId,
              type: 'upi',
              name: acc.bankName,
              details: acc.accountNumber,
              icon: Landmark,
              disabled: status === 'Down',
              bankStatus: status,
              pinLength: acc.pinLength,
              isDefault: acc.isDefault,
            });
        }
        setPaymentOptions(options);
        
        // Set default selection
        if (sourceUpi && options.find(opt => opt.id === sourceUpi && !opt.disabled)) {
          setSelectedPaymentOptionId(sourceUpi);
        } else {
            const defaultUpi = options.find(opt => opt.type === 'upi' && opt.isDefault && !opt.disabled);
            if (defaultUpi) {
                setSelectedPaymentOptionId(defaultUpi.id);
            } else {
                const firstAvailableUpi = options.find(opt => opt.type === 'upi' && !opt.disabled);
                if (firstAvailableUpi) {
                    setSelectedPaymentOptionId(firstAvailableUpi.id);
                } else if (options.find(opt => opt.id === 'wallet' && !opt.disabled)) {
                    setSelectedPaymentOptionId('wallet');
                } else if (options.length > 0 && !options[0].disabled) {
                     setSelectedPaymentOptionId(options[0].id);
                }
            }
        }


      } catch (err: any) {
        setError(err.message || "Failed to load payment options.");
        toast({ variant: "destructive", title: "Error", description: "Could not load payment options." });
      } finally {
        setIsLoadingPaymentOptions(false);
      }
    };

    fetchPaymentOptions();
  }, [searchParams, router, toast, amount]); // Added amount to re-check wallet disable state

  const promptForPin = (): Promise<string | null> => {
    return new Promise((resolve) => {
      setUpiPin('');
      pinPromiseResolverRef.current = { resolve };
      setIsPinDialogOpen(true);
    });
  };

  const handlePinSubmit = () => {
    const selectedOption = paymentOptions.find(opt => opt.id === selectedPaymentOptionId);
    const expectedLength = selectedOption?.pinLength;
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
    const selectedOption = paymentOptions.find(opt => opt.id === selectedPaymentOptionId);
    if (!selectedOption) {
      toast({ variant: "destructive", title: "Payment Method Required", description: "Please select a payment method." });
      return;
    }
    if (selectedOption.disabled) {
        toast({ variant: "destructive", title: "Method Unavailable", description: `${selectedOption.name} is currently unavailable.` });
        return;
    }
    if (!amount || Number(amount) <= 0) {
        toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid amount." });
        return;
    }
    
    setIsProcessing(true);
    setShowConfirmation(true);
    setPaymentResult(null);
    setError(null);

    try {
      let result: UpiTransactionResult;

      if (selectedOption.type === 'wallet') {
        const walletBalanceOption = paymentOptions.find(opt => opt.id === 'wallet');
        if (walletBalanceOption && walletBalanceOption.details) {
            const currentWalletBalance = parseFloat(walletBalanceOption.details.replace(/[^0-9.]/g, ''));
            if (currentWalletBalance < Number(amount)) {
                toast({ variant: "destructive", title: "Insufficient Wallet Balance", description: "Please add funds or choose another method." });
                setIsProcessing(false);
                setShowConfirmation(false); // Stay on payment page
                return;
            }
        }
        const walletResult = await payViaWalletApiService(auth.currentUser.uid, recipientUpiId, Number(amount), note);
        result = {
            success: walletResult.success,
            transactionId: walletResult.transactionId,
            amount: Number(amount),
            recipientUpiId: recipientUpiId,
            status: walletResult.success ? 'Completed' : 'Failed',
            message: walletResult.message,
        };
      } else if (selectedOption.type === 'upi') {
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
          selectedOption.id, // This is the sourceAccountUpiId
          isStealthScan
        );
      } else { // 'card' or other types
          throw new Error("Selected payment method type is not yet implemented for processing.");
      }
      
      setPaymentResult(result);

      if (result.success || result.status === 'Completed' || result.status === 'FallbackSuccess') {
        toast({ title: "Payment Successful!", description: `Sent ₹${amount} to ${recipientName || recipientUpiId}.`, duration: 5000 });
        if (selectedOption.type === 'wallet' || result.usedWalletFallback) {
            // Refresh wallet balance display
            getWalletBalanceService().then(newBalance => {
                 setPaymentOptions(prevOpts => prevOpts.map(opt => 
                    opt.id === 'wallet' ? {...opt, details: `Balance: ₹${newBalance.toFixed(2)}`, disabled: newBalance < Number(amount || 0)} : opt
                ));
            }).catch(console.error);
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
    const selectedOpt = paymentOptions.find(opt => opt.id === selectedPaymentOptionId);
    if (!selectedOpt) return "Unknown Source";
    return `${selectedOpt.name} ${selectedOpt.details ? `(${selectedOpt.details})` : ''}`;
  };

  const selectedUpiAccountForPin = paymentOptions.find(opt => opt.id === selectedPaymentOptionId && opt.type === 'upi');


  if (isLoadingPaymentOptions && !error) {
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
              <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border">
                      <AvatarImage src={`https://picsum.photos/seed/${recipientUpiId}/40/40`} alt={recipientName || recipientUpiId} data-ai-hint="recipient avatar"/>
                      <AvatarFallback>{(recipientName || recipientUpiId || 'R').charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">Paying {recipientName || recipientUpiId}</CardTitle>
                    <CardDescription className="text-xs">{recipientUpiId}</CardDescription>
                  </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="amount" className="sr-only">Amount (₹)</Label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-2xl">₹</span>
                    <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        min="1"
                        step="0.01"
                        className="pl-10 text-3xl font-bold h-16 text-center"
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

              <Separator/>

              <div className="space-y-2">
                <Label>Pay Using</Label>
                {isLoadingPaymentOptions && <div className="text-center text-sm text-muted-foreground p-4"><Loader2 className="h-5 w-5 animate-spin inline mr-2"/>Loading payment methods...</div>}
                {!isLoadingPaymentOptions && paymentOptions.length === 0 && !error && (
                    <Alert variant="default">
                        <Info className="h-4 w-4" />
                        <AlertTitle>No Payment Methods</AlertTitle>
                        <AlertDescription>
                            Please link a bank account in UPI settings or add funds to your Zet Pay Wallet to make payments.
                        </AlertDescription>
                    </Alert>
                )}
                {!isLoadingPaymentOptions && paymentOptions.map(option => (
                    <Button
                        key={option.id}
                        variant={selectedPaymentOptionId === option.id ? "default" : "outline"}
                        className={cn(
                            "w-full justify-start h-auto py-2.5 px-3 text-left items-center gap-3",
                            selectedPaymentOptionId === option.id && "ring-2 ring-primary ring-offset-1",
                            option.disabled && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => !option.disabled && setSelectedPaymentOptionId(option.id)}
                        disabled={option.disabled || isProcessing}
                    >
                        <option.icon className={cn("h-6 w-6 flex-shrink-0", selectedPaymentOptionId === option.id ? "text-primary-foreground" : "text-primary")} />
                        <div className="flex-grow">
                            <p className="font-medium text-sm">{option.name}</p>
                            {option.details && <p className="text-xs text-muted-foreground">{option.details}</p>}
                        </div>
                        {option.isDefault && option.type === 'upi' && <Badge variant="outline" className="text-xs ml-auto">Primary</Badge>}
                        {option.bankStatus && option.bankStatus !== 'Active' && (
                            <Badge variant={option.bankStatus === 'Slow' ? "secondary" : "destructive"} className={cn("text-xs ml-auto", option.bankStatus === 'Slow' ? "bg-yellow-100 text-yellow-700" : "")}>
                                {option.bankStatus}
                            </Badge>
                        )}
                    </Button>
                ))}
                 {/* Conceptual Credit/Debit Card Option */}
                 <Button
                    variant={selectedPaymentOptionId === 'card_placeholder' ? "default" : "outline"}
                    className="w-full justify-start h-auto py-2.5 px-3 text-left items-center gap-3 opacity-50 cursor-not-allowed"
                    disabled // Keep disabled until implemented
                >
                    <CreditCard className="h-6 w-6 text-primary" />
                    <div>
                        <p className="font-medium text-sm">Credit/Debit Card</p>
                        <p className="text-xs text-muted-foreground">Pay using saved or new card (Coming Soon)</p>
                    </div>
                </Button>
              </div>

              {error && !showConfirmation && <Alert variant="destructive" className="mt-4"><CircleAlert className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

              <Button
                onClick={handlePayment}
                className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white mt-6 h-11 text-base"
                disabled={isProcessing || isLoadingPaymentOptions || !selectedPaymentOptionId || !amount || Number(amount) <=0 || paymentOptions.find(opt => opt.id === selectedPaymentOptionId)?.disabled}
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
                <Button variant="outline" className="w-full" onClick={() => { setShowConfirmation(false); setPaymentResult(null); setError(null); }}>Try Again</Button>
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
                Enter your {selectedUpiAccountForPin?.pinLength || '4 or 6'} digit UPI PIN for {selectedUpiAccountForPin?.bankName || 'your account'} to authorize payment of ₹{Number(amount).toFixed(2)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="pin-input-dialog" className="sr-only">UPI PIN</Label>
            <Input
              id="pin-input-dialog"
              type="password"
              inputMode="numeric"
              maxLength={selectedUpiAccountForPin?.pinLength || 6}
              value={upiPin}
              onChange={(e) => setUpiPin(e.target.value.replace(/\D/g, ''))}
              className="text-center text-xl tracking-[0.3em]"
              placeholder={selectedUpiAccountForPin?.pinLength === 4 ? "****" : "******"}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handlePinCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePinSubmit} 
                 disabled={!(
                    (selectedUpiAccountForPin?.pinLength === 4 && upiPin.length === 4) ||
                    (selectedUpiAccountForPin?.pinLength === 6 && upiPin.length === 6) ||
                    (!selectedUpiAccountForPin?.pinLength && (upiPin.length === 4 || upiPin.length === 6))
                )}>
                <Lock className="mr-2 h-4 w-4" /> Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
