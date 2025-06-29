
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, HandCoins, Loader2, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { processBillPayment } from '@/services/bills';
import { mockClubsData, Club } from '@/mock-data'; 
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import type { Transaction } from '@/services/types';

export default function ClubFeesPage() {
    const [clubs, setClubs] = useState<Club[]>(mockClubsData);
    const [selectedClub, setSelectedClub] = useState<string>('');
    const [membershipId, setMembershipId] = useState('');
    const [amount, setAmount] = useState<string>('');
    const [isLoadingClubs, setIsLoadingClubs] = useState(false); // Currently not used as data is static
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) {
            toast({ variant: "destructive", title: "Not Logged In", description: "Please log in to make payments." });
            return;
        }
        if (!selectedClub || !membershipId || !amount || Number(amount) <= 0) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select club, enter membership ID and a valid amount." });
            return;
        }
        setIsProcessing(true);
        const clubName = clubs.find(c => c.id === selectedClub)?.name || 'Club Fee';
        try {
            const paymentDetails = {
                billerId: selectedClub,
                identifier: membershipId,
                amount: Number(amount),
                billerType: 'Club Fee',
                billerName: clubName,
            };
            const transactionResult = await processBillPayment(paymentDetails) as Transaction;

            if (transactionResult.status === 'Completed') {
                toast({ title: "Payment Successful!", description: `₹${amount} paid for ${clubName} membership (${membershipId}). Txn ID: ${transactionResult.id}` });
                setMembershipId('');
                setAmount('');
                router.push('/history');
            } else {
                throw new Error(transactionResult.description || `Payment ${transactionResult.status}`);
            }
        } catch (err: any) {
            console.error("Club fee payment failed:", err);
            toast({ variant: "destructive", title: "Payment Failed", description: err.message || "Could not complete club fee payment." });
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
                <HandCoins className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Club Fees</h1>
            </header>

            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Pay Club Membership Fees</CardTitle>
                        <CardDescription>Select your club and enter details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePayment} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="club">Select Club</Label>
                                <Select value={selectedClub} onValueChange={setSelectedClub} required disabled={isLoadingClubs}>
                                    <SelectTrigger id="club">
                                        <SelectValue placeholder={isLoadingClubs ? "Loading..." : "Select Club"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clubs.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="membershipId">Membership ID / Account Number</Label>
                                <Input
                                    id="membershipId"
                                    type="text"
                                    placeholder="Enter Membership ID"
                                    value={membershipId}
                                    onChange={(e) => setMembershipId(e.target.value)}
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
                                        placeholder="Enter Fee Amount"
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
                                    disabled={isProcessing || !selectedClub || !membershipId || !amount || Number(amount) <= 0}
                                >
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    {isProcessing ? 'Processing...' : `Pay Club Fee`}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
