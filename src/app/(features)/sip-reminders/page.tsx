'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Clock, PlusCircle, Edit, Trash2, CalendarIcon, BellRing } from 'lucide-react';
import Link from 'next/link';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface SipReminder {
    id: string;
    fundName: string;
    sipAmount: number;
    sipDate: number; // Day of the month (1-28)
    frequency: 'Monthly' | 'Quarterly';
    nextDueDate?: Date; // Calculated
}

const mockSipReminders: SipReminder[] = [
    { id: 'sip1', fundName: 'Axis Bluechip Fund', sipAmount: 5000, sipDate: 5, frequency: 'Monthly' },
    { id: 'sip2', fundName: 'Parag Parikh Flexi Cap', sipAmount: 10000, sipDate: 15, frequency: 'Monthly' },
];

export default function SipRemindersPage() {
    const [reminders, setReminders] = useState<SipReminder[]>(mockSipReminders);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentReminder, setCurrentReminder] = useState<Partial<SipReminder>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const { toast } = useToast();

    const handleSaveReminder = () => {
        if (!currentReminder.fundName || !currentReminder.sipAmount || !currentReminder.sipDate || !currentReminder.frequency) {
            toast({ variant: "destructive", title: "Missing fields" });
            return;
        }
        if (editingId) {
            setReminders(reminders.map(r => r.id === editingId ? { ...currentReminder, id: editingId } as SipReminder : r));
            toast({ title: "SIP Reminder Updated!" });
        } else {
            const newReminder = { ...currentReminder, id: `sip-${Date.now()}` } as SipReminder;
            setReminders([...reminders, newReminder]);
            toast({ title: "SIP Reminder Added!" });
        }
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
        setReminders(reminders.filter(r => r.id !== id));
        toast({ title: "SIP Reminder Deleted" });
    };

    // Calculate next due date (simplified)
    const calculateNextDueDate = (sipDate: number, frequency: 'Monthly' | 'Quarterly'): Date => {
        const today = new Date();
        let nextDate = new Date(today.getFullYear(), today.getMonth(), sipDate);
        if (nextDate < today) {
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

        {reminders.length === 0 ? (
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
                                    <CardDescription>₹{reminder.sipAmount} / {reminder.frequency}</CardDescription>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModal(reminder)}><Edit className="h-4 w-4"/></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteReminder(reminder.id)}><Trash2 className="h-4 w-4"/></Button>
                                </div>
                            </CardHeader>
                            <CardContent className="text-sm">
                                <p className="flex items-center gap-1 text-primary"><BellRing className="h-4 w-4"/> Next Due: {format(nextDueDate, "PPP")} (Day {reminder.sipDate})</p>
                                {/* TODO: Add functionality to link to investment page or mark as paid */}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        )}

        {/* Add/Edit Modal (Simplified) */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>{editingId ? 'Edit' : 'Add'} SIP Reminder</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div><Label htmlFor="fundName">Fund Name</Label><Input id="fundName" value={currentReminder.fundName || ''} onChange={e => setCurrentReminder({...currentReminder, fundName: e.target.value})}/></div>
                        <div><Label htmlFor="sipAmount">SIP Amount (₹)</Label><Input id="sipAmount" type="number" value={currentReminder.sipAmount || ''} onChange={e => setCurrentReminder({...currentReminder, sipAmount: Number(e.target.value)})}/></div>
                        <div><Label htmlFor="sipDate">SIP Date (Day of Month)</Label><Input id="sipDate" type="number" min="1" max="28" value={currentReminder.sipDate || ''} onChange={e => setCurrentReminder({...currentReminder, sipDate: Number(e.target.value)})}/></div>
                        <div><Label htmlFor="frequency">Frequency</Label><Select value={currentReminder.frequency || 'Monthly'} onValueChange={val => setCurrentReminder({...currentReminder, frequency: val as any})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Monthly">Monthly</SelectItem><SelectItem value="Quarterly">Quarterly</SelectItem></SelectContent></Select></div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleSaveReminder}>Save</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

      </main>
    </div>
  );
}
