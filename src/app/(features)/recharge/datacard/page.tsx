
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, HardDrive, Loader2, Search, Wallet } from 'lucide-react';
import Link from 'next/link';
import { getBillers, Biller, RechargePlan, processRecharge } from '@/services/recharge';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge'; // Added Badge
import { mockBillersData, mockDataCardPlansData } from '@/mock-data'; // Import centralized mock data

export default function DataCardRechargePage() {
    const [operators, setOperators] = useState<Biller[]>([]);
    const [selectedOperator, setSelectedOperator] = useState<string>('');
    const [selectedOperatorName, setSelectedOperatorName] = useState<string>('');
    const [dataCardNumber, setDataCardNumber] = useState('');
    const [amount, setAmount] = useState<string>('');
    const [isLoadingOperators, setIsLoadingOperators] = useState(false);
    const [isLoadingPlans, setIsLoadingPlans] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [plans, setPlans] = useState<RechargePlan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<RechargePlan | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const fetchOperators = async () => {
            setIsLoadingOperators(true);
            try {
                const fetchedOperators = await getBillers('Datacard');
                setOperators(fetchedOperators.length > 0 ? fetchedOperators : (mockBillersData['Datacard'] || []));
            } catch (err) {
                console.error("Failed to load data card operators:", err);
                setError('Failed to load operators.');
                toast({ variant: "destructive", title: "Error Loading Operators" });
                 setOperators(mockBillersData['Datacard'] || []);
            } finally {
                setIsLoadingOperators(false);
            }
        };
        fetchOperators();
    }, [toast]);

    useEffect(() => {
        if (selectedOperator) {
            const operator = operators.find(op => op.billerId === selectedOperator);
            setSelectedOperatorName(operator?.billerName || '');
            fetchPlans(selectedOperator);
        } else {
            setPlans([]);
            setSelectedPlan(null);
            setAmount('');
            setSelectedOperatorName('');
        }
    }, [selectedOperator, operators]);

    const fetchPlans = async (operatorId: string) => {
        setIsLoadingPlans(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            setPlans(mockDataCardPlansData);
        } catch (err) {
            console.error(`Failed to load plans for ${operatorId}:`, err);
            toast({ variant: "destructive", title: "Could not load plans" });
            setPlans([]);
        } finally {
            setIsLoadingPlans(false);
        }
    };

    const handlePlanSelect = (plan: RechargePlan) => {
        setAmount(plan.price.toString());
        setSelectedPlan(plan);
    };

    const handleRecharge = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!selectedOperator || !dataCardNumber || !amount || Number(amount) <= 0) {
            setError("Please fill all fields with valid values.");
            toast({ variant: "destructive", title: "Missing Information" });
            return;
        }
        setIsProcessing(true);
        try {
            const result = await processRecharge('datacard', dataCardNumber, Number(amount), selectedOperator, selectedPlan?.planId);
            if (result.status === 'Completed') {
                toast({ title: "Recharge Successful!", description: `Data Card ${dataCardNumber} recharged with ₹${amount}.` });
                setDataCardNumber('');
                setAmount('');
                setSelectedPlan(null);
            } else {
                throw new Error(`Recharge ${result.status}`);
            }
        } catch (err: any) {
            console.error("Data card recharge failed:", err);
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
                <HardDrive className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Data Card Recharge</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Recharge Data Card</CardTitle>
                        <CardDescription>Enter details for your prepaid data card or dongle.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRecharge} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="operator">Operator</Label>
                                <Select value={selectedOperator} onValueChange={setSelectedOperator} required disabled={isLoadingOperators}>
                                    <SelectTrigger id="operator">
                                        <SelectValue placeholder={isLoadingOperators ? "Loading..." : "Select Operator"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {operators.map((op) => (
                                            <SelectItem key={op.billerId} value={op.billerId}>
                                                {op.logoUrl && <Image src={op.logoUrl} alt="" width={16} height={16} className="inline-block mr-2 h-4 w-4 object-contain"/>}
                                                {op.billerName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {error && !isLoadingOperators && <p className="text-xs text-destructive mt-1">{error}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="dataCardNumber">Data Card Number / Registered Mobile</Label>
                                <Input
                                    id="dataCardNumber"
                                    type="text"
                                    placeholder="Enter Number"
                                    value={dataCardNumber}
                                    onChange={(e) => setDataCardNumber(e.target.value)}
                                    required
                                />
                            </div>

                             {selectedOperator && (
                                <div className="space-y-2 pt-2">
                                    <Label>Select Plan</Label>
                                    {isLoadingPlans && <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading plans...</div>}
                                    {!isLoadingPlans && plans.length === 0 && <p className="text-sm text-muted-foreground">No plans found for {selectedOperatorName}. Enter amount manually.</p>}
                                    {!isLoadingPlans && plans.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-2">
                                            {plans.map(plan => (
                                                <Card
                                                    key={plan.planId}
                                                    className={`p-3 cursor-pointer hover:border-primary ${selectedPlan?.planId === plan.planId ? 'border-primary ring-1 ring-primary' : ''}`}
                                                    onClick={() => handlePlanSelect(plan)}
                                                >
                                                    <p className="font-semibold">₹{plan.price}</p>
                                                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                                                    <p className="text-xs mt-1">Validity: {plan.validity}</p>
                                                     {plan.isOffer && <Badge variant="destructive" className="mt-1 text-xs">Offer</Badge>}
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>
                             )}

                            <div className="space-y-1">
                                <Label htmlFor="amount">Recharge Amount (₹)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder="Enter Amount"
                                        value={amount}
                                        onChange={(e) => { setAmount(e.target.value); setSelectedPlan(null); }}
                                        required
                                        min="10"
                                        step="1"
                                        className="pl-7"
                                    />
                                </div>
                            </div>

                            {error && <p className="text-sm text-destructive mt-2">{error}</p>}

                            <div className="pt-4">
                                <Separator className="mb-4"/>
                                <Button
                                    type="submit"
                                    className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                    disabled={isProcessing || !selectedOperator || !dataCardNumber || !amount || Number(amount) <= 0}
                                >
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    {isProcessing ? 'Processing...' : `Recharge Data Card`}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
