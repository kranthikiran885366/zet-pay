
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Power, Loader2, Wallet, Info } from 'lucide-react';
import Link from 'next/link';
import { getBillers, Biller, processRecharge } from '@/services/recharge'; // Reuse recharge service
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

export default function PrepaidElectricityRechargePage() {
    const [providers, setProviders] = useState<Biller[]>([]);
    const [selectedProvider, setSelectedProvider] = useState<string>('');
    const [consumerNumber, setConsumerNumber] = useState('');
    const [amount, setAmount] = useState<string>('');
    const [isLoadingProviders, setIsLoadingProviders] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(error);
    const { toast } = useToast();

    // Fetch Electricity Providers (assuming a specific type like 'PrepaidElectricity')
    useEffect(() => {
        const fetchProviders = async () => {
            setIsLoadingProviders(true);
            setError(null);
            try {
                // Use 'Electricity' type, backend might need to differentiate prepaid/postpaid
                // Or use a specific type like 'PrepaidElectricity' if API supports it
                const fetchedProviders = await getBillers('Electricity');
                setProviders(fetchedProviders.length > 0 ? fetchedProviders : [ // Mock data if API is empty
                     { billerId: 'mock-prepaid-bescom', billerName: 'BESCOM Prepaid (Mock)', billerType: 'Electricity' },
                     { billerId: 'mock-prepaid-tneb', billerName: 'TNEB Prepaid (Mock)', billerType: 'Electricity' },
                ]);
            } catch (err) {
                console.error("Failed to load electricity providers:", err);
                setError('Failed to load providers.');
                toast({ variant: "destructive", title: "Error Loading Providers" });
                 // Fallback mock data
                 setProviders([
                    { billerId: 'mock-prepaid-bescom', billerName: 'BESCOM Prepaid (Mock)', billerType: 'Electricity' },
                    { billerId: 'mock-prepaid-tneb', billerName: 'TNEB Prepaid (Mock)', billerType: 'Electricity' },
                 ]);
            } finally {
                setIsLoadingProviders(false);
            }
        };
        fetchProviders();
    }, [toast]);

    const handleRecharge = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!selectedProvider || !consumerNumber || !amount || Number(amount) <= 0) {
            setError("Please select provider, enter consumer number, and a valid amount.");
            toast({ variant: "destructive", title: "Missing Information" });
            return;
        }
        setIsProcessing(true);
        try {
            // Use 'electricity' type, backend might differentiate based on billerId or other params
            const result = await processRecharge('electricity', consumerNumber, Number(amount), selectedProvider);
            if (result.status === 'Completed') {
                toast({ title: "Recharge Successful!", description: `Prepaid electricity for ${consumerNumber} recharged with ₹${amount}.` });
                // Reset form
                setConsumerNumber('');
                setAmount('');
            } else {
                throw new Error(`Recharge ${result.status}`);
            }
        } catch (err: any) {
            console.error("Prepaid electricity recharge failed:", err);
            setError(err.message || "Recharge failed.");
            toast({ variant: "destructive", title: "Recharge Failed", description: err.message });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/services" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Power className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Prepaid Electricity</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Recharge Prepaid Meter</CardTitle>
                        <CardDescription>Select your electricity provider and enter details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRecharge} className="space-y-4">
                            {/* Provider Selection */}
                            <div className="space-y-1">
                                <Label htmlFor="provider">Electricity Provider</Label>
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
                                {error && !isLoadingProviders && <p className="text-xs text-destructive mt-1">{error}</p>}
                            </div>

                            {/* Consumer Number Input */}
                            <div className="space-y-1">
                                <Label htmlFor="consumerNumber">Consumer Number / Meter Number</Label>
                                <Input
                                    id="consumerNumber"
                                    type="text"
                                    placeholder="Enter Number"
                                    value={consumerNumber}
                                    onChange={(e) => setConsumerNumber(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Amount Input */}
                            <div className="space-y-1">
                                <Label htmlFor="amount">Recharge Amount (₹)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder="Enter Amount"
                                        value={amount}
                                        onChange={(e) => { setAmount(e.target.value); }}
                                        required
                                        min="50" // Example min amount
                                        step="1"
                                        className="pl-7"
                                    />
                                </div>
                            </div>

                            {error && <p className="text-sm text-destructive mt-2">{error}</p>}

                             {/* Payment Button */}
                            <div className="pt-4">
                                <Separator className="mb-4"/>
                                <Button
                                    type="submit"
                                    className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                    disabled={isProcessing || !selectedProvider || !consumerNumber || !amount || Number(amount) <= 0}
                                >
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    {isProcessing ? 'Processing...' : `Recharge Meter`}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
