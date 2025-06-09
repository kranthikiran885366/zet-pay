
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, GraduationCap, Loader2, Wallet, Info, Building, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { getBillers, Biller } from '@/services/recharge'; 
import { fetchBillDetails, processBillPayment } from '@/services/bills'; 
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { auth } from '@/lib/firebase';
import { format } from 'date-fns';
import type { Transaction } from '@/services/types';
import { useRouter } from 'next/navigation';


interface Institute extends Biller {
    location?: string; 
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
    const [fetchedBillInfo, setFetchedBillInfo] = useState<{ amount: number | null; dueDate?: Date | null; consumerName?: string } | null>(null);
    const [isFetchingAmount, setIsFetchingAmount] = useState<boolean>(false);
    const [isLoadingInstitutes, setIsLoadingInstitutes] = useState<boolean>(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
          setIsLoggedIn(!!user);
          if (!user) {
            setIsLoadingInstitutes(false);
            setError("Please log in to pay fees.");
          }
        });
        return () => unsubscribe();
    }, []);

    
    useEffect(() => {
        if (!isLoggedIn) return;

        async function fetchInstitutes() {
            setIsLoadingInstitutes(true);
            setError(null);
            try {
                const fetched = await getBillers('Education');
                setInstitutes(fetched.length > 0 ? fetched as Institute[] : mockInstitutes);
            } catch (err: any) {
                setError(err.message || 'Failed to load institutions. Please try again.');
                console.error(err);
                toast({ variant: "destructive", title: "Error Loading Institutions", description: err.message });
                setInstitutes(mockInstitutes);
            } finally {
                setIsLoadingInstitutes(false);
            }
        }
        fetchInstitutes();
    }, [isLoggedIn, toast]);

    
    useEffect(() => {
        setFetchedBillInfo(null);
        setAmount('');
        setError(null);
    }, [selectedInstituteId, studentId]);

    
    const handleFetchFee = async () => {
        if (!selectedInstituteId || !studentId) {
           toast({ variant: "destructive", title: "Missing Details", description: "Please select an institution and enter Student ID." });
           return;
        }
        setIsFetchingAmount(true);
        setError(null);
        setFetchedBillInfo(null);
        setAmount('');

        try {
            const billDetails = await fetchBillDetails(selectedInstituteId, studentId);
            if (billDetails && billDetails.amount !== null) {
                setFetchedBillInfo(billDetails);
                setAmount(billDetails.amount.toString());
                toast({ title: "Fee Amount Fetched", description: `Outstanding fee for ${billDetails.consumerName || 'Student'}: ₹${billDetails.amount.toFixed(2)}${billDetails.dueDate ? ` (Due: ${format(new Date(billDetails.dueDate), 'PP')})` : ''}` });
            } else {
                toast({ title: "Manual Entry Required", description: "Could not fetch fee amount. Please enter manually." });
            }
        } catch (err: any) {
            console.error("Failed to fetch fee amount:", err);
            setError(err.message || "Failed to fetch fee details. Please enter amount manually.");
            toast({ variant: "destructive", title: "Error Fetching Fee", description: err.message || "Please try again." });
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

        if (!selectedInstituteId || !studentId || !amount || Number(amount) <= 0) {
            setError("Please fill in all required fields with valid values.");
            toast({ variant: "destructive", title: "Invalid Input" });
            return;
        }

        setIsProcessingPayment(true);
        const instituteName = institutes.find(i => i.billerId === selectedInstituteId)?.billerName || 'Education Fee';

        try {
            const paymentDetails = {
                billerId: selectedInstituteId,
                identifier: studentId,
                amount: Number(amount),
                billerType: 'Education',
                billerName: instituteName,
            };
            const transactionResult = await processBillPayment(paymentDetails) as Transaction; 

            if (transactionResult.status === 'Completed') {
                toast({
                    title: "Payment Successful",
                    description: `Paid ₹${amount} towards ${instituteName} fees for Student ID ${studentId}. Txn ID: ${transactionResult.id}`,
                });
                setStudentId('');
                setAmount('');
                setFetchedBillInfo(null);
                router.push('/history');
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

     const isAmountInputDisabled = fetchedBillInfo?.amount !== null || isFetchingAmount || isProcessingPayment;

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/services" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <GraduationCap className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Education Fees</h1>
            </header>

            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Pay School/College Fees</CardTitle>
                        <CardDescription>Select institution and enter student details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {!isLoggedIn && (
                            <p className="text-destructive text-center p-4">Please log in to pay education fees.</p>
                         )}
                         {isLoggedIn && (
                            <form onSubmit={handlePayment} className="space-y-4">
                                <div className="space-y-1">
                                    <Label htmlFor="institution">Institution</Label>
                                    <Select value={selectedInstituteId} onValueChange={setSelectedInstituteId} required disabled={isLoadingInstitutes || institutes.length === 0}>
                                        <SelectTrigger id="institution">
                                            <SelectValue placeholder={isLoadingInstitutes ? "Loading..." : (institutes.length === 0 ? "No institutions available" : "Select School/College/University")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {institutes.map((inst) => (
                                                <SelectItem key={inst.billerId} value={inst.billerId}>
                                                    {inst.logoUrl && <Image src={inst.logoUrl} alt={inst.billerName} width={16} height={16} className="inline-block mr-2 h-4 w-4 object-contain" data-ai-hint="school college university logo"/>}
                                                    {inst.billerName} {inst.location ? `(${inst.location})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {error && error.includes("institutions") && <p className="text-xs text-destructive mt-1">{error}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="studentId">Student ID / Roll Number</Label>
                                    <Input
                                        id="studentId"
                                        type="text"
                                        placeholder="Enter Student Identifier"
                                        value={studentId}
                                        onChange={(e) => setStudentId(e.target.value)}
                                        required
                                        disabled={isProcessingPayment || !selectedInstituteId}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="amount">Fee Amount (₹)</Label>
                                        {fetchedBillInfo?.amount === null && !isFetchingAmount && (
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
                                            placeholder={isFetchingAmount ? "Fetching..." : (fetchedBillInfo?.amount === null ? "Enter Amount or Fetch Fee" : "Fee Amount Fetched")}
                                            value={amount}
                                            onChange={(e) => {
                                                setAmount(e.target.value);
                                                if (fetchedBillInfo?.amount !== null) setFetchedBillInfo(prev => prev ? {...prev, amount: null} : null); 
                                            }}
                                            required
                                            min="1"
                                            step="0.01"
                                            className="pl-7"
                                            disabled={isAmountInputDisabled}
                                        />
                                    </div>
                                    {fetchedBillInfo?.amount !== null && fetchedBillInfo?.amount !== undefined && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3"/> Fetched fee: ₹{fetchedBillInfo.amount.toFixed(2)}.{fetchedBillInfo.dueDate ? ` Due: ${format(new Date(fetchedBillInfo.dueDate), 'PP')}` : ''}</p>
                                    )}
                                </div>
                                {error && !error.includes("institutions") && <p className="text-sm text-destructive mt-2">{error}</p>}
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
                         )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
