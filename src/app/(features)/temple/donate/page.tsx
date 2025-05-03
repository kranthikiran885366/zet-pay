'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, HeartHandshake, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox'; // For anonymous donation

// Mock Data (Replace with actual API calls)
const mockTemples = [ // Reuse or fetch centrally
    { id: 'tirupati', name: 'Tirumala Tirupati Devasthanams (TTD)' },
    { id: 'shirdi', name: 'Shirdi Saibaba Sansthan Trust' },
    { id: 'vaishno-devi', name: 'Vaishno Devi Shrine Board' },
    { id: 'ram-mandir', name: 'Shri Ram Janmabhoomi Teerth Kshetra (Ayodhya)'},
];

const mockDonationSchemes: { [templeId: string]: string[] } = {
    'tirupati': ['General Donation', 'Annadanam Trust', 'Veda Parirakshana Trust', 'Gosamrakshana Trust'],
    'shirdi': ['General Donation', 'Annadan Fund', 'Hospital Fund', 'Education Fund'],
    'vaishno-devi': ['General Donation', 'Shrine Development Fund'],
    'ram-mandir': ['Temple Construction Fund', 'General Donation'],
};

export default function TempleDonationPage() {
    const [selectedTemple, setSelectedTemple] = useState<string>('');
    const [selectedScheme, setSelectedScheme] = useState<string>('General Donation');
    const [amount, setAmount] = useState<string>('');
    const [donorName, setDonorName] = useState(''); // Optional
    const [panNumber, setPanNumber] = useState(''); // Optional for tax receipts
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const schemes = mockDonationSchemes[selectedTemple] || ['General Donation'];

    // Reset scheme when temple changes
    useState(() => {
        setSelectedScheme('General Donation'); // Reset to default
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTemple]);


    const handleDonate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTemple || !amount || Number(amount) <= 0) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select temple and enter a valid amount." });
            return;
        }
        if (!isAnonymous && !donorName) {
            toast({ variant: "destructive", title: "Donor Name Required", description: "Please enter donor name or check 'Donate Anonymously'." });
            return;
        }

        setIsProcessing(true);
        console.log("Processing Donation:", {
            temple: selectedTemple,
            scheme: selectedScheme,
            amount,
            donorName: isAnonymous ? 'Anonymous' : donorName,
            pan: panNumber
        });
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast({ title: "Donation Successful!", description: `Thank you for your generous donation of ₹${amount} to ${mockTemples.find(t=>t.id===selectedTemple)?.name}.` });
            // Reset form
            setSelectedTemple('');
            setSelectedScheme('General Donation');
            setAmount('');
            setDonorName('');
            setPanNumber('');
            setIsAnonymous(false);
        } catch (err) {
            console.error("Donation failed:", err);
            toast({ variant: "destructive", title: "Donation Failed" });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/temple" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <HeartHandshake className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Donate to Temple</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Make a Donation</CardTitle>
                        <CardDescription>Support temples and trusts through secure donations.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleDonate} className="space-y-4">
                             {/* Temple Selection */}
                             <div className="space-y-1">
                                <Label htmlFor="temple">Select Temple / Trust</Label>
                                <Select value={selectedTemple} onValueChange={setSelectedTemple} required>
                                    <SelectTrigger id="temple"><SelectValue placeholder="Select Temple" /></SelectTrigger>
                                    <SelectContent>
                                        {mockTemples.map(temple => <SelectItem key={temple.id} value={temple.id}>{temple.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Donation Scheme Selection */}
                            {selectedTemple && schemes.length > 1 && (
                                <div className="space-y-1">
                                    <Label htmlFor="scheme">Select Donation Scheme</Label>
                                    <Select value={selectedScheme} onValueChange={setSelectedScheme} required>
                                        <SelectTrigger id="scheme"><SelectValue placeholder="Select Scheme" /></SelectTrigger>
                                        <SelectContent>
                                            {schemes.map(scheme => <SelectItem key={scheme} value={scheme}>{scheme}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Amount Input */}
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
                                        min="1" // Minimum donation amount
                                        step="1"
                                        className="pl-7"
                                    />
                                </div>
                            </div>

                             <Separator />

                             {/* Donor Details */}
                            <div className="space-y-1">
                                <Label htmlFor="donorName">Donor Name</Label>
                                <Input id="donorName" placeholder="Enter Your Name" value={donorName} onChange={(e) => setDonorName(e.target.value)} disabled={isAnonymous} required={!isAnonymous}/>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="panNumber">PAN Number (Optional)</Label>
                                <Input id="panNumber" placeholder="Enter PAN for tax receipt" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} disabled={isAnonymous}/>
                                <p className="text-xs text-muted-foreground">Needed for 80G tax exemption receipt (if applicable).</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="anonymous" checked={isAnonymous} onCheckedChange={(checked) => setIsAnonymous(Boolean(checked))} />
                                <Label htmlFor="anonymous" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                  Donate Anonymously
                                </Label>
                            </div>

                            {/* Purchase Button */}
                            <div className="pt-4">
                                <Separator className="mb-4"/>
                                <Button
                                    type="submit"
                                    className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                    disabled={isProcessing || !selectedTemple || !amount || Number(amount) <= 0 || (!isAnonymous && !donorName)}
                                >
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    {isProcessing ? 'Processing...' : `Proceed to Donate`}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
