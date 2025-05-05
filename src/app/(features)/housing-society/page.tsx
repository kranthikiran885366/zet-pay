'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building, Loader2, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { processBillPayment } from '@/services/bills'; // Use bill payment service

// Mock Data (Replace with actual API calls/data)
interface HousingSociety {
    id: string;
    name: string;
    city: string;
}
const mockSocieties: HousingSociety[] = [
    { id: 'soc1', name: 'Prestige Lakeside Habitat', city: 'Bangalore' },
    { id: 'soc2', name: 'DLF Park Place', city: 'Gurgaon' },
    { id: 'soc3', name: 'Hiranandani Gardens', city: 'Mumbai' },
    { id: 'soc4', name: 'My Home Bhooja', city: 'Hyderabad' },
];

export default function HousingSocietyPage() {
    const [societies, setSocieties] = useState<HousingSociety[]>(mockSocieties);
    const [selectedSociety, setSelectedSociety] = useState<string>('');
    const [flatNumber, setFlatNumber] = useState('');
    const [amount, setAmount] = useState<string>('');
    const [isLoadingSocieties, setIsLoadingSocieties] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    // useEffect(() => {
    //     // Fetch actual list of societies if API exists
    // }, []);

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSociety || !flatNumber || !amount || Number(amount) <= 0) {
            toast({ variant: "destructive", title: "Missing Information" });
            return;
        }
        setIsProcessing(true);
        const societyName = societies.find(s => s.id === selectedSociety)?.name || 'Society Dues';
        try {
            const paymentDetails = {
                billerId: selectedSociety,
                identifier: flatNumber, // Use flat number as identifier
                amount: Number(amount),
                billerType: 'Housing Society', // Define a specific type
                billerName: societyName,
            };
            const transactionResult = await processBillPayment(paymentDetails);

            if (transactionResult.status === 'Completed') {
                toast({ title: "Payment Successful!", description: `₹${amount} paid for ${societyName} (Flat: ${flatNumber}).` });
                setFlatNumber('');
                setAmount('');
            } else {
                throw new Error(`Payment ${transactionResult.status}`);
            }
        } catch (err: any) {
            console.error("Housing society payment failed:", err);
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
                <Building className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Housing Society Dues</h1>
            </header>

            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Pay Society Maintenance</CardTitle>
                        <CardDescription>Select your housing society and flat details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePayment} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="society">Select Housing Society</Label>
                                <Select value={selectedSociety} onValueChange={setSelectedSociety} required disabled={isLoadingSocieties}>
                                    <SelectTrigger id="society">
                                        <SelectValue placeholder={isLoadingSocieties ? "Loading..." : "Select Society"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {societies.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name} - {s.city}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="flatNumber">Flat / House Number</Label>
                                <Input
                                    id="flatNumber"
                                    type="text"
                                    placeholder="Enter Flat/House Number"
                                    value={flatNumber}
                                    onChange={(e) => setFlatNumber(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="amount">Amount (₹)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder="Enter Amount Due"
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
                                    disabled={isProcessing || !selectedSociety || !flatNumber || !amount || Number(amount) <= 0}
                                >
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    {isProcessing ? 'Processing...' : `Pay Society Dues`}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
