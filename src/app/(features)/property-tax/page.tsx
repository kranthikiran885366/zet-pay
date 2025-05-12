
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Home, Loader2, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { processBillPayment } from '@/services/bills';
import { mockMunicipalitiesData, Municipality } from '@/mock-data'; // Import centralized mock data

export default function PropertyTaxPage() {
    const [municipalities, setMunicipalities] = useState<Municipality[]>(mockMunicipalitiesData);
    const [selectedMunicipality, setSelectedMunicipality] = useState<string>('');
    const [propertyId, setPropertyId] = useState('');
    const [assessmentYear, setAssessmentYear] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMunicipality || !propertyId || !assessmentYear || !amount || Number(amount) <= 0) {
            toast({ variant: "destructive", title: "Missing Information" });
            return;
        }
        setIsProcessing(true);
        const municipalityName = municipalities.find(m => m.id === selectedMunicipality)?.name || 'Property Tax';
        try {
            const paymentDetails = {
                billerId: selectedMunicipality,
                identifier: propertyId,
                amount: Number(amount),
                billerType: 'Property Tax',
                billerName: `${municipalityName} (${assessmentYear})`,
            };
            const transactionResult = await processBillPayment(paymentDetails);

            if (transactionResult.status === 'Completed') {
                toast({ title: "Payment Successful!", description: `Property tax of ₹${amount} paid for ${propertyId} (${assessmentYear}).` });
                setPropertyId('');
                setAmount('');
                setAssessmentYear('');
            } else {
                throw new Error(`Payment ${transactionResult.status}`);
            }
        } catch (err: any) {
            console.error("Property tax payment failed:", err);
            toast({ variant: "destructive", title: "Payment Failed", description: err.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const currentYear = new Date().getFullYear();
    const assessmentYears = Array.from({ length: 3 }, (_, i) => `${currentYear - i}-${currentYear - i + 1}`);

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/services" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Home className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Property Tax</h1>
            </header>

            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Pay Property Tax</CardTitle>
                        <CardDescription>Select your municipality and enter property details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePayment} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="municipality">Select Municipality / Corporation</Label>
                                <Select value={selectedMunicipality} onValueChange={setSelectedMunicipality} required disabled={isLoading}>
                                    <SelectTrigger id="municipality">
                                        <SelectValue placeholder={isLoading ? "Loading..." : "Select Municipality"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {municipalities.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="propertyId">Property ID / SAS Application No.</Label>
                                <Input
                                    id="propertyId"
                                    type="text"
                                    placeholder="Enter Property Identifier"
                                    value={propertyId}
                                    onChange={(e) => setPropertyId(e.target.value)}
                                    required
                                />
                            </div>

                             <div className="space-y-1">
                                <Label htmlFor="assessmentYear">Assessment Year</Label>
                                <Select value={assessmentYear} onValueChange={setAssessmentYear} required>
                                    <SelectTrigger id="assessmentYear">
                                        <SelectValue placeholder="Select Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assessmentYears.map((year) => (
                                            <SelectItem key={year} value={year}>{year}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="amount">Tax Amount (₹)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder="Enter Tax Amount Due"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        required
                                        min="1"
                                        step="0.01"
                                        className="pl-7"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Enter the exact amount from your tax notice.</p>
                            </div>

                            <div className="pt-4">
                                <Separator className="mb-4"/>
                                <Button
                                    type="submit"
                                    className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                    disabled={isProcessing || !selectedMunicipality || !propertyId || !assessmentYear || !amount || Number(amount) <= 0}
                                >
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    {isProcessing ? 'Processing...' : `Pay Property Tax`}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
