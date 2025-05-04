'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Info, TrendingUp, Target, DollarSign, Settings, PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { subscribeToTransactionHistory, Transaction } from '@/services/transactions'; // Use subscription
import { analyzeSpending, AnalyzeSpendingInput, AnalyzeSpendingOutput } from '@/ai/flows/spending-analysis';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Unsubscribe } from 'firebase/firestore'; // Import Unsubscribe type
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components

interface SpendingCategory {
  category: string;
  amount: number;
  color: string;
}

interface Budget {
  id: string;
  category: string;
  limit: number;
}

const COLORS = ['#008080', '#32CD32', '#FFC107', '#2196F3', '#9C27B0', '#FF5722', '#795548'];

// Function to categorize transactions (simple example, AI can enhance this)
const categorizeTransaction = (tx: Transaction): string => {
    const name = tx.name?.toLowerCase() || ''; // Handle potentially undefined name
    const desc = tx.description?.toLowerCase() || ''; // Handle potentially undefined description
    if (tx.type === 'Recharge' || tx.type === 'Bill Payment') return tx.type;
    if (name.includes('food') || name.includes('restaurant') || name.includes('cafe') || desc.includes('dinner') || desc.includes('lunch')) return 'Food & Dining';
    if (name.includes('grocery') || name.includes('market') || name.includes('supermarket')) return 'Groceries';
    if (name.includes('movie') || name.includes('entertainment') || name.includes('tickets')) return 'Entertainment';
    if (name.includes('shopping') || name.includes('amazon') || name.includes('flipkart') || name.includes('myntra')) return 'Shopping';
    if (name.includes('travel') || name.includes('flight') || name.includes('hotel') || name.includes('uber') || name.includes('ola')) return 'Travel';
    if (tx.type === 'Sent') return 'Transfers';
    if (tx.type === 'Received' || tx.type === 'Cashback') return 'Income/Credits';
    return 'Other';
};

export default function SpendingAnalysisPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [analysis, setAnalysis] = useState<AnalyzeSpendingOutput | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Manages overall page loading (including initial transactions)
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false); // Manages AI analysis loading state
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
    const [currentBudget, setCurrentBudget] = useState<Partial<Budget>>({});
    const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);

    const { toast } = useToast();

     // Load budgets from local storage on mount
    useEffect(() => {
        try {
            const storedBudgets = localStorage.getItem('payfriend-budgets');
            if (storedBudgets) {
                setBudgets(JSON.parse(storedBudgets));
            }
        } catch (error) {
             console.error("Error loading budgets from localStorage:", error);
             // Handle error appropriately, maybe clear corrupted data
             localStorage.removeItem('payfriend-budgets');
        }
    }, []);

    // Function to trigger AI analysis
    const triggerAnalysis = async (currentTransactions: Transaction[]) => {
        if (currentTransactions.length > 0) {
            setIsLoadingAnalysis(true);
            try {
                 const input: AnalyzeSpendingInput = {
                    // Map only essential fields, keep it concise
                    transactionHistory: JSON.stringify(currentTransactions.map(tx => ({
                        name: tx.name,
                        description: tx.description,
                        amount: tx.amount,
                        date: tx.date.toISOString().split('T')[0], // Just date YYYY-MM-DD
                        type: tx.type,
                        status: tx.status,
                    }))),
                    // TODO: Add user preferences if available from profile/settings
                    // userPreferences: JSON.stringify({ spendingGoals: ['Reduce Dining Out'], preferredCategories: ['Travel', 'Groceries'] })
                 };
                 const analysisResult = await analyzeSpending(input);
                 setAnalysis(analysisResult);
                 toast({ title: "Spending Analysis Updated", description: "AI insights generated based on latest transactions." });
             } catch(error) {
                 console.error("Error analyzing spending:", error);
                 toast({ variant: "destructive", title: "Analysis Error", description: "Could not generate spending analysis." });
                 setAnalysis(null);
             } finally {
                 setIsLoadingAnalysis(false);
             }
        } else {
             setAnalysis(null); // No transactions, no analysis
             setIsLoadingAnalysis(false);
        }
    };


     // Fetch transactions using real-time subscription and trigger analysis
    useEffect(() => {
        setIsLoading(true); // Set loading true when starting subscription
        let unsubscribe: Unsubscribe | null = null;

        const setupSubscription = () => {
             unsubscribe = subscribeToTransactionHistory(
                 (fetchedTransactions) => {
                     setTransactions(fetchedTransactions);
                     triggerAnalysis(fetchedTransactions); // Trigger analysis whenever transactions update
                     setIsLoading(false); // Set loading false after first fetch completes
                 },
                 (error) => {
                     console.error("Error fetching transactions:", error);
                      if (error.message !== "User not logged in.") {
                        toast({ variant: "destructive", title: "Error", description: "Could not load transaction data." });
                      }
                     setIsLoading(false); // Also stop loading on error
                 }
             );
        }

        // Wait for auth state before subscribing
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (user) {
                setupSubscription();
            } else {
                setIsLoading(false);
                setTransactions([]); // Clear data if logged out
                setAnalysis(null);
                 if (unsubscribe) unsubscribe(); // Clean up previous subscription if user logs out
            }
        });


        // Cleanup subscription on unmount
        return () => {
            unsubscribeAuth(); // Cleanup auth listener
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [toast]); // Re-subscribe might not be needed often unless user context changes dramatically

    // Process data for charts and budgets based on the current transactions state
    const { spendingData, totalSpending, availableCategories } = useMemo(() => {
        const spending: { [key: string]: number } = {};
        let total = 0;
        const categories = new Set<string>();

        transactions.forEach(tx => {
            if (tx.amount < 0 && tx.status === 'Completed') { // Only completed expenses
                const category = categorizeTransaction(tx);
                categories.add(category);
                spending[category] = (spending[category] || 0) + Math.abs(tx.amount);
                total += Math.abs(tx.amount);
            }
        });

         const spendingData = Object.entries(spending)
            .map(([category, amount], index) => ({
                category,
                amount: Number(amount.toFixed(2)),
                color: COLORS[index % COLORS.length],
            }))
            .sort((a, b) => b.amount - a.amount); // Sort by amount descending

        return { spendingData, totalSpending: total, availableCategories: Array.from(categories).sort() };
    }, [transactions]); // Recalculate when transactions update

     // Budget related functions (remain the same)
    const saveBudget = () => {
        if (!currentBudget.category || !currentBudget.limit || currentBudget.limit <= 0) {
            toast({ variant: "destructive", title: "Invalid Budget", description: "Please select a category and enter a valid limit." });
            return;
        }

        let updatedBudgets;
        if (editingBudgetId) {
            // Update existing budget
            updatedBudgets = budgets.map(b => b.id === editingBudgetId ? { ...b, category: currentBudget.category!, limit: currentBudget.limit! } : b);
        } else {
            // Add new budget - check if category already exists
            if (budgets.some(b => b.category === currentBudget.category)) {
                 toast({ variant: "destructive", title: "Duplicate Budget", description: `A budget for ${currentBudget.category} already exists.` });
                 return;
            }
            const newBudget: Budget = {
                id: `budget-${Date.now()}`,
                category: currentBudget.category!,
                limit: currentBudget.limit!,
            };
            updatedBudgets = [...budgets, newBudget];
        }

        setBudgets(updatedBudgets);
         try {
             localStorage.setItem('payfriend-budgets', JSON.stringify(updatedBudgets));
         } catch (error) {
             console.error("Error saving budgets to localStorage:", error);
             toast({ variant: "destructive", title: "Save Error", description: "Could not save budget." });
             // Optionally revert state change if saving failed
         }
        setIsBudgetDialogOpen(false);
        setCurrentBudget({});
        setEditingBudgetId(null);
        toast({ title: "Budget Saved" });
    };

    const openEditBudgetDialog = (budget: Budget) => {
        setCurrentBudget({ category: budget.category, limit: budget.limit });
        setEditingBudgetId(budget.id);
        setIsBudgetDialogOpen(true);
    };

    const deleteBudget = (id: string) => {
        const updatedBudgets = budgets.filter(b => b.id !== id);
        setBudgets(updatedBudgets);
         try {
             localStorage.setItem('payfriend-budgets', JSON.stringify(updatedBudgets));
         } catch (error) {
             console.error("Error deleting budget from localStorage:", error);
             toast({ variant: "destructive", title: "Delete Error", description: "Could not delete budget." });
              // Optionally revert state change if deleting failed
         }
        toast({ title: "Budget Deleted" });
    };

    const getBudgetProgress = (category: string, limit: number): number => {
        const spent = spendingData.find(s => s.category === category)?.amount || 0;
        return Math.min(100, (spent / limit) * 100);
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
                <TrendingUp className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Spending Analysis & Budgets</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-6 pb-20">
                {isLoading && <div className="flex justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/> <span className="ml-2">Loading data...</span></div>}

                {!isLoading && transactions.length === 0 && (
                     <Card className="shadow-md text-center">
                         <CardContent className="p-6">
                            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                            <p className="text-muted-foreground">No transaction data available for analysis.</p>
                            <p className="text-xs text-muted-foreground mt-1">Make some payments or recharges to see insights.</p>
                         </CardContent>
                     </Card>
                )}

                 {!isLoading && transactions.length > 0 && (
                    <>
                        {/* Spending Overview */}
                        <Card className="shadow-md">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-primary"/> Spending Overview
                                </CardTitle>
                                <CardDescription>Your spending distribution for completed transactions.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {spendingData.length > 0 ? (
                                    <>
                                        <div className="h-60 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={spendingData}
                                                        cx="50%"
                                                        cy="50%"
                                                        labelLine={false}
                                                        outerRadius={80}
                                                        fill="#8884d8"
                                                        dataKey="amount"
                                                        nameKey="category"
                                                        // label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`} // Label might clutter small charts
                                                    >
                                                        {spendingData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip formatter={(value: number, name: string) => [`₹${value.toFixed(2)}`, name]} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <p className="text-center text-lg font-semibold mt-4">Total Spending: ₹{totalSpending.toFixed(2)}</p>
                                    </>
                                ) : (
                                     <p className="text-center text-muted-foreground py-4">No spending data to display (check transaction status).</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* AI Insights */}
                         <Card className="shadow-md">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                     <Info className="h-5 w-5 text-primary"/> AI Insights & Recommendations
                                </CardTitle>
                                <CardDescription>Powered by AI to help you manage your finances.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                {isLoadingAnalysis && <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/> <span className="ml-2 text-muted-foreground">Generating insights...</span></div>}
                                {!isLoadingAnalysis && analysis ? (
                                    <>
                                         <Alert variant="default" className="bg-blue-50 border-blue-200">
                                             <AlertTitle className="font-semibold text-blue-800">Summary</AlertTitle>
                                             <AlertDescription className="text-blue-700">{analysis.summary || 'No summary generated.'}</AlertDescription>
                                         </Alert>
                                          <Alert variant="default" className="bg-yellow-50 border-yellow-200">
                                             <AlertTitle className="font-semibold text-yellow-800">Key Insights</AlertTitle>
                                             <AlertDescription className="text-yellow-700">{analysis.insights || 'No insights generated.'}</AlertDescription>
                                         </Alert>
                                         <Alert variant="default" className="bg-green-50 border-green-200">
                                             <AlertTitle className="font-semibold text-green-800">Recommendations</AlertTitle>
                                             <AlertDescription className="text-green-700">{analysis.recommendations || 'No recommendations generated.'}</AlertDescription>
                                         </Alert>
                                    </>
                                ) : !isLoadingAnalysis && transactions.length > 0 ? (
                                    <p className="text-muted-foreground text-center py-4">Could not generate AI insights at this time.</p>
                                ) : !isLoadingAnalysis && transactions.length === 0 ? (
                                     <p className="text-muted-foreground text-center py-4">No transactions yet to generate insights.</p>
                                ) : null }
                                <Button variant="link" size="sm" className="w-full text-xs" onClick={() => triggerAnalysis(transactions)} disabled={isLoadingAnalysis || transactions.length === 0}>
                                    <RefreshCw className="h-3 w-3 mr-1"/> Regenerate Analysis
                                </Button>
                            </CardContent>
                        </Card>

                         {/* Budgets Section */}
                        <Card className="shadow-md">
                            <CardHeader className="flex flex-row justify-between items-center">
                                <div className="space-y-1">
                                    <CardTitle className="flex items-center gap-2">
                                        <Target className="h-5 w-5 text-primary"/> Budgets
                                    </CardTitle>
                                    <CardDescription>Set and track spending limits by category.</CardDescription>
                                </div>
                                <Dialog open={isBudgetDialogOpen} onOpenChange={(open) => { if (!open) { setCurrentBudget({}); setEditingBudgetId(null); } setIsBudgetDialogOpen(open); }}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" onClick={() => { setCurrentBudget({}); setEditingBudgetId(null); setIsBudgetDialogOpen(true); }}>
                                            <PlusCircle className="mr-2 h-4 w-4"/> Add Budget
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>{editingBudgetId ? 'Edit Budget' : 'Add New Budget'}</DialogTitle>
                                        </DialogHeader>
                                        <div className="py-4 space-y-4">
                                            <div className="space-y-2">
                                                 <Label htmlFor="budget-category">Category</Label>
                                                 <Select
                                                     value={currentBudget.category || ''}
                                                     onValueChange={(value) => setCurrentBudget(prev => ({...prev, category: value}))}
                                                     disabled={!!editingBudgetId} // Disable category change when editing
                                                 >
                                                     <SelectTrigger id="budget-category">
                                                         <SelectValue placeholder="Select Category" />
                                                     </SelectTrigger>
                                                     <SelectContent>
                                                         {availableCategories
                                                             .filter(cat => cat !== 'Income/Credits') // Exclude income from budget categories
                                                             .filter(cat => !budgets.some(b => b.category === cat && b.id !== editingBudgetId)) // Filter out categories already budgeted (except the one being edited)
                                                             .map(cat => (
                                                             <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                         ))}
                                                        {availableCategories.filter(cat => cat !== 'Income/Credits').length === budgets.length && !editingBudgetId && <p className="p-2 text-xs text-muted-foreground">All spending categories budgeted.</p>}
                                                     </SelectContent>
                                                 </Select>
                                             </div>
                                             <div className="space-y-2">
                                                 <Label htmlFor="budget-limit">Monthly Limit (₹)</Label>
                                                 <Input
                                                     id="budget-limit"
                                                     type="number"
                                                     min="1"
                                                     placeholder="Enter amount"
                                                     value={currentBudget.limit || ''}
                                                     onChange={(e) => setCurrentBudget(prev => ({...prev, limit: Number(e.target.value)}))}
                                                 />
                                             </div>
                                        </div>
                                        <DialogFooter>
                                             <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                            <Button onClick={saveBudget}>{editingBudgetId ? 'Save Changes' : 'Add Budget'}</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {budgets.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No budgets set yet. Click 'Add Budget' to create one.</p>}
                                {budgets.map(budget => {
                                     const spent = spendingData.find(s => s.category === budget.category)?.amount || 0;
                                     const progress = getBudgetProgress(budget.category, budget.limit);
                                     const isOverBudget = spent > budget.limit;
                                     const remaining = budget.limit - spent;
                                     return (
                                         <div key={budget.id} className="space-y-1 border-b pb-3 last:border-none last:pb-0">
                                             <div className="flex justify-between items-center">
                                                 <span className="text-sm font-medium">{budget.category}</span>
                                                  <div className="flex items-center gap-1">
                                                     <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => openEditBudgetDialog(budget)}>
                                                        <Edit className="h-3 w-3"/>
                                                    </Button>
                                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteBudget(budget.id)}>
                                                         <Trash2 className="h-3 w-3"/>
                                                     </Button>
                                                  </div>
                                             </div>
                                             <Progress value={progress} aria-label={`${budget.category} budget progress ${progress.toFixed(0)}%`} className={isOverBudget ? '[&>div]:bg-destructive' : ''} />
                                             <div className="flex justify-between text-xs text-muted-foreground">
                                                 <span>Spent: ₹{spent.toFixed(2)}</span>
                                                 {isOverBudget ? (
                                                     <span className="text-destructive">Over by ₹{(spent - budget.limit).toFixed(2)}</span>
                                                 ) : (
                                                    <span className={remaining < budget.limit * 0.1 ? "text-orange-600" : ""}>
                                                         Remaining: ₹{remaining.toFixed(2)}
                                                     </span>
                                                 )}
                                                 <span>Limit: ₹{budget.limit.toFixed(2)}</span>
                                             </div>
                                         </div>
                                     );
                                })}
                            </CardContent>
                        </Card>

                    </>
                )}

            </main>
        </div>
    );}