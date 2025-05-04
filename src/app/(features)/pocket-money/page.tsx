
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, PiggyBank, Settings, PlusCircle, IndianRupee, BarChart, Bell, CalendarDays, Loader2, GraduationCap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Corrected import line
import { format, addDays } from 'date-fns'; // Import addDays

// Mock Data Interfaces
interface ChildAccount {
    id: string;
    name: string;
    avatarSeed: string;
    balance: number;
    allowanceAmount?: number;
    allowanceFrequency?: 'Daily' | 'Weekly' | 'Monthly';
    lastAllowanceDate?: Date;
    spendingLimitPerTxn?: number;
    linkedSchoolBillerId?: string; // For school fee payments
}

interface PocketMoneyTransaction {
    id: string;
    childId: string;
    description: string; // e.g., "Allowance Added", "Ice Cream", "Book Store", "School Fee"
    amount: number; // Positive for allowance, negative for spending
    date: Date;
}

// Mock Data (replace with actual backend/service calls)
const mockChildAccounts: ChildAccount[] = [
    { id: 'child1', name: 'Rohan S.', avatarSeed: 'rohan', balance: 580.50, allowanceAmount: 100, allowanceFrequency: 'Weekly', lastAllowanceDate: new Date(Date.now() - 3 * 86400000), spendingLimitPerTxn: 200 },
    { id: 'child2', name: 'Priya K.', avatarSeed: 'priya', balance: 125.00, allowanceAmount: 50, allowanceFrequency: 'Daily', lastAllowanceDate: new Date(Date.now() - 1 * 86400000) },
];

const mockTransactions: PocketMoneyTransaction[] = [
    { id: 'txn1', childId: 'child1', description: 'Allowance Added', amount: 100, date: new Date(Date.now() - 3 * 86400000) },
    { id: 'txn2', childId: 'child1', description: 'Book Store', amount: -150, date: new Date(Date.now() - 2 * 86400000) },
    { id: 'txn3', childId: 'child1', description: 'Snacks Corner', amount: -45.50, date: new Date(Date.now() - 1 * 86400000) },
    { id: 'txn4', childId: 'child2', description: 'Allowance Added', amount: 50, date: new Date(Date.now() - 1 * 86400000) },
    { id: 'txn5', childId: 'child2', description: 'Toy Shop', amount: -80, date: new Date(Date.now() - 1 * 86400000) },
].sort((a, b) => b.date.getTime() - a.date.getTime());


export default function DigitalPocketMoneyPage() {
    const [childAccounts, setChildAccounts] = useState<ChildAccount[]>([]);
    const [selectedChild, setSelectedChild] = useState<ChildAccount | null>(null);
    const [childTransactions, setChildTransactions] = useState<PocketMoneyTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddingFunds, setIsAddingFunds] = useState(false);
    const [addFundsAmount, setAddFundsAmount] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [currentSettings, setCurrentSettings] = useState<Partial<ChildAccount>>({});

    const { toast } = useToast();

    // Fetch child accounts and select the first one initially
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // TODO: Replace with actual API call to fetch child accounts linked to the parent
                await new Promise(resolve => setTimeout(resolve, 800)); // Simulate loading
                setChildAccounts(mockChildAccounts);
                if (mockChildAccounts.length > 0) {
                    setSelectedChild(mockChildAccounts[0]);
                }
            } catch (error) {
                console.error("Failed to fetch child accounts:", error);
                toast({ variant: "destructive", title: "Error", description: "Could not load child accounts." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [toast]);

    // Fetch transactions for the selected child
    useEffect(() => {
        if (selectedChild) {
            // TODO: Replace with actual API call to fetch transactions for selectedChild.id
            const transactions = mockTransactions.filter(tx => tx.childId === selectedChild.id).slice(0, 5); // Get latest 5 for demo
            setChildTransactions(transactions);
        } else {
            setChildTransactions([]);
        }
    }, [selectedChild]);

    const handleAddFunds = async () => {
        if (!selectedChild || !addFundsAmount || Number(addFundsAmount) <= 0) {
            toast({ variant: "destructive", title: "Invalid Amount" });
            return;
        }
        const amount = Number(addFundsAmount);
        setIsAddingFunds(true);
        try {
            // TODO: Implement API call to add funds to child's wallet
            console.log(`Adding ₹${amount} to ${selectedChild.name}'s account`);
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Update local state (simulation)
            setChildAccounts(prev => prev.map(acc => acc.id === selectedChild.id ? { ...acc, balance: acc.balance + amount } : acc));
            setSelectedChild(prev => prev ? { ...prev, balance: prev.balance + amount } : null);
            // Add transaction locally (simulation)
            const newTx: PocketMoneyTransaction = { id: `txn-${Date.now()}`, childId: selectedChild.id, description: 'Funds Added by Parent', amount, date: new Date() };
            setChildTransactions(prev => [newTx, ...prev].slice(0, 5));

            toast({ title: "Funds Added", description: `₹${amount} added to ${selectedChild.name}'s pocket money.` });
            setAddFundsAmount('');
        } catch (error) {
            console.error("Failed to add funds:", error);
            toast({ variant: "destructive", title: "Failed to Add Funds" });
        } finally {
            setIsAddingFunds(false);
        }
    };

    const handleSaveSettings = () => {
         if (!selectedChild || !currentSettings.allowanceFrequency || !currentSettings.allowanceAmount) {
             toast({ variant: "destructive", title: "Invalid Settings", description:"Please provide allowance details."});
             return;
         }
         // TODO: Implement API call to save settings for selectedChild.id
         console.log("Saving settings for", selectedChild.name, currentSettings);
         setChildAccounts(prev => prev.map(acc => acc.id === selectedChild.id ? {...acc, ...currentSettings } as ChildAccount : acc));
         setSelectedChild(prev => prev ? {...prev, ...currentSettings} as ChildAccount : null);
         setIsSettingsOpen(false);
         toast({title: "Settings Saved"});
     };

      const handlePaySchoolFees = () => {
          if (!selectedChild || !selectedChild.linkedSchoolBillerId) {
              toast({description: "No linked school for this child."});
              return;
          }
          // TODO: Redirect to bill payment page with pre-filled details
          // router.push(`/bills/education?billerId=${selectedChild.linkedSchoolBillerId}&identifier=...`);
          alert(`Redirecting to pay school fees for ${selectedChild.name} (School Biller ID: ${selectedChild.linkedSchoolBillerId})`);
      }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-secondary flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading Pocket Money...</p>
            </div>
        );
    }

    if (childAccounts.length === 0) {
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
    if (!selectedChild && childAccounts.length > 0) {
        setSelectedChild(childAccounts[0]);
        return null; // Render will happen on next cycle
    }

    if (!selectedChild) {
         // This case should ideally not be reached if loading/empty state handled correctly
         return <p>Error: No child selected.</p>;
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
                 {childAccounts.length > 1 && (
                     <Select value={selectedChild.id} onValueChange={(id) => setSelectedChild(childAccounts.find(c => c.id === id) || null)}>
                         <SelectTrigger className="w-auto h-8 text-xs bg-primary/80 border-none text-primary-foreground max-w-[150px]">
                             <SelectValue placeholder="Select Child"/>
                         </SelectTrigger>
                         <SelectContent>
                             {childAccounts.map(child => (
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
                {/* Child Balance Card */}
                <Card className="shadow-md">
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

                 {/* Settings Dialog */}
                 <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <DialogContent>
                        <DialogHeader>
                             <DialogTitle>Pocket Money Settings for {selectedChild.name}</DialogTitle>
                             <DialogDescription>Manage allowance and spending controls.</DialogDescription>
                        </DialogHeader>
                         <div className="py-4 space-y-4">
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
                             {/* TODO: Add School Fee Biller Linking */}
                         </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                             <Button onClick={handleSaveSettings}>Save Settings</Button>
                        </DialogFooter>
                    </DialogContent>
                 </Dialog>

            </main>
        </div>
    );
}

    