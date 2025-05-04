'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Wallet, Loader2, Info, Plus, Minus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLinkedAccounts, BankAccount } from '@/services/upi'; // For funding source
import { getUpiLiteBalance, topUpUpiLite, disableUpiLite, UpiLiteDetails } from '@/services/upiLite'; // Use new service

export default function UpiLitePage() {
    const [liteDetails, setLiteDetails] = useState<UpiLiteDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false); // For top-up/disable actions
    const [topUpAmount, setTopUpAmount] = useState<string>('');
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [fundingSourceUpiId, setFundingSourceUpiId] = useState<string>('');
    const { toast } = useToast();

    // Fetch UPI Lite details on mount
    useEffect(() => {
        const fetchDetails = async () => {
            setIsLoading(true);
            try {
                const details = await getUpiLiteBalance();
                setLiteDetails(details);
                 // Fetch linked accounts only if Lite is enabled or potentially for enabling
                if (details.isEnabled || true) {
                    const userAccounts = await getLinkedAccounts();
                    setAccounts(userAccounts);
                    const defaultAccount = userAccounts.find(acc => acc.isDefault);
                    setFundingSourceUpiId(defaultAccount?.upiId || userAccounts[0]?.upiId || '');
                }
            } catch (error) {
                console.error("Failed to fetch UPI Lite details:", error);
                toast({ variant: "destructive", title: "Error", description: "Could not load UPI Lite information." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetails();
    }, [toast]);

    const handleTopUp = async () => {
        if (!topUpAmount || Number(topUpAmount) <= 0 || !fundingSourceUpiId) {
            toast({ variant: "destructive", title: "Invalid Input", description: "Please enter a valid amount and select a funding source." });
            return;
        }
        const amount = Number(topUpAmount);
        if (liteDetails && (liteDetails.balance + amount) > liteDetails.maxBalance) {
            toast({ variant: "destructive", title: "Limit Exceeded", description: `Top-up amount exceeds UPI Lite balance limit of ₹${liteDetails.maxBalance}.` });
            return;
        }

        setIsProcessing(true);
        try {
            // Simulate PIN entry if required by bank rules (often not for Lite top-up)
            const success = await topUpUpiLite(amount, fundingSourceUpiId);
            if (success) {
                // Refresh balance after successful top-up
                const updatedDetails = await getUpiLiteBalance();
                setLiteDetails(updatedDetails);
                toast({ title: "Top-up Successful", description: `₹${amount} added to UPI Lite.` });
                setTopUpAmount('');
            } else {
                throw new Error("Top-up failed via service.");
            }
        } catch (error: any) {
            console.error("UPI Lite top-up failed:", error);
            toast({ variant: "destructive", title: "Top-up Failed", description: error.message || "Could not add funds to UPI Lite." });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDisableLite = async () => {
        if (!liteDetails || !liteDetails.isEnabled) return;
        setIsProcessing(true);
        try {
             // Important: Ask for confirmation, explain funds will be transferred back.
            const success = await disableUpiLite();
            if (success) {
                const updatedDetails = await getUpiLiteBalance(); // Should show disabled now
                setLiteDetails(updatedDetails);
                toast({ title: "UPI Lite Disabled", description: `Your UPI Lite balance (₹${liteDetails.balance}) has been transferred back to your bank account.` });
            } else {
                 throw new Error("Disabling failed via service.");
            }
        } catch (error: any) {
            console.error("UPI Lite disable failed:", error);
             toast({ variant: "destructive", title: "Disable Failed", description: error.message || "Could not disable UPI Lite." });
        } finally {
            setIsProcessing(false);
        }
    };

     const handleEnableLite = async () => {
        if (!fundingSourceUpiId) {
             toast({ variant: "destructive", title: "Account Needed", description: "Please select a bank account to enable UPI Lite." });
             return;
        }
        setIsProcessing(true);
        try {
             // Simulate enabling flow (might involve PIN)
            console.log("Enabling UPI Lite with account:", fundingSourceUpiId);
            await new Promise(resolve => setTimeout(resolve, 1500));
            const updatedDetails = await getUpiLiteBalance(); // Should show enabled now
            setLiteDetails(updatedDetails);
            toast({ title: "UPI Lite Enabled", description: `UPI Lite is now active. You can add funds.` });
        } catch (error: any) {
            console.error("UPI Lite enable failed:", error);
             toast({ variant: "destructive", title: "Enable Failed", description: error.message || "Could not enable UPI Lite." });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/profile/upi" passHref> {/* Link back to UPI settings */}
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Wallet className="h-6 w-6" />
                <h1 className="text-lg font-semibold">UPI Lite</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-6 pb-20">
                {isLoading && <div className="flex justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}

                {!isLoading && liteDetails && (
                    <>
                        <Card className="shadow-md">
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    <span>UPI Lite Balance</span>
                                    <Badge variant={liteDetails.isEnabled ? "default" : "secondary"} className={liteDetails.isEnabled ? "bg-green-100 text-green-700" : ""}>
                                        {liteDetails.isEnabled ? 'Active' : 'Disabled'}
                                    </Badge>
                                </CardTitle>
                                <CardDescription>Fast, PIN-less payments up to ₹{liteDetails.maxTxnAmount}.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-center">
                                <p className="text-4xl font-bold mb-2">₹{liteDetails.balance.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">
                                    Max Balance: ₹{liteDetails.maxBalance.toLocaleString()} | Max Txn: ₹{liteDetails.maxTxnAmount.toLocaleString()}
                                </p>
                            </CardContent>
                        </Card>

                        {liteDetails.isEnabled ? (
                            <>
                                {/* Top-up Section */}
                                <Card className="shadow-md">
                                    <CardHeader>
                                        <CardTitle>Add Money to UPI Lite</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                         <div className="space-y-1">
                                            <Label htmlFor="fundingSource">From Bank Account</Label>
                                            <Select value={fundingSourceUpiId} onValueChange={setFundingSourceUpiId} required disabled={accounts.length === 0}>
                                                <SelectTrigger id="fundingSource">
                                                    <SelectValue placeholder={accounts.length > 0 ? "Select Account" : "No accounts linked"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {accounts.map(acc => (
                                                        <SelectItem key={acc.upiId} value={acc.upiId}>
                                                            {acc.bankName} - {acc.accountNumber}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="topUpAmount">Amount to Add (₹)</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                                <Input
                                                    id="topUpAmount"
                                                    type="number"
                                                    placeholder="Enter amount"
                                                    value={topUpAmount}
                                                    onChange={(e) => setTopUpAmount(e.target.value)}
                                                    min="1"
                                                    max={liteDetails.maxBalance - liteDetails.balance} // Max allowable top-up
                                                    step="1"
                                                    className="pl-7"
                                                />
                                            </div>
                                        </div>
                                        <Button className="w-full" onClick={handleTopUp} disabled={isProcessing || !topUpAmount || Number(topUpAmount) <= 0 || !fundingSourceUpiId}>
                                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Plus className="h-4 w-4 mr-2"/>}
                                            Add Money
                                        </Button>
                                    </CardContent>
                                </Card>

                                {/* Disable Section */}
                                <Card className="shadow-md">
                                    <CardHeader>
                                        <CardTitle>Disable UPI Lite</CardTitle>
                                        <CardDescription>Your remaining balance will be transferred back to your bank account.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                         <Button variant="destructive" className="w-full" onClick={handleDisableLite} disabled={isProcessing}>
                                             {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Minus className="h-4 w-4 mr-2"/>}
                                            Disable UPI Lite
                                        </Button>
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                             // Enable Section
                             <Card className="shadow-md">
                                <CardHeader>
                                    <CardTitle>Enable UPI Lite</CardTitle>
                                    <CardDescription>Select a bank account to activate fast, PIN-less payments for small amounts.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                      <div className="space-y-1">
                                        <Label htmlFor="enableFundingSource">Link with Bank Account</Label>
                                        <Select value={fundingSourceUpiId} onValueChange={setFundingSourceUpiId} required disabled={accounts.length === 0}>
                                            <SelectTrigger id="enableFundingSource">
                                                <SelectValue placeholder={accounts.length > 0 ? "Select Account" : "No accounts linked"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {accounts.map(acc => (
                                                    <SelectItem key={acc.upiId} value={acc.upiId}>
                                                        {acc.bankName} - {acc.accountNumber}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button className="w-full" onClick={handleEnableLite} disabled={isProcessing || !fundingSourceUpiId}>
                                         {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Plus className="h-4 w-4 mr-2"/>}
                                        Enable UPI Lite
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="shadow-md border-blue-500">
                             <CardHeader>
                                 <CardTitle className="flex items-center gap-2 text-blue-700"><Info className="h-5 w-5"/> What is UPI Lite?</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-2">
                                <p>UPI Lite allows super fast, PIN-less payments for amounts up to ₹{liteDetails?.maxTxnAmount || 500}.</p>
                                <p>Add money from your bank account to your UPI Lite balance (up to ₹{liteDetails?.maxBalance || 2000}).</p>
                                <p>Payments made via UPI Lite do not clutter your bank statement.</p>
                                <p>Ideal for small, frequent transactions like snacks, travel, etc.</p>
                            </CardContent>
                        </Card>
                    </>
                )}

                {!isLoading && !liteDetails && (
                     <Card className="shadow-md text-center">
                         <CardContent className="p-6">
                             <p className="text-muted-foreground">Could not load UPI Lite details. Please try again later.</p>
                         </CardContent>
                     </Card>
                )}

            </main>
        </div>
    );
}
