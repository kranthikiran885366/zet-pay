
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

// Mock Data (Replace with actual API calls/data)
interface GamingPlatform {
    id: string;
    name: string;
    logoUrl?: string;
}
const mockPlatforms: GamingPlatform[] = [
    { id: 'google-play', name: 'Google Play Recharge Code', logoUrl: '/logos/googleplay.png' },
    { id: 'freefire', name: 'Garena Free Fire Diamonds', logoUrl: '/logos/freefire.png' },
    { id: 'pubg-uc', name: 'PUBG Mobile UC (Unknown Cash)', logoUrl: '/logos/pubg.png' },
    { id: 'steam-wallet', name: 'Steam Wallet Code', logoUrl: '/logos/steam.png' },
];

interface GamingVoucher {
    id: string;
    value: number; // INR value
    description?: string; // e.g., "100 Diamonds", "$10 Steam Credit"
}
const mockVouchers: { [platformId: string]: GamingVoucher[] } = {
    'google-play': [
        { id: 'gp-100', value: 100 }, { id: 'gp-300', value: 300 }, { id: 'gp-500', value: 500 }, { id: 'gp-1000', value: 1000 },
    ],
    'freefire': [
        { id: 'ff-100d', value: 80, description: '100 Diamonds' }, { id: 'ff-310d', value: 240, description: '310 Diamonds' }, { id: 'ff-520d', value: 400, description: '520 Diamonds' },
    ],
    'pubg-uc': [
        { id: 'pubg-60uc', value: 75, description: '60 UC' }, { id: 'pubg-325uc', value: 380, description: '300 + 25 UC' }, { id: 'pubg-660uc', value: 750, description: '600 + 60 UC' },
    ],
    'steam-wallet': [
        { id: 'steam-250', value: 250 }, { id: 'steam-500', value: 500 }, { id: 'steam-1000', value: 1000 },
    ],
};

export default function GamingVoucherPage() {
    const [selectedPlatform, setSelectedPlatform] = useState<string>('');
    const [selectedVoucher, setSelectedVoucher] = useState<GamingVoucher | null>(null);
    const [playerId, setPlayerId] = useState(''); // Optional, needed for some games like Free Fire
    const [amount, setAmount] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const vouchers = mockVouchers[selectedPlatform] || [];
    const requiresPlayerId = ['freefire', 'pubg-uc'].includes(selectedPlatform); // Example check

    useEffect(() => {
        // Reset selection when platform changes
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
        if (!selectedPlatform || !amount || Number(amount) <= 0) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select platform and voucher/amount." });
            return;
        }
        if (requiresPlayerId && !playerId) {
             toast({ variant: "destructive", title: "Player ID Required", description: "Please enter your Player ID for this game." });
            return;
        }

        setIsProcessing(true);
        const platformName = mockPlatforms.find(p => p.id === selectedPlatform)?.name || 'Gaming';
        console.log("Purchasing Gaming Voucher:", { platform: platformName, playerId, voucher: selectedVoucher?.description || `₹${amount}` });
        try {
            // Simulate API call (replace with actual)
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast({ title: "Purchase Successful!", description: `${selectedVoucher?.description || `₹${amount} voucher`} for ${platformName} purchased. Code sent via SMS/Email.` });
            setPlayerId('');
            setAmount('');
            setSelectedVoucher(null);
            // Maybe navigate to a "My Vouchers" page
        } catch (err) {
            console.error("Gaming voucher purchase failed:", err);
            toast({ variant: "destructive", title: "Purchase Failed" });
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
                <Gamepad2 className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Gaming Vouchers</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Purchase Gaming Credits</CardTitle>
                        <CardDescription>Select your game or platform and choose a voucher.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePurchase} className="space-y-4">
                            {/* Platform Selection */}
                            <div className="space-y-1">
                                <Label htmlFor="platform">Game / Platform</Label>
                                <Select value={selectedPlatform} onValueChange={setSelectedPlatform} required>
                                    <SelectTrigger id="platform">
                                        <SelectValue placeholder="Select Game or Platform" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mockPlatforms.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.logoUrl && <Image src={p.logoUrl} alt="" width={16} height={16} className="inline-block mr-2 h-4 w-4 object-contain"/>}
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Player ID Input (Conditional) */}
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

                            {/* Voucher Selection */}
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

                            {/* Amount Display (read-only from voucher) */}
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
                             {/* Allow custom amount for some types like Google Play */}
                             {selectedPlatform === 'google-play' && !selectedVoucher && (
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
                                             min="10" // Min recharge for GP
                                             step="1"
                                             className="pl-7"
                                         />
                                     </div>
                                 </div>
                             )}


                            {/* Purchase Button */}
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
