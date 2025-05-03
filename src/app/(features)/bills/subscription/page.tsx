
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Tv2, Loader2, Wallet, Info } from 'lucide-react'; // Use Tv2 or appropriate icon
import Link from 'next/link';
import { getBillers, Biller, processRecharge } from '@/services/recharge'; // Reuse recharge/biller service
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

// Mock Data (Replace with actual API calls/data)
interface SubscriptionPlan {
    id: string;
    name: string; // e.g., "Premium Monthly", "Mobile Annual"
    price: number;
    validity: string;
    description?: string;
}

const mockSubscriptionBillers: Biller[] = [
    { billerId: 'netflix', billerName: 'Netflix', billerType: 'Subscription', logoUrl: '/logos/netflix.png' },
    { billerId: 'hotstar', billerName: 'Disney+ Hotstar', billerType: 'Subscription', logoUrl: '/logos/hotstar.png' },
    { billerId: 'primevideo', billerName: 'Amazon Prime Video', billerType: 'Subscription', logoUrl: '/logos/primevideo.png' },
    { billerId: 'spotify', billerName: 'Spotify Premium', billerType: 'Subscription', logoUrl: '/logos/spotify.png' },
    { billerId: 'sony_liv', billerName: 'SonyLIV', billerType: 'Subscription', logoUrl: '/logos/sonyliv.png' },
];

const mockSubscriptionPlans: { [billerId: string]: SubscriptionPlan[] } = {
    'netflix': [
        { id: 'nflx-mob', name: 'Mobile', price: 149, validity: '1 Month', description: 'Watch on 1 mobile or tablet' },
        { id: 'nflx-bas', name: 'Basic', price: 199, validity: '1 Month', description: 'Watch on 1 device (HD)' },
        { id: 'nflx-std', name: 'Standard', price: 499, validity: '1 Month', description: 'Watch on 2 devices (Full HD)' },
        { id: 'nflx-prm', name: 'Premium', price: 649, validity: '1 Month', description: 'Watch on 4 devices (Ultra HD)' },
    ],
    'hotstar': [
        { id: 'hs-mob', name: 'Mobile', price: 499, validity: '1 Year', description: 'Mobile Only (Ads)' },
        { id: 'hs-sup', name: 'Super', price: 899, validity: '1 Year', description: 'All Content, 2 Devices (Ads)' },
        { id: 'hs-prm', name: 'Premium', price: 1499, validity: '1 Year', description: 'All Content, 4 Devices (Ad-free)' },
    ],
    'spotify': [
        { id: 'sp-prem-ind', name: 'Premium Individual', price: 119, validity: '1 Month' },
        { id: 'sp-prem-duo', name: 'Premium Duo', price: 149, validity: '1 Month', description: 'For 2 accounts' },
        { id: 'sp-prem-fam', name: 'Premium Family', price: 179, validity: '1 Month', description: 'For up to 6 accounts' },
        { id: 'sp-prem-stu', name: 'Premium Student', price: 59, validity: '1 Month' },
    ]
};

export default function SubscriptionPaymentPage() {
    const [billers, setBillers] = useState<Biller[]>([]);
    const [selectedBiller, setSelectedBiller] = useState<string>('');
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
    const [accountIdentifier, setAccountIdentifier] = useState(''); // e.g., Email or Mobile used for subscription
    const [amount, setAmount] = useState<string>('');
    const [isLoadingBillers, setIsLoadingBillers] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const plans = mockSubscriptionPlans[selectedBiller] || [];

    // Fetch Subscription Billers
    useEffect(() => {
        const fetchSubscriptionBillers = async () => {
            setIsLoadingBillers(true);
            setError(null);
            try {
                // Replace with actual API call if getBillers supports 'Subscription' type
                // const fetchedBillers = await getBillers('Subscription');
                await new Promise(resolve => setTimeout(resolve, 300)); // Simulate
                setBillers(mockSubscriptionBillers);
            } catch (err) {
                console.error("Failed to load subscription providers:", err);
                setError('Failed to load providers.');
                toast({ variant: "destructive", title: "Error Loading Providers" });
                setBillers(mockSubscriptionBillers); // Fallback mock data
            } finally {
                setIsLoadingBillers(false);
            }
        };
        fetchSubscriptionBillers();
    }, [toast]);

    useEffect(() => {
        // Reset plan and amount when biller changes
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
            // Use processRecharge, potentially passing a 'subscription' type if backend handles it
            // Or use a dedicated processSubscriptionPayment function if available
            const result = await processRecharge('subscription', accountIdentifier, Number(amount), selectedBiller, selectedPlan?.id);
            if (result.status === 'Completed') {
                toast({ title: "Payment Successful!", description: `${billerName} subscription renewed/paid for ${accountIdentifier}.` });
                // Reset form partially
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
                            {/* Provider Selection */}
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

                            {/* Account Identifier */}
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

                            {/* Plan Selection */}
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

                             {/* Amount Display (mostly from selected plan) */}
                             {selectedPlan && (
                                 <div className="space-y-1">
                                     <Label htmlFor="amount">Amount (₹)</Label>
                                     <div className="relative">
                                         <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                         <Input
                                             id="amount"
                                             type="number"
                                             value={amount}
                                             readOnly // Amount is usually fixed by plan
                                             className="pl-7 font-semibold bg-muted/50"
                                         />
                                     </div>
                                 </div>
                             )}
                             {/* Allow manual amount entry if NO plans are available */}
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

                             {/* Payment Button */}
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
