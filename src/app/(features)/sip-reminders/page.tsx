
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Clock, PlusCircle, Edit, Trash2, CalendarIcon, BellRing } from 'lucide-react';
import Link from 'next/link';
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { mockSipRemindersData, SipReminder } from '@/mock-data/reminders'; 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"; // Import Dialog components
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogTrigger } from "@/components/ui/alert-dialog";


export default function SipRemindersPage() {
    const [reminders, setReminders] = useState<SipReminder[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentReminder, setCurrentReminder] = useState<Partial<SipReminder>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        const storedReminders = localStorage.getItem('payfriend-sip-reminders');
        if (storedReminders) {
            setReminders(JSON.parse(storedReminders));
        } else {
            setReminders(mockSipRemindersData); // Use mock data if nothing in local storage
            localStorage.setItem('payfriend-sip-reminders', JSON.stringify(mockSipRemindersData));
        }
        setIsLoading(false);
    }, []);

    const saveReminder = () => {
        if (!currentReminder.fundName || !currentReminder.sipAmount || currentReminder.sipAmount <= 0 || !currentReminder.sipDate || currentReminder.sipDate < 1 || currentReminder.sipDate > 28 || !currentReminder.frequency) {
            toast({ variant: "destructive", title: "Invalid Input", description: "Please fill all fields correctly. SIP date must be between 1 and 28." });
            return;
        }
        let updatedReminders;
        if (editingId) {
            updatedReminders = reminders.map(r => r.id === editingId ? { ...currentReminder, id: editingId } as SipReminder : r);
            toast({ title: "SIP Reminder Updated!" });
        } else {
            const newReminder = { ...currentReminder, id: `sip-${Date.now()}` } as SipReminder;
            updatedReminders = [...reminders, newReminder];
            toast({ title: "SIP Reminder Added!" });
        }
        setReminders(updatedReminders);
        localStorage.setItem('payfriend-sip-reminders', JSON.stringify(updatedReminders));
        setIsModalOpen(false);
        setCurrentReminder({});
        setEditingId(null);
    };

    const openEditModal = (reminder: SipReminder) => {
        setCurrentReminder(reminder);
        setEditingId(reminder.id);
        setIsModalOpen(true);
    };

    const deleteReminder = (id: string) => {
        const updatedReminders = reminders.filter(r => r.id !== id);
        setReminders(updatedReminders);
        localStorage.setItem('payfriend-sip-reminders', JSON.stringify(updatedReminders));
        toast({ title: "SIP Reminder Deleted" });
    };

    const calculateNextDueDate = (sipDate: number, frequency: 'Monthly' | 'Quarterly'): Date => {
        const today = new Date();
        let nextDate = new Date(today.getFullYear(), today.getMonth(), sipDate);
        // If this month's SIP date has already passed or is today, move to next cycle
        if (nextDate <= today) {
            nextDate.setMonth(nextDate.getMonth() + (frequency === 'Monthly' ? 1 : 3));
        }
        return nextDate;
    };

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Clock className="h-6 w-6" />
        <h1 className="text-lg font-semibold">SIP Reminders & Planning</h1>
      </header>

      <main className="flex-grow p-4 space-y-4 pb-20">
        <Button className="w-full" onClick={() => { setCurrentReminder({frequency: 'Monthly', sipDate: 5}); setEditingId(null); setIsModalOpen(true);}}>
            <PlusCircle className="mr-2 h-4 w-4"/> Add SIP Reminder
        </Button>

        {isLoading && <div className="text-center text-muted-foreground">Loading reminders...</div>}

        {!isLoading && reminders.length === 0 ? (
            <Card className="shadow-md text-center">
                <CardContent className="p-6">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No SIP reminders set up yet.</p>
                </CardContent>
            </Card>
        ) : (
            <div className="space-y-3">
                {reminders.map(reminder => {
                    const nextDueDate = calculateNextDueDate(reminder.sipDate, reminder.frequency);
                    return (
                        <Card key={reminder.id} className="shadow-sm">
                            <CardHeader className="pb-2 flex flex-row justify-between items-start">
                                <div>
                                    <CardTitle className="text-base">{reminder.fundName}</CardTitle>
                                    <CardDescription>₹{reminder.sipAmount.toLocaleString()} / {reminder.frequency}</CardDescription>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModal(reminder)}><Edit className="h-4 w-4"/></Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Delete Reminder?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete the reminder for {reminder.fundName}?</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteReminder(reminder.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardHeader>
                            <CardContent className="text-sm">
                                <p className="flex items-center gap-1 text-primary"><BellRing className="h-4 w-4"/> Next Due: {format(nextDueDate, "PPP")} (Day {reminder.sipDate})</p>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        )}

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editingId ? 'Edit' : 'Add'} SIP Reminder</DialogTitle>
                     <DialogDescription>Set up a reminder for your Systematic Investment Plan.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="fundName" className="text-right">Fund Name</Label>
                        <Input id="fundName" value={currentReminder.fundName || ''} onChange={e => setCurrentReminder({...currentReminder, fundName: e.target.value})} className="col-span-3" placeholder="e.g., Axis Bluechip"/>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="sipAmount" className="text-right">Amount (₹)</Label>
                        <Input id="sipAmount" type="number" value={currentReminder.sipAmount || ''} onChange={e => setCurrentReminder({...currentReminder, sipAmount: Number(e.target.value)})} className="col-span-3" placeholder="e.g., 5000"/>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="sipDate" className="text-right">SIP Date</Label>
                        <Input id="sipDate" type="number" min="1" max="28" value={currentReminder.sipDate || ''} onChange={e => setCurrentReminder({...currentReminder, sipDate: Number(e.target.value)})} className="col-span-3" placeholder="Day of month (1-28)"/>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="frequency" className="text-right">Frequency</Label>
                        <Select value={currentReminder.frequency || 'Monthly'} onValueChange={val => setCurrentReminder({...currentReminder, frequency: val as any})}><SelectTrigger className="col-span-3"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Monthly">Monthly</SelectItem><SelectItem value="Quarterly">Quarterly</SelectItem></SelectContent></Select>
                    </div>
                </div>
                <DialogFooter>
                     <Button variant="outline" onClick={() => {setIsModalOpen(false); setCurrentReminder({}); setEditingId(null);}}>Cancel</Button>
                    <Button onClick={handleSaveReminder}>Save Reminder</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
