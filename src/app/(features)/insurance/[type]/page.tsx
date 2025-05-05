'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ShieldCheck, Bike, Car, HeartPulse, Loader2, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { processBillPayment } from '@/services/bills'; // Use bill payment service

// Mock Data (Replace with actual API calls/data)
interface Insurer {
    id: string;
    name: string;
    logoUrl?: string;
}
const mockInsurers: { [type: string]: Insurer[] } = {
    'bike': [
        { id: 'acko-bike', name: 'Acko General Insurance', logoUrl: '/logos/acko.png' },
        { id: 'hdfc-ergo-bike', name: 'HDFC ERGO General Insurance', logoUrl: '/logos/hdfc_ergo.png' },
        { id: 'icici-lombard-bike', name: 'ICICI Lombard General Insurance', logoUrl: '/logos/icici_lombard.png' },
    ],
    'car': [
        { id: 'bajaj-allianz-car', name: 'Bajaj Allianz General Insurance', logoUrl: '/logos/bajaj_allianz.png' },
        { id: 'tata-aig-car', name: 'TATA AIG General Insurance', logoUrl: '/logos/tata_aig.png' },
        { id: 'reliance-gen-car', name: 'Reliance General Insurance', logoUrl: '/logos/reliance_gen.png' },
    ],
    'health': [
        { id: 'star-health', name: 'Star Health Insurance', logoUrl: '/logos/star_health.png' },
        { id: 'care-health', name: 'Care Health Insurance', logoUrl: '/logos/care.png' },
        { id: 'niva-bupa', name: 'Niva Bupa Health Insurance', logoUrl: '/logos/niva_bupa.png' },
    ],
    'life': [
        { id: 'lic', name: 'Life Insurance Corporation (LIC)', logoUrl: '/logos/lic.png' },
        { id: 'hdfc-life', name: 'HDFC Life Insurance', logoUrl: '/logos/hdfc_life.png' },
        { id: 'sbi-life', name: 'SBI Life Insurance', logoUrl: '/logos/sbi_life.png' },
    ]
};

const insuranceTypeDetails: { [key: string]: { title: string; icon: React.ElementType; identifierLabel: string; billerType: string } } = {
    'bike': { title: 'Bike Insurance Premium', icon: Bike, identifierLabel: 'Policy Number / Vehicle Reg. No.', billerType: 'Bike Insurance' },
    'car': { title: 'Car Insurance Premium', icon: Car, identifierLabel: 'Policy Number / Vehicle Reg. No.', billerType: 'Car Insurance' },
    'health': { title: 'Health Insurance Premium', icon: HeartPulse, identifierLabel: 'Policy Number', billerType: 'Health Insurance' },
    'life': { title: 'Life Insurance Premium', icon: ShieldCheck, identifierLabel: 'Policy Number', billerType: 'Life Insurance' },
};

export default function InsurancePaymentPage() {
    const params = useParams();
    const type = typeof params.type === 'string' ? params.type : 'bike'; // Default to bike
    const details = insuranceTypeDetails[type] || insuranceTypeDetails['life']; // Fallback

    const [insurers, setInsurers] = useState<Insurer[]>([]);
    const [selectedInsurer, setSelectedInsurer] = useState<string>('');
    const [identifier, setIdentifier] = useState(''); // Policy number or Vehicle Reg
    const [dob, setDob] = useState<string>(''); // Sometimes required for LIC etc.
    const [amount, setAmount] = useState<string>('');
    const [isLoadingInsurers, setIsLoadingInsurers] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Fetch insurers based on type
        setIsLoadingInsurers(true);
        // Simulate fetching
        setTimeout(() => {
            setInsurers(mockInsurers[type] || []);
            setIsLoadingInsurers(false);
        }, 500);
        setSelectedInsurer(''); // Reset selection on type change
        setIdentifier('');
        setDob('');
        setAmount('');
    }, [type]);

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInsurer || !identifier || !amount || Number(amount) <= 0) {
            toast({ variant: "destructive", title: "Missing Information" });
            return;
        }
         // Add DOB validation if required for specific insurers (e.g., LIC)
         // if (selectedInsurer === 'lic' && !dob) { ... }

        setIsProcessing(true);
        const insurerName = insurers.find(i => i.id === selectedInsurer)?.name || details.title;
        try {
            const paymentDetails = {
                billerId: selectedInsurer,
                identifier: identifier,
                amount: Number(amount),
                billerType: details.billerType,
                billerName: insurerName,
                // Optionally include DOB or other verification data if needed by backend
            };
            const transactionResult = await processBillPayment(paymentDetails);

            if (transactionResult.status === 'Completed') {
                toast({ title: "Payment Successful!", description: `₹${amount} paid for ${insurerName} policy (${identifier}).` });
                setIdentifier('');
                setAmount('');
                setDob('');
            } else {
                throw new Error(`Payment ${transactionResult.status}`);
            }
        } catch (err: any) {
            console.error("Insurance payment failed:", err);
            toast({ variant: "destructive", title: "Payment Failed", description: err.message });
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
                                                {i.logoUrl && <Image src={i.logoUrl} alt="" width={16} height={16} className="inline-block mr-2 h-4 w-4 object-contain"/>}
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

                            {/* Conditionally show DOB input for specific insurers like LIC */}
                            {selectedInsurer === 'lic' && (
                                <div className="space-y-1">
                                    <Label htmlFor="dob">Date of Birth (for verification)</Label>
                                    <Input
                                        id="dob"
                                        type="date"
                                        value={dob}
                                        onChange={(e) => setDob(e.target.value)}
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
                                    disabled={isProcessing || !selectedInsurer || !identifier || !amount || Number(amount) <= 0}
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
