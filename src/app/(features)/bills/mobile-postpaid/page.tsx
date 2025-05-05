'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BookUser, Loader2, Wallet, Info } from 'lucide-react'; // Placeholder Icon
import Link from 'next/link';
import { getBillers, Biller, processRecharge } from '@/services/recharge'; // Reuse recharge/biller service
import { fetchBillAmount, processBillPayment } from '@/services/bills'; // Reuse bill payment service
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

export default function MobilePostpaidPage() {
    const [operators, setOperators] = useState<Biller[]>([]);
    const [selectedOperator, setSelectedOperator] = useState<string>('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [amount, setAmount] = useState<string>('');
    const [fetchedAmount, setFetchedAmount] = useState<number | null>(null);
    const [isFetchingAmount, setIsFetchingAmount] = useState<boolean>(false);
    const [isLoadingOperators, setIsLoadingOperators] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    // Fetch Mobile Operators (assuming type 'Mobile' or specific 'Postpaid')
    useEffect(() => {
        async function fetchOperators() {
            setIsLoadingOperators(true);
            setError(null);
            try {
                // Use 'Mobile' type, backend/biller API should differentiate postpaid
                const fetchedOperators = await getBillers('Mobile');
                setOperators(fetchedOperators);
            } catch (err) {
                setError('Failed to load operators. Please try again.');
                console.error(err);
                toast({ variant: "destructive", title: "Error Loading Operators" });
            } finally {
                setIsLoadingOperators(false);
            }
        }
        fetchOperators();
    }, [toast]);

    // Handle fetch bill amount when operator/number changes
    useEffect(() => {
        if (selectedOperator && mobileNumber && mobileNumber.match(/^[6-9]\d{9}$/)) {
            handleFetchBill();
        } else {
            setFetchedAmount(null); // Clear if operator/number is invalid or cleared
            setAmount('');
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedOperator, mobileNumber]);

    // Fetch Bill Amount
    const handleFetchBill = async () => {
        if (!selectedOperator || !mobileNumber) return;
        setIsFetchingAmount(true);
        setError(null);
        setFetchedAmount(null);
        setAmount('');
        try {
            // Use fetchBillAmount service, backend needs to handle 'Mobile Postpaid' context
            const billDetails = await fetchBillAmount(selectedOperator, mobileNumber);
             if (billDetails !== null) {
                 setFetchedAmount(billDetails);
                 setAmount(billDetails.toString());
                 toast({ title: "Bill Fetched", description: `Outstanding amount: ₹${billDetails.toFixed(2)}` });
             } else {
                 toast({ title: "Manual Entry Required", description: "Could not fetch bill details. Please enter the amount." });
             }
        } catch (err: any) {
            console.error("Failed to fetch postpaid bill amount:", err);
            setError("Could not fetch bill details. Please enter amount manually.");
            toast({ variant: "destructive", title: "Error Fetching Bill", description: err.message || "Please try again." });
        } finally {
            setIsFetchingAmount(false);
        }
    }

    // Process Payment
    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!selectedOperator || !mobileNumber || !amount || Number(amount) <= 0) {
            setError("Please fill all fields with valid values.");
            toast({ variant: "destructive", title: "Invalid Input" });
            return;
        }
        setIsProcessingPayment(true);
        const operatorName = operators.find(o => o.billerId === selectedOperator)?.billerName || 'Mobile Postpaid';
        try {
            // Use processBillPayment, backend needs to handle 'Mobile Postpaid' type
            const paymentDetails = {
                billerId: selectedOperator,
                identifier: mobileNumber,
                amount: Number(amount),
                billerType: 'Mobile Postpaid', // Specific type
                billerName: operatorName,
            };
            const transactionResult = await processBillPayment(paymentDetails);
            if (transactionResult.status === 'Completed') {
                toast({ title: "Payment Successful", description: `Paid ₹${amount} for ${operatorName} bill (${mobileNumber}).` });
                setMobileNumber('');
                setAmount('');
                setFetchedAmount(null);
            } else {
                 throw new Error(`Payment ${transactionResult.status}. ${transactionResult.description || ''}`);
            }
        } catch (err: any) {
            console.error("Mobile Postpaid payment failed:", err);
            setError(err.message || "Payment failed. Please try again.");
            toast({ variant: "destructive", title: "Payment Failed", description: err.message || "Please check details and try again." });
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const isAmountInputDisabled = fetchedAmount !== null || isFetchingAmount || isProcessingPayment;


    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/services" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <BookUser className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Mobile Postpaid Bill</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Pay Your Postpaid Bill</CardTitle>
                        <CardDescription>Enter your mobile number and operator to pay.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePayment} className="space-y-4">
                            {/* Operator Selection */}
                            <div className="space-y-1">
                                <Label htmlFor="operator">Operator</Label>
                                <Select value={selectedOperator} onValueChange={setSelectedOperator} required disabled={isLoadingOperators}>
                                    <SelectTrigger id="operator">
                                        <SelectValue placeholder={isLoadingOperators ? "Loading..." : "Select Operator"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {operators.map((op) => (
                                            <SelectItem key={op.billerId} value={op.billerId}>
                                                {op.logoUrl && <Image src={op.logoUrl} alt="" width={16} height={16} className="inline-block mr-2 h-4 w-4 object-contain"/>}
                                                {op.billerName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Mobile Number Input */}
                            <div className="space-y-1">
                                <Label htmlFor="mobileNumber">Mobile Number</Label>
                                <Input
                                    id="mobileNumber"
                                    type="tel"
                                    placeholder="Enter 10-digit mobile number"
                                    value={mobileNumber}
                                    onChange={(e) => setMobileNumber(e.target.value)}
                                    required
                                    pattern="[6-9]\d{9}"
                                    maxLength={10}
                                />
                            </div>

                            {/* Amount Input */}
                            <div className="space-y-1">
                                 <div className="flex justify-between items-center">
                                    <Label htmlFor="amount">Amount (₹)</Label>
                                    {fetchedAmount === null && !isFetchingAmount && (
                                         <Button type="button" variant="link" size="sm" onClick={handleFetchBill} disabled={!selectedOperator || !mobileNumber || !mobileNumber.match(/^[6-9]\d{9}$/)}>
                                            Fetch Bill Amount
                                        </Button>
                                    )}
                                     {isFetchingAmount && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder={isFetchingAmount ? "Fetching..." : (fetchedAmount === null ? "Enter Amount or Fetch Bill" : "Bill Amount Fetched")}
                                        value={amount}
                                        onChange={(e) => {
                                            setAmount(e.target.value);
                                            if (fetchedAmount !== null) setFetchedAmount(null);
                                        }}
                                        required
                                        min="1"
                                        step="0.01"
                                        className="pl-7"
                                        disabled={isAmountInputDisabled}
                                    />
                                </div>
                                {fetchedAmount !== null && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3"/> Fetched bill amount: ₹{fetchedAmount.toFixed(2)}</p>
                                )}
                            </div>

                            {error && <p className="text-sm text-destructive mt-2">{error}</p>}

                            {/* Payment Button */}
                            <div className="pt-4">
                                <Separator className="mb-4"/>
                                <Button
                                    type="submit"
                                    className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                    disabled={isProcessingPayment || !selectedOperator || !mobileNumber || !amount || Number(amount) <= 0 || !mobileNumber.match(/^[6-9]\d{9}$/)}
                                >
                                    {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    {isProcessingPayment ? 'Processing...' : `Pay Bill`}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
