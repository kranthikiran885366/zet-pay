
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BookUser, Loader2, Wallet, Info } from 'lucide-react';
import Link from 'next/link';
import { getBillers, Biller } from '@/services/recharge'; // Using Biller type for operators
import { fetchBillDetails, processBillPayment } from '@/services/bills'; // Using the corrected service function
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import type { Transaction } from '@/services/types';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase'; // Import auth

export default function MobilePostpaidPage() {
    const [operators, setOperators] = useState<Biller[]>([]);
    const [selectedOperatorId, setSelectedOperatorId] = useState<string>('');
    const [selectedOperatorName, setSelectedOperatorName] = useState<string>('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [amount, setAmount] = useState<string>('');
    const [fetchedBillInfo, setFetchedBillInfo] = useState<{ amount: number | null; dueDate?: Date | null; consumerName?: string, status?: string, minAmountDue?: number } | null>(null);
    const [isFetchingAmount, setIsFetchingAmount] = useState<boolean>(false);
    const [isLoadingOperators, setIsLoadingOperators] = useState(true);
    const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            setIsLoggedIn(!!user);
            if (!user) {
                setIsLoadingOperators(false);
                setError("Please log in to pay bills.");
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!isLoggedIn) return;

        async function fetchOperators() {
            setIsLoadingOperators(true);
            setError(null);
            try {
                const fetchedOperators = await getBillers('Mobile Postpaid');
                setOperators(fetchedOperators);
            } catch (err: any) {
                setError(err.message || 'Failed to load operators. Please try again.');
                console.error(err);
                toast({ variant: "destructive", title: "Error Loading Operators", description: err.message });
            } finally {
                setIsLoadingOperators(false);
            }
        }
        fetchOperators();
    }, [isLoggedIn, toast]);

    useEffect(() => {
        const operator = operators.find(op => op.billerId === selectedOperatorId);
        setSelectedOperatorName(operator?.billerName || '');
        setFetchedBillInfo(null); 
        setAmount('');
        setError(null);
    }, [selectedOperatorId, operators]);

    // Auto-fetch bill details when operator and valid mobile number are present
    useEffect(() => {
        if (selectedOperatorId && mobileNumber && mobileNumber.match(/^[6-9]\d{9}$/)) {
            handleFetchBill();
        } else {
            setFetchedBillInfo(null);
            setAmount(''); // Clear amount if number/operator changes
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mobileNumber, selectedOperatorId]); // Re-run only when mobileNumber or selectedOperatorId changes

    const handleFetchBill = async () => {
        if (!selectedOperatorId || !mobileNumber) return; // Guard against empty values
        setIsFetchingAmount(true);
        setError(null);
        setFetchedBillInfo(null);
        setAmount('');

        try {
            // The service `fetchBillDetails` needs the 'type'.
            // The backend endpoint is /api/bills/details/:type/:identifier
            // The page is responsible for providing its `type`.
            const billDetails = await fetchBillDetails('mobile-postpaid', selectedOperatorId, mobileNumber);
            if (billDetails && (billDetails.amount !== null && billDetails.amount !== undefined)) {
                setFetchedBillInfo(billDetails);
                setAmount(billDetails.amount.toString());
                toast({ title: "Bill Fetched", description: `Outstanding for ${billDetails.consumerName || mobileNumber}: ₹${billDetails.amount.toFixed(2)}${billDetails.dueDate ? ` (Due: ${format(new Date(billDetails.dueDate), 'PP')})` : ''}` });
            } else {
                toast({ title: "Manual Entry Required", description: "Could not fetch bill details. Please enter the amount." });
                 setFetchedBillInfo({ amount: null }); // Indicate manual entry
            }
        } catch (err: any) {
            console.error("Failed to fetch postpaid bill amount:", err);
            setError(err.message || "Could not fetch bill details. Please enter amount manually.");
            toast({ variant: "destructive", title: "Error Fetching Bill", description: err.message || "Please try again." });
             setFetchedBillInfo({ amount: null }); // Indicate manual entry on error
        } finally {
            setIsFetchingAmount(false);
        }
    }

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!isLoggedIn) {
            setError("Please log in to make payments.");
            return;
        }
        if (!selectedOperatorId || !mobileNumber || !amount || Number(amount) <= 0) {
            setError("Please fill all fields with valid values.");
            toast({ variant: "destructive", title: "Invalid Input" });
            return;
        }
        setIsProcessingPayment(true);
        try {
            const paymentDetails = {
                billerId: selectedOperatorId,
                identifier: mobileNumber,
                amount: Number(amount),
                billerType: 'Mobile Postpaid', 
                billerName: selectedOperatorName || 'Mobile Postpaid Bill',
            };
            const transactionResult = await processBillPayment(paymentDetails);
            if (transactionResult.status === 'Completed') {
                toast({ title: "Payment Successful", description: `Paid ₹${amount} for ${selectedOperatorName} bill (${mobileNumber}). Txn ID: ${transactionResult.id}` });
                setMobileNumber('');
                setAmount('');
                setFetchedBillInfo(null);
                setSelectedOperatorId('');
                router.push('/history');
            } else {
                setError(transactionResult.description || `Payment ${transactionResult.status}. Please check history for details.`);
                toast({ variant: "destructive", title: `Payment ${transactionResult.status}`, description: transactionResult.description || "Please check history for details." });
            }
        } catch (err: any) {
            console.error("Mobile Postpaid payment failed:", err);
            setError(err.message || "Payment failed. Please try again.");
            toast({ variant: "destructive", title: "Payment Failed", description: err.message || "Please check details and try again." });
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const isAmountInputDisabled = (fetchedBillInfo?.amount !== null && fetchedBillInfo?.amount !== undefined) || isFetchingAmount || isProcessingPayment;


    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/services" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <BookUser className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Mobile Postpaid Bill</h1>
            </header>

            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Pay Your Postpaid Bill</CardTitle>
                        <CardDescription>Enter your mobile number and operator to pay.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!isLoggedIn && (
                            <p className="text-destructive text-center p-4">Please log in to pay bills.</p>
                        )}
                        {isLoggedIn && (
                            <form onSubmit={handlePayment} className="space-y-4">
                                <div className="space-y-1">
                                    <Label htmlFor="operator">Operator</Label>
                                    <Select value={selectedOperatorId} onValueChange={setSelectedOperatorId} required disabled={isLoadingOperators || operators.length === 0}>
                                        <SelectTrigger id="operator">
                                            <SelectValue placeholder={isLoadingOperators ? "Loading..." : (operators.length === 0 ? "No operators found" : "Select Operator")} />
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
                                    {error && error.includes("operators") && <p className="text-xs text-destructive mt-1">{error}</p>}
                                </div>
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
                                        disabled={!selectedOperatorId || isProcessingPayment}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="amount">Amount (₹)</Label>
                                        {selectedOperatorId && mobileNumber.match(/^[6-9]\d{9}$/) && !isFetchingAmount && (fetchedBillInfo?.amount === null || fetchedBillInfo?.amount === undefined) && (
                                            <Button type="button" variant="link" size="sm" onClick={handleFetchBill} disabled={isFetchingAmount || isProcessingPayment}>
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
                                            placeholder={isFetchingAmount ? "Fetching..." : ((fetchedBillInfo?.amount === null || fetchedBillInfo?.amount === undefined) ? "Enter Amount or Fetch Bill" : "Bill Amount Fetched")}
                                            value={amount}
                                            onChange={(e) => {
                                                setAmount(e.target.value);
                                                if (fetchedBillInfo?.amount !== null && fetchedBillInfo?.amount !== undefined) setFetchedBillInfo(prev => prev ? {...prev, amount: null} : {amount: null});
                                            }}
                                            required
                                            min="1"
                                            step="0.01"
                                            className="pl-7"
                                            disabled={isAmountInputDisabled || !selectedOperatorId || !mobileNumber.match(/^[6-9]\d{9}$/)}
                                        />
                                    </div>
                                    {fetchedBillInfo?.amount !== null && fetchedBillInfo?.amount !== undefined && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3"/> Fetched bill: ₹{fetchedBillInfo.amount.toFixed(2)} for {fetchedBillInfo.consumerName || mobileNumber}.
                                        {fetchedBillInfo.dueDate && ` Due: ${format(new Date(fetchedBillInfo.dueDate), 'PP')}.`}
                                        </p>
                                    )}
                                </div>

                                {error && !error.includes("operators") && <p className="text-sm text-destructive mt-2">{error}</p>}

                                <div className="pt-4">
                                    <Separator className="mb-4"/>
                                    <Button
                                        type="submit"
                                        className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                        disabled={isProcessingPayment || isFetchingAmount || !selectedOperatorId || !mobileNumber || !amount || Number(amount) <= 0 || !mobileNumber.match(/^[6-9]\d{9}$/)}
                                    >
                                        {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                        {isProcessingPayment ? 'Processing...' : `Pay Bill ₹${amount || '0'}`}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

