
'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, UserPlus, Users, Check, X, Calculator, Send } from 'lucide-react';
import Link from 'next/link';
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';

// Mock Contact Data (replace with actual contact fetching/search)
interface Contact {
  id: string;
  name: string;
  phone?: string; // Optional phone for display
  avatarSeed: string;
}

const mockContacts: Contact[] = [
  { id: '1', name: "Alice Smith", phone: "+919876543210", avatarSeed: 'alice' },
  { id: '2', name: "Bob Johnson", phone: "+919988776655", avatarSeed: 'bob' },
  { id: '3', name: "Charlie Brown", phone: "+918877665544", avatarSeed: 'charlie' },
  { id: '4', name: "David Williams", phone: "+917766554433", avatarSeed: 'david' },
  { id: '5', name: "Eve Davis", phone: "+916655443322", avatarSeed: 'eve' },
   { id: '6', name: "Frank Miller", phone: "+915544332211", avatarSeed: 'frank' },
];

interface SplitParticipant extends Contact {
  share: number;
  isIncluded: boolean;
}


export default function BillSplitPage() {
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [participants, setParticipants] = useState<SplitParticipant[]>(
      mockContacts.map(c => ({ ...c, share: 0, isIncluded: false })) // Initially no one included
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [splitEqually, setSplitEqually] = useState(true);
  const { toast } = useToast();

   const includedParticipants = participants.filter(p => p.isIncluded);
   const numIncluded = includedParticipants.length;

   // Calculate shares when total amount or participants change
    useEffect(() => {
        if (!totalAmount || Number(totalAmount) <= 0 || numIncluded === 0) {
             setParticipants(prev => prev.map(p => ({ ...p, share: 0 })));
             return;
        }

        const numericTotal = Number(totalAmount);

        if (splitEqually) {
             const equalShare = numericTotal / numIncluded;
             setParticipants(prev => prev.map(p => ({
                 ...p,
                 share: p.isIncluded ? Number(equalShare.toFixed(2)) : 0
             })));
        } else {
            // For unequal split, shares are updated manually via input,
            // but we might need validation or recalculation logic here later.
            // For now, just keep existing manual shares if any.
             validateManualSplit(); // Validate on participant change
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalAmount, numIncluded, splitEqually]); // Rerun when these change

  const handleToggleParticipant = (id: string) => {
    setParticipants(prev =>
      prev.map(p => (p.id === id ? { ...p, isIncluded: !p.isIncluded } : p))
    );
  };

   const handleManualShareChange = (id: string, value: string) => {
        const numericValue = Number(value) || 0; // Default to 0 if invalid
        setParticipants(prev =>
            prev.map(p => (p.id === id ? { ...p, share: numericValue } : p))
        );
        // No need to call validate here, it happens in useEffect or on submit
    };

   // Validate manual split amounts
   const validateManualSplit = (): boolean => {
      if (splitEqually || !totalAmount || Number(totalAmount) <= 0 || numIncluded === 0) return true; // No validation needed or possible

      const numericTotal = Number(totalAmount);
      const currentManualTotal = includedParticipants.reduce((sum, p) => sum + p.share, 0);

       if (Math.abs(currentManualTotal - numericTotal) > 0.01) { // Allow for small floating point differences
            toast({
                variant: "destructive",
                title: "Split Mismatch",
                description: `Manual shares (₹${currentManualTotal.toFixed(2)}) do not add up to the total amount (₹${numericTotal.toFixed(2)}).`,
            });
            return false;
        }
       return true;
   }


   const handleSplitRequest = (e: React.FormEvent) => {
        e.preventDefault();
         if (!totalAmount || Number(totalAmount) <= 0) {
            toast({ variant: "destructive", title: "Invalid Total Amount" });
            return;
        }
        if (numIncluded === 0) {
            toast({ variant: "destructive", title: "No Participants", description: "Please select at least one contact to split with." });
            return;
        }

        if (!splitEqually && !validateManualSplit()) {
            return; // Validation failed, toast shown by validate function
        }

        console.log("Splitting Bill:");
        console.log("Total:", totalAmount);
        console.log("Split Equally:", splitEqually);
        console.log("Participants:", includedParticipants.map(p => ({ id: p.id, name: p.name, share: p.share })));

        // TODO: Implement API call to send split requests
        toast({ title: "Split Request Sent (Simulated)", description: `Requests sent to ${numIncluded} participant(s).` });

        // Optionally reset form
        // setTotalAmount('');
        // setParticipants(mockContacts.map(c => ({ ...c, share: 0, isIncluded: false })));
        // setSearchTerm('');
        // setSplitEqually(true);
   };

   // Filter contacts based on search term
   const filteredContacts = participants.filter(p =>
       p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.phone?.includes(searchTerm)
   );


  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Users className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Split Bill</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-4">
        <form onSubmit={handleSplitRequest}>
            {/* Total Amount Card */}
            <Card className="shadow-md mb-4">
                <CardHeader>
                    <CardTitle>Total Bill Amount</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                        id="totalAmount"
                        type="number"
                        placeholder="0.00"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                        required
                        min="0.01"
                        step="0.01"
                        className="pl-7 text-lg"
                    />
                    </div>
                </CardContent>
            </Card>

            {/* Participants Card */}
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Select Participants ({numIncluded})</CardTitle>
                     <Input
                        placeholder="Search contacts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mt-2"
                    />
                </CardHeader>
                <CardContent className="space-y-3 max-h-60 overflow-y-auto pr-2">
                   {filteredContacts.map((participant) => (
                        <div key={participant.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id={`participant-${participant.id}`}
                                    checked={participant.isIncluded}
                                    onCheckedChange={() => handleToggleParticipant(participant.id)}
                                    aria-label={`Include ${participant.name}`}
                                />
                                <Label htmlFor={`participant-${participant.id}`} className="flex items-center gap-3 cursor-pointer">
                                     <Avatar className="h-9 w-9">
                                        <AvatarImage src={`https://picsum.photos/seed/${participant.avatarSeed}/40/40`} alt={participant.name} data-ai-hint="person avatar"/>
                                        <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium">{participant.name}</p>
                                        {participant.phone && <p className="text-xs text-muted-foreground">{participant.phone}</p>}
                                    </div>
                                </Label>
                            </div>
                             {/* Manual Input Field (only if splitting unequally and participant is included) */}
                             {!splitEqually && participant.isIncluded && (
                                <div className="relative w-24">
                                     <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                                    <Input
                                        type="number"
                                        value={participant.share || ''}
                                        onChange={(e) => handleManualShareChange(participant.id, e.target.value)}
                                        min="0"
                                        step="0.01"
                                        className="pl-5 h-8 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="Share"
                                    />
                                </div>
                             )}
                        </div>
                    ))}
                    {filteredContacts.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No contacts match your search.</p>}
                </CardContent>
            </Card>

            {/* Split Method & Summary Card */}
            <Card className="shadow-md mt-4">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle>Split Method</CardTitle>
                     <div className="flex items-center space-x-2">
                        <Label htmlFor="split-equally">Split Equally</Label>
                        <Switch
                            id="split-equally"
                            checked={splitEqually}
                            onCheckedChange={setSplitEqually}
                            disabled={numIncluded === 0}
                        />
                    </div>
                </CardHeader>
                 {numIncluded > 0 && (
                     <CardContent>
                         <Separator className="mb-3"/>
                          <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Amount per person:</span>
                              <span className="font-semibold">
                                 {splitEqually ? `₹${(Number(totalAmount) / numIncluded || 0).toFixed(2)}` : 'Split Manually'}
                              </span>
                          </div>
                     </CardContent>
                 )}
            </Card>

            {/* Submit Button */}
            <Button type="submit" className="w-full mt-6 bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={numIncluded === 0 || !totalAmount || Number(totalAmount) <= 0}>
                <Send className="mr-2 h-4 w-4" /> Send Split Request{numIncluded > 0 ? ` to ${numIncluded}` : ''}
            </Button>
        </form>
      </main>
    </div>
  );
}
