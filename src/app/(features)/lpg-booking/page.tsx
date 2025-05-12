
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Flame, Loader2, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { processBillPayment } from '@/services/bills';
import { mockLpgProvidersData, LpgProvider } from '@/mock-data'; // Import centralized mock data

export default function LpgBookingPage() {
    const [providers, setProviders] = useState<LpgProvider[]>(mockLpgProvidersData);
    const [selectedProvider, setSelectedProvider] = useState<string>('');
    const [identifier, setIdentifier] = useState('');
    const [amount, setAmount] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const providerDetails = providers.find(p => p.id === selectedProvider);

    const handleBookCylinder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProvider || !identifier) {
            toast({ variant: "destructive", title: "Missing Information" });
            return;
        }
        const bookingAmount = Number(amount) || 1000;

        setIsProcessing(true);
        const providerName = providerDetails?.name || 'LPG Booking';
        try {
            const paymentDetails = {
                billerId: selectedProvider,
                identifier: identifier,
                amount: bookingAmount,
                billerType: 'LPG',
                billerName: `Booking for ${providerName}`,
            };
            const transactionResult = await processBillPayment(paymentDetails);

            if (transactionResult.status === 'Completed') {
                toast({ title: "Booking Successful!", description: `LPG cylinder booked for ${identifier} with ${providerName}. Refill expected soon.` });
                setIdentifier('');
                setAmount('');
            } else {
                throw new Error(`Booking ${transactionResult.status}`);
            }
        } catch (err: any) {
            console.error("LPG booking failed:", err);
            toast({ variant: "destructive", title: "Booking Failed", description: err.message });
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
                <Flame className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Book LPG Cylinder</h1>
            </header>

            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Book Your LPG Refill</CardTitle>
                        <CardDescription>Select your gas provider and enter details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleBookCylinder} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="provider">Gas Provider</Label>
                                <Select value={selectedProvider} onValueChange={setSelectedProvider} required disabled={isLoading}>
                                    <SelectTrigger id="provider">
                                        <SelectValue placeholder={isLoading ? "Loading..." : "Select Provider"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {providers.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.logoUrl && <Image src={p.logoUrl} alt="" width={16} height={16} className="inline-block mr-2 h-4 w-4 object-contain"/>}
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {providerDetails && (
                                <div className="space-y-1">
                                    <Label htmlFor="identifier">{providerDetails.identifierLabel}</Label>
                                    <Input
                                        id="identifier"
                                        type="text"
                                        placeholder={providerDetails.identifierPlaceholder}
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            <div className="pt-4">
                                <Separator className="mb-4"/>
                                <p className='text-center text-muted-foreground text-sm mb-3'>Refill Amount: ₹1000.00 (Example)</p>
                                <Button
                                    type="submit"
                                    className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                    disabled={isProcessing || !selectedProvider || !identifier}
                                >
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    {isProcessing ? 'Processing...' : `Book & Pay for Cylinder`}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
