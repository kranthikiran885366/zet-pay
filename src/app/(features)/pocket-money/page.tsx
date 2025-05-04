'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, PiggyBank, Settings, PlusCircle, IndianRupee, BarChart, Bell, CalendarDays, Loader2, GraduationCap, Landmark, HandCoins, Percent, RefreshCw, History } from 'lucide-react'; // Added HandCoins, Percent, RefreshCw, History
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays, differenceInDays } from 'date-fns'; // Import addDays, differenceInDays
import { checkMicroLoanEligibility, applyForMicroLoan, getMicroLoanStatus, repayMicroLoan, MicroLoanStatus, MicroLoanEligibility } from '@/services/loans'; // Import loan services
import { getPocketMoneyConfig, updatePocketMoneyConfig, PocketMoneyConfig, PocketMoneyTransaction, getPocketMoneyTransactions } from '@/services/pocket-money'; // Import pocket money services
import { auth } from '@/lib/firebase'; // Import auth


export default function DigitalPocketMoneyPage() {
    const [config, setConfig] = useState<PocketMoneyConfig | null>(null); // Holds multiple child accounts
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [childTransactions, setChildTransactions] = useState<PocketMoneyTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddingFunds, setIsAddingFunds] = useState(false);
    const [addFundsAmount, setAddFundsAmount] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [currentSettings, setCurrentSettings] = useState<Partial<PocketMoneyConfig['children'][0]>>({}); // For editing child settings
    const [loanStatus, setLoanStatus] = useState<MicroLoanStatus | null>(null);
    const [loanEligibility, setLoanEligibility] = useState<MicroLoanEligibility | null>(null);
    const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
    const [isApplyingLoan, setIsApplyingLoan] = useState(false);
    const [isRepayingLoan, setIsRepayingLoan] = useState(false);
    const [loanAmountToApply, setLoanAmountToApply] = useState('');
    const [repayAmount, setRepayAmount] = useState('');
    const [userId, setUserId] = useState<string | null>(null);


    const { toast } = useToast();

     // Get user ID on mount
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            setUserId(user ? user.uid : null);
        });
        return () => unsubscribe();
    }, []);


    // Fetch initial data (config, loan status) when userId is available
    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [fetchedConfig, fetchedLoanStatus] = await Promise.all([
                    getPocketMoneyConfig(userId),
                    getMicroLoanStatus(userId) // Fetch loan status for the parent/user
                ]);
                setConfig(fetchedConfig);
                setLoanStatus(fetchedLoanStatus);
                // Select the first child by default if config exists and has children
                if (fetchedConfig && fetchedConfig.children.length > 0) {
                    setSelectedChildId(fetchedConfig.children[0].id);
                }
            } catch (error: any) {
                console.error("Failed to fetch initial data:", error);
                toast({ variant: "destructive", title: "Error", description: "Could not load pocket money data." });
                // Set default empty config if fetch fails
                setConfig({ userId, children: [] });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [userId, toast]);

    // Fetch transactions for the selected child
    useEffect(() => {
        if (selectedChildId && userId) {
            // Fetch transactions for the selected child
            // This might need adjustment based on how transactions are stored (parent or child level)
             const fetchChildTransactions = async () => {
                try {
                    // Assuming transactions are linked to the child ID within the parent's data
                    const transactions = await getPocketMoneyTransactions(userId, selectedChildId);
                    setChildTransactions(transactions.slice(0, 5)); // Show latest 5
                } catch (error) {
                     console.error(`Failed to fetch transactions for child ${selectedChildId}:`, error);
                     setChildTransactions([]);
                }
            };
            fetchChildTransactions();
        } else {
            setChildTransactions([]);
        }
    }, [selectedChildId, userId]);

    const selectedChild = config?.children.find(c => c.id === selectedChildId);

    // Add Funds Handler (similar to before, uses config state)
    const handleAddFunds = async () => {
        if (!selectedChild || !addFundsAmount || Number(addFundsAmount) <= 0 || !userId) {
            toast({ variant: "destructive", title: "Invalid Amount or Selection" });
            return;
        }
        const amount = Number(addFundsAmount);
        setIsAddingFunds(true);
        try {
            // TODO: Implement actual fund transfer from parent account
            console.log(`Adding ₹${amount} to ${selectedChild.name}'s account`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API

            // Update local state
            const updatedConfig = {
                ...config!,
                children: config!.children.map(c =>
                    c.id === selectedChildId ? { ...c, balance: c.balance + amount } : c
                )
            };
            setConfig(updatedConfig);
            // Update settings in backend (optional if balance update handles it)
            // await updatePocketMoneyConfig(userId, updatedConfig); // Maybe update whole config? Depends on backend

            // Add transaction (this should ideally happen server-side after fund transfer)
            // const newTx: PocketMoneyTransaction = { id: `txn-${Date.now()}`, childId: selectedChildId, description: 'Funds Added by Parent', amount, date: new Date() };
            // setChildTransactions(prev => [newTx, ...prev].slice(0, 5));

            toast({ title: "Funds Added", description: `₹${amount} added to ${selectedChild.name}'s pocket money.` });
            setAddFundsAmount('');
        } catch (error: any) {
            console.error("Failed to add funds:", error);
            toast({ variant: "destructive", title: "Failed to Add Funds", description: error.message });
        } finally {
            setIsAddingFunds(false);
        }
    };

    // Save Child Settings Handler
    const handleSaveSettings = async () => {
         if (!selectedChild || !currentSettings.name || !userId) {
             toast({ variant: "destructive", title: "Invalid Settings", description:"Child name is required."});
             return;
         }
         setIsLoading(true); // Use main loading state for simplicity
         try {
             // Find the child index to update
             const childIndex = config!.children.findIndex(c => c.id === selectedChildId);
             if (childIndex === -1) throw new Error("Child not found");

             const updatedChildData = { ...config!.children[childIndex], ...currentSettings };
             const updatedChildren = [...config!.children];
             updatedChildren[childIndex] = updatedChildData;

             const updatedConfig = { ...config!, children: updatedChildren };

             // Update backend
             await updatePocketMoneyConfig(userId, updatedConfig);

             setConfig(updatedConfig); // Update local state
             setIsSettingsOpen(false);
             toast({title: "Settings Saved"});
         } catch (error: any) {
              console.error("Failed to save settings:", error);
              toast({ variant: "destructive", title: "Save Failed", description: error.message });
         } finally {
             setIsLoading(false);
             setCurrentSettings({}); // Clear editing state
         }
     };

      // --- Micro-Loan Handlers ---

     const handleCheckEligibility = async () => {
         if (!userId) return;
         setIsCheckingEligibility(true);
         setLoanEligibility(null);
         try {
             const eligibility = await checkMicroLoanEligibility(userId, 5000); // Check for a default/max amount
             setLoanEligibility(eligibility);
             if (!eligibility.eligible) {
                 toast({ variant: "destructive", title: "Not Eligible", description: eligibility.message || "You are currently not eligible for a micro-loan." });
             } else {
                  toast({ title: "Eligibility Checked", description: `You are eligible for a loan up to ₹${eligibility.limit}.` });
             }
         } catch (error: any) {
             console.error("Eligibility check failed:", error);
             toast({ variant: "destructive", title: "Eligibility Check Failed", description: error.message });
         } finally {
             setIsCheckingEligibility(false);
         }
     };

     const handleApplyLoan = async (purpose: 'General' | 'Education' = 'General') => {
         if (!userId || !loanAmountToApply || Number(loanAmountToApply) <= 0) {
             toast({ variant: "destructive", title: "Invalid Amount" });
             return;
         }
         if (!loanEligibility?.eligible || Number(loanAmountToApply) > loanEligibility.limit) {
              toast({ variant: "destructive", title: "Amount Exceeds Limit", description: `You are eligible for up to ₹${loanEligibility?.limit || 0}.` });
             return;
         }
         setIsApplyingLoan(true);
         try {
             const result = await applyForMicroLoan(userId, Number(loanAmountToApply), purpose);
             if (result.success) {
                 toast({ title: "Loan Approved!", description: `₹${loanAmountToApply} credited. Repay by ${format(result.dueDate!, 'PPp')} for 0% interest.` });
                 // Refresh loan status
                 const newStatus = await getMicroLoanStatus(userId);
                 setLoanStatus(newStatus);
                 setLoanAmountToApply('');
                 setLoanEligibility(null); // Reset eligibility check
             } else {
                 throw new Error(result.message || "Loan application failed.");
             }
         } catch (error: any) {
             console.error("Loan application failed:", error);
             toast({ variant: "destructive", title: "Loan Application Failed", description: error.message });
         } finally {
             setIsApplyingLoan(false);
         }
     };

    const handleRepayLoan = async () => {
         if (!userId || !loanStatus?.loanId || !repayAmount || Number(repayAmount) <= 0) {
             toast({ variant: "destructive", title: "Invalid Repayment Details" });
             return;
         }
         setIsRepayingLoan(true);
         try {
            // TODO: Add logic to select payment source (Wallet/Bank)
             const result = await repayMicroLoan(userId, loanStatus.loanId, Number(repayAmount));
             if (result.success) {
                 toast({ title: "Repayment Successful", description: result.message || `₹${repayAmount} paid towards your loan.` });
                 // Refresh loan status
                 const newStatus = await getMicroLoanStatus(userId);
                 setLoanStatus(newStatus);
                 setRepayAmount('');
             } else {
                 throw new Error(result.message || "Repayment failed.");
             }
         } catch (error: any) {
             console.error("Loan repayment failed:", error);
             toast({ variant: "destructive", title: "Repayment Failed", description: error.message });
         } finally {
             setIsRepayingLoan(false);
         }
     };

      // --- End Micro-Loan Handlers ---

      const handlePaySchoolFees = () => {
          if (!selectedChild || !selectedChild.linkedSchoolBillerId) {
              toast({description: "No linked school for this child."});
              return;
          }
          // Check if eligible for SNPL?
          if (loanEligibility?.eligible) {
              const confirmSNPL = confirm(`Do you want to use "Study Now, Pay Later" for the school fees? You are eligible for up to ₹${loanEligibility.limit}.`);
              if (confirmSNPL) {
                  // TODO: Fetch actual fee amount maybe? Or let user enter it in SNPL flow.
                  // For now, just trigger the loan application with 'Education' purpose.
                  // You might need a dedicated SNPL application UI later.
                  setLoanAmountToApply('5000'); // Example amount
                  handleApplyLoan('Education');
                  return;
              }
          }
          // Fallback to regular bill payment flow
          alert(`Redirecting to pay school fees for ${selectedChild.name} (School Biller ID: ${selectedChild.linkedSchoolBillerId}) using regular payment methods.`);
          // router.push(`/bills/education?billerId=${selectedChild.linkedSchoolBillerId}&identifier=...`);
      }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-secondary flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading Pocket Money...</p>
            </div>
        );
    }

    if (!config || config.children.length === 0) {
        return (
             <div className="min-h-screen bg-secondary flex flex-col">
                <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                    <Link href="/services" passHref>
                        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80"><ArrowLeft className="h-5 w-5" /></Button>
                    </Link>
                    <PiggyBank className="h-6 w-6" />
                    <h1 className="text-lg font-semibold">Digital Pocket Money</h1>
                </header>
                <main className="flex-grow p-4 flex items-center justify-center">
                    <Card className="shadow-md w-full max-w-md text-center">
                        <CardContent className="p-6">
                            <PiggyBank className="h-16 w-16 text-primary mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">You haven't set up any child accounts yet.</p>
                             {/* TODO: Add button to navigate to child account setup */}
                            <Button disabled>Setup Child Account (Coming Soon)</Button>
                        </CardContent>
                    </Card>
                </main>
            </div>
        )
    }

    // Ensure selectedChild is set if accounts exist but state is somehow null
    if (!selectedChildId && config.children.length > 0) {
        setSelectedChildId(config.children[0].id);
        return null; // Render will happen on next cycle
    }

    if (!selectedChild) {
         // This case should ideally not be reached if loading/empty state handled correctly
         return <p>Error: No child selected or found.</p>;
    }


    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                    <Link href="/services" passHref>
                         <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80"><ArrowLeft className="h-5 w-5" /></Button>
                    </Link>
                    <PiggyBank className="h-6 w-6" />
                    <h1 className="text-lg font-semibold">Digital Pocket Money</h1>
                </div>
                 {/* Child Selector Dropdown */}
                 {config.children.length > 1 && (
                     <Select value={selectedChildId || ''} onValueChange={(id) => setSelectedChildId(id || null)}>
                         <SelectTrigger className="w-auto h-8 text-xs bg-primary/80 border-none text-primary-foreground max-w-[150px]">
                             <SelectValue placeholder="Select Child"/>
                         </SelectTrigger>
                         <SelectContent>
                             {config.children.map(child => (
                                 <SelectItem key={child.id} value={child.id}>
                                     <div className="flex items-center gap-2">
                                          <Avatar className="h-5 w-5">
                                             <AvatarImage src={`https://picsum.photos/seed/${child.avatarSeed}/20/20`} alt={child.name} data-ai-hint="child avatar"/>
                                             <AvatarFallback>{child.name?.charAt(0)}</AvatarFallback>
                                          </Avatar>
                                         {child.name}
                                     </div>
                                </SelectItem>
                             ))}
                         </SelectContent>
                     </Select>
                 )}
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-6 pb-20">
                 {/* --- Child Wallet Section --- */}
                 <Card className="shadow-md">
                    {/* ... (Child Balance Card - same as before) ... */}
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                         <div className="flex items-center gap-3">
                             <Avatar className="h-12 w-12">
                                <AvatarImage src={`https://picsum.photos/seed/${selectedChild.avatarSeed}/60/60`} alt={selectedChild.name} data-ai-hint="child avatar large"/>
                                <AvatarFallback>{selectedChild.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <CardTitle>{selectedChild.name}'s Wallet</CardTitle>
                         </div>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => { setCurrentSettings({...selectedChild}); setIsSettingsOpen(true); }}>
                                <Settings className="h-5 w-5 text-muted-foreground" />
                            </Button>
                         </DialogTrigger>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-3xl font-bold text-center">₹{selectedChild.balance.toFixed(2)}</p>
                        <div className="flex gap-2">
                             <Input
                                type="number"
                                placeholder="Amount to add"
                                value={addFundsAmount}
                                onChange={e => setAddFundsAmount(e.target.value)}
                                min="1"
                                className="h-9"
                             />
                            <Button size="sm" onClick={handleAddFunds} disabled={isAddingFunds} className="h-9">
                                {isAddingFunds ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-1" />} Add Funds
                            </Button>
                        </div>
                    </CardContent>
                 </Card>

                {/* ... (Allowance Info, Quick Actions, Recent Transactions - same as before) ... */}
                 {/* Allowance Info */}
                 <Card className="shadow-sm border-dashed">
                     <CardContent className="p-3 text-center">
                        {selectedChild.allowanceAmount && selectedChild.allowanceFrequency ? (
                             <p className="text-sm text-muted-foreground">
                                Gets <span className="font-medium text-primary">₹{selectedChild.allowanceAmount}</span> {selectedChild.allowanceFrequency}.
                                {selectedChild.lastAllowanceDate && ` Next on ${format(addDays(new Date(selectedChild.lastAllowanceDate), selectedChild.allowanceFrequency === 'Weekly' ? 7 : selectedChild.allowanceFrequency === 'Monthly' ? 30 : 1), 'MMM d')}`}
                             </p>
                        ) : (
                            <p className="text-sm text-muted-foreground">No automatic allowance set.</p>
                        )}
                        {selectedChild.spendingLimitPerTxn && <p className="text-xs text-muted-foreground">Spending Limit: ₹{selectedChild.spendingLimitPerTxn} per transaction.</p>}
                     </CardContent>
                 </Card>

                {/* Quick Actions */}
                <Card className="shadow-md">
                    <CardHeader className="pb-2">
                         <CardTitle className="text-base">Quick Actions</CardTitle>
                    </CardHeader>
                     <CardContent className="grid grid-cols-2 gap-3">
                         {/* TODO: Add functionality */}
                         <Button variant="outline" disabled><BarChart className="mr-2 h-4 w-4"/> View Spending</Button>
                         <Button variant="outline" disabled><Bell className="mr-2 h-4 w-4"/> Set Task/Goal</Button>
                          <Button variant="outline" onClick={handlePaySchoolFees} disabled={!selectedChild.linkedSchoolBillerId}>
                            <GraduationCap className="mr-2 h-4 w-4"/> Pay School Fees
                         </Button>
                         <Button variant="outline" disabled>Request Funds</Button>
                     </CardContent>
                 </Card>

                {/* Recent Transactions */}
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="text-base">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                         {childTransactions.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No recent transactions.</p>
                         ) : (
                            childTransactions.map(tx => (
                                <div key={tx.id} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">{tx.description}</p>
                                        <p className="text-xs text-muted-foreground">{format(tx.date, 'PPp')}</p>
                                    </div>
                                    <p className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-foreground'}`}>
                                        {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                                    </p>
                                </div>
                            ))
                         )}
                    </CardContent>
                </Card>

                 {/* --- Micro-Loan Section --- */}
                 <Card className="shadow-md border-blue-500">
                     <CardHeader>
                         <CardTitle className="flex items-center gap-2 text-blue-700">
                            <HandCoins className="h-5 w-5"/> Micro-Loans & SNPL
                         </CardTitle>
                         <CardDescription>Short-term loans for students, including "Study Now, Pay Later".</CardDescription>
                     </CardHeader>
                     <CardContent className="space-y-4">
                         {loanStatus && loanStatus.hasActiveLoan ? (
                             // Active Loan View
                             <div>
                                 <p className="text-sm font-medium">Active Loan:</p>
                                 <div className="p-3 border rounded-md bg-muted/50 mt-1 space-y-1">
                                     <p>Amount Due: <span className="font-semibold">₹{loanStatus.amountDue?.toFixed(2)}</span></p>
                                     <p>Due Date: {format(loanStatus.dueDate!, 'PPP')} ({differenceInDays(loanStatus.dueDate!, new Date())} days left)</p>
                                     <p className="text-xs text-muted-foreground">Loan ID: {loanStatus.loanId}</p>
                                 </div>
                                 <div className="mt-3 space-y-2">
                                      <Label htmlFor="repayAmount">Repay Amount (₹)</Label>
                                      <div className="flex gap-2">
                                          <Input id="repayAmount" type="number" placeholder="Enter amount" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} min="1" max={loanStatus.amountDue} />
                                          <Button onClick={handleRepayLoan} disabled={isRepayingLoan || !repayAmount || Number(repayAmount) <= 0}>
                                               {isRepayingLoan ? <Loader2 className="h-4 w-4 animate-spin" /> : "Repay"}
                                           </Button>
                                      </div>
                                 </div>
                             </div>
                         ) : (
                             // No Active Loan View
                             <div>
                                 {!loanEligibility && (
                                     <Button onClick={handleCheckEligibility} disabled={isCheckingEligibility} className="w-full">
                                         {isCheckingEligibility ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Percent className="mr-2 h-4 w-4"/>}
                                         Check Micro-Loan Eligibility
                                     </Button>
                                 )}
                                 {loanEligibility && loanEligibility.eligible && (
                                     <div className="space-y-3">
                                         <p className="text-sm text-green-600 font-medium">✅ Eligible for micro-loan up to ₹{loanEligibility.limit}!</p>
                                         <div className="space-y-1">
                                              <Label htmlFor="loanAmountApply">Amount to Apply (₹)</Label>
                                             <Input id="loanAmountApply" type="number" placeholder="Enter amount" value={loanAmountToApply} onChange={(e) => setLoanAmountToApply(e.target.value)} min="500" max={loanEligibility.limit} />
                                         </div>
                                         <Button onClick={() => handleApplyLoan()} disabled={isApplyingLoan || !loanAmountToApply || Number(loanAmountToApply) <= 0} className="w-full">
                                              {isApplyingLoan ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <HandCoins className="mr-2 h-4 w-4"/>}
                                             Apply for ₹{loanAmountToApply || 'Loan'} (0% interest if paid in 7 days)
                                         </Button>
                                          <Button variant="outline" onClick={() => handleApplyLoan('Education')} disabled={isApplyingLoan || !loanAmountToApply || Number(loanAmountToApply) <= 0} className="w-full">
                                             <GraduationCap className="mr-2 h-4 w-4"/> Apply as Study Now, Pay Later
                                          </Button>
                                     </div>
                                 )}
                                  {loanEligibility && !loanEligibility.eligible && (
                                     <p className="text-sm text-destructive">{loanEligibility.message || "Not eligible for micro-loans currently."}</p>
                                 )}
                             </div>
                         )}
                     </CardContent>
                 </Card>


                 {/* Settings Dialog */}
                 <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                     <DialogContent>
                         <DialogHeader>
                             <DialogTitle>Pocket Money Settings for {selectedChild.name}</DialogTitle>
                             <DialogDescription>Manage allowance and spending controls.</DialogDescription>
                         </DialogHeader>
                         <div className="py-4 space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="child-name">Child's Name</Label>
                                <Input id="child-name" placeholder="Enter name" value={currentSettings.name || ''} onChange={e => setCurrentSettings({...currentSettings, name: e.target.value })} required/>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="allowance-amount">Automatic Allowance Amount (₹)</Label>
                                <Input id="allowance-amount" type="number" min="0" value={currentSettings.allowanceAmount || ''} onChange={e => setCurrentSettings({...currentSettings, allowanceAmount: Number(e.target.value) || 0})}/>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="allowance-freq">Allowance Frequency</Label>
                                <Select value={currentSettings.allowanceFrequency || ''} onValueChange={val => setCurrentSettings({...currentSettings, allowanceFrequency: val as ChildAccount['allowanceFrequency']})}>
                                     <SelectTrigger id="allowance-freq"><SelectValue placeholder="Select Frequency" /></SelectTrigger>
                                     <SelectContent>
                                        <SelectItem value="Daily">Daily</SelectItem>
                                        <SelectItem value="Weekly">Weekly</SelectItem>
                                        <SelectItem value="Monthly">Monthly</SelectItem>
                                        <SelectItem value="None">None</SelectItem> {/* Option to disable */}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="spending-limit">Spending Limit per Transaction (₹) (0 for no limit)</Label>
                                <Input id="spending-limit" type="number" min="0" value={currentSettings.spendingLimitPerTxn || ''} onChange={e => setCurrentSettings({...currentSettings, spendingLimitPerTxn: Number(e.target.value) || 0})}/>
                            </div>
                              <div className="space-y-2">
                                <Label htmlFor="school-biller">Linked School Biller ID (Optional)</Label>
                                <Input id="school-biller" placeholder="Enter School Biller ID for Fee Payment" value={currentSettings.linkedSchoolBillerId || ''} onChange={e => setCurrentSettings({...currentSettings, linkedSchoolBillerId: e.target.value || undefined })}/>
                            </div>
                         </div>
                         <DialogFooter>
                             <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                             <Button onClick={handleSaveSettings} disabled={isLoading}>Save Settings</Button>
                         </DialogFooter>
                     </DialogContent>
                 </Dialog>

            </main>
        </div>
    );
}
