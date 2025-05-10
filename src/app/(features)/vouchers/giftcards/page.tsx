'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Gift, Loader2, Wallet, Search } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea';

// Mock Data (Replace with actual API calls/data)
interface GiftCardBrand {
    id: string;
    name: string;
    logoUrl?: string;
    categories: string[];
    denominations: number[]; // Available fixed amounts
    allowCustomAmount: boolean;
    minCustomAmount?: number;
    maxCustomAmount?: number;
}
const mockBrands: GiftCardBrand[] = [
    { id: 'amazon', name: 'Amazon Pay Gift Card', logoUrl: '/logos/amazon.png', categories: ['Shopping', 'Popular'], denominations: [100, 250, 500, 1000, 2000], allowCustomAmount: true, minCustomAmount: 50, maxCustomAmount: 10000 },
    { id: 'flipkart', name: 'Flipkart Gift Card', logoUrl: '/logos/flipkart.png', categories: ['Shopping', 'Popular'], denominations: [250, 500, 1000, 2500, 5000], allowCustomAmount: false },
    { id: 'myntra', name: 'Myntra Gift Card', logoUrl: '/logos/myntra.png', categories: ['Fashion'], denominations: [500, 1000, 2000, 5000], allowCustomAmount: true, minCustomAmount: 100 },
    { id: 'bookmyshow', name: 'BookMyShow Gift Card', logoUrl: '/logos/bookmyshow.png', categories: ['Entertainment'], denominations: [250, 500, 1000], allowCustomAmount: true, minCustomAmount: 100 },
];

const mockCategories = ['All', 'Popular', 'Shopping', 'Fashion', 'Entertainment', 'Grocery', 'Travel'];

export default function GiftCardPurchasePage() {
    const [brands] = useState<GiftCardBrand[]>(mockBrands);
    const [filteredBrands, setFilteredBrands] = useState<GiftCardBrand[]>(mockBrands);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBrand, setSelectedBrand] = useState<GiftCardBrand | null>(null);
    const [selectedDenomination, setSelectedDenomination] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [recipientName, setRecipientName] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [senderName, setSenderName] = useState('');
    const [message, setMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        let results = brands;
        if (selectedCategory !== 'All') {
            results = results.filter(brand => brand.categories.includes(selectedCategory));
        }
        if (searchTerm) {
            results = results.filter(brand => brand.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        setFilteredBrands(results);
    }, [brands, selectedCategory, searchTerm]);

    useEffect(() => {
        setSelectedDenomination(null);
        setCustomAmount('');
        setRecipientName('');
        setRecipientEmail('');
        setMessage('');
    }, [selectedBrand]);

    const handleSelectBrand = (brand: GiftCardBrand) => {
        setSelectedBrand(brand);
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

        if (!selectedBrand || finalAmount <= 0 || !recipientName || !recipientEmail) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select brand, amount, and enter recipient details." });
            return;
        }
        // Add more validation logic if needed based on brand rules
        // ...

        setIsProcessing(true);
        console.log("Purchasing Gift Card:", { brand: selectedBrand.name, amount: finalAmount, recipientName, recipientEmail, senderName, message });
        try {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
            toast({ title: "Gift Card Purchased!", description: `₹${finalAmount} ${selectedBrand.name} gift card sent to ${recipientEmail}.` });
            setSelectedBrand(null); // Go back to brand selection
        } catch (err) {
            console.error("Gift card purchase failed:", err);
            toast({ variant: "destructive", title: "Purchase Failed" });
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
                <Gift className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Purchase Gift Cards</h1>
            </header>

            <main className="flex-grow p-4 space-y-4 pb-20">
                {!selectedBrand ? (
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle>Select a Brand</CardTitle>
                            <Input type="search" placeholder="Search brands (e.g., Amazon, Myntra)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="mt-2" />
                            <div className="flex flex-wrap gap-2 pt-3">
                                {mockCategories.map(cat => (
                                    <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat)}>{cat}</Button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {filteredBrands.map((brand) => (
                                <Card key={brand.id} className="p-3 cursor-pointer hover:shadow-lg text-center flex flex-col items-center justify-center" onClick={() => handleSelectBrand(brand)}>
                                    <Image src={brand.logoUrl || '/logos/default-gift.png'} alt={brand.name} width={80} height={50} className="h-12 w-auto object-contain mb-2" data-ai-hint="brand logo gift card"/>
                                    <p className="text-xs font-medium truncate w-full">{brand.name}</p>
                                </Card>
                            ))}
                            {filteredBrands.length === 0 && <p className="col-span-full text-center text-muted-foreground py-4">No brands found matching your criteria.</p>}
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="shadow-md">
                         <CardHeader>
                             <div className="flex items-center gap-3">
                                 <Button variant="ghost" size="icon" className="h-7 w-7 -ml-2" onClick={() => setSelectedBrand(null)}><ArrowLeft className="h-4 w-4"/></Button>
                                 <Image src={selectedBrand.logoUrl || '/logos/default-gift.png'} alt={selectedBrand.name} width={40} height={40} className="h-10 w-auto object-contain" data-ai-hint="brand logo gift card"/>
                                 <div>
                                    <CardTitle>{selectedBrand.name}</CardTitle>
                                    <CardDescription>Select amount and enter recipient details</CardDescription>
                                 </div>
                             </div>
                         </CardHeader>
                         <CardContent>
                            <form onSubmit={handlePurchase} className="space-y-4">
                                <div className="space-y-2">
                                     <Label>Select Amount (₹)</Label>
                                     <div className="flex flex-wrap gap-2">
                                        {selectedBrand.denominations.map(denom => (
                                            <Button key={denom} type="button" variant={selectedDenomination === denom ? "default" : "outline"} onClick={() => handleSelectDenomination(denom)}>₹{denom}</Button>
                                        ))}
                                     </div>
                                </div>
                                {selectedBrand.allowCustomAmount && (
                                     <div className="space-y-1">
                                         <Label htmlFor="customAmount">Or Enter Custom Amount (₹)</Label>
                                         <Input id="customAmount" type="number" placeholder={`Min ₹${selectedBrand.minCustomAmount || 1}`} value={customAmount} onChange={handleCustomAmountChange} min={selectedBrand.minCustomAmount || 1} max={selectedBrand.maxCustomAmount} step="1" />
                                     </div>
                                )}
                                <Separator />
                                <div className="space-y-1"><Label htmlFor="recipientName">Recipient's Name</Label><Input id="recipientName" value={recipientName} onChange={e=>setRecipientName(e.target.value)} required/></div>
                                <div className="space-y-1"><Label htmlFor="recipientEmail">Recipient's Email</Label><Input id="recipientEmail" type="email" value={recipientEmail} onChange={e=>setRecipientEmail(e.target.value)} required/></div>
                                <div className="space-y-1"><Label htmlFor="senderName">Your Name (Optional)</Label><Input id="senderName" value={senderName} onChange={e=>setSenderName(e.target.value)} /></div>
                                <div className="space-y-1"><Label htmlFor="message">Message (Optional)</Label><Textarea id="message" value={message} onChange={e=>setMessage(e.target.value)} maxLength={150} /></div>
                                <div className="pt-2">
                                    <Separator className="mb-3"/>
                                    <div className="flex justify-between items-center text-base font-semibold mb-3"><span>Total Payable:</span><span>₹{totalAmount.toFixed(2)}</span></div>
                                    <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={isProcessing || totalAmount <= 0 || !recipientName || !recipientEmail}><Wallet className="mr-2 h-4 w-4"/> {isProcessing ? <Loader2 className="animate-spin"/> : 'Purchase Now'}</Button>
                                </div>
                            </form>
                         </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
