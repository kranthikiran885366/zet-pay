'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Receipt, Loader2, Wallet, Search, Car } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';

// Mock States/UTs for Challan Payment
const mockStates = [
    { id: 'KA', name: 'Karnataka' },
    { id: 'MH', name: 'Maharashtra' },
    { id: 'DL', name: 'Delhi' },
    { id: 'TS', name: 'Telangana' },
    { id: 'TN', name: 'Tamil Nadu' },
];

// Mock Challan Details (replace with actual API response structure)
interface ChallanDetails {
    challanNumber: string;
    vehicleNumber: string;
    ownerName: string;
    offenseDate: string;
    offenseDetails: string;
    amount: number;
    dueDate: string;
    status: 'Pending' | 'Paid';
}

export default function TrafficChallanPage() {
    const [selectedState, setSelectedState] = useState<string>('');
    const [identifierType, setIdentifierType] = useState<'challan' | 'vehicle'>('vehicle');
    const [identifier, setIdentifier] = useState('');
    const [challanDetails, setChallanDetails] = useState<ChallanDetails | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const { toast } = useToast();

    const handleFetchChallan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedState || !identifier) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please select state and enter identifier." });
            return;
        }
        setIsLoading(true);
        setChallanDetails(null);
        console.log("Fetching challan details:", { state: selectedState, type: identifierType, value: identifier });
        try {
            // Simulate API call to Parivahan or state RTO portal
            await new Promise(resolve => setTimeout(resolve, 1500));
            // Mock result
            if (identifier === 'KA01AB1234' || identifier === 'CHLN98765') {
                 setChallanDetails({
                    challanNumber: 'CHLN98765',
                    vehicleNumber: 'KA01AB1234',
                    ownerName: 'Test Owner',
                    offenseDate: '2024-07-10',
                    offenseDetails: 'Jumping Red Signal',
                    amount: 500,
                    dueDate: '2024-08-09',
                    status: 'Pending',
                });
            } else {
                toast({ description: "No pending challans found for the provided details." });
            }
        } catch (err) {
            console.error("Challan fetch failed:", err);
            toast({ variant: "destructive", title: "Fetch Failed", description: "Could not fetch challan details." });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePayment = async () => {
         if (!challanDetails || challanDetails.status !== 'Pending') return;
         setIsProcessingPayment(true);
         console.log("Paying challan:", challanDetails.challanNumber, "Amount:", challanDetails.amount);
         try {
            // Simulate payment API call
            await new Promise(resolve => setTimeout(resolve, 2000));
             toast({ title: "Payment Successful!", description: `Challan ${challanDetails.challanNumber} paid successfully.` });
             setChallanDetails(prev => prev ? {...prev, status: 'Paid'} : null); // Update status locally
         } catch (err) {
            console.error("Challan payment failed:", err);
             toast({ variant: "destructive", title: "Payment Failed", description: "Could not complete the payment." });
         } finally {
            setIsProcessingPayment(false);
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
                <Receipt className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Traffic Challan Payment</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Pay Traffic Challan</CardTitle>
                        <CardDescription>Enter challan or vehicle details to find and pay fines.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleFetchChallan} className="space-y-4">
                             {/* State Selection */}
                             <div className="space-y-1">
                                <Label htmlFor="state">Select State / UT</Label>
                                <Select value={selectedState} onValueChange={setSelectedState} required>
                                    <SelectTrigger id="state">
                                        <SelectValue placeholder="Select State/UT" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mockStates.map((state) => (
                                            <SelectItem key={state.id} value={state.id}>{state.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Identifier Type */}
                            <div className="space-y-1">
                                <Label>Search By</Label>
                                <Select value={identifierType} onValueChange={(value) => setIdentifierType(value as 'challan' | 'vehicle')} required>
                                    <SelectTrigger id="idType">
                                        <SelectValue placeholder="Select Search Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="vehicle">Vehicle Number</SelectItem>
                                        <SelectItem value="challan">Challan Number</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Identifier Input */}
                            <div className="space-y-1">
                                <Label htmlFor="identifierValue">{identifierType === 'challan' ? 'Challan Number' : 'Vehicle Number (e.g., KA01AB1234)'}</Label>
                                <Input
                                    id="identifierValue"
                                    type="text"
                                    placeholder={`Enter ${identifierType === 'challan' ? 'Challan Number' : 'Vehicle Number'}`}
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                                    required
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                {isLoading ? 'Fetching...' : 'Fetch Challan Details'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Challan Details & Payment */}
                {challanDetails && (
                     <Card className="shadow-md mt-4">
                        <CardHeader>
                            <CardTitle>Challan Details Found</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                             <div className="text-sm space-y-1">
                                <p><strong>Challan No:</strong> {challanDetails.challanNumber}</p>
                                <p><strong>Vehicle No:</strong> {challanDetails.vehicleNumber}</p>
                                <p><strong>Owner:</strong> {challanDetails.ownerName}</p>
                                <p><strong>Offense Date:</strong> {format(new Date(challanDetails.offenseDate), 'PPP')}</p>
                                <p><strong>Offense:</strong> {challanDetails.offenseDetails}</p>
                                <p><strong>Due Date:</strong> {format(new Date(challanDetails.dueDate), 'PPP')}</p>
                                <p><strong>Status:</strong> <span className={challanDetails.status === 'Pending' ? 'text-orange-600 font-semibold' : 'text-green-600 font-semibold'}>{challanDetails.status}</span></p>
                             </div>

                            <Separator/>

                             <div className="flex justify-between items-center">
                                 <span className="text-lg font-semibold">Amount Due:</span>
                                 <span className="text-2xl font-bold">₹{challanDetails.amount.toFixed(2)}</span>
                             </div>

                            <Button
                                className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                                disabled={isProcessingPayment || challanDetails.status === 'Paid'}
                                onClick={handlePayment}
                            >
                                {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                {challanDetails.status === 'Paid' ? 'Already Paid' : (isProcessingPayment ? 'Processing...' : 'Pay Challan Now')}
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
