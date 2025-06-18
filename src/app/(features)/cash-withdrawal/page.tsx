'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Store, MapPin, IndianRupee, QrCode, Loader2, Copy, CheckCircle, Smartphone } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { getNearbyAgents, initiateWithdrawal, ZetAgent, WithdrawalDetails } from '@/services/cash-withdrawal'; // Import new service

export default function CardlessCashWithdrawalPage() {
    const [step, setStep] = useState<'selectAgent' | 'enterAmount' | 'showCode' | 'completed'>('selectAgent');
    const [agents, setAgents] = useState<ZetAgent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<ZetAgent | null>(null);
    const [amount, setAmount] = useState<string>('');
    const [withdrawalDetails, setWithdrawalDetails] = useState<WithdrawalDetails | null>(null);
    const [isLoadingAgents, setIsLoadingAgents] = useState(true);
    const [isInitiating, setIsInitiating] = useState(false);
    const { toast } = useToast();

    // Fetch nearby agents on mount (using mock location for now)
    useEffect(() => {
        const fetchAgents = async () => {
            setIsLoadingAgents(true);
            try {
                // TODO: Get actual user location
                const fetchedAgents = await getNearbyAgents(12.9716, 77.5946); // Mock Bangalore coordinates
                setAgents(fetchedAgents);
            } catch (error) {
                console.error("Failed to fetch nearby agents:", error);
                toast({ variant: "destructive", title: "Error", description: "Could not load nearby agents." });
            } finally {
                setIsLoadingAgents(false);
            }
        };
        fetchAgents();
    }, [toast]);

    const handleSelectAgent = (agent: ZetAgent) => {
        setSelectedAgent(agent);
        setStep('enterAmount');
    };

    const handleInitiateWithdrawal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAgent || !amount || Number(amount) <= 0) {
            toast({ variant: "destructive", title: "Invalid Input", description: "Please select an agent and enter a valid amount." });
            return;
        }
        // TODO: Add check for available balance

        setIsInitiating(true);
        setWithdrawalDetails(null);
        try {
            const details = await initiateWithdrawal(selectedAgent.id, Number(amount));
            setWithdrawalDetails(details);
            setStep('showCode');
            toast({ title: "Withdrawal Initiated", description: "Show the OTP & QR code to the agent." });
        } catch (error: any) {
            console.error("Failed to initiate withdrawal:", error);
            toast({ variant: "destructive", title: "Initiation Failed", description: error.message || "Could not start withdrawal process." });
        } finally {
            setIsInitiating(false);
        }
    };

    const copyOtp = () => {
        if (!withdrawalDetails?.otp) return;
        navigator.clipboard.writeText(withdrawalDetails.otp)
            .then(() => toast({ title: "OTP Copied!" }))
            .catch(() => toast({ variant: "destructive", title: "Copy Failed" }));
    };

    const handleCompletion = () => {
        // This would ideally be triggered by a backend event or agent confirmation
        setStep('completed');
        // Reset state for next withdrawal
        // setSelectedAgent(null);
        // setAmount('');
        // setWithdrawalDetails(null);
    };


    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <IndianRupee className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Cardless Cash Withdrawal</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">

                {step === 'selectAgent' && (
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle>Select Nearby Agent</CardTitle>
                            <CardDescription>Choose a Zet Agent shop to withdraw cash.</CardDescription>
                             {/* TODO: Add Map View toggle here */}
                        </CardHeader>
                        <CardContent className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {isLoadingAgents && <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
                            {!isLoadingAgents && agents.length === 0 && <p className="text-muted-foreground text-center py-4">No Zet Agents found nearby.</p>}
                            {!isLoadingAgents && agents.map(agent => (
                                <Card key={agent.id} className="p-3 flex items-center justify-between cursor-pointer hover:bg-accent" onClick={() => handleSelectAgent(agent)}>
                                    <div className="flex items-center gap-3">
                                        <Store className="h-6 w-6 text-primary" />
                                        <div>
                                            <p className="font-semibold">{agent.name}</p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3"/> {agent.address} ({agent.distanceKm.toFixed(1)}km)</p>
                                             <p className="text-xs text-muted-foreground">Timings: {agent.operatingHours}</p>
                                        </div>
                                    </div>
                                    {/* Optionally show agent limits/fees */}
                                </Card>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {step === 'enterAmount' && selectedAgent && (
                     <Card className="shadow-md">
                        <CardHeader>
                            <Button variant="ghost" size="sm" onClick={() => setStep('selectAgent')} className="text-muted-foreground mb-2 justify-start p-0 h-auto">
                                <ArrowLeft className="h-4 w-4 mr-1"/> Change Agent
                            </Button>
                            <CardTitle>Withdraw from {selectedAgent.name}</CardTitle>
                             <CardDescription>{selectedAgent.address}</CardDescription>
                        </CardHeader>
                         <CardContent>
                            <form onSubmit={handleInitiateWithdrawal} className="space-y-4">
                                <div className="space-y-1">
                                    <Label htmlFor="amount">Enter Amount to Withdraw (₹)</Label>
                                    <div className="relative">
                                         <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                                         <Input
                                            id="amount"
                                            type="number"
                                            placeholder="Enter Amount"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            required
                                            min="100" // Example min withdrawal
                                            max="5000" // Example max withdrawal per transaction
                                            step="100" // Example step
                                            className="pl-7 text-lg font-semibold h-11"
                                        />
                                    </div>
                                     {/* TODO: Display applicable fees */}
                                </div>
                                <Button type="submit" className="w-full" disabled={isInitiating}>
                                    {isInitiating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                                    {isInitiating ? 'Generating Code...' : 'Get OTP & QR Code'}
                                </Button>
                            </form>
                         </CardContent>
                     </Card>
                )}

                {step === 'showCode' && withdrawalDetails && selectedAgent && (
                     <Card className="shadow-md text-center">
                        <CardHeader>
                            <CardTitle>Show this to the Agent</CardTitle>
                             <CardDescription>Withdraw ₹{withdrawalDetails.amount} from {selectedAgent.name}</CardDescription>
                        </CardHeader>
                         <CardContent className="space-y-4 flex flex-col items-center">
                             {/* QR Code Display */}
                             <div className="bg-white p-4 rounded-lg border border-border shadow-inner">
                                 <Image
                                     src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(withdrawalDetails.qrData)}`}
                                     alt="Withdrawal QR Code"
                                     width={200}
                                     height={200}
                                     data-ai-hint="cash withdrawal transaction qr code"
                                 />
                             </div>
                             <Separator />
                             {/* OTP Display */}
                             <div>
                                <Label className="text-muted-foreground">One-Time Password (OTP)</Label>
                                 <div className="flex items-center justify-center gap-2 mt-1">
                                    <p className="text-3xl font-bold tracking-widest p-2 border rounded-md bg-muted">
                                        {withdrawalDetails.otp}
                                    </p>
                                    <Button variant="ghost" size="icon" onClick={copyOtp}><Copy className="h-5 w-5"/></Button>
                                 </div>
                                 <p className="text-xs text-muted-foreground mt-1">Expires in: {withdrawalDetails.expiresInSeconds} seconds</p> {/* TODO: Add countdown timer */}
                             </div>

                            <Separator />
                             <p className="text-sm text-muted-foreground">Agent will scan QR or enter OTP to confirm and dispense cash.</p>

                            {/* Manual Completion Button (for demo) */}
                             <Button onClick={handleCompletion} variant="secondary" className="mt-4">Mark as Completed (Demo)</Button>

                         </CardContent>
                     </Card>
                )}

                {step === 'completed' && withdrawalDetails && (
                    <Card className="shadow-md text-center border-2 border-green-500">
                         <CardHeader>
                            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                            <CardTitle className="text-2xl text-green-600">Withdrawal Successful</CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-2">
                             <p className="text-lg">You have successfully withdrawn <span className="font-bold">₹{withdrawalDetails.amount}</span>.</p>
                              <p className="text-sm text-muted-foreground">From: {selectedAgent?.name}</p>
                              <p className="text-xs text-muted-foreground">Transaction ID: {withdrawalDetails.transactionId}</p>
                              <Separator className="my-4"/>
                             <Link href="/" passHref>
                                <Button className="w-full">Done</Button>
                             </Link>
                         </CardContent>
                    </Card>
                )}

            </main>
        </div>
    );
}