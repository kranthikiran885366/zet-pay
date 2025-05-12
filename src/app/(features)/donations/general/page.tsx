
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Heart, Loader2, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { processBillPayment } from '@/services/bills';
import { mockCharitiesData, Charity } from '@/mock-data'; // Import centralized mock data

export default function GeneralDonationsPage() {
    const [charities, setCharities] = useState<Charity[]>(mockCharitiesData);
    const [selectedCharity, setSelectedCharity] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [donorName, setDonorName] = useState('');
    const [panNumber, setPanNumber] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const handleDonate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCharity || !amount || Number(amount) <= 0) {
            toast({ variant: "destructive", title: "Missing Information" });
            return;
        }
        if (!isAnonymous && !donorName) {
            toast({ variant: "destructive", title: "Donor Name Required" });
            return;
        }

        setIsProcessing(true);
        const charityName = charities.find(c => c.id === selectedCharity)?.name || 'Charity Donation';
        try {
             const paymentDetails = {
                billerId: selectedCharity,
                identifier: isAnonymous ? 'Anonymous' : donorName,
                amount: Number(amount),
                billerType: 'Donation',
                billerName: `Donation to ${charityName}`,
            };
            const transactionResult = await processBillPayment(paymentDetails);

            if (transactionResult.status === 'Completed') {
                toast({ title: "Donation Successful!", description: `Thank you for donating ₹${amount} to ${charityName}.` });
                setAmount('');
                setDonorName('');
                setPanNumber('');
                setIsAnonymous(false);
                setSelectedCharity('');
            } else {
                throw new Error(`Donation ${transactionResult.status}`);
            }
        } catch (err: any) {
            console.error("Donation failed:", err);
            toast({ variant: "destructive", title: "Donation Failed", description: err.message });
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
                <Heart className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Donate to Charity</h1>
            </header>

            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Make a Donation</CardTitle>
                        <CardDescription>Support a cause by donating to registered NGOs and charities.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleDonate} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="charity">Select Charity / NGO</Label>
                                <Select value={selectedCharity} onValueChange={setSelectedCharity} required disabled={isLoading}>
                                    <SelectTrigger id="charity">
                                        <SelectValue placeholder={isLoading ? "Loading..." : "Select Organization"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {charities.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.logoUrl && <Image src={c.logoUrl} alt="" width={16} height={16} className="inline-block mr-2 h-4 w-4 object-contain"/>}
                                                {c.name} - <span className="text-xs text-muted-foreground">{c.description}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="amount">Donation Amount (₹)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder="Enter Amount"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        required
                                        min="10"
                                        step="1"
                                        className="pl-7"
                                    />
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-1">
                                <Label htmlFor="donorName">Donor Name</Label>
                                <Input id="donorName" placeholder="Enter Your Name" value={donorName} onChange={(e) => setDonorName(e.target.value)} disabled={isAnonymous} required={!isAnonymous}/>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="panNumber">PAN Number (Optional for 80G)</Label>
                                <Input id="panNumber" placeholder="Enter PAN for tax receipt" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} disabled={isAnonymous}/>
                                <p className="text-xs text-muted-foreground">Needed for 80G tax exemption receipt (if applicable).</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="anonymous-donate" checked={isAnonymous} onCheckedChange={(checked) => setIsAnonymous(Boolean(checked))} />
                                <Label htmlFor="anonymous-donate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                  Donate Anonymously
                                </Label>
                            </div>

                            <div className="pt-4">
                                <Separator className="mb-4"/>
                                <Button
                                    type="submit"
                                    className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                    disabled={isProcessing || !selectedCharity || !amount || Number(amount) <= 0 || (!isAnonymous && !donorName)}
                                >
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    {isProcessing ? 'Processing...' : `Donate Now`}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
