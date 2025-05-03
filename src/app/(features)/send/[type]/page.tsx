
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, User, Landmark, Loader2, Send, X } from 'lucide-react'; // Removed Banknote icon
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { suggestFrequentContacts, SmartPayeeSuggestionInput } from '@/ai/flows/smart-payee-suggestion';
import { getContacts, Payee } from '@/services/contacts'; // Use Firestore contact service
import { processUpiPayment, UpiTransaction } from '@/services/upi';
import { addTransaction } from '@/services/transactions'; // Import transaction service
import { auth } from '@/lib/firebase'; // Import Firebase auth instance

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


export default function SendMoneyPage() {
  const params = useParams();
  const router = useRouter();
  const type = typeof params.type === 'string' ? (params.type === 'bank' ? 'bank' : 'mobile') : 'mobile';

  const [searchTerm, setSearchTerm] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedPayee, setSelectedPayee] = useState<Payee | null>(null);
  const [manualIdentifier, setManualIdentifier] = useState('');
  const [filteredPayees, setFilteredPayees] = useState<Payee[]>([]);
  const [suggestedPayees, setSuggestedPayees] = useState<Payee[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const pageDetails = type === 'mobile'
    ? { icon: User, title: "Send to Mobile Contact", placeholder: "Enter Name or Mobile Number", identifierLabel: "Mobile Number" }
    : { icon: Landmark, title: "Send to Bank/UPI ID", placeholder: "Enter Name, UPI ID, or Account No.", identifierLabel: "UPI ID / Account Number" };

  // Fetch AI-powered suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        // Get contacts from Firestore to base suggestions on
        const allContacts = await getContacts();
        // Get current user ID
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) return; // Need user ID for AI call

        const recentContactsData: SmartPayeeSuggestionInput = {
          userId: currentUserId,
          // Use actual contact IDs for the AI flow
          recentContacts: allContacts.slice(0, 10).map(c => c.id) // Use IDs, limit for demo
        };
        const result = await suggestFrequentContacts(recentContactsData);
        const suggestions = result.suggestedContacts
          .map(id => allContacts.find(p => p.id === id))
          .filter((p): p is Payee => !!p);
        setSuggestedPayees(suggestions);
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
        // Optional: Show non-critical toast
      } finally {
        setIsLoadingSuggestions(false);
      }
    };
    fetchSuggestions();
  }, []);

    // Function to fetch contacts based on search from Firestore
    const searchContacts = useCallback(async (term: string) => {
        if (term.trim() === '') {
            setFilteredPayees([]);
            setIsLoadingSearch(false);
            return;
        }
        setIsLoadingSearch(true);
        try {
            // Use Firestore service to search
            const results = await getContacts(term);
            const relevantResults = results.filter(payee =>
                 type === 'mobile' ? payee.type === 'mobile' : true // Mobile only allows mobile, Bank allows bank/upi id/account
             );
            setFilteredPayees(relevantResults);
        } catch (error) {
             console.error("Failed to search contacts:", error);
             toast({ variant: "destructive", title: "Error Searching Contacts" });
             setFilteredPayees([]);
        } finally {
             setIsLoadingSearch(false);
        }
    }, [type, toast]);

    // Debounced search
    const debouncedSearchContacts = useCallback(debounce(searchContacts, 300), [searchContacts]);


  // Trigger search when searchTerm changes
  useEffect(() => {
     if (!selectedPayee) {
        debouncedSearchContacts(searchTerm);
     } else {
        setFilteredPayees([]);
     }
  }, [searchTerm, selectedPayee, debouncedSearchContacts]);

  const handleSelectPayee = (payee: Payee) => {
    setSelectedPayee(payee);
    setSearchTerm(payee.name);
    setManualIdentifier('');
    setFilteredPayees([]);
  };

  const handleSendMoney = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetIdentifier = selectedPayee ? selectedPayee.identifier : manualIdentifier.trim();
    const targetPayeeName = selectedPayee ? selectedPayee.name : (manualIdentifier || 'Recipient');

    if (!targetIdentifier || !amount || Number(amount) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Please provide a valid recipient and amount.",
      });
      return;
    }

    // Basic validation
     if (type === 'mobile' && !targetIdentifier.match(/^[6-9]\d{9}$/)) {
        toast({ variant: "destructive", title: "Invalid Mobile Number" });
        return;
     }
     if (type === 'bank' && !targetIdentifier.match(/^[\w.-]+@[\w.-]+$/) && !targetIdentifier.match(/^\d{9,18}$/)) {
         toast({ variant: "destructive", title: "Invalid UPI ID or Account Number" });
         return;
     }

    setIsSending(true);
    console.log("Sending money:", { identifier: targetIdentifier, amount, type });

    try {
        // ** TODO: Integrate secure PIN entry here before calling processUpiPayment **
        const enteredPin = prompt("Enter UPI PIN (DEMO ONLY - DO NOT USE IN PROD)"); // SECURITY RISK - FOR DEMO ONLY
        if (!enteredPin) {
            toast({ title: "PIN Entry Cancelled" });
            setIsSending(false);
            return;
        }

        const paymentResult = await processUpiPayment(targetIdentifier, Number(amount), enteredPin, `Payment to ${targetPayeeName}`);

        // Add transaction to Firestore history
        await addTransaction({
            type: paymentResult.status === 'Completed' ? 'Sent' : 'Failed',
            name: targetPayeeName,
            description: `Sent via ${type === 'mobile' ? 'Mobile' : 'UPI/Bank'} ${paymentResult.message ? `- ${paymentResult.message}` : ''}`,
            amount: -Number(amount),
            status: paymentResult.status as Transaction['status'],
            upiId: targetIdentifier,
            billerId: undefined, // Not applicable
        });

         if (paymentResult.status === 'Completed') {
             toast({
                title: "Payment Successful",
                description: `₹${amount} sent to ${targetPayeeName}`,
             });
             router.push('/'); // Redirect on success
         } else {
             throw new Error(paymentResult.message || `Payment ${paymentResult.status}`);
         }

    } catch (error: any) {
        console.error("Payment failed:", error);
         toast({
            variant: "destructive",
            title: "Payment Failed",
            description: error.message || "Could not complete the transaction.",
         });
         // Add failed transaction to history even if processUpiPayment throws
          try {
                await addTransaction({
                    type: 'Failed',
                    name: targetPayeeName,
                    description: `Payment Failed - ${error.message || 'Unknown Error'}`,
                    amount: -Number(amount),
                    status: 'Failed',
                    upiId: targetIdentifier,
                    billerId: undefined,
                });
          } catch (historyError) {
                console.error("Failed to add failed transaction to history:", historyError);
          }
    } finally {
       setIsSending(false);
    }
  };

   const handleClearSelection = () => {
        setSelectedPayee(null);
        setSearchTerm('');
        setManualIdentifier('');
        setFilteredPayees([]);
   }

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <pageDetails.icon className="h-6 w-6" />
        <h1 className="text-lg font-semibold">{pageDetails.title}</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Enter Payment Details</CardTitle>
            <CardDescription>Search for a contact or enter {pageDetails.identifierLabel} directly.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendMoney} className="space-y-4">
              {/* Payee Search/Input */}
              <div className="space-y-2 relative">
                <Label htmlFor="payee-input">{pageDetails.identifierLabel} or Name</Label>
                <Input
                  id="payee-input"
                  placeholder={pageDetails.placeholder}
                  value={selectedPayee ? selectedPayee.name : searchTerm}
                  onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (selectedPayee) {
                         setSelectedPayee(null);
                         setManualIdentifier('');
                      }
                  }}
                  required={!selectedPayee && !manualIdentifier}
                  className="pr-10"
                  disabled={!!selectedPayee}
                />
                 {isLoadingSearch && !selectedPayee && (
                     <Loader2 className="absolute right-3 top-[34px] h-4 w-4 animate-spin text-muted-foreground" />
                 )}
                  {searchTerm && !selectedPayee && !isLoadingSearch && (
                     <Button variant="ghost" size="icon" className="absolute right-1 top-[26px] h-7 w-7" onClick={() => setSearchTerm('')}>
                        <X className="h-4 w-4 text-muted-foreground"/>
                    </Button>
                 )}

                 {/* Suggestions/Results Dropdown */}
                 {(!selectedPayee && (filteredPayees.length > 0 || (searchTerm.trim() === '' && suggestedPayees.length > 0))) && (
                    <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        <p className="text-xs font-semibold p-2 text-muted-foreground">
                            {searchTerm.trim() === '' ? 'Suggested Contacts' : 'Search Results'}
                        </p>
                        {(searchTerm.trim() === '' ? suggestedPayees : filteredPayees).map((payee) => (
                            <div
                            key={payee.id}
                            className="flex items-center p-2 hover:bg-accent cursor-pointer"
                            onClick={() => handleSelectPayee(payee)}
                            >
                            <Avatar className="h-8 w-8 mr-3">
                                <AvatarImage src={`https://picsum.photos/seed/${payee.avatarSeed || payee.id}/40/40`} alt={payee.name} data-ai-hint="person avatar"/>
                                <AvatarFallback>{payee.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-medium">{payee.name}</p>
                                <p className="text-xs text-muted-foreground">{payee.identifier}</p>
                            </div>
                            </div>
                        ))}
                        {isLoadingSuggestions && searchTerm.trim() === '' && !isLoadingSearch && <p className="p-2 text-sm text-muted-foreground">Loading suggestions...</p>}
                         {(searchTerm.trim() !== '' && !isLoadingSearch && filteredPayees.length === 0) && <p className="p-2 text-sm text-muted-foreground">No contacts found.</p>}
                    </div>
                 )}
              </div>

              {/* Selected Payee Display */}
              {selectedPayee && (
                <div className="flex items-center p-3 border border-primary rounded-md bg-primary/5">
                  <Avatar className="h-9 w-9 mr-3">
                     <AvatarImage src={`https://picsum.photos/seed/${selectedPayee.avatarSeed || selectedPayee.id}/40/40`} alt={selectedPayee.name} data-ai-hint="person avatar"/>
                    <AvatarFallback>{selectedPayee.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow overflow-hidden">
                    <p className="text-sm font-medium truncate">{selectedPayee.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{selectedPayee.identifier}</p>
                  </div>
                   <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleClearSelection}>
                        <X className="h-4 w-4"/>
                    </Button>
                </div>
              )}

              {/* Manual Identifier Input */}
               {!selectedPayee && (
                 <div className="space-y-2">
                    <Label htmlFor="manual-identifier">Enter {pageDetails.identifierLabel}</Label>
                    <Input
                    id="manual-identifier"
                    placeholder={`Manually enter ${pageDetails.identifierLabel}`}
                    value={manualIdentifier}
                    onChange={(e) => setManualIdentifier(e.target.value)}
                    required={!selectedPayee}
                    />
                </div>
               )}

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    min="1"
                    step="0.01"
                    className="pl-7 text-lg font-semibold"
                    disabled={!selectedPayee && !manualIdentifier.trim()}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                 type="submit"
                 className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                 disabled={(!selectedPayee && !manualIdentifier.trim()) || !amount || Number(amount) <= 0 || isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Proceed to Pay
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
      