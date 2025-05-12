
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TramFront, Wallet, Loader2, Info } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge'; // Import Badge
import { cn } from '@/lib/utils'; // Import cn utility
import { mockMetroSystemsData, mockMetroRechargeOptionsData, MetroRechargeOption } from '@/mock-data'; // Import centralized mock data


export default function MetroRechargePage() {
    const [selectedMetroId, setSelectedMetroId] = useState<string>('');
    const [cardNumber, setCardNumber] = useState('');
    const [currentBalance, setCurrentBalance] = useState<number | null>(null);
    const [isFetchingBalance, setIsFetchingBalance] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const selectedMetro = mockMetroSystemsData.find(m => m.id === selectedMetroId);
    const rechargeOptions = selectedMetro ? (mockMetroRechargeOptionsData[selectedMetro.id] || []) : [];

    const handleMetroChange = (metroId: string) => {
        setSelectedMetroId(metroId);
        setCardNumber('');
        setCurrentBalance(null);
        setRechargeAmount('');
    };

    const handleFetchBalance = async () => {
        if (!selectedMetro || !cardNumber) {
            toast({ variant: "destructive", title: "Missing Details", description: `Please enter the ${selectedMetro?.cardLabel || 'Card Number'}.` });
            return;
        }
         if (!selectedMetro.requiresFetch) {
            toast({ description: "Balance check not supported for this Metro. Please proceed with recharge." });
            return;
        }
        setIsFetchingBalance(true);
        setCurrentBalance(null);
        console.log("Fetching balance for:", selectedMetro.name, cardNumber);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const balance = Math.floor(Math.random() * 500) + 50;
            setCurrentBalance(balance);
            toast({ title: "Balance Fetched", description: `Current balance: ₹${balance.toFixed(2)}` });
        } catch (error) {
            console.error("Balance fetch failed:", error);
            toast({ variant: "destructive", title: "Balance Fetch Failed", description: "Could not fetch current balance." });
        } finally {
            setIsFetchingBalance(false);
        }
    };

    const handleSelectRechargeOption = (amount: number) => {
        setRechargeAmount(amount.toString());
    };

    const handleRecharge = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMetro || !cardNumber || !rechargeAmount || Number(rechargeAmount) <= 0) {
            toast({ variant: "destructive", title: "Invalid Input", description: `Please select Metro, enter ${selectedMetro?.cardLabel || 'Card Number'}, and enter/select a valid amount.` });
            return;
        }
        setIsProcessing(true);
        console.log("Processing Metro Recharge:", { metro: selectedMetro.name, card: cardNumber, amount: rechargeAmount });
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            toast({ title: "Recharge Successful!", description: `₹${rechargeAmount} added to your ${selectedMetro.name} card.` });
            setCardNumber('');
            setCurrentBalance(null);
            setRechargeAmount('');
        } catch (error) {
            console.error("Metro recharge failed:", error);
            toast({ variant: "destructive", title: "Recharge Failed", description: "Could not complete the recharge." });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <TramFront className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Metro Recharge</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Recharge Metro Card</CardTitle>
                        <CardDescription>Select your city's Metro and enter card details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRecharge} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="metroSystem">Select Metro</Label>
                                <Select value={selectedMetroId} onValueChange={handleMetroChange} required>
                                    <SelectTrigger id="metroSystem">
                                        <SelectValue placeholder="Select Metro System" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mockMetroSystemsData.map(metro => (
                                            <SelectItem key={metro.id} value={metro.id}>
                                                 {metro.logoUrl && <Image src={metro.logoUrl} alt="" width={16} height={16} className="inline-block mr-2 h-4 w-4 object-contain" />}
                                                {metro.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedMetro && (
                                <div className="space-y-1">
                                    <Label htmlFor="cardNumber">{selectedMetro.cardLabel}</Label>
                                    <div className="flex gap-2">
                                         <Input
                                            id="cardNumber"
                                            type="text"
                                            placeholder={selectedMetro.cardPlaceholder}
                                            value={cardNumber}
                                            onChange={(e) => setCardNumber(e.target.value)}
                                            required
                                            className="flex-grow"
                                        />
                                        {selectedMetro.requiresFetch && (
                                             <Button type="button" variant="outline" onClick={handleFetchBalance} disabled={isFetchingBalance || !cardNumber}>
                                                {isFetchingBalance ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check Balance"}
                                            </Button>
                                        )}
                                    </div>
                                     {currentBalance !== null && (
                                        <p className="text-sm text-muted-foreground mt-1">Current Balance: ₹{currentBalance.toFixed(2)}</p>
                                    )}
                                </div>
                            )}

                             {selectedMetro && cardNumber && (
                                <div className="space-y-2 pt-2">
                                    <Label>Select Recharge Amount</Label>
                                    <div className="flex flex-wrap gap-2">
                                         {rechargeOptions.map(option => (
                                            <Button
                                                key={option.id}
                                                type="button"
                                                variant={rechargeAmount === option.amount.toString() ? "default" : "outline"}
                                                onClick={() => handleSelectRechargeOption(option.amount)}
                                                className={cn("h-auto p-2 flex flex-col", option.isPopular && "border-primary")}
                                            >
                                                <span className="font-semibold">₹{option.amount}</span>
                                                 {option.description && <span className="text-xs text-muted-foreground">{option.description}</span>}
                                                  {option.isPopular && <Badge variant="secondary" className="text-[10px] mt-1 bg-primary/10 text-primary border-none px-1 py-0">Popular</Badge>}
                                            </Button>
                                        ))}
                                    </div>
                                    <div className="relative pt-2">
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground -mt-[-5px]">₹</span>
                                        <Input
                                            id="rechargeAmount"
                                            type="number"
                                            placeholder="Or enter amount"
                                            value={rechargeAmount}
                                            onChange={(e) => setRechargeAmount(e.target.value)}
                                            required
                                            min="1"
                                            step="1"
                                            className="pl-7"
                                        />
                                     </div>
                                </div>
                            )}

                             {selectedMetro && cardNumber && rechargeAmount && (
                                <div className="space-y-4 pt-4">
                                    <Separator/>
                                     <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Amount to Recharge:</span>
                                        <span className="font-bold text-lg">₹{Number(rechargeAmount).toFixed(2)}</span>
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                        disabled={isProcessing || !selectedMetro || !cardNumber || !rechargeAmount || Number(rechargeAmount) <= 0}
                                    >
                                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                        {isProcessing ? 'Processing...' : `Recharge Card`}
                                    </Button>
                                </div>
                             )}
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
