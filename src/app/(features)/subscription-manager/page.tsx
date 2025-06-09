'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, ListChecks, BellRing, Settings, XCircle, PlusCircle, Edit, Trash2, Info, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { format, addDays, differenceInDays } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";


interface Subscription {
    id: string;
    name: string;
    category: 'OTT' | 'Music' | 'Utility' | 'Software' | 'Other';
    amount: number;
    billingCycle: 'Monthly' | 'Quarterly' | 'Annually';
    nextDueDate: string; // ISO string
    paymentMethod?: string; // e.g., 'Credit Card **** 1234', 'Wallet'
    status: 'Active' | 'Paused' | 'Cancelled';
    autoDetected?: boolean;
}

const mockSubscriptions: Subscription[] = [
    { id: 'sub1', name: 'Netflix Premium', category: 'OTT', amount: 649, billingCycle: 'Monthly', nextDueDate: addDays(new Date(), 10).toISOString(), paymentMethod: 'HDFC Credit Card', status: 'Active', autoDetected: true },
    { id: 'sub2', name: 'Spotify Premium', category: 'Music', amount: 129, billingCycle: 'Monthly', nextDueDate: addDays(new Date(), 5).toISOString(), paymentMethod: 'PayFriend Wallet', status: 'Active', autoDetected: true },
    { id: 'sub3', name: 'Adobe Creative Cloud', category: 'Software', amount: 4230, billingCycle: 'Monthly', nextDueDate: addDays(new Date(), 20).toISOString(), paymentMethod: 'ICICI Debit Card', status: 'Active' },
    { id: 'sub4', name: 'Gym Membership', category: 'Other', amount: 1500, billingCycle: 'Monthly', nextDueDate: addDays(new Date(), -5).toISOString(), paymentMethod: 'Cash (Manual)', status: 'Active' },
    { id: 'sub5', name: 'Old News Subscription', category: 'Other', amount: 99, billingCycle: 'Monthly', nextDueDate: addDays(new Date(), -35).toISOString(), paymentMethod: 'Expired Card', status: 'Cancelled', autoDetected: true },
];

const subscriptionCategories: Subscription['category'][] = ['OTT', 'Music', 'Utility', 'Software', 'Other'];
const billingCycles: Subscription['billingCycle'][] = ['Monthly', 'Quarterly', 'Annually'];

export default function SubscriptionManagerPage() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentSubscription, setCurrentSubscription] = useState<Partial<Subscription>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        const storedSubs = localStorage.getItem('payfriend-subscriptions');
        if (storedSubs) {
            setSubscriptions(JSON.parse(storedSubs).map((s: Subscription) => ({...s, nextDueDate: new Date(s.nextDueDate).toISOString() })));
        } else {
            setSubscriptions(mockSubscriptions.map(s => ({...s, nextDueDate: new Date(s.nextDueDate).toISOString() })));
            localStorage.setItem('payfriend-subscriptions', JSON.stringify(mockSubscriptions));
        }
        setIsLoading(false);
    }, []);

    const saveSubscription = () => {
        if (!currentSubscription.name || !currentSubscription.amount || !currentSubscription.billingCycle || !currentSubscription.nextDueDate || !currentSubscription.category) {
            toast({ variant: "destructive", title: "Missing Fields", description: "Please fill all required fields." });
            return;
        }

        let updatedSubs;
        if (editingId) {
            updatedSubs = subscriptions.map(s => s.id === editingId ? { ...s, ...currentSubscription } as Subscription : s);
        } else {
            const newSub: Subscription = {
                id: `sub-${Date.now()}`,
                status: 'Active',
                ...currentSubscription
            } as Subscription;
            updatedSubs = [...subscriptions, newSub];
        }

        updatedSubs.sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
        setSubscriptions(updatedSubs);
        localStorage.setItem('payfriend-subscriptions', JSON.stringify(updatedSubs));
        setIsModalOpen(false);
        setCurrentSubscription({});
        setEditingId(null);
        toast({ title: `Subscription ${editingId ? 'Updated' : 'Added'}` });
    };

    const handleEdit = (sub: Subscription) => {
        setCurrentSubscription({...sub});
        setEditingId(sub.id);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        const updatedSubs = subscriptions.filter(s => s.id !== id);
        setSubscriptions(updatedSubs);
        localStorage.setItem('payfriend-subscriptions', JSON.stringify(updatedSubs));
        toast({ title: "Subscription Removed" });
    };

    const getDueDateStatus = (dueDate: string, status: Subscription['status']): { text: string; color: string; icon?: React.ElementType } => {
        if (status === 'Cancelled') return { text: 'Cancelled', color: 'text-muted-foreground' };
        if (status === 'Paused') return { text: 'Paused', color: 'text-yellow-600' };

        const today = new Date(); today.setHours(0,0,0,0);
        const due = new Date(dueDate); due.setHours(0,0,0,0);
        const daysDiff = differenceInDays(due, today);

        if (daysDiff < 0) return { text: `Overdue by ${Math.abs(daysDiff)} day(s)`, color: 'text-red-600', icon: AlertCircle };
        if (daysDiff === 0) return { text: 'Due Today', color: 'text-orange-600', icon: AlertCircle };
        if (daysDiff <= 7) return { text: `Due in ${daysDiff} day(s)`, color: 'text-yellow-600', icon: BellRing };
        return { text: `Due ${format(due, 'PP')}`, color: 'text-blue-600', icon: BellRing };
    };


  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <ListChecks className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Subscription Manager</h1>
      </header>

      <main className="flex-grow p-4 space-y-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button variant="outline" className="w-full" onClick={() => { setCurrentSubscription({}); setEditingId(null); setIsModalOpen(true);}}>
                <PlusCircle className="mr-2 h-4 w-4"/> Add Subscription Manually
            </Button>
            <Button className="w-full" onClick={() => toast({description: "Scanning for subscriptions... (Not implemented)"})}>
                <Settings className="mr-2 h-4 w-4"/> Detect Subscriptions
            </Button>
        </div>

        {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
        ) : subscriptions.length === 0 ? (
             <Card className="shadow-md text-center">
                <CardContent className="p-6">
                    <ListChecks className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No subscriptions tracked yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">Add them manually or try auto-detection.</p>
                </CardContent>
            </Card>
        ) : (
            <div className="space-y-3">
                {subscriptions.map(sub => {
                    const { text, color, icon: Icon } = getDueDateStatus(sub.nextDueDate, sub.status);
                    return(
                    <Card key={sub.id} className="shadow-sm">
                        <CardHeader className="flex flex-row justify-between items-start pb-2">
                            <div>
                                <CardTitle className="text-base">{sub.name}</CardTitle>
                                <CardDescription className="text-xs">{sub.category} • ₹{sub.amount}/{sub.billingCycle}</CardDescription>
                            </div>
                            <Badge variant={sub.status === 'Active' ? 'default' : 'outline'} className={sub.status === 'Active' ? 'bg-green-100 text-green-700' : ''}>{sub.status}</Badge>
                        </CardHeader>
                        <CardContent className="text-sm pt-1">
                            <p className={`flex items-center gap-1 text-xs ${color} font-medium`}>
                                {Icon && <Icon className="h-3 w-3"/>} {text}
                            </p>
                            {sub.paymentMethod && <p className="text-xs text-muted-foreground">Paid via: {sub.paymentMethod}</p>}
                            {sub.autoDetected && <p className="text-xs text-blue-500">Auto-detected</p>}
                            <div className="flex gap-2 mt-3">
                                <Button size="xs" variant="outline" onClick={() => handleEdit(sub)}><Edit className="h-3 w-3 mr-1"/> Edit</Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="xs" variant="destructiveOutline"><Trash2 className="h-3 w-3 mr-1"/> Delete</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Delete Subscription?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to remove "{sub.name}"? This won't cancel the actual subscription.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(sub.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                {sub.status === 'Active' && <Button size="xs" variant="outline" onClick={() => toast({description: `Cancellation assistance for ${sub.name}... (Not implemented)`})}>Help Cancel</Button>}
                            </div>
                        </CardContent>
                    </Card>
                );
                })}
            </div>
        )}

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingId ? 'Edit' : 'Add'} Subscription</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                    <div><Label htmlFor="sub-name">Service Name</Label><Input id="sub-name" value={currentSubscription.name || ''} onChange={e => setCurrentSubscription(p => ({...p, name: e.target.value}))}/></div>
                    <div><Label htmlFor="sub-category">Category</Label><Select value={currentSubscription.category || ''} onValueChange={val => setCurrentSubscription(p => ({...p, category: val as Subscription['category']}))}><SelectTrigger><SelectValue placeholder="Select Category"/></SelectTrigger><SelectContent>{subscriptionCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label htmlFor="sub-amount">Amount (₹)</Label><Input id="sub-amount" type="number" value={currentSubscription.amount || ''} onChange={e => setCurrentSubscription(p => ({...p, amount: parseFloat(e.target.value) || 0}))}/></div>
                    <div><Label htmlFor="sub-cycle">Billing Cycle</Label><Select value={currentSubscription.billingCycle || ''} onValueChange={val => setCurrentSubscription(p => ({...p, billingCycle: val as Subscription['billingCycle']}))}><SelectTrigger><SelectValue placeholder="Select Cycle"/></SelectTrigger><SelectContent>{billingCycles.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label htmlFor="sub-due-date">Next Due Date</Label><Input id="sub-due-date" type="date" value={currentSubscription.nextDueDate ? currentSubscription.nextDueDate.split('T')[0] : ''} onChange={e => setCurrentSubscription(p => ({...p, nextDueDate: new Date(e.target.value).toISOString()}))}/></div>
                    <div><Label htmlFor="sub-payment-method">Payment Method (Optional)</Label><Input id="sub-payment-method" value={currentSubscription.paymentMethod || ''} onChange={e => setCurrentSubscription(p => ({...p, paymentMethod: e.target.value}))} /></div>
                    <div><Label htmlFor="sub-notes">Notes (Optional)</Label><Input id="sub-notes" value={currentSubscription.notes || ''} onChange={e => setCurrentSubscription(p => ({...p, notes: e.target.value}))} /></div>
                    <div><Label htmlFor="sub-status">Status</Label><Select value={currentSubscription.status || 'Active'} onValueChange={val => setCurrentSubscription(p => ({...p, status: val as Subscription['status']}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Paused">Paused</SelectItem><SelectItem value="Cancelled">Cancelled</SelectItem></SelectContent></Select></div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={saveSubscription}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
