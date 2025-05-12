
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Tv2, Loader2, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { processBillPayment } from '@/services/bills';
import { mockCableProvidersData } from '@/mock-data'; // Import centralized mock data
import type { Biller } from '@/services/recharge'; // For Biller type consistency

export default function CableTvPage() {
    const [providers, setProviders] = useState<Biller[]>([]);
    const [selectedProvider, setSelectedProvider] = useState<string>('');
    const [accountNumber, setAccountNumber] = useState('');
    const [amount, setAmount] = useState<string>('');
    const [isLoadingProviders, setIsLoadingProviders] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchProviders = async () => {
            setIsLoadingProviders(true);
            try {
                await new Promise(resolve => setTimeout(resolve, 500));
                setProviders(mockCableProvidersData);
            } catch (err) {
                console.error("Failed to load cable providers:", err);
                toast({ variant: "destructive", title: "Error Loading Providers" });
                setProviders(mockCableProvidersData);
            } finally {
                setIsLoadingProviders(false);
            }
        };
        fetchProviders();
    }, [toast]);

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProvider || !accountNumber || !amount || Number(amount) <= 0) {
            toast({ variant: "destructive", title: "Missing Information" });
            return;
        }
        setIsProcessing(true);
        const providerName = providers.find(p => p.billerId === selectedProvider)?.billerName || 'Cable TV';
        try {
            const paymentDetails = {
                billerId: selectedProvider,
                identifier: accountNumber,
                amount: Number(amount),
                billerType: 'Cable TV',
                billerName: providerName,
            };
            const transactionResult = await processBillPayment(paymentDetails);

            if (transactionResult.status === 'Completed') {
                toast({ title: "Payment Successful!", description: `₹${amount} paid for ${providerName} (Account: ${accountNumber}).` });
                setAccountNumber('');
                setAmount('');
            } else {
                throw new Error(`Payment ${transactionResult.status}`);
            }
        } catch (err: any) {
            console.error("Cable TV payment failed:", err);
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
                <Tv2 className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Cable TV Bill</h1>
            </header>

            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Pay Your Cable Bill</CardTitle>
                        <CardDescription>Select your provider and enter account details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePayment} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="provider">Cable Provider</Label>
                                <Select value={selectedProvider} onValueChange={setSelectedProvider} required disabled={isLoadingProviders}>
                                    <SelectTrigger id="provider">
                                        <SelectValue placeholder={isLoadingProviders ? "Loading..." : "Select Provider"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {providers.map((p) => (
                                            <SelectItem key={p.billerId} value={p.billerId}>
                                                {p.logoUrl && <Image src={p.logoUrl} alt="" width={16} height={16} className="inline-block mr-2 h-4 w-4 object-contain"/>}
                                                {p.billerName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="accountNumber">Account Number / VC Number</Label>
                                <Input
                                    id="accountNumber"
                                    type="text"
                                    placeholder="Enter Account/VC Number"
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
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
                                        placeholder="Enter Bill Amount"
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
                                    disabled={isProcessing || !selectedProvider || !accountNumber || !amount || Number(amount) <= 0}
                                >
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    {isProcessing ? 'Processing...' : `Pay Cable Bill`}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
