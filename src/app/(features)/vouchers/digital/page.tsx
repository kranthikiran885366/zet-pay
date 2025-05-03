
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mailbox, Loader2, Wallet } from 'lucide-react'; // Using Mailbox as placeholder icon
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';

// Mock Data (Replace with actual API calls/data)
interface DigitalVoucherBrand {
    id: string;
    name: string;
    logoUrl?: string;
    denominations: number[];
    allowCustomAmount: boolean;
    minAmount?: number;
    maxAmount?: number;
}
const mockDigitalVoucherBrands: DigitalVoucherBrand[] = [
    { id: 'google-play-voucher', name: 'Google Play Recharge Code', logoUrl: '/logos/googleplay.png', denominations: [100, 300, 500, 1000, 1500, 5000], allowCustomAmount: true, minAmount: 10, maxAmount: 5000 },
    { id: 'apple-store-voucher', name: 'App Store & iTunes Code', logoUrl: '/logos/appstore.png', denominations: [500, 1000, 2000, 5000], allowCustomAmount: false },
    { id: 'uber-voucher', name: 'Uber Voucher', logoUrl: '/logos/uber.png', denominations: [100, 250, 500], allowCustomAmount: true, minAmount: 50 },
    // Add more brands like Amazon Shopping Voucher etc.
];

export default function DigitalVoucherPage() {
    const [brands, setBrands] = useState<DigitalVoucherBrand[]>(mockDigitalVoucherBrands);
    const [selectedBrand, setSelectedBrand] = useState<DigitalVoucherBrand | null>(null);
    const [selectedDenomination, setSelectedDenomination] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [recipientMobile, setRecipientMobile] = useState(''); // Mobile number to send voucher code
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Reset amount when brand changes
        setSelectedDenomination(null);
        setCustomAmount('');
        setRecipientMobile('');
    }, [selectedBrand]);

    const handleSelectBrand = (brandId: string) => {
        const brand = brands.find(b => b.id === brandId);
        setSelectedBrand(brand || null);
    };

    const handleSelectDenomination = (amount: number) => {
        setSelectedDenomination(amount);
        setCustomAmount('');
    };

    const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedDenomination(null);
        setCustomAmount(e.target.value);
    };

     const getTotalAmount = (): number => {
        if (selectedDenomination) return selectedDenomination;
        if (customAmount && Number(customAmount) > 0) return Number(customAmount);
        return 0;
     }
     const totalAmount = getTotalAmount();

    const handlePurchase = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalAmount = selectedDenomination || (customAmount ? Number(customAmount) : 0);

        if (!selectedBrand || finalAmount <= 0 || !recipientMobile || !recipientMobile.match(/^[6-9]\d{9}$/)) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select brand, amount, and enter a valid recipient mobile number." });
            return;
        }
        // Custom amount validation
        if (customAmount && !selectedDenomination) {
            if (selectedBrand.allowCustomAmount === false) {
                toast({ variant: "destructive", title: "Invalid Amount", description: `${selectedBrand.name} does not allow custom amounts.` });
                return;
            }
            const numAmount = Number(customAmount);
            if (selectedBrand.minAmount && numAmount < selectedBrand.minAmount) {
                toast({ variant: "destructive", title: "Amount Too Low", description: `Minimum amount is ₹${selectedBrand.minAmount}.` });
                return;
            }
            if (selectedBrand.maxAmount && numAmount > selectedBrand.maxAmount) {
                toast({ variant: "destructive", title: "Amount Too High", description: `Maximum amount is ₹${selectedBrand.maxAmount}.` });
                return;
            }
        }


        setIsProcessing(true);
        console.log("Purchasing Digital Voucher:", {
            brand: selectedBrand.name,
            amount: finalAmount,
            recipientMobile
        });
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast({ title: "Voucher Purchased!", description: `₹${finalAmount} ${selectedBrand.name} voucher code sent to ${recipientMobile}.` });
            // Reset form
            setSelectedBrand(null);
            setRecipientMobile('');
        } catch (err) {
            console.error("Voucher purchase failed:", err);
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
                <Mailbox className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Digital Vouchers</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Purchase Digital Voucher</CardTitle>
                        <CardDescription>Select a brand and amount to purchase a voucher code.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePurchase} className="space-y-4">
                            {/* Brand Selection */}
                            <div className="space-y-1">
                                <Label htmlFor="brand">Brand / Platform</Label>
                                <Select value={selectedBrand?.id || ''} onValueChange={handleSelectBrand} required>
                                    <SelectTrigger id="brand">
                                        <SelectValue placeholder="Select Brand" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {brands.map((b) => (
                                            <SelectItem key={b.id} value={b.id}>
                                                {b.logoUrl && <Image src={b.logoUrl} alt="" width={16} height={16} className="inline-block mr-2 h-4 w-4 object-contain"/>}
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                           {selectedBrand && (
                               <>
                                     {/* Denomination Selection */}
                                     {selectedBrand.denominations.length > 0 && (
                                         <div className="space-y-2">
                                             <Label>Select Amount (₹)</Label>
                                             <div className="flex flex-wrap gap-2">
                                                {selectedBrand.denominations.map(denom => (
                                                    <Button
                                                        key={denom}
                                                        type="button"
                                                        variant={selectedDenomination === denom ? "default" : "outline"}
                                                        onClick={() => handleSelectDenomination(denom)}
                                                    >
                                                        ₹{denom}
                                                    </Button>
                                                ))}
                                             </div>
                                         </div>
                                     )}


                                     {/* Custom Amount Input */}
                                     {selectedBrand.allowCustomAmount && (
                                         <div className="space-y-1">
                                             <Label htmlFor="customAmount">Or Enter Custom Amount (₹)</Label>
                                             <div className="relative">
                                                 <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                                 <Input
                                                     id="customAmount"
                                                     type="number"
                                                     placeholder={`Enter Amount ${selectedBrand.minAmount ? `(Min ₹${selectedBrand.minAmount})` : ''} ${selectedBrand.maxAmount ? `(Max ₹${selectedBrand.maxAmount})` : ''}`}
                                                     value={customAmount}
                                                     onChange={handleCustomAmountChange}
                                                     min={selectedBrand.minAmount || 0}
                                                     max={selectedBrand.maxAmount}
                                                     step="1"
                                                     className="pl-7"
                                                     required={!selectedDenomination && selectedBrand.allowCustomAmount}
                                                 />
                                             </div>
                                         </div>
                                    )}

                                     <Separator />

                                    {/* Recipient Mobile */}
                                    <div className="space-y-1">
                                        <Label htmlFor="recipientMobile">Recipient Mobile Number</Label>
                                        <Input
                                            id="recipientMobile"
                                            type="tel"
                                            placeholder="Enter 10-digit mobile number"
                                            value={recipientMobile}
                                            onChange={(e) => setRecipientMobile(e.target.value)}
                                            required
                                            pattern="[6-9]\d{9}"
                                            maxLength={10}
                                        />
                                        <p className="text-xs text-muted-foreground">Voucher code will be sent via SMS to this number.</p>
                                    </div>


                                     {/* Purchase Button */}
                                     <div className="pt-4">
                                         <Separator className="mb-4"/>
                                          <div className="flex justify-between items-center text-sm mb-2">
                                             <span className="text-muted-foreground">Total Amount:</span>
                                             <span className="font-bold text-lg">₹{totalAmount.toFixed(2)}</span>
                                         </div>
                                        <Button
                                            type="submit"
                                            className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                            disabled={isProcessing || totalAmount <= 0 || !recipientMobile || !recipientMobile.match(/^[6-9]\d{9}$/)}
                                        >
                                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                            {isProcessing ? 'Processing...' : `Purchase Voucher`}
                                        </Button>
                                    </div>
                                </>
                           )}
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
