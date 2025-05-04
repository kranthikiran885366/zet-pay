
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, GraduationCap, Loader2, Wallet, Info, Building, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { getBillers, Biller } from '@/services/recharge'; // Reuse biller service
import { fetchBillAmount, processBillPayment } from '@/services/bills'; // Reuse bill payment service
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

// Mock Data (Extend Biller interface or create new for educational institutions)
interface Institute extends Biller {
    location?: string; // e.g., "Bangalore, Karnataka"
}

const mockInstitutes: Institute[] = [
    { billerId: 'mock-school-1', billerName: 'ABC Public School', billerType: 'Education', location: 'Delhi', logoUrl: '/logos/abc_school.png' },
    { billerId: 'mock-college-1', billerName: 'XYZ Engineering College', billerType: 'Education', location: 'Mumbai', logoUrl: '/logos/xyz_college.png' },
    { billerId: 'mock-uni-1', billerName: 'University of Example', billerType: 'Education', location: 'Bangalore', logoUrl: '/logos/uni_example.png' },
    { billerId: 'mock-coaching-1', billerName: 'A+ Coaching Center', billerType: 'Education', location: 'Chennai', logoUrl: '/logos/aplus_coaching.png' },
];

export default function EducationFeesPage() {
    const [institutes, setInstitutes] = useState<Institute[]>([]);
    const [selectedInstituteId, setSelectedInstituteId] = useState<string>('');
    const [studentId, setStudentId] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [fetchedAmount, setFetchedAmount] = useState<number | null>(null);
    const [isFetchingAmount, setIsFetchingAmount] = useState<boolean>(false);
    const [isLoadingInstitutes, setIsLoadingInstitutes] = useState<boolean>(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    // Fetch Institutes
    useEffect(() => {
        async function fetchInstitutes() {
            setIsLoadingInstitutes(true);
            setError(null);
            try {
                // Assuming 'Education' is the type expected by getBillers
                const fetched = await getBillers('Education');
                setInstitutes(fetched.length > 0 ? fetched as Institute[] : mockInstitutes); // Use fetched or mock
            } catch (err) {
                setError('Failed to load institutions. Please try again.');
                console.error(err);
                toast({ variant: "destructive", title: "Error Loading Institutions" });
                setInstitutes(mockInstitutes); // Fallback to mock
            } finally {
                setIsLoadingInstitutes(false);
            }
        }
        fetchInstitutes();
    }, [toast]);

     // Reset amount/fetched state when institute or student ID changes
    useEffect(() => {
        setFetchedAmount(null);
        setAmount('');
        setError(null);
    }, [selectedInstituteId, studentId]);

    // Fetch Bill Amount (if supported by institute)
    const handleFetchFee = async () => {
        if (!selectedInstituteId || !studentId) {
           toast({ variant: "destructive", title: "Missing Details", description: "Please select an institution and enter Student ID." });
           return;
        }
        setIsFetchingAmount(true);
        setError(null);
        setFetchedAmount(null);
        setAmount('');

        try {
            // Use fetchBillAmount service, backend needs to handle 'Education' type
            const feeAmount = await fetchBillAmount(selectedInstituteId, studentId);
            if (feeAmount !== null) {
                setFetchedAmount(feeAmount);
                setAmount(feeAmount.toString());
                toast({ title: "Fee Amount Fetched", description: `Outstanding fee: ₹${feeAmount.toFixed(2)}` });
            } else {
                toast({ title: "Manual Entry Required", description: "Could not fetch fee amount. Please enter manually." });
            }
        } catch (err: any) {
            console.error("Failed to fetch fee amount:", err);
            setError("Failed to fetch fee details. Please enter amount manually.");
            toast({ variant: "destructive", title: "Error Fetching Fee", description: err.message || "Please try again." });
        } finally {
            setIsFetchingAmount(false);
        }
    }

    // Process Payment
    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!selectedInstituteId || !studentId || !amount || Number(amount) <= 0) {
            setError("Please fill in all required fields with valid values.");
            toast({ variant: "destructive", title: "Invalid Input" });
            return;
        }

        setIsProcessingPayment(true);
        const instituteName = institutes.find(i => i.billerId === selectedInstituteId)?.billerName || 'Education Fee';

        try {
            // Use processBillPayment, backend needs to handle 'Education' type
            const paymentDetails = {
                billerId: selectedInstituteId,
                identifier: studentId,
                amount: Number(amount),
                billerType: 'Education',
                billerName: instituteName,
            };
            const transactionResult = await processBillPayment(paymentDetails);

            if (transactionResult.status === 'Completed') {
                toast({
                    title: "Payment Successful",
                    description: `Paid ₹${amount} towards ${instituteName} fees for Student ID ${studentId}.`,
                });
                // Reset form partially
                setStudentId('');
                setAmount('');
                setFetchedAmount(null);
            } else {
                throw new Error(`Payment ${transactionResult.status}. ${transactionResult.description || ''}`);
            }

        } catch (err: any) {
            console.error("Education fee payment failed:", err);
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
                <GraduationCap className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Education Fees</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Pay School/College Fees</CardTitle>
                        <CardDescription>Select institution and enter student details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePayment} className="space-y-4">
                           {/* Institution Select */}
                            <div className="space-y-1">
                                <Label htmlFor="institution">Institution</Label>
                                <Select value={selectedInstituteId} onValueChange={setSelectedInstituteId} required disabled={isLoadingInstitutes}>
                                    <SelectTrigger id="institution">
                                        <SelectValue placeholder={isLoadingInstitutes ? "Loading..." : "Select School/College/University"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {institutes.map((inst) => (
                                            <SelectItem key={inst.billerId} value={inst.billerId}>
                                                 {inst.logoUrl && <Image src={inst.logoUrl} alt="" width={16} height={16} className="inline-block mr-2 h-4 w-4 object-contain"/>}
                                                 {inst.billerName} {inst.location ? `(${inst.location})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {error && !isLoadingInstitutes && <p className="text-xs text-destructive mt-1">{error}</p>}
                            </div>

                            {/* Student ID Input */}
                            <div className="space-y-1">
                                <Label htmlFor="studentId">Student ID / Roll Number</Label>
                                <Input
                                    id="studentId"
                                    type="text"
                                    placeholder="Enter Student Identifier"
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                    required
                                    disabled={isProcessingPayment}
                                />
                            </div>

                            {/* Amount Input */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="amount">Fee Amount (₹)</Label>
                                    {/* Show Fetch button only if amount not fetched/fetching */}
                                    {fetchedAmount === null && !isFetchingAmount && (
                                         <Button type="button" variant="link" size="sm" onClick={handleFetchFee} disabled={!selectedInstituteId || !studentId || isFetchingAmount}>
                                            {isFetchingAmount ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch Fee"}
                                        </Button>
                                    )}
                                     {isFetchingAmount && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder={isFetchingAmount ? "Fetching..." : (fetchedAmount === null ? "Enter Amount or Fetch Fee" : "Fee Amount Fetched")}
                                        value={amount}
                                        onChange={(e) => {
                                            setAmount(e.target.value);
                                            if (fetchedAmount !== null) setFetchedAmount(null); // Clear fetched if manually changed
                                        }}
                                        required
                                        min="1"
                                        step="0.01"
                                        className="pl-7"
                                        disabled={isAmountInputDisabled}
                                    />
                                </div>
                                {fetchedAmount !== null && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3"/> Fetched fee amount: ₹{fetchedAmount.toFixed(2)}</p>
                                )}
                            </div>

                            {error && <p className="text-sm text-destructive mt-2">{error}</p>}

                            {/* Payment Button */}
                            <div className="pt-4">
                                <Separator className="mb-4"/>
                                <Button
                                    type="submit"
                                    className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                    disabled={isProcessingPayment || isFetchingAmount || !selectedInstituteId || !studentId || !amount || Number(amount) <= 0}
                                >
                                    {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    {isProcessingPayment ? 'Processing...' : `Pay Fee ₹${amount || '0'}`}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

