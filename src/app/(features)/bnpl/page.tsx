'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Wallet, Loader2, Info, TrendingUp, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { getBnplStatus, activateBnpl, getBnplStatement, BnplDetails, BnplStatement } from '@/services/bnpl';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

export default function BnplPage() {
    const [bnplDetails, setBnplDetails] = useState<BnplDetails | null>(null);
    const [statement, setStatement] = useState<BnplStatement | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false); // For activation/repayment actions
    const { toast } = useToast();

    // Fetch BNPL status and statement on mount
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const details = await getBnplStatus();
                setBnplDetails(details);
                if (details.isActive) {
                    const stmt = await getBnplStatement();
                    setStatement(stmt);
                }
            } catch (error) {
                console.error("Failed to fetch BNPL details:", error);
                toast({ variant: "destructive", title: "Error", description: "Could not load Pay Later information." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [toast]);

    const handleActivate = async () => {
        setIsProcessing(true);
        try {
            const success = await activateBnpl();
            if (success) {
                const details = await getBnplStatus(); // Re-fetch status
                setBnplDetails(details);
                toast({ title: "Pay Later Activated!", description: "You can now use Pay Later for eligible transactions." });
            } else {
                throw new Error("Activation failed via service.");
            }
        } catch (error: any) {
            console.error("BNPL activation failed:", error);
            toast({ variant: "destructive", title: "Activation Failed", description: error.message || "Could not activate Pay Later." });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRepay = async () => {
        if (!statement || statement.dueAmount <= 0) return;
        setIsProcessing(true);
        try {
            // Simulate repayment process
            console.log(`Repaying BNPL amount: ₹${statement.dueAmount}`);
            await new Promise(resolve => setTimeout(resolve, 1500));
            // Refetch statement and status after payment
            const details = await getBnplStatus();
            const stmt = await getBnplStatement();
            setBnplDetails(details);
            setStatement(stmt);
            toast({ title: "Repayment Successful", description: `Paid ₹${statement.dueAmount} towards your Pay Later bill.` });
        } catch (error: any) {
             console.error("BNPL repayment failed:", error);
             toast({ variant: "destructive", title: "Repayment Failed", description: error.message || "Could not process repayment." });
        } finally {
             setIsProcessing(false);
        }
    }

    const availableLimit = bnplDetails ? bnplDetails.creditLimit - (statement?.dueAmount || 0) : 0;
    const usagePercentage = bnplDetails && bnplDetails.creditLimit > 0 ? ((statement?.dueAmount || 0) / bnplDetails.creditLimit) * 100 : 0;

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/" passHref> {/* Link back to Home or Profile */}
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Wallet className="h-6 w-6" /> {/* Using Wallet icon */}
                <h1 className="text-lg font-semibold">Pay Later</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-6 pb-20">
                {isLoading && <div className="flex justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}

                {!isLoading && !bnplDetails && (
                     <Card className="shadow-md text-center">
                        <CardContent className="p-6">
                            <p className="text-muted-foreground">Could not load Pay Later details.</p>
                        </CardContent>
                    </Card>
                )}

                {!isLoading && bnplDetails && (
                    <>
                        <Card className="shadow-md">
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    <span>Pay Later Status</span>
                                     <Badge variant={bnplDetails.isActive ? "default" : "destructive"} className={bnplDetails.isActive ? "bg-green-100 text-green-700" : ""}>
                                        {bnplDetails.isActive ? 'Active' : 'Inactive'}
                                     </Badge>
                                </CardTitle>
                                <CardDescription>Your Buy Now, Pay Later facility details.</CardDescription>
                            </CardHeader>
                            {bnplDetails.isActive ? (
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Available Limit</Label>
                                        <p className="text-2xl font-bold">₹{availableLimit.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Total Limit: ₹{bnplDetails.creditLimit.toLocaleString()}
                                        </p>
                                    </div>
                                     <Progress value={usagePercentage} aria-label={`${usagePercentage.toFixed(0)}% Used`} />
                                     <p className="text-xs text-muted-foreground text-right">
                                        Used: ₹{(statement?.dueAmount || 0).toLocaleString()}
                                     </p>
                                </CardContent>
                            ) : (
                                <CardContent className="text-center">
                                    <p className="text-muted-foreground mb-4">Pay Later is not active on your account.</p>
                                    <Button onClick={handleActivate} disabled={isProcessing}>
                                         {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <CheckCircle className="h-4 w-4 mr-2"/>}
                                        Activate Pay Later Now
                                    </Button>
                                    <p className="text-xs text-muted-foreground mt-2">(Subject to eligibility check)</p>
                                </CardContent>
                            )}
                        </Card>

                        {bnplDetails.isActive && statement && (
                            <Card className="shadow-md">
                                <CardHeader>
                                    <CardTitle className="flex justify-between items-center">
                                        <span>Current Bill</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Due Date: {format(new Date(statement.dueDate), 'PPP')}
                                        </span>
                                    </CardTitle>
                                     <CardDescription>Your outstanding Pay Later amount for this cycle.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Amount Due:</span>
                                        <span className="text-xl font-bold">₹{statement.dueAmount.toLocaleString()}</span>
                                     </div>
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Minimum Amount Due:</span>
                                        <span className="font-medium">₹{statement.minAmountDue.toLocaleString()}</span>
                                     </div>
                                      <div className="flex justify-between items-center text-sm">
                                         <span className="text-muted-foreground">Billing Period:</span>
                                         <span className="font-medium">
                                             {format(new Date(statement.statementPeriodStart), 'MMM d')} - {format(new Date(statement.statementPeriodEnd), 'MMM d, yyyy')}
                                         </span>
                                      </div>
                                      <Separator/>
                                       <Button className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white" onClick={handleRepay} disabled={isProcessing || statement.dueAmount <= 0}>
                                         {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Wallet className="h-4 w-4 mr-2"/>}
                                        {statement.dueAmount <= 0 ? 'Bill Cleared' : `Pay Now ₹${statement.dueAmount.toLocaleString()}`}
                                     </Button>
                                     <p className="text-xs text-muted-foreground text-center">Late fees may apply if not paid by the due date.</p>
                                     {/* Add View Full Statement Button */}
                                     <Button variant="link" size="sm" className="w-full">View Transaction History</Button>
                                </CardContent>
                            </Card>
                        )}

                        {bnplDetails.isActive && !statement && !isLoading && (
                             <Card className="shadow-md text-center">
                                <CardContent className="p-6">
                                     <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3"/>
                                    <p className="text-muted-foreground">No outstanding bill for the current cycle.</p>
                                </CardContent>
                            </Card>
                        )}


                         <Card className="shadow-md border-blue-500">
                             <CardHeader>
                                 <CardTitle className="flex items-center gap-2 text-blue-700"><Info className="h-5 w-5"/> How Pay Later Works</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-2">
                                <p>Use your Pay Later limit for UPI payments, recharges, bill payments, and online shopping where supported.</p>
                                <p>Your spends are consolidated into a monthly bill.</p>
                                <p>Pay your bill by the due date to avoid late fees and keep using the service.</p>
                                 <p>Repayments can often be made via UPI or Net Banking.</p>
                            </CardContent>
                        </Card>
                    </>
                )}
            </main>
        </div>
    );
}
