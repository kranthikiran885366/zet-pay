
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Gift, Loader2, Wallet, Search, Mail, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea'; // Import Textarea

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
    { id: 'bigbasket', name: 'Bigbasket Gift Card', logoUrl: '/logos/bigbasket.png', categories: ['Grocery'], denominations: [500, 1000, 2000], allowCustomAmount: false },
];

const mockCategories = ['All', 'Popular', 'Shopping', 'Fashion', 'Entertainment', 'Grocery', 'Travel'];

export default function GiftCardPurchasePage() {
    const [brands, setBrands] = useState<GiftCardBrand[]>(mockBrands); // Start with mock data
    const [filteredBrands, setFilteredBrands] = useState<GiftCardBrand[]>(mockBrands);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBrand, setSelectedBrand] = useState<GiftCardBrand | null>(null);
    const [selectedDenomination, setSelectedDenomination] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [recipientName, setRecipientName] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [senderName, setSenderName] = useState(''); // Default to user's name later
    const [message, setMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    // Filter Brands based on category and search term
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

    // Reset details when brand changes
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
        setCustomAmount(''); // Clear custom amount if denomination is selected
    };

    const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedDenomination(null); // Clear denomination if custom amount is typed
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
            toast({ variant: "destructive", title: "Missing Information", description: "Please select a brand, amount, and enter recipient details." });
            return;
        }
        if (selectedBrand.allowCustomAmount === false && customAmount) {
             toast({ variant: "destructive", title: "Invalid Amount", description: `${selectedBrand.name} does not allow custom amounts.` });
            return;
        }
        if (customAmount) {
             const numAmount = Number(customAmount);
             if (selectedBrand.minCustomAmount && numAmount < selectedBrand.minCustomAmount) {
                 toast({ variant: "destructive", title: "Amount Too Low", description: `Minimum amount is ₹${selectedBrand.minCustomAmount}.` });
                 return;
             }
              if (selectedBrand.maxCustomAmount && numAmount > selectedBrand.maxCustomAmount) {
                 toast({ variant: "destructive", title: "Amount Too High", description: `Maximum amount is ₹${selectedBrand.maxCustomAmount}.` });
                 return;
             }
        }

        setIsProcessing(true);
        console.log("Purchasing Gift Card:", {
            brand: selectedBrand.name,
            amount: finalAmount,
            recipientName,
            recipientEmail,
            senderName: senderName || 'Your Friend',
            message
        });
        try {
            // Simulate API call (replace with actual)
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast({ title: "Gift Card Purchased!", description: `₹${finalAmount} ${selectedBrand.name} gift card sent to ${recipientEmail}.` });
            // Reset form
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
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/services" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Gift className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Gift Cards</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                {!selectedBrand ? (
                    // Brand Selection View
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle>Select a Brand</CardTitle>
                            <Input
                                type="search"
                                placeholder="Search brands..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="mt-2"
                            />
                             <div className="flex flex-wrap gap-2 pt-3">
                                {mockCategories.map(cat => (
                                    <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat)}>
                                        {cat}
                                    </Button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                             {filteredBrands.map((brand) => (
                                <Card key={brand.id} className="p-2 cursor-pointer hover:shadow-lg text-center" onClick={() => handleSelectBrand(brand)}>
                                    <Image src={brand.logoUrl || '/logos/default-gift.png'} alt={brand.name} width={60} height={40} className="h-10 w-auto mx-auto object-contain mb-2"/>
                                    <p className="text-xs font-medium truncate">{brand.name}</p>
                                </Card>
                             ))}
                             {filteredBrands.length === 0 && <p className="col-span-full text-center text-muted-foreground">No brands found.</p>}
                        </CardContent>
                    </Card>
                ) : (
                    // Purchase Details View
                    <Card className="shadow-md">
                         <CardHeader>
                             <div className="flex items-center gap-3">
                                 <Button variant="ghost" size="icon" className="h-7 w-7 -ml-2" onClick={() => setSelectedBrand(null)}><ArrowLeft className="h-4 w-4"/></Button>
                                 <Image src={selectedBrand.logoUrl || '/logos/default-gift.png'} alt={selectedBrand.name} width={40} height={40} className="h-10 w-auto object-contain"/>
                                 <div>
                                    <CardTitle>{selectedBrand.name}</CardTitle>
                                    <CardDescription>Select amount and enter recipient details</CardDescription>
                                 </div>
                             </div>
                         </CardHeader>
                         <CardContent>
                            <form onSubmit={handlePurchase} className="space-y-4">
                                {/* Denomination Selection */}
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

                                {/* Custom Amount Input */}
                                {selectedBrand.allowCustomAmount && (
                                     <div className="space-y-1">
                                         <Label htmlFor="customAmount">Or Enter Custom Amount (₹)</Label>
                                         <div className="relative">
                                             <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                             <Input
                                                 id="customAmount"
                                                 type="number"
                                                 placeholder={`Enter Amount ${selectedBrand.minCustomAmount ? `(Min ₹${selectedBrand.minCustomAmount})` : ''} ${selectedBrand.maxCustomAmount ? `(Max ₹${selectedBrand.maxCustomAmount})` : ''}`}
                                                 value={customAmount}
                                                 onChange={handleCustomAmountChange}
                                                 min={selectedBrand.minCustomAmount || 0}
                                                 max={selectedBrand.maxCustomAmount}
                                                 step="1"
                                                 className="pl-7"
                                             />
                                         </div>
                                     </div>
                                )}

                                <Separator />

                                {/* Recipient Details */}
                                <div className="space-y-1">
                                    <Label htmlFor="recipientName">Recipient's Name</Label>
                                    <Input id="recipientName" placeholder="Enter Name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} required/>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="recipientEmail">Recipient's Email</Label>
                                    <Input id="recipientEmail" type="email" placeholder="Enter Email Address" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} required/>
                                </div>
                                <div className="space-y-1">
                                     <Label htmlFor="senderName">Your Name (Optional)</Label>
                                     <Input id="senderName" placeholder="Enter Your Name" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                     <Label htmlFor="message">Message (Optional)</Label>
                                     <Textarea id="message" placeholder="Add a personal message (max 150 chars)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={150} />
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
                                        disabled={isProcessing || totalAmount <= 0 || !recipientName || !recipientEmail}
                                    >
                                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                        {isProcessing ? 'Processing...' : `Purchase Gift Card`}
                                    </Button>
                                </div>
                            </form>
                         </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
