'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Home, Landmark, CreditCard, Loader2, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { processUpiPayment } from '@/services/upi'; // Import UPI payment service
import { auth } from '@/lib/firebase'; // To check auth state

// Mock Data (Landlord details would ideally be saved contacts)
interface Landlord {
    id: string;
    name: string;
    upiId?: string;
    bankAccount?: { number: string; ifsc: string };
}
const mockLandlords: Landlord[] = [
    { id: 'll1', name: 'Mr. Ramesh Kumar', upiId: 'rameshk@okicici' },
    { id: 'll2', name: 'Ms. Sunita Sharma', bankAccount: { number: 'XXXXXX1234', ifsc: 'HDFC0000001' } },
];

export default function RentPaymentPage() {
    const [landlords, setLandlords] = useState<Landlord[]>(mockLandlords); // Use fetched contacts later
    const [selectedLandlord, setSelectedLandlord] = useState<Landlord | null>(null);
    const [amount, setAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'upi' | 'creditCard' | 'wallet'>('upi'); // Default to UPI
    const [tenantName, setTenantName] = useState(''); // Optional: Tenant name for remarks
    const [propertyAddress, setPropertyAddress] = useState(''); // Optional: Property Address for remarks
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const { toast } = useToast();

    // Check login status
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            setIsLoggedIn(!!user);
             if (user) {
                // Fetch user's name for default sender name?
                // setTenantName(user.displayName || '');
            }
        });
        return () => unsubscribe();
    }, []);

    // useEffect(() => {
    //     // TODO: Fetch saved landlords (contacts tagged as 'landlord'?)
    // }, []);

    const handleSelectLandlord = (landlordId: string) => {
        const landlord = landlords.find(ll => ll.id === landlordId);
        setSelectedLandlord(landlord || null);
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLandlord || !amount || Number(amount) <= 0) {
            toast({ variant: "destructive", title: "Missing Information" });
            return;
        }
         if (!isLoggedIn) {
             toast({ variant: "destructive", title: "Login Required", description: "Please log in to make payments." });
             return;
         }

        setIsProcessing(true);
        const note = `Rent Payment ${propertyAddress ? `for ${propertyAddress}` : ''} ${tenantName ? `from ${tenantName}` : ''}`;
        const recipientIdentifier = selectedLandlord.upiId || selectedLandlord.bankAccount?.number; // Prioritize UPI ID
        const recipientName = selectedLandlord.name;

        try {
            // TODO: Implement logic based on paymentMethod
            if (paymentMethod === 'upi') {
                if (!recipientIdentifier) throw new Error("Landlord UPI ID or Account not found.");
                // Use processUpiPayment (assuming it handles account transfer too)
                const enteredPin = prompt("Enter UPI PIN (DEMO ONLY)"); // **Replace with secure PIN entry**
                if (!enteredPin) throw new Error("PIN entry cancelled.");

                const result = await processUpiPayment(recipientIdentifier, Number(amount), enteredPin, note, auth.currentUser?.uid);
                if (!result.success && result.status !== 'FallbackSuccess') {
                    throw new Error(result.message || "UPI payment failed.");
                }
                 toast({ title: "Payment Successful!", description: `Rent of ₹${amount} paid to ${recipientName}.` });
            } else if (paymentMethod === 'creditCard') {
                // TODO: Implement Credit Card payment flow (requires saved cards/gateway integration)
                await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate
                 toast({ title: "Payment Successful!", description: `Rent of ₹${amount} paid to ${recipientName} via Credit Card.` });
            } else { // Wallet
                // TODO: Implement Wallet payment flow
                 await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate
                 toast({ title: "Payment Successful!", description: `Rent of ₹${amount} paid to ${recipientName} via Wallet.` });
            }

            setAmount(''); // Reset amount after successful payment
            setPropertyAddress('');
            setTenantName('');

        } catch (err: any) {
            console.error("Rent payment failed:", err);
            toast({ variant: "destructive", title: "Payment Failed", description: err.message });
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
                <Home className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Rent Payment</h1>
            </header>

            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Pay Your Rent Securely</CardTitle>
                        <CardDescription>Select landlord and enter rent details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePayment} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="landlord">Select Landlord</Label>
                                <Select value={selectedLandlord?.id || ''} onValueChange={handleSelectLandlord} required>
                                    <SelectTrigger id="landlord">
                                        <SelectValue placeholder="Select Landlord" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {landlords.map((ll) => (
                                            <SelectItem key={ll.id} value={ll.id}>
                                                {ll.name} {ll.upiId ? `(${ll.upiId})` : ll.bankAccount ? `(A/C ...${ll.bankAccount.number.slice(-4)})` : ''}
                                            </SelectItem>
                                        ))}
                                        {/* Option to add new landlord */}
                                    </SelectContent>
                                </Select>
                                {/* TODO: Add button to add new landlord */}
                            </div>

                            {selectedLandlord && (
                                <div className="p-2 border rounded-md bg-muted/50 text-xs">
                                    <p>Paying to: <span className='font-medium'>{selectedLandlord.name}</span></p>
                                    {selectedLandlord.upiId && <p>UPI ID: {selectedLandlord.upiId}</p>}
                                     {selectedLandlord.bankAccount && <p>Account: ...{selectedLandlord.bankAccount.number.slice(-4)} (IFSC: {selectedLandlord.bankAccount.ifsc})</p>}
                                </div>
                            )}

                            <div className="space-y-1">
                                <Label htmlFor="amount">Rent Amount (₹)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        placeholder="Enter Rent Amount"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        required
                                        min="1"
                                        step="0.01"
                                        className="pl-7"
                                    />
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-1">
                                <Label htmlFor="tenantName">Your Name (Optional)</Label>
                                <Input id="tenantName" placeholder="Enter your name (for remarks)" value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="propertyAddress">Property Address (Optional)</Label>
                                <Input id="propertyAddress" placeholder="e.g., Flat 101, Green Apartments" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="paymentMethod">Payment Method</Label>
                                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'upi' | 'creditCard' | 'wallet')} required>
                                    <SelectTrigger id="paymentMethod">
                                        <SelectValue placeholder="Select Payment Method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="upi"><Landmark className="inline h-4 w-4 mr-2" /> UPI (Linked Bank Account)</SelectItem>
                                        <SelectItem value="creditCard"><CreditCard className="inline h-4 w-4 mr-2" /> Credit Card (Charges Apply)</SelectItem>
                                        {/* <SelectItem value="wallet"><Wallet className="inline h-4 w-4 mr-2" /> Zet Pay Wallet</SelectItem> */}
                                    </SelectContent>
                                </Select>
                                {paymentMethod === 'creditCard' && <p className='text-xs text-muted-foreground mt-1'>A small convenience fee may apply for credit card payments.</p>}
                            </div>

                            <div className="pt-4">
                                <Separator className="mb-4"/>
                                <Button
                                    type="submit"
                                    className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                    disabled={isProcessing || !selectedLandlord || !amount || Number(amount) <= 0 || !isLoggedIn}
                                >
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    {isProcessing ? 'Processing...' : `Pay Rent`}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
