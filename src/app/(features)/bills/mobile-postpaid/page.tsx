'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Smartphone, Loader2, Wallet, Info, BadgePercent, Repeat, BellRing, RefreshCw, Edit } from 'lucide-react';
import Link from 'next/link';
import { getBillers, Biller, detectOperatorAndCircle } from '@/services/recharge';
import { fetchBillDetails as fetchBillDetailsApi, processBillPayment as processBillPaymentApi, FetchedBillDetails } from '@/services/bills';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { format, isValid } from 'date-fns';
import type { Transaction } from '@/services/types';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';

export default function MobilePostpaidPage() {
    const [operators, setOperators] = useState<Biller[]>([]);
    const [selectedOperatorId, setSelectedOperatorId] = useState<string>('');
    const [detectedOperatorInfo, setDetectedOperatorInfo] = useState<{ operator: Biller, circle: string } | null>(null);
    const [isManualOperatorSelection, setIsManualOperatorSelection] = useState(false);
    const [mobileNumber, setMobileNumber] = useState('');
    const [amount, setAmount] = useState<string>('');
    const [fetchedBillInfo, setFetchedBillInfo] = useState<FetchedBillDetails | null>(null);
    const [isDetectingOperator, setIsDetectingOperator] = useState<boolean>(false);
    const [isFetchingAmount, setIsFetchingAmount] = useState<boolean>(false);
    const [isLoadingOperators, setIsLoadingOperators] = useState(true);
    const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'upi' | 'card'>('wallet');
    const [couponCode, setCouponCode] = useState('');

    const { toast } = useToast();
    const router = useRouter();
    const mobileNumberInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            setIsLoggedIn(!!user);
            if (!user) {
                setIsLoadingOperators(false);
                setError("Please log in to pay bills.");
            } else {
                fetchInitialOperators();
            }
        });
        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchInitialOperators = async () => {
        setIsLoadingOperators(true);
        setError(null);
        try {
            const fetchedOperators = await getBillers('Mobile Postpaid');
            setOperators(fetchedOperators);
            if (fetchedOperators.length === 0) {
                setError('Could not load mobile operators. Please try refreshing.');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load operators.');
            console.error(err);
            toast({ variant: "destructive", title: "Error Loading Operators", description: err.message });
        } finally {
            setIsLoadingOperators(false);
        }
    };

    const handleMobileNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
        setMobileNumber(value);
        // Reset dependent states when mobile number changes significantly
        if (value.length < 10 || value.length === 0) {
            setDetectedOperatorInfo(null);
            setSelectedOperatorId('');
            setFetchedBillInfo(null);
            setAmount('');
            setIsManualOperatorSelection(false);
        }
    };
    
    const attemptAutoDetection = useCallback(async () => {
        if (mobileNumber.length === 10 && !isManualOperatorSelection) {
            setIsDetectingOperator(true);
            setFetchedBillInfo(null); setAmount(''); // Clear previous bill info
            try {
                const detectionResult = await detectOperatorAndCircle(mobileNumber);
                if (detectionResult && detectionResult.operator) {
                    setDetectedOperatorInfo(detectionResult);
                    setSelectedOperatorId(detectionResult.operator.billerId); // Auto-select detected operator
                    toast({ title: "Operator Detected", description: `${detectionResult.operator.billerName} (${detectionResult.circle})`});
                } else {
                    toast({ description: "Could not auto-detect operator. Please select manually." });
                    setIsManualOperatorSelection(true); // Fallback to manual
                }
            } catch (error: any) {
                toast({ variant: "destructive", title: "Operator Detection Failed", description: error.message });
                setIsManualOperatorSelection(true); // Fallback to manual
            } finally {
                setIsDetectingOperator(false);
            }
        }
    }, [mobileNumber, isManualOperatorSelection, toast]);

    useEffect(() => {
        const timer = setTimeout(() => {
            attemptAutoDetection();
        }, 700); // Debounce auto-detection
        return () => clearTimeout(timer);
    }, [attemptAutoDetection]);
    

    const fetchBill = useCallback(async () => {
        const operatorToUse = selectedOperatorId || detectedOperatorInfo?.operator.billerId;
        if (!operatorToUse || !mobileNumber || mobileNumber.length !== 10) {
            setFetchedBillInfo(null); setAmount(''); // Clear if not enough info
            return;
        }
        setIsFetchingAmount(true);
        setError(null);
        setFetchedBillInfo(null);
        setAmount('');

        try {
            const billDetails = await fetchBillDetailsApi('mobile-postpaid', operatorToUse, mobileNumber);
            if (billDetails && (billDetails.amount !== null && billDetails.amount !== undefined)) {
                setFetchedBillInfo(billDetails);
                setAmount(billDetails.amount.toString());
                toast({ title: "Bill Details Fetched", description: `Outstanding for ${billDetails.consumerName || mobileNumber}: ₹${billDetails.amount.toFixed(2)}${billDetails.dueDate && isValid(new Date(billDetails.dueDate)) ? ` (Due: ${format(new Date(billDetails.dueDate), 'PP')})` : ''}` });
            } else {
                toast({ title: "Manual Entry Required", description: billDetails.message || "Could not fetch bill details automatically. Please enter amount." });
                setFetchedBillInfo({ amount: null }); 
            }
        } catch (err: any) {
            console.error("Failed to fetch postpaid bill amount:", err);
            setError(err.message || "Could not fetch bill details. Please enter amount manually.");
            toast({ variant: "destructive", title: "Error Fetching Bill", description: err.message || "Please try again." });
            setFetchedBillInfo({ amount: null });
        } finally {
            setIsFetchingAmount(false);
        }
    }, [selectedOperatorId, detectedOperatorInfo, mobileNumber, toast]);

    useEffect(() => {
        if ((selectedOperatorId || detectedOperatorInfo?.operator.billerId) && mobileNumber.length === 10) {
            fetchBill();
        }
    }, [selectedOperatorId, detectedOperatorInfo, mobileNumber, fetchBill]);


    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!isLoggedIn) { setError("Please log in to make payments."); return; }
        
        const finalOperatorId = selectedOperatorId || detectedOperatorInfo?.operator.billerId;
        const finalOperatorName = operators.find(op => op.billerId === finalOperatorId)?.billerName || detectedOperatorInfo?.operator.billerName || "Mobile Postpaid";

        if (!finalOperatorId || !mobileNumber || !amount || Number(amount) <= 0) {
            setError("Please fill all fields with valid values.");
            toast({ variant: "destructive", title: "Invalid Input" });
            return;
        }
        setIsProcessingPayment(true);
        try {
            const paymentDetails = {
                billerId: finalOperatorId,
                identifier: mobileNumber,
                amount: Number(amount),
                billerType: 'Mobile Postpaid', 
                billerName: finalOperatorName,
                paymentMethod, 
                // couponCode: couponCode // If backend supports this
            };
            const transactionResult = await processBillPaymentApi(paymentDetails);
            if (transactionResult.status === 'Completed' || transactionResult.status === 'Processing Activation') {
                toast({ title: "Payment Successful", description: `Paid ₹${amount} for ${finalOperatorName} bill (${mobileNumber}). Txn ID: ${transactionResult.id}` });
                // Reset form partially, keep number and operator for convenience
                setAmount('');
                setFetchedBillInfo(null);
                setCouponCode('');
                 router.push('/history'); // Consider redirecting or showing a success modal
            } else {
                setError(transactionResult.description || `Payment ${transactionResult.status}. Check history.`);
                toast({ variant: "destructive", title: `Payment ${transactionResult.status}`, description: transactionResult.description || "Check history for details." });
            }
        } catch (err: any) {
            console.error("Mobile Postpaid payment failed:", err);
            setError(err.message || "Payment failed. Please try again.");
            toast({ variant: "destructive", title: "Payment Failed", description: err.message || "Details in history." });
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const isAmountInputDisabled = (fetchedBillInfo?.amount !== null && fetchedBillInfo?.amount !== undefined) || isFetchingAmount || isProcessingPayment;
    const currentOperator = selectedOperatorId ? operators.find(op => op.billerId === selectedOperatorId) : detectedOperatorInfo?.operator;
    const operatorName = currentOperator?.billerName;

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/services" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Smartphone className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Mobile Postpaid Bill</h1>
            </header>

            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Pay Your Postpaid Bill</CardTitle>
                        <CardDescription>Enter your mobile number to fetch bill details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!isLoggedIn && ( <p className="text-destructive text-center p-4">Please log in to pay bills.</p> )}
                        {isLoggedIn && (
                            <form onSubmit={handlePayment} className="space-y-4">
                                <div className="space-y-1">
                                    <Label htmlFor="mobileNumber">Mobile Number</Label>
                                    <Input
                                        id="mobileNumber"
                                        type="tel"
                                        ref={mobileNumberInputRef}
                                        placeholder="Enter 10-digit mobile number"
                                        value={mobileNumber}
                                        onChange={handleMobileNumberChange}
                                        required
                                        pattern="[6-9]\d{9}"
                                        maxLength={10}
                                        disabled={isProcessingPayment}
                                    />
                                </div>

                                {/* Operator Display/Selection */}
                                {(isDetectingOperator || detectedOperatorInfo || isManualOperatorSelection) && (
                                    <div className="p-3 border rounded-md bg-muted/50">
                                        {isDetectingOperator ? (
                                            <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Detecting operator...</div>
                                        ) : detectedOperatorInfo && !isManualOperatorSelection ? (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {detectedOperatorInfo.operator.logoUrl && <Image src={detectedOperatorInfo.operator.logoUrl} alt={detectedOperatorInfo.operator.billerName} width={24} height={24} className="h-6 w-6 rounded-full object-contain border bg-white p-0.5" data-ai-hint="operator logo small"/>}
                                                    <div>
                                                        <p className="text-sm font-medium">{detectedOperatorInfo.operator.billerName}</p>
                                                        <p className="text-xs text-muted-foreground">{detectedOperatorInfo.circle} | Postpaid</p>
                                                    </div>
                                                </div>
                                                <Button variant="link" size="xs" className="p-0 h-auto text-xs" onClick={() => setIsManualOperatorSelection(true)}><Edit className="h-3 w-3 mr-1"/>Change</Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                <Label htmlFor="operator-manual">Select Operator</Label>
                                                <Select value={selectedOperatorId} onValueChange={setSelectedOperatorId} required disabled={isLoadingOperators || operators.length === 0}>
                                                    <SelectTrigger id="operator-manual">
                                                        <SelectValue placeholder={isLoadingOperators ? "Loading..." : (operators.length === 0 ? "No operators" : "Select Operator")} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {operators.map((op) => (
                                                            <SelectItem key={op.billerId} value={op.billerId}>
                                                                {op.logoUrl && <Image src={op.logoUrl} alt={op.billerName} width={16} height={16} className="inline-block mr-2 h-4 w-4 object-contain" data-ai-hint="operator logo"/>}
                                                                {op.billerName}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {error && error.includes("operators") && <p className="text-xs text-destructive mt-1">{error}</p>}

                                {/* Bill Details and Amount */}
                                {(selectedOperatorId || detectedOperatorInfo) && mobileNumber.length === 10 && (
                                    <div className="space-y-3 pt-2">
                                        {isFetchingAmount && <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Fetching bill details...</div>}
                                        
                                        {fetchedBillInfo && (
                                            <Card className="bg-background p-3 border-dashed">
                                                <CardDescription className="text-xs mb-1">Bill for: {fetchedBillInfo.consumerName || mobileNumber}</CardDescription>
                                                {fetchedBillInfo.dueDate && isValid(new Date(fetchedBillInfo.dueDate)) && <p className="text-xs text-muted-foreground">Due Date: {format(new Date(fetchedBillInfo.dueDate), 'PP')}</p>}
                                                {fetchedBillInfo.status && <p className="text-xs text-muted-foreground">Status: <Badge variant={fetchedBillInfo.status === 'PAID' ? 'default' : 'secondary'} className={fetchedBillInfo.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>{fetchedBillInfo.status}</Badge></p>}
                                                {fetchedBillInfo.minAmountDue !== undefined && <p className="text-xs text-muted-foreground">Minimum Due: ₹{fetchedBillInfo.minAmountDue.toFixed(2)}</p>}
                                            </Card>
                                        )}

                                        <div className="space-y-1">
                                            <Label htmlFor="amount">Amount to Pay (₹)</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                                <Input
                                                    id="amount"
                                                    type="number"
                                                    placeholder={(isFetchingAmount || fetchedBillInfo?.amount === undefined) ? "Enter amount" : "Fetched bill amount"}
                                                    value={amount}
                                                    onChange={(e) => { setAmount(e.target.value); if (fetchedBillInfo?.amount !== null) setFetchedBillInfo(prev => prev ? {...prev, amount: null} : {amount: null}); }}
                                                    required
                                                    min="1" step="0.01" className="pl-7"
                                                    disabled={isAmountInputDisabled}
                                                />
                                            </div>
                                            {error && !error.includes("operators") && <p className="text-sm text-destructive mt-1">{error}</p>}
                                        </div>

                                         {/* Payment Method & Coupon */}
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <div className="space-y-1">
                                                <Label htmlFor="paymentMethod" className="text-xs">Pay using</Label>
                                                <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as any)}>
                                                    <SelectTrigger id="paymentMethod"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="wallet">Zet Wallet</SelectItem>
                                                        <SelectItem value="upi">UPI</SelectItem>
                                                        <SelectItem value="card" disabled>Credit/Debit Card</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="coupon" className="text-xs">Coupon (Optional)</Label>
                                                <Input id="coupon" placeholder="Enter code" value={couponCode} onChange={e => setCouponCode(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-2">
                                             <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => router.push(`/reminders?category=Mobile Postpaid&billerName=${operatorName}&identifier=${mobileNumber}${amount ? `&amount=${amount}` : ''}`)} disabled={!mobileNumber || !operatorName}><BellRing className="mr-1 h-3 w-3"/> Set Reminder</Button>
                                             <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => router.push(`/autopay/setup?merchantName=${encodeURIComponent(operatorName || '')}&identifier=${mobileNumber}${amount ? `&maxAmount=${amount}` : ''}`)} disabled={!mobileNumber || !operatorName}><Repeat className="mr-1 h-3 w-3"/> Setup Autopay</Button>
                                        </div>


                                        <div className="pt-4">
                                            <Separator className="mb-4"/>
                                            <Button type="submit" className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={isProcessingPayment || isFetchingAmount || !(selectedOperatorId || detectedOperatorInfo) || !mobileNumber || !amount || Number(amount) <= 0 || (fetchedBillInfo?.status === 'PAID' && fetchedBillInfo.amount === 0) }>
                                                {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                                {isProcessingPayment ? 'Processing...' : `Pay Bill ₹${amount || '0'}`}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </form>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
