
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Target, PlusCircle, Edit, Trash2, CheckCircle, XCircle, Loader2, DollarSign } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from '@/components/ui/separator';

interface SavingsGoal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate?: string; // Optional target date as ISO string
}

export default function SavingsGoalsPage() {
    const [goals, setGoals] = useState<SavingsGoal[]>([]);
    const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
    const [currentGoal, setCurrentGoal] = useState<Partial<SavingsGoal>>({});
    const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
    const [isContributing, setIsContributing] = useState<string | null>(null); // Track which goal is being contributed to
    const [contributionAmount, setContributionAmount] = useState<string>('');
    const [showContributeDialog, setShowContributeDialog] = useState(false);
    const [selectedGoalForContribution, setSelectedGoalForContribution] = useState<SavingsGoal | null>(null);

    const { toast } = useToast();

    // Load goals from local storage on mount
    useEffect(() => {
        const storedGoals = localStorage.getItem('payfriend-goals');
        if (storedGoals) {
            setGoals(JSON.parse(storedGoals));
        }
         // Add mock goal if none exist
        else {
             const mockGoal: SavingsGoal = { id: 'mock1', name: 'Dream Vacation', targetAmount: 50000, currentAmount: 12500, targetDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString() };
             setGoals([mockGoal]);
             localStorage.setItem('payfriend-goals', JSON.stringify([mockGoal]));
        }
    }, []);

    const saveGoal = () => {
        if (!currentGoal.name || !currentGoal.targetAmount || currentGoal.targetAmount <= 0) {
            toast({ variant: "destructive", title: "Invalid Goal", description: "Please enter a goal name and a valid target amount." });
            return;
        }

        let updatedGoals;
        if (editingGoalId) {
            // Update existing goal
            updatedGoals = goals.map(g => g.id === editingGoalId ? { ...g, name: currentGoal.name!, targetAmount: currentGoal.targetAmount!, targetDate: currentGoal.targetDate } : g);
        } else {
            // Add new goal
            const newGoal: SavingsGoal = {
                id: `goal-${Date.now()}`,
                name: currentGoal.name!,
                targetAmount: currentGoal.targetAmount!,
                currentAmount: currentGoal.currentAmount || 0, // Initialize current amount
                targetDate: currentGoal.targetDate,
            };
            updatedGoals = [...goals, newGoal];
        }

        setGoals(updatedGoals);
        localStorage.setItem('payfriend-goals', JSON.stringify(updatedGoals));
        setIsGoalDialogOpen(false);
        setCurrentGoal({});
        setEditingGoalId(null);
        toast({ title: "Goal Saved" });
    };

    const openEditGoalDialog = (goal: SavingsGoal) => {
        setCurrentGoal({ name: goal.name, targetAmount: goal.targetAmount, currentAmount: goal.currentAmount, targetDate: goal.targetDate });
        setEditingGoalId(goal.id);
        setIsGoalDialogOpen(true);
    };

    const deleteGoal = (id: string) => {
        const updatedGoals = goals.filter(g => g.id !== id);
        setGoals(updatedGoals);
        localStorage.setItem('payfriend-goals', JSON.stringify(updatedGoals));
        toast({ title: "Goal Deleted" });
    };

     const openContributeDialog = (goal: SavingsGoal) => {
        setSelectedGoalForContribution(goal);
        setContributionAmount('');
        setShowContributeDialog(true);
    };

    const handleContribute = async () => {
        if (!selectedGoalForContribution || !contributionAmount || Number(contributionAmount) <= 0) {
            toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid amount to contribute." });
            return;
        }
        const amount = Number(contributionAmount);
        setIsContributing(selectedGoalForContribution.id);
        try {
            // Simulate saving contribution - In real app, transfer from wallet/bank
            console.log(`Contributing ${amount} to ${selectedGoalForContribution.name}`);
            await new Promise(resolve => setTimeout(resolve, 1000));

             const updatedGoals = goals.map(g =>
                g.id === selectedGoalForContribution.id
                    ? { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + amount) } // Update current amount, cap at target
                    : g
            );

            setGoals(updatedGoals);
            localStorage.setItem('payfriend-goals', JSON.stringify(updatedGoals));
            setShowContributeDialog(false);
            toast({ title: "Contribution Successful!", description: `₹${amount} added to your goal: ${selectedGoalForContribution.name}.` });

        } catch (error) {
            console.error("Contribution failed:", error);
            toast({ variant: "destructive", title: "Contribution Failed" });
        } finally {
            setIsContributing(null);
            setContributionAmount('');
             setSelectedGoalForContribution(null); // Clear selection after attempt
        }
    };


    const getGoalProgress = (current: number, target: number): number => {
        if (target <= 0) return 0;
        return Math.min(100, (current / target) * 100);
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
                <Target className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Savings Goals</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-6 pb-20">
                <Card className="shadow-md">
                    <CardHeader className="flex flex-row justify-between items-center">
                        <div>
                            <CardTitle>Your Goals</CardTitle>
                            <CardDescription>Set financial targets and track your progress.</CardDescription>
                        </div>
                        <Dialog open={isGoalDialogOpen} onOpenChange={(open) => { if (!open) { setCurrentGoal({}); setEditingGoalId(null); } setIsGoalDialogOpen(open); }}>
                            <DialogTrigger asChild>
                                <Button size="sm" onClick={() => { setCurrentGoal({}); setEditingGoalId(null); setIsGoalDialogOpen(true); }}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> New Goal
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{editingGoalId ? 'Edit Goal' : 'Create New Savings Goal'}</DialogTitle>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="goal-name">Goal Name</Label>
                                        <Input
                                            id="goal-name"
                                            placeholder="e.g., Down Payment, Vacation Fund"
                                            value={currentGoal.name || ''}
                                            onChange={(e) => setCurrentGoal(prev => ({ ...prev, name: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="goal-target">Target Amount (₹)</Label>
                                        <Input
                                            id="goal-target"
                                            type="number"
                                            min="1"
                                            placeholder="Enter target amount"
                                            value={currentGoal.targetAmount || ''}
                                            onChange={(e) => setCurrentGoal(prev => ({ ...prev, targetAmount: Number(e.target.value) }))}
                                        />
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="goal-current">Current Amount (₹) - Optional</Label>
                                         <Input
                                            id="goal-current"
                                            type="number"
                                            min="0"
                                            placeholder="Enter current saved amount (if any)"
                                            value={currentGoal.currentAmount || ''}
                                            onChange={(e) => setCurrentGoal(prev => ({...prev, currentAmount: Number(e.target.value)}))}
                                            disabled={!!editingGoalId} // Disable editing current amount directly here
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="goal-date">Target Date (Optional)</Label>
                                        <Input
                                            id="goal-date"
                                            type="date"
                                            value={currentGoal.targetDate ? currentGoal.targetDate.split('T')[0] : ''} // Format for date input
                                            onChange={(e) => setCurrentGoal(prev => ({ ...prev, targetDate: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                    <Button onClick={saveGoal}>{editingGoalId ? 'Save Changes' : 'Create Goal'}</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {goals.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No savings goals set yet. Create your first goal!</p>}
                        {goals.map(goal => {
                            const progress = getGoalProgress(goal.currentAmount, goal.targetAmount);
                            const isCompleted = goal.currentAmount >= goal.targetAmount;
                            return (
                                <Card key={goal.id} className="p-4 border shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-semibold">{goal.name}</p>
                                             {isCompleted ? (
                                                <Badge variant="default" className="bg-green-100 text-green-700 mt-1 text-xs">
                                                    <CheckCircle className="h-3 w-3 mr-1"/> Completed!
                                                </Badge>
                                            ) : goal.targetDate ? (
                                                <p className="text-xs text-muted-foreground">Target Date: {new Date(goal.targetDate).toLocaleDateString()}</p>
                                            ): null}
                                        </div>
                                         <div className="flex items-center gap-1">
                                             <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => openEditGoalDialog(goal)}>
                                                 <Edit className="h-4 w-4" />
                                             </Button>
                                              <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                     <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                                         <Trash2 className="h-4 w-4" />
                                                     </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                     <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Goal?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to delete the goal "{goal.name}"? This action cannot be undone.
                                                        </AlertDialogDescription>
                                                     </AlertDialogHeader>
                                                     <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                         <AlertDialogAction onClick={() => deleteGoal(goal.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                     </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                         </div>
                                    </div>
                                    <Progress value={progress} className="h-3" />
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                        <span>Saved: ₹{goal.currentAmount.toLocaleString()}</span>
                                        <span>Target: ₹{goal.targetAmount.toLocaleString()}</span>
                                    </div>
                                     {!isCompleted && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full mt-3 text-primary border-primary hover:bg-primary/10 hover:text-primary"
                                             onClick={() => openContributeDialog(goal)}
                                              disabled={isContributing === goal.id}
                                        >
                                             {isContributing === goal.id ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <PlusCircle className="h-4 w-4 mr-2"/>}
                                              {isContributing === goal.id ? 'Contributing...' : 'Add Funds'}
                                        </Button>
                                    )}
                                </Card>
                            );
                        })}
                    </CardContent>
                </Card>

                 {/* Contribution Dialog */}
                <Dialog open={showContributeDialog} onOpenChange={setShowContributeDialog}>
                    <DialogContent>
                        <DialogHeader>
                             <DialogTitle>Contribute to "{selectedGoalForContribution?.name}"</DialogTitle>
                             <DialogDescription>
                                Current Amount: ₹{selectedGoalForContribution?.currentAmount.toLocaleString()} / ₹{selectedGoalForContribution?.targetAmount.toLocaleString()}
                             </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-2">
                            <Label htmlFor="contribute-amount">Amount to Add (₹)</Label>
                             <Input
                                id="contribute-amount"
                                type="number"
                                min="1"
                                placeholder="Enter amount"
                                value={contributionAmount}
                                onChange={(e) => setContributionAmount(e.target.value)}
                            />
                            {/* TODO: Add source selection (Wallet/Bank) */}
                        </div>
                         <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                            <Button onClick={handleContribute} disabled={isContributing === selectedGoalForContribution?.id || !contributionAmount || Number(contributionAmount) <= 0}>
                                {isContributing === selectedGoalForContribution?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                                Contribute
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}
