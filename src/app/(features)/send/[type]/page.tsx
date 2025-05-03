
'use client';

import { useParams, useRouter } from 'next/navigation'; // Import useRouter
import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, User, Landmark, Banknote, Loader2, Send, X } from 'lucide-react'; // Added X
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { suggestFrequentContacts, SmartPayeeSuggestionInput } from '@/ai/flows/smart-payee-suggestion';
import { getContacts, Payee } from '@/services/contacts'; // Import contact service
import { processUpiPayment, UpiTransaction } from '@/services/upi'; // Import UPI service
import { addTransaction } from '@/services/transactions'; // Import transaction service

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
  const router = useRouter(); // Initialize router
  const type = typeof params.type === 'string' ? (params.type === 'bank' ? 'bank' : 'mobile') : 'mobile'; // Default to mobile

  const [searchTerm, setSearchTerm] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedPayee, setSelectedPayee] = useState<Payee | null>(null);
  const [manualIdentifier, setManualIdentifier] = useState(''); // For manual input
  const [filteredPayees, setFilteredPayees] = useState<Payee[]>([]);
  const [suggestedPayees, setSuggestedPayees] = useState<Payee[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false); // Loading state for search
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
        const allContacts = await getContacts(); // Get all contacts for suggestion base
        const recentContactsData: SmartPayeeSuggestionInput = {
          userId: 'currentUser123', // Replace with actual user ID
          // Use IDs from fetched contacts for better accuracy if API allows
          recentContacts: allContacts.slice(0, 5).map(c => c.id) // Mock recent contacts
        };
        const result = await suggestFrequentContacts(recentContactsData);
        const suggestions = result.suggestedContacts
          .map(id => allContacts.find(p => p.id === id))
          .filter((p): p is Payee => !!p);
        setSuggestedPayees(suggestions);
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
        // Optional: Show non-critical toast
        // toast({ variant: "default", title: "Could not load suggestions" });
      } finally {
        setIsLoadingSuggestions(false);
      }
    };
    fetchSuggestions();
  }, []); // Run only once

    // Function to fetch contacts based on search
    const searchContacts = useCallback(async (term: string) => {
        if (term.trim() === '') {
            setFilteredPayees([]);
            setIsLoadingSearch(false);
            return;
        }
        setIsLoadingSearch(true);
        try {
            const results = await getContacts(term);
            // Filter results further based on the send 'type' if needed
            const relevantResults = results.filter(payee =>
                 type === 'mobile' ? payee.type === 'mobile' : true // Mobile only allows mobile, Bank allows bank/upi id
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
     if (!selectedPayee) { // Only search if no payee is selected
        debouncedSearchContacts(searchTerm);
     } else {
        setFilteredPayees([]); // Clear results if a payee is selected
     }
  }, [searchTerm, selectedPayee, debouncedSearchContacts]);

  const handleSelectPayee = (payee: Payee) => {
    setSelectedPayee(payee);
    setSearchTerm(payee.name); // Fill search bar with name for display
    setManualIdentifier(''); // Clear manual identifier
    setFilteredPayees([]); // Hide dropdown
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

    // Basic validation for UPI ID / Mobile / Account Number (can be improved)
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
        // Simulate payment processing - Replace with actual API call
        // In a real app, this would involve PIN entry securely
        // const paymentResult = await processUpiPayment(targetIdentifier, Number(amount), enteredPin);

        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
        const paymentResult: UpiTransaction = { // Mock success result
             transactionId: `TXN${Date.now()}`,
             amount: Number(amount),
             recipientUpiId: targetIdentifier,
             status: 'Completed',
        };


        // Add to local transaction history (simulation)
        addTransaction({
            type: 'Sent',
            name: targetPayeeName,
            description: `Sent via ${type === 'mobile' ? 'Mobile' : 'UPI/Bank'}`,
            amount: -Number(amount), // Negative for sent
            status: paymentResult.status as Transaction['status'], // Cast status
            upiId: targetIdentifier, // Store the identifier used
        });

         toast({
            title: "Payment Successful",
            description: `₹${amount} sent to ${targetPayeeName}`,
        });

        // Redirect to home or history page after success
        router.push('/');

    } catch (error: any) {
        console.error("Payment failed:", error);
         toast({
            variant: "destructive",
            title: "Payment Failed",
            description: error.message || "Could not complete the transaction.",
         });
         // Add failed transaction to history
          addTransaction({
            type: 'Failed',
            name: targetPayeeName,
            description: `Payment Failed - ${error.message || 'Unknown Error'}`,
            amount: -Number(amount),
            status: 'Failed',
            upiId: targetIdentifier,
        });
    } finally {
       setIsSending(false);
       // Optionally clear form fields here if not redirecting immediately
        // setSelectedPayee(null);
        // setSearchTerm('');
        // setManualIdentifier('');
        // setAmount('');
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
                  value={selectedPayee ? selectedPayee.name : searchTerm} // Show name if selected, else search term
                  onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (selectedPayee) {
                         setSelectedPayee(null); // Deselect if user modifies search after selection
                         setManualIdentifier('');
                      }
                  }}
                  required={!selectedPayee && !manualIdentifier} // Required if nothing is selected/entered
                  className="pr-10" // Make space for loader or clear button
                  disabled={!!selectedPayee} // Disable input if payee is selected from list
                />
                 {isLoadingSearch && !selectedPayee && (
                     <Loader2 className="absolute right-3 top-[34px] h-4 w-4 animate-spin text-muted-foreground" />
                 )}
                 {/* Clear button for search input when not selected */}
                  {searchTerm && !selectedPayee && !isLoadingSearch && (
                     <Button variant="ghost" size="icon" className="absolute right-1 top-[26px] h-7 w-7" onClick={() => setSearchTerm('')}>
                        <X className="h-4 w-4 text-muted-foreground"/>
                    </Button>
                 )}

                 {/* Suggestions/Results Dropdown */}
                 {(!selectedPayee && !isLoadingSearch && (filteredPayees.length > 0 || (searchTerm.trim() === '' && suggestedPayees.length > 0))) && (
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
                                <AvatarImage src={`https://picsum.photos/seed/${payee.avatarSeed}/40/40`} alt={payee.name} data-ai-hint="person avatar"/>
                                <AvatarFallback>{payee.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-medium">{payee.name}</p>
                                <p className="text-xs text-muted-foreground">{payee.identifier}</p>
                            </div>
                            </div>
                        ))}
                        {isLoadingSuggestions && searchTerm.trim() === '' && <p className="p-2 text-sm text-muted-foreground">Loading suggestions...</p>}
                         {(searchTerm.trim() !== '' && filteredPayees.length === 0) && <p className="p-2 text-sm text-muted-foreground">No contacts found.</p>}
                    </div>
                 )}
              </div>

              {/* Selected Payee Display */}
              {selectedPayee && (
                <div className="flex items-center p-3 border border-primary rounded-md bg-primary/5">
                  <Avatar className="h-9 w-9 mr-3">
                     <AvatarImage src={`https://picsum.photos/seed/${selectedPayee.avatarSeed}/40/40`} alt={selectedPayee.name} data-ai-hint="person avatar"/>
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

              {/* Manual Identifier Input (Show only if no payee selected from search/suggestions) */}
               {!selectedPayee && (
                 <div className="space-y-2">
                    <Label htmlFor="manual-identifier">Enter {pageDetails.identifierLabel}</Label>
                    <Input
                    id="manual-identifier"
                    placeholder={`Manually enter ${pageDetails.identifierLabel}`}
                    value={manualIdentifier}
                    onChange={(e) => setManualIdentifier(e.target.value)}
                    required={!selectedPayee} // Required only if no payee selected
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
                    className="pl-7 text-lg font-semibold" // Make amount input larger
                    disabled={!selectedPayee && !manualIdentifier.trim()} // Disable if no recipient identifier
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
