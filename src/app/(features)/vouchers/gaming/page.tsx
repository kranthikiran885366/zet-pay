
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Gamepad2, Loader2, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { mockGamingPlatformsData, mockGamingVouchersData, GamingPlatform, GamingVoucher } from '@/mock-data';
import { purchaseVoucher, VoucherPurchasePayload } from '@/services/vouchers'; // Import voucher service
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function GamingVoucherPage() {
    const [selectedPlatform, setSelectedPlatform] = useState<string>('');
    const [selectedVoucher, setSelectedVoucher] = useState<GamingVoucher | null>(null);
    const [playerId, setPlayerId] = useState('');
    const [amount, setAmount] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const vouchers = mockGamingVouchersData[selectedPlatform] || [];
    const platformDetails = mockGamingPlatformsData.find(p => p.id === selectedPlatform);
    const requiresPlayerId = platformDetails?.requiresPlayerId || ['freefire', 'pubg-uc'].includes(selectedPlatform); // Fallback if not in mock data

    useEffect(() => {
        setSelectedVoucher(null);
        setAmount('');
        setPlayerId('');
    }, [selectedPlatform]);

    const handleVoucherSelect = (voucher: GamingVoucher) => {
        setSelectedVoucher(voucher);
        setAmount(voucher.value.toString());
    };

    const handlePurchase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) {
            toast({ variant: "destructive", title: "Not Logged In", description: "Please log in to purchase vouchers." });
            return;
        }
        if (!selectedPlatform || !amount || Number(amount) <= 0) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select platform and voucher/amount." });
            return;
        }
        if (requiresPlayerId && !playerId) {
             toast({ variant: "destructive", title: "Player ID Required", description: `Please enter your Player ID for ${platformDetails?.name || 'this game'}.` });
            return;
        }

        setIsProcessing(true);
        const purchasePayload: VoucherPurchasePayload = {
            brandId: selectedPlatform,
            amount: Number(amount),
            playerId: playerId || undefined,
            billerName: platformDetails?.name || 'Gaming Voucher',
            voucherType: 'gaming',
        };

        try {
            const result = await purchaseVoucher(purchasePayload);
             if (result.status === 'Completed') {
                toast({ title: "Purchase Successful!", description: `${selectedVoucher?.description || `₹${amount} voucher`} for ${platformDetails?.name} purchased. Details sent via SMS/Email. Txn ID: ${result.id}` });
                setPlayerId('');
                setAmount('');
                setSelectedVoucher(null);
                router.push('/history');
            } else {
                 throw new Error(result.description || "Voucher purchase failed.");
            }
        } catch (err: any) {
            console.error("Gaming voucher purchase failed:", err);
            toast({ variant: "destructive", title: "Purchase Failed", description: err.message || "Could not complete voucher purchase." });
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
                <Gamepad2 className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Gaming Vouchers</h1>
            </header>

            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Purchase Gaming Credits</CardTitle>
                        <CardDescription>Select your game or platform and choose a voucher.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePurchase} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="platform">Game / Platform</Label>
                                <Select value={selectedPlatform} onValueChange={setSelectedPlatform} required>
                                    <SelectTrigger id="platform">
                                        <SelectValue placeholder="Select Game or Platform" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mockGamingPlatformsData.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.logoUrl && <Image src={p.logoUrl} alt={p.name} width={16} height={16} className="inline-block mr-2 h-4 w-4 object-contain" data-ai-hint="game platform logo"/>}
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {requiresPlayerId && (
                                <div className="space-y-1">
                                    <Label htmlFor="playerId">Player ID / In-Game Name</Label>
                                    <Input
                                        id="playerId"
                                        type="text"
                                        placeholder="Enter Player ID"
                                        value={playerId}
                                        onChange={(e) => setPlayerId(e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            {selectedPlatform && vouchers.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <Label>Select Voucher</Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {vouchers.map(voucher => (
                                            <Card
                                                key={voucher.id}
                                                className={`p-3 cursor-pointer hover:border-primary ${selectedVoucher?.id === voucher.id ? 'border-primary ring-1 ring-primary' : ''}`}
                                                onClick={() => handleVoucherSelect(voucher)}
                                            >
                                                <p className="font-semibold">₹{voucher.value}</p>
                                                {voucher.description && <p className="text-xs text-muted-foreground">{voucher.description}</p>}
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedVoucher && (
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
                             {platformDetails?.allowCustomAmount && !selectedVoucher && (
                                 <div className="space-y-1">
                                     <Label htmlFor="amount-custom">Recharge Amount (₹)</Label>
                                     <div className="relative">
                                         <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                         <Input
                                             id="amount-custom"
                                             type="number"
                                             placeholder="Enter Amount (e.g., 100)"
                                             value={amount}
                                             onChange={(e) => setAmount(e.target.value)}
                                             required
                                             min={platformDetails.customMinAmount || 10}
                                             max={platformDetails.customMaxAmount || 5000}
                                             step="1"
                                             className="pl-7"
                                         />
                                     </div>
                                 </div>
                             )}

                            <div className="pt-4">
                                <Separator className="mb-4"/>
                                <Button
                                    type="submit"
                                    className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                    disabled={isProcessing || !selectedPlatform || !amount || Number(amount) <= 0 || (requiresPlayerId && !playerId)}
                                >
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    {isProcessing ? 'Processing...' : `Purchase Voucher`}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
