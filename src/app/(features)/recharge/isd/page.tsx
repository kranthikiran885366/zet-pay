
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, PhoneCall, Globe, Loader2, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import Image from 'next/image'; // If providers have logos

// Mock Data (Replace with actual API calls/data)
interface CallingCardProvider {
    id: string;
    name: string;
    logoUrl?: string;
}
const mockProviders: CallingCardProvider[] = [
    { id: 'reliance-global', name: 'Reliance Global Call', logoUrl: '/logos/reliance.png' },
    { id: 'tata-tele', name: 'Tata Tele Calling Card', logoUrl: '/logos/tata.png' },
    { id: 'matrix', name: 'Matrix Intl. SIM Card', logoUrl: '/logos/matrix.png' }, // Example SIM card top-up
];

interface CallingCardPlan {
    id: string;
    country: string;
    minutes: number | string; // Can be number or "Unlimited"
    price: number;
    validity: string;
}
const mockPlans: { [providerId: string]: CallingCardPlan[] } = {
    'reliance-global': [
        { id: 'rg-us-100', country: 'USA/Canada', minutes: 1000, price: 500, validity: '30 Days' },
        { id: 'rg-uk-500', country: 'UK', minutes: 500, price: 600, validity: '30 Days' },
        { id: 'rg-uae-200', country: 'UAE', minutes: 200, price: 750, validity: '30 Days' },
    ],
    'tata-tele': [
        { id: 'tt-global-basic', country: 'Global Pack', minutes: 300, price: 400, validity: '28 Days' },
        { id: 'tt-aus-nz-500', country: 'Australia/NZ', minutes: 500, price: 800, validity: '30 Days' },
    ],
    'matrix': [ // Example for SIM top-up
        { id: 'matrix-topup-10', country: 'Global Top-up', minutes: '$10 Value', price: 850, validity: 'N/A' },
        { id: 'matrix-topup-25', country: 'Global Top-up', minutes: '$25 Value', price: 2100, validity: 'N/A' },
    ],
};

export default function IntlCallingRechargePage() {
    const [selectedProvider, setSelectedProvider] = useState<string>('');
    const [accountNumber, setAccountNumber] = useState(''); // Card number or registered mobile
    const [amount, setAmount] = useState<string>('');
    const [selectedPlan, setSelectedPlan] = useState<CallingCardPlan | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const plans = mockPlans[selectedProvider] || [];

    const handlePlanSelect = (plan: CallingCardPlan) => {
        setSelectedPlan(plan);
        setAmount(plan.price.toString());
    };

    const handleRecharge = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProvider || !accountNumber || !amount || Number(amount) <= 0) {
            toast({ variant: "destructive", title: "Missing Information" });
            return;
        }
        setIsProcessing(true);
        console.log("Processing Intl Calling Recharge:", { provider: selectedProvider, account: accountNumber, amount });
        try {
            // Simulate API call (replace with actual)
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast({ title: "Recharge Successful!", description: `Your calling card ${accountNumber} has been recharged with ₹${amount}.` });
            setAccountNumber('');
            setAmount('');
            setSelectedPlan(null);
        } catch (err) {
            console.error("Intl calling recharge failed:", err);
            toast({ variant: "destructive", title: "Recharge Failed" });
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
                <PhoneCall className="h-6 w-6" />
                <h1 className="text-lg font-semibold">International Calling Cards</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Recharge Calling Card</CardTitle>
                        <CardDescription>Select provider and top-up your international calling card.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRecharge} className="space-y-4">
                            {/* Provider Selection */}
                            <div className="space-y-1">
                                <Label htmlFor="provider">Provider</Label>
                                <Select value={selectedProvider} onValueChange={setSelectedProvider} required>
                                    <SelectTrigger id="provider">
                                        <SelectValue placeholder="Select Provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mockProviders.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.logoUrl && <Image src={p.logoUrl} alt="" width={16} height={16} className="inline-block mr-2 h-4 w-4 object-contain"/>}
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Account/Card Number */}
                            <div className="space-y-1">
                                <Label htmlFor="accountNumber">Calling Card Number / Registered Mobile</Label>
                                <Input
                                    id="accountNumber"
                                    type="text"
                                    placeholder="Enter Number"
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Plans (if available) */}
                            {selectedProvider && plans.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <Label>Select Plan/Pack</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-2">
                                        {plans.map(plan => (
                                            <Card
                                                key={plan.id}
                                                className={`p-3 cursor-pointer hover:border-primary ${selectedPlan?.id === plan.id ? 'border-primary ring-1 ring-primary' : ''}`}
                                                onClick={() => handlePlanSelect(plan)}
                                            >
                                                <p className="font-semibold">₹{plan.price} - {plan.country}</p>
                                                <p className="text-xs text-muted-foreground">{plan.minutes} Minutes</p>
                                                <p className="text-xs mt-1">Validity: {plan.validity}</p>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Amount Input */}
                            <div className="space-y-1">
                                <Label htmlFor="amount">Top-up Amount (₹)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder="Enter Amount"
                                        value={amount}
                                        onChange={(e) => { setAmount(e.target.value); setSelectedPlan(null); }}
                                        required
                                        min="100" // Example min amount
                                        step="1"
                                        className="pl-7"
                                    />
                                </div>
                            </div>

                            {/* Payment Button */}
                            <div className="pt-4">
                                <Separator className="mb-4"/>
                                <Button
                                    type="submit"
                                    className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                    disabled={isProcessing || !selectedProvider || !accountNumber || !amount || Number(amount) <= 0}
                                >
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    {isProcessing ? 'Processing...' : `Recharge Card`}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
