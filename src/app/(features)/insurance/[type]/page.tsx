
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ShieldCheck, Bike, Car, HeartPulse, Loader2, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { processBillPayment } from '@/services/bills';
import { mockInsurersData, Insurer } from '@/mock-data'; 
import { auth } from '@/lib/firebase';
import type { Transaction } from '@/services/types';

const insuranceTypeDetails: { [key: string]: { title: string; icon: React.ElementType; identifierLabel: string; billerType: string } } = {
    'bike': { title: 'Bike Insurance Premium', icon: Bike, identifierLabel: 'Policy Number / Vehicle Reg. No.', billerType: 'Bike Insurance' },
    'car': { title: 'Car Insurance Premium', icon: Car, identifierLabel: 'Policy Number / Vehicle Reg. No.', billerType: 'Car Insurance' },
    'health': { title: 'Health Insurance Premium', icon: HeartPulse, identifierLabel: 'Policy Number', billerType: 'Health Insurance' },
    'life': { title: 'Life Insurance Premium', icon: ShieldCheck, identifierLabel: 'Policy Number', billerType: 'Life Insurance' },
};

export default function InsurancePaymentPage() {
    const params = useParams();
    const router = useRouter();
    const type = typeof params.type === 'string' ? params.type : 'life'; // Default to life if type is weird
    const details = insuranceTypeDetails[type] || insuranceTypeDetails['life'];

    const [insurers, setInsurers] = useState<Insurer[]>([]);
    const [selectedInsurer, setSelectedInsurer] = useState<string>('');
    const [identifier, setIdentifier] = useState('');
    const [dob, setDob] = useState<string>(''); // For LIC or others needing DOB
    const [amount, setAmount] = useState<string>('');
    const [isLoadingInsurers, setIsLoadingInsurers] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setIsLoadingInsurers(true);
        // Simulate fetching insurers based on type
        setTimeout(() => {
            setInsurers(mockInsurersData[type] || mockInsurersData['life'] || []);
            setIsLoadingInsurers(false);
        }, 500);
        // Reset fields when type changes
        setSelectedInsurer('');
        setIdentifier('');
        setDob('');
        setAmount('');
    }, [type]);

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
         if (!auth.currentUser) {
            toast({ variant: "destructive", title: "Not Logged In", description: "Please log in to make payments." });
            return;
        }
        if (!selectedInsurer || !identifier || !amount || Number(amount) <= 0) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select insurer, enter identifier, and a valid amount." });
            return;
        }
        // Specific validation for LIC
        if (selectedInsurer === 'lic' && !dob) {
            toast({ variant: "destructive", title: "Date of Birth Required", description: "Please enter Date of Birth for LIC premium payment." });
            return;
        }

        setIsProcessing(true);
        const insurerName = insurers.find(i => i.id === selectedInsurer)?.name || details.title;
        try {
            const paymentDetails = {
                billerId: selectedInsurer,
                identifier: identifier, // Could append DOB for LIC if backend expects it: `${identifier}|${dob}`
                amount: Number(amount),
                billerType: details.billerType,
                billerName: insurerName,
            };
            const transactionResult = await processBillPayment(paymentDetails) as Transaction;

            if (transactionResult.status === 'Completed') {
                toast({ title: "Payment Successful!", description: `₹${amount} paid for ${insurerName} policy (${identifier}). Txn ID: ${transactionResult.id}` });
                setIdentifier('');
                setAmount('');
                setDob('');
                router.push('/history');
            } else {
                throw new Error(transactionResult.description || `Payment ${transactionResult.status}`);
            }
        } catch (err: any) {
            console.error("Insurance payment failed:", err);
            toast({ variant: "destructive", title: "Payment Failed", description: err.message || "Could not complete insurance payment." });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/services" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <details.icon className="h-6 w-6" />
                <h1 className="text-lg font-semibold">{details.title}</h1>
            </header>

            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Pay Insurance Premium</CardTitle>
                        <CardDescription>Select your insurer and policy details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePayment} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="insurer">Select Insurer</Label>
                                <Select value={selectedInsurer} onValueChange={setSelectedInsurer} required disabled={isLoadingInsurers}>
                                    <SelectTrigger id="insurer">
                                        <SelectValue placeholder={isLoadingInsurers ? "Loading..." : "Select Insurer"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {insurers.map((i) => (
                                            <SelectItem key={i.id} value={i.id}>
                                                {i.logoUrl && <Image src={i.logoUrl} alt={i.name} width={16} height={16} className="inline-block mr-2 h-4 w-4 object-contain" data-ai-hint="insurance company logo"/>}
                                                {i.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="identifier">{details.identifierLabel}</Label>
                                <Input
                                    id="identifier"
                                    type="text"
                                    placeholder={`Enter ${details.identifierLabel}`}
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    required
                                />
                            </div>

                            {selectedInsurer === 'lic' && ( // Example: Show DOB field only for LIC
                                <div className="space-y-1">
                                    <Label htmlFor="dob">Date of Birth (DDMMYYYY)</Label>
                                    <Input
                                        id="dob"
                                        type="text"
                                        placeholder="DDMMYYYY format"
                                        value={dob}
                                        onChange={(e) => setDob(e.target.value.replace(/\D/g, '').slice(0,8))}
                                        maxLength={8}
                                        pattern="\d{8}"
                                        required
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <Label htmlFor="amount">Premium Amount (₹)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder="Enter Premium Amount"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        required
                                        min="1"
                                        step="0.01"
                                        className="pl-7"
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <Separator className="mb-4"/>
                                <Button
                                    type="submit"
                                    className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                    disabled={isProcessing || !selectedInsurer || !identifier || !amount || Number(amount) <= 0 || (selectedInsurer === 'lic' && !dob)}
                                >
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    {isProcessing ? 'Processing...' : `Pay Premium`}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
