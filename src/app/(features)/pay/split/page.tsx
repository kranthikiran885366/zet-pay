
'use client';

import { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, UserPlus, Users, Check, X, Calculator, Send, Loader2 } from 'lucide-react'; // Added Loader2
import Link from 'next/link';
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { Switch } from "@/components/ui/switch"; // Import Switch
import { getContacts, Payee as Contact } from '@/services/contacts'; // Use contact service

// Interface for participants in the split
interface SplitParticipant extends Contact {
  share: number;
  isIncluded: boolean;
}

// Debounce function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
}


export default function BillSplitPage() {
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [allContacts, setAllContacts] = useState<Contact[]>([]); // Store all fetched contacts
  const [participants, setParticipants] = useState<SplitParticipant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [splitEqually, setSplitEqually] = useState(true);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isSendingRequests, setIsSendingRequests] = useState(false);
  const { toast } = useToast();

   // Fetch contacts on mount
   useEffect(() => {
        const fetchInitialContacts = async () => {
            setIsLoadingContacts(true);
            try {
                const contacts = await getContacts();
                setAllContacts(contacts);
                setParticipants(contacts.map(c => ({ ...c, share: 0, isIncluded: false })));
            } catch (error) {
                 console.error("Failed to fetch contacts:", error);
                 toast({ variant: "destructive", title: "Error Loading Contacts" });
                 setParticipants([]); // Clear participants on error
            } finally {
                setIsLoadingContacts(false);
            }
        };
        fetchInitialContacts();
    }, [toast]);

   const includedParticipants = participants.filter(p => p.isIncluded);
   const numIncluded = includedParticipants.length;

   // Calculate shares when total amount or participants change
    useEffect(() => {
        if (!totalAmount || Number(totalAmount) <= 0 || numIncluded === 0) {
             // Reset shares if conditions not met
             setParticipants(prev => prev.map(p => ({ ...p, share: 0 })));
             return;
        }

        const numericTotal = Number(totalAmount);

        if (splitEqually) {
             const equalShare = numericTotal / numIncluded;
             setParticipants(prev => prev.map(p => ({
                 ...p,
                 share: p.isIncluded ? Number(equalShare.toFixed(2)) : p.share // Keep non-included share if needed, though usually 0
             })));
        } else {
             // When switching to unequal, retain existing shares but validate
             validateManualSplit(false); // Validate without showing toast immediately on switch
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalAmount, numIncluded, splitEqually]); // Rerun when these change

  const handleToggleParticipant = (id: string) => {
    setParticipants(prev =>
      prev.map(p => (p.id === id ? { ...p, isIncluded: !p.isIncluded, share: !p.isIncluded ? p.share : 0 } : p)) // Reset share if unchecking
    );
     // Note: useEffect will recalculate shares after state update
  };

   const handleManualShareChange = (id: string, value: string) => {
        // Allow empty input temporarily, treat as 0 for calculation
        const numericValue = value === '' ? 0 : Number(value);
        setParticipants(prev =>
            prev.map(p => (p.id === id ? { ...p, share: numericValue } : p))
        );
        // Validation can happen in useEffect or on submit
    };

   // Validate manual split amounts
   const validateManualSplit = (showToast = true): boolean => {
      if (splitEqually || !totalAmount || Number(totalAmount) <= 0 || numIncluded === 0) return true; // No validation needed or possible

      const numericTotal = Number(totalAmount);
      const currentManualTotal = includedParticipants.reduce((sum, p) => sum + p.share, 0);

       if (Math.abs(currentManualTotal - numericTotal) > 0.01) { // Allow for small floating point differences
           if(showToast) {
                toast({
                    variant: "destructive",
                    title: "Split Mismatch",
                    description: `Manual shares (₹${currentManualTotal.toFixed(2)}) do not add up to the total amount (₹${numericTotal.toFixed(2)}).`,
                });
           }
            return false;
        }
       return true;
   }


   const handleSplitRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSendingRequests(true); // Start loading

         if (!totalAmount || Number(totalAmount) <= 0) {
            toast({ variant: "destructive", title: "Invalid Total Amount" });
            setIsSendingRequests(false);
            return;
        }
        if (numIncluded === 0) {
            toast({ variant: "destructive", title: "No Participants", description: "Please select at least one contact to split with." });
            setIsSendingRequests(false);
            return;
        }

        if (!splitEqually && !validateManualSplit()) {
             setIsSendingRequests(false);
            return; // Validation failed, toast shown by validate function
        }

        console.log("Splitting Bill:");
        console.log("Total:", totalAmount);
        console.log("Split Equally:", splitEqually);
        console.log("Participants:", includedParticipants.map(p => ({ id: p.id, name: p.name, share: p.share })));

        try {
            // TODO: Implement API call to send split requests to each participant
            // Example: await sendSplitRequests(includedParticipants.map(p => ({ id: p.id, share: p.share })), totalAmount);
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call

            toast({ title: "Split Request Sent", description: `Requests sent to ${numIncluded} participant(s).` });

            // Optionally reset form after successful submission
            // setTotalAmount('');
            // setParticipants(allContacts.map(c => ({ ...c, share: 0, isIncluded: false })));
            // setSearchTerm('');
            // setSplitEqually(true);
        } catch (error: any) {
             console.error("Failed to send split requests:", error);
             toast({ variant: "destructive", title: "Failed to Send Requests", description: error.message || "An error occurred." });
        } finally {
           setIsSendingRequests(false); // Stop loading
        }
   };

    // Debounced search function
    const searchContacts = useCallback(async (term: string) => {
         if (!term.trim()) {
             setParticipants(allContacts.map(c => ({ ...c, share: 0, isIncluded: false }))); // Reset to all contacts
             setIsLoadingContacts(false);
             return;
         }
         setIsLoadingContacts(true);
         try {
             const results = await getContacts(term);
             // Preserve inclusion state and share if contact already exists in participants state
             const currentParticipantsMap = new Map(participants.map(p => [p.id, { isIncluded: p.isIncluded, share: p.share }]));
             setParticipants(results.map(c => ({
                ...c,
                share: currentParticipantsMap.get(c.id)?.share || 0,
                isIncluded: currentParticipantsMap.get(c.id)?.isIncluded || false,
            })));
         } catch (error) {
             console.error("Error searching contacts:", error);
             toast({ variant: "destructive", title: "Error Searching Contacts" });
             setParticipants([]); // Clear on search error
         } finally {
             setIsLoadingContacts(false);
         }
     }, [allContacts, participants, toast]);

     const debouncedSearch = useCallback(debounce(searchContacts, 300), [searchContacts]);


   // Filter contacts based on search term using debounced search
   useEffect(() => {
       debouncedSearch(searchTerm);
   }, [searchTerm, debouncedSearch]);


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
                        className="pl-7 text-lg font-semibold"
                    />
                    </div>
                </CardContent>
            </Card>

            {/* Participants Card */}
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Select Participants ({numIncluded})</span>
                         {isLoadingContacts && <Loader2 className="h-5 w-5 animate-spin text-primary"/>}
                    </CardTitle>
                     <Input
                        type="search"
                        placeholder="Search contacts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mt-2"
                    />
                </CardHeader>
                <CardContent className="space-y-3 max-h-60 overflow-y-auto pr-2">
                   {!isLoadingContacts && participants.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            {searchTerm ? "No contacts match your search." : "No contacts found."}
                        </p>
                    )}
                   {!isLoadingContacts && participants.map((participant) => (
                        <div key={participant.id} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 flex-grow overflow-hidden">
                                <Checkbox
                                    id={`participant-${participant.id}`}
                                    checked={participant.isIncluded}
                                    onCheckedChange={() => handleToggleParticipant(participant.id)}
                                    aria-label={`Include ${participant.name}`}
                                    className="flex-shrink-0"
                                />
                                <Label htmlFor={`participant-${participant.id}`} className="flex items-center gap-3 cursor-pointer flex-grow overflow-hidden">
                                     <Avatar className="h-9 w-9 flex-shrink-0">
                                        <AvatarImage src={`https://picsum.photos/seed/${participant.avatarSeed}/40/40`} alt={participant.name} data-ai-hint="person avatar"/>
                                        <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-medium truncate">{participant.name}</p>
                                        {participant.identifier && <p className="text-xs text-muted-foreground truncate">{participant.identifier}</p>}
                                    </div>
                                </Label>
                            </div>
                             {/* Manual Input Field (only if splitting unequally and participant is included) */}
                             {!splitEqually && participant.isIncluded && (
                                <div className="relative w-24 flex-shrink-0">
                                     <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                                    <Input
                                        type="number"
                                        value={participant.share || ''} // Allow empty string for temporary input
                                        onChange={(e) => handleManualShareChange(participant.id, e.target.value)}
                                        min="0"
                                        step="0.01"
                                        className="pl-5 h-8 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="0.00"
                                    />
                                </div>
                             )}
                        </div>
                    ))}

                </CardContent>
            </Card>

            {/* Split Method & Summary Card */}
             {numIncluded > 0 && (
                <Card className="shadow-md mt-4">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>Split Method</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Label htmlFor="split-equally" className="text-sm">Split Equally</Label>
                            <Switch
                                id="split-equally"
                                checked={splitEqually}
                                onCheckedChange={setSplitEqually}
                                disabled={numIncluded === 0}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Separator className="mb-3"/>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Amount per person:</span>
                            <span className="font-semibold">
                                {splitEqually ? `₹${(Number(totalAmount) / numIncluded || 0).toFixed(2)}` : 'Split Manually'}
                            </span>
                        </div>
                         {!splitEqually && (
                            <p className="text-xs text-muted-foreground mt-2">Enter each person's share in the list above.</p>
                         )}
                    </CardContent>
                </Card>
             )}


            {/* Submit Button */}
            <Button
                type="submit"
                className="w-full mt-6 bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                disabled={numIncluded === 0 || !totalAmount || Number(totalAmount) <= 0 || isSendingRequests}
            >
                 {isSendingRequests ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                 {isSendingRequests ? 'Sending Requests...' : `Send Split Request${numIncluded > 0 ? ` to ${numIncluded}` : ''}`}
            </Button>
        </form>
      </main>
    </div>
  );
}

