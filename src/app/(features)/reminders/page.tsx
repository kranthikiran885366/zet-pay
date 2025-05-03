
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BellRing, PlusCircle, Edit, Trash2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays, differenceInDays } from "date-fns";
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface BillReminder {
    id: string;
    billerName: string; // e.g., "Electricity Bill", "Credit Card"
    dueDate: string; // ISO string format
    amount?: number; // Optional amount
    notes?: string;
    category: string; // e.g., Utilities, Finance, Subscription
    isPaid?: boolean; // Track if manually marked as paid
}

const REMINDER_CATEGORIES = ["Utilities", "Finance", "Subscription", "Rent", "Insurance", "Loan", "Other"];

export default function BillRemindersPage() {
    const [reminders, setReminders] = useState<BillReminder[]>([]);
    const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
    const [currentReminder, setCurrentReminder] = useState<Partial<BillReminder>>({});
    const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true); // For initial load

    const { toast } = useToast();

    // Load reminders from local storage on mount
    useEffect(() => {
        setIsLoading(true);
        const storedReminders = localStorage.getItem('payfriend-reminders');
        if (storedReminders) {
            setReminders(JSON.parse(storedReminders));
        }
        // Add mock data if empty
        else {
             const mockReminders: BillReminder[] = [
                { id: 'rem1', billerName: 'Airtel Postpaid', dueDate: addDays(new Date(), 5).toISOString(), amount: 799, category: 'Utilities', isPaid: false },
                { id: 'rem2', billerName: 'HDFC Credit Card', dueDate: addDays(new Date(), 12).toISOString(), category: 'Finance', isPaid: false },
                 { id: 'rem3', billerName: 'Netflix Subscription', dueDate: addDays(new Date(), -2).toISOString(), amount: 499, category: 'Subscription', isPaid: true }, // Example paid overdue
             ];
            setReminders(mockReminders);
             localStorage.setItem('payfriend-reminders', JSON.stringify(mockReminders));
        }
         setIsLoading(false);
    }, []);

    const saveReminder = () => {
        if (!currentReminder.billerName || !currentReminder.dueDate || !currentReminder.category) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please enter biller name, due date, and category." });
            return;
        }

        let updatedReminders;
        if (editingReminderId) {
            // Update existing reminder
             updatedReminders = reminders.map(r =>
                r.id === editingReminderId
                    ? { ...r, ...currentReminder, amount: currentReminder.amount || undefined, notes: currentReminder.notes || undefined } as BillReminder // Ensure correct type
                    : r
            );
        } else {
            // Add new reminder
            const newReminder: BillReminder = {
                id: `rem-${Date.now()}`,
                billerName: currentReminder.billerName!,
                dueDate: currentReminder.dueDate!,
                category: currentReminder.category!,
                amount: currentReminder.amount || undefined,
                notes: currentReminder.notes || undefined,
                isPaid: false, // Default to unpaid
            };
            updatedReminders = [...reminders, newReminder];
        }

        setReminders(updatedReminders.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())); // Sort by due date
        localStorage.setItem('payfriend-reminders', JSON.stringify(updatedReminders));
        setIsReminderDialogOpen(false);
        setCurrentReminder({});
        setEditingReminderId(null);
        toast({ title: "Reminder Saved" });
    };

    const openEditReminderDialog = (reminder: BillReminder) => {
        setCurrentReminder({ ...reminder });
        setEditingReminderId(reminder.id);
        setIsReminderDialogOpen(true);
    };

    const deleteReminder = (id: string) => {
        const updatedReminders = reminders.filter(r => r.id !== id);
        setReminders(updatedReminders);
        localStorage.setItem('payfriend-reminders', JSON.stringify(updatedReminders));
        toast({ title: "Reminder Deleted" });
    };

    const togglePaidStatus = (id: string) => {
        const updatedReminders = reminders.map(r =>
            r.id === id ? { ...r, isPaid: !r.isPaid } : r
        ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        setReminders(updatedReminders);
        localStorage.setItem('payfriend-reminders', JSON.stringify(updatedReminders));
        const reminder = updatedReminders.find(r => r.id === id);
        toast({ title: `Reminder marked as ${reminder?.isPaid ? 'Paid' : 'Unpaid'}` });
    }

    const getDueDateStatus = (dueDate: string, isPaid?: boolean): { text: string; color: string; icon: React.ElementType } => {
        if (isPaid) return { text: 'Paid', color: 'text-green-600', icon: CheckCircle };
        const today = new Date(); today.setHours(0,0,0,0);
        const due = new Date(dueDate); due.setHours(0,0,0,0);
        const daysDiff = differenceInDays(due, today);

        if (daysDiff < 0) return { text: `Overdue by ${Math.abs(daysDiff)} day(s)`, color: 'text-red-600', icon: AlertCircle };
        if (daysDiff === 0) return { text: 'Due Today', color: 'text-orange-600', icon: AlertCircle };
        if (daysDiff === 1) return { text: 'Due Tomorrow', color: 'text-yellow-600', icon: BellRing };
        return { text: `Due in ${daysDiff} days`, color: 'text-blue-600', icon: BellRing };
    }

     // Filter reminders into upcoming/past
    const upcomingReminders = reminders.filter(r => !r.isPaid).sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const pastReminders = reminders.filter(r => r.isPaid).sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());


    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <BellRing className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Bill Reminders</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-6 pb-20">
                 <Dialog open={isReminderDialogOpen} onOpenChange={(open) => { if (!open) { setCurrentReminder({}); setEditingReminderId(null); } setIsReminderDialogOpen(open); }}>
                    <DialogTrigger asChild>
                        <Button className="w-full" onClick={() => { setCurrentReminder({}); setEditingReminderId(null); setIsReminderDialogOpen(true); }}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add New Reminder
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingReminderId ? 'Edit Reminder' : 'Add New Bill Reminder'}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="reminder-name">Biller Name</Label>
                                <Input
                                    id="reminder-name"
                                    placeholder="e.g., Electricity Bill, Rent"
                                    value={currentReminder.billerName || ''}
                                    onChange={(e) => setCurrentReminder(prev => ({ ...prev, billerName: e.target.value }))}
                                />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="reminder-category">Category</Label>
                                <Select
                                    value={currentReminder.category || ''}
                                    onValueChange={(value) => setCurrentReminder(prev => ({ ...prev, category: value }))}
                                >
                                    <SelectTrigger id="reminder-category">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {REMINDER_CATEGORIES.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="reminder-due-date">Due Date</Label>
                                <Input
                                    id="reminder-due-date"
                                    type="date"
                                    value={currentReminder.dueDate ? currentReminder.dueDate.split('T')[0] : ''}
                                    onChange={(e) => setCurrentReminder(prev => ({ ...prev, dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
                                />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="reminder-amount">Amount (₹) - Optional</Label>
                                <Input
                                    id="reminder-amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="Enter amount if known"
                                    value={currentReminder.amount || ''}
                                    onChange={(e) => setCurrentReminder(prev => ({ ...prev, amount: Number(e.target.value) || undefined }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reminder-notes">Notes (Optional)</Label>
                                <Input
                                    id="reminder-notes"
                                    placeholder="e.g., Account ID, Policy No."
                                    value={currentReminder.notes || ''}
                                    onChange={(e) => setCurrentReminder(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                            <Button onClick={saveReminder}>{editingReminderId ? 'Save Changes' : 'Add Reminder'}</Button>
                        </DialogFooter>
                    </DialogContent>
                 </Dialog>

                {isLoading && <div className="flex justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}

                {!isLoading && reminders.length === 0 && (
                    <Card className="shadow-md text-center">
                        <CardContent className="p-6">
                            <BellRing className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">You have no bill reminders set up.</p>
                            <p className="text-xs text-muted-foreground mt-1">Add reminders to never miss a payment!</p>
                        </CardContent>
                    </Card>
                )}

                {/* Upcoming Reminders */}
                 {!isLoading && upcomingReminders.length > 0 && (
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle>Upcoming Bills</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {upcomingReminders.map(reminder => {
                                const { text, color, icon: Icon } = getDueDateStatus(reminder.dueDate, reminder.isPaid);
                                return (
                                     <ReminderCard
                                        key={reminder.id}
                                        reminder={reminder}
                                        statusText={text}
                                        statusColor={color}
                                        statusIcon={Icon}
                                        onEdit={openEditReminderDialog}
                                        onDelete={deleteReminder}
                                        onTogglePaid={togglePaidStatus}
                                    />
                                );
                            })}
                        </CardContent>
                    </Card>
                 )}

                  {/* Past/Paid Reminders */}
                 {!isLoading && pastReminders.length > 0 && (
                     <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle>Paid / Past Reminders</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {pastReminders.map(reminder => {
                                const { text, color, icon: Icon } = getDueDateStatus(reminder.dueDate, reminder.isPaid);
                                return (
                                     <ReminderCard
                                        key={reminder.id}
                                        reminder={reminder}
                                        statusText={text}
                                        statusColor={color}
                                        statusIcon={Icon}
                                        onEdit={openEditReminderDialog}
                                        onDelete={deleteReminder}
                                        onTogglePaid={togglePaidStatus}
                                    />
                                );
                            })}
                        </CardContent>
                    </Card>
                 )}
            </main>
        </div>
    );
}

// Reminder Card Component
interface ReminderCardProps {
    reminder: BillReminder;
    statusText: string;
    statusColor: string;
    statusIcon: React.ElementType;
    onEdit: (reminder: BillReminder) => void;
    onDelete: (id: string) => void;
    onTogglePaid: (id: string) => void;
}

function ReminderCard({ reminder, statusText, statusColor, statusIcon: Icon, onEdit, onDelete, onTogglePaid }: ReminderCardProps) {
    return (
        <div className="border rounded-lg p-3 flex items-center justify-between gap-3 bg-card">
            <div className="flex-grow overflow-hidden">
                 <div className="flex items-center justify-between">
                    <p className="font-semibold truncate">{reminder.billerName}</p>
                     <Badge variant="secondary" className="text-xs shrink-0 ml-2">{reminder.category}</Badge>
                 </div>
                {reminder.amount && <p className="text-sm font-medium text-primary">Amount: ₹{reminder.amount.toLocaleString()}</p>}
                 <p className={`text-xs flex items-center gap-1 ${statusColor} mt-1`}><Icon className="h-3 w-3" /> {statusText}</p>
                 {reminder.notes && <p className="text-xs text-muted-foreground mt-1 truncate">Notes: {reminder.notes}</p>}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-1 shrink-0">
                 <Button
                    size="sm"
                    variant={reminder.isPaid ? "outline" : "default"}
                    className={`h-7 text-xs ${reminder.isPaid ? '' : 'bg-green-600 hover:bg-green-700'}`}
                    onClick={() => onTogglePaid(reminder.id)}
                 >
                     {reminder.isPaid ? <XCircle className="h-3 w-3 mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                     {reminder.isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                 </Button>
                 {/* <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEdit(reminder)}><Edit className="h-4 w-4"/></Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>...</AlertDialogContent> // Simplified for brevity
                 </AlertDialog> */}
             </div>
        </div>
    );
}
