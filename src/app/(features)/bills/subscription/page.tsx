
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Tv2, Loader2, Wallet, Info } from 'lucide-react';
import Link from 'next/link';
import { getBillers, Biller, processRecharge } from '@/services/recharge';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { mockSubscriptionBillersData, mockSubscriptionPlansData, SubscriptionPlan } from '@/mock-data'; // Import centralized mock data

export default function SubscriptionPaymentPage() {
    const [billers, setBillers] = useState<Biller[]>([]);
    const [selectedBiller, setSelectedBiller] = useState<string>('');
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
    const [accountIdentifier, setAccountIdentifier] = useState('');
    const [amount, setAmount] = useState<string>('');
    const [isLoadingBillers, setIsLoadingBillers] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const plans = mockSubscriptionPlansData[selectedBiller] || [];

    useEffect(() => {
        const fetchSubscriptionBillers = async () => {
            setIsLoadingBillers(true);
            setError(null);
            try {
                await new Promise(resolve => setTimeout(resolve, 300));
                setBillers(mockSubscriptionBillersData);
            } catch (err) {
                console.error("Failed to load subscription providers:", err);
                setError('Failed to load providers.');
                toast({ variant: "destructive", title: "Error Loading Providers" });
                setBillers(mockSubscriptionBillersData);
            } finally {
                setIsLoadingBillers(false);
            }
        };
        fetchSubscriptionBillers();
    }, [toast]);

    useEffect(() => {
        setSelectedPlan(null);
        setAmount('');
    }, [selectedBiller]);

    const handlePlanSelect = (plan: SubscriptionPlan) => {
        setSelectedPlan(plan);
        setAmount(plan.price.toString());
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!selectedBiller || !accountIdentifier || !amount || Number(amount) <= 0) {
            setError("Please select provider, enter account identifier, and select a plan/amount.");
            toast({ variant: "destructive", title: "Missing Information" });
            return;
        }
        setIsProcessing(true);
        const billerName = billers.find(b => b.billerId === selectedBiller)?.billerName || 'Subscription';
        try {
            const result = await processRecharge('subscription', accountIdentifier, Number(amount), selectedBiller, selectedPlan?.id);
            if (result.status === 'Completed') {
                toast({ title: "Payment Successful!", description: `${billerName} subscription renewed/paid for ${accountIdentifier}.` });
                setAccountIdentifier('');
                setAmount('');
                setSelectedPlan(null);
            } else {
                throw new Error(`Payment ${result.status}`);
            }
        } catch (err: any) {
            console.error("Subscription payment failed:", err);
            setError(err.message || "Payment failed.");
            toast({ variant: "destructive", title: "Payment Failed", description: err.message });
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
                <Tv2 className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Subscription Services</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Pay for Subscriptions</CardTitle>
                        <CardDescription>Renew your OTT, music, or other subscriptions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePayment} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="provider">Service Provider</Label>
                                <Select value={selectedBiller} onValueChange={setSelectedBiller} required disabled={isLoadingBillers}>
                                    <SelectTrigger id="provider">
                                        <SelectValue placeholder={isLoadingBillers ? "Loading..." : "Select Service"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {billers.map((p) => (
                                            <SelectItem key={p.billerId} value={p.billerId}>
                                                {p.logoUrl && <Image src={p.logoUrl} alt="" width={16} height={16} className="inline-block mr-2 h-4 w-4 object-contain"/>}
                                                {p.billerName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {error && !isLoadingBillers && <p className="text-xs text-destructive mt-1">{error}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="accountIdentifier">Account Email / Mobile Number</Label>
                                <Input
                                    id="accountIdentifier"
                                    type="text"
                                    placeholder="Enter email or mobile linked to subscription"
                                    value={accountIdentifier}
                                    onChange={(e) => setAccountIdentifier(e.target.value)}
                                    required
                                />
                            </div>

                            {selectedBiller && plans.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <Label>Select Subscription Plan</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-2">
                                        {plans.map(plan => (
                                            <Card
                                                key={plan.id}
                                                className={`p-3 cursor-pointer hover:border-primary ${selectedPlan?.id === plan.id ? 'border-primary ring-1 ring-primary' : ''}`}
                                                onClick={() => handlePlanSelect(plan)}
                                            >
                                                <p className="font-semibold">{plan.name} - ₹{plan.price}</p>
                                                <p className="text-xs text-muted-foreground">{plan.description || `Validity: ${plan.validity}`}</p>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                             {selectedPlan && (
                                 <div className="space-y-1">
                                     <Label htmlFor="amount">Amount (₹)</Label>
                                     <div className="relative">
                                         <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                         <Input
                                             id="amount"
                                             type="number"
                                             value={amount}
                                             readOnly
                                             className="pl-7 font-semibold bg-muted/50"
                                         />
                                     </div>
                                 </div>
                             )}
                             {selectedBiller && plans.length === 0 && (
                                 <div className="space-y-1">
                                     <Label htmlFor="amount-manual">Payment Amount (₹)</Label>
                                     <div className="relative">
                                         <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                         <Input
                                             id="amount-manual"
                                             type="number"
                                             placeholder="Enter Amount"
                                             value={amount}
                                             onChange={(e) => { setAmount(e.target.value); setSelectedPlan(null); }}
                                             required
                                             min="1"
                                             step="0.01"
                                             className="pl-7"
                                         />
                                     </div>
                                 </div>
                             )}

                            {error && <p className="text-sm text-destructive mt-2">{error}</p>}

                            <div className="pt-4">
                                <Separator className="mb-4"/>
                                <Button
                                    type="submit"
                                    className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                    disabled={isProcessing || !selectedBiller || !accountIdentifier || !amount || Number(amount) <= 0}
                                >
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    {isProcessing ? 'Processing...' : `Pay for Subscription`}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
