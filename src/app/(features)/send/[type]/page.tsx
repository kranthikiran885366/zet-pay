
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, User, Landmark, Loader2, Send, X } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { suggestFrequentContacts, SmartPayeeSuggestionInput } from '@/ai/flows/smart-payee-suggestion';
import { getContacts, savePayee, subscribeToContacts, Payee } from '@/services/contacts'; // Use subscribeToContacts
import { processUpiPayment, verifyUpiId } from '@/services/upi'; // Removed UpiTransaction import as it's not directly used here
import { addTransaction, Transaction } from '@/services/transactions';
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
import type { Unsubscribe } from 'firebase/firestore'; // Import Unsubscribe

// Debounce function (remains the same)
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
  const [allUserContacts, setAllUserContacts] = useState<Payee[]>([]); // Store all contacts from subscription
  const [suggestedPayees, setSuggestedPayees] = useState<Payee[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true); // Manage contact loading state
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);
  const [verifiedManualName, setVerifiedManualName] = useState<string | null>(null);
  const [manualVerificationError, setManualVerificationError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  const pageDetails = type === 'mobile'
    ? { icon: User, title: "Send to Mobile Contact", placeholder: "Enter Name or Mobile Number", identifierLabel: "Mobile Number" }
    : { icon: Landmark, title: "Send to Bank/UPI ID", placeholder: "Enter Name, UPI ID, or Account No.", identifierLabel: "UPI ID / Account Number" };

    // Check login status
    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            const loggedIn = !!user;
            setIsLoggedIn(loggedIn);
            if (!loggedIn) {
                setIsLoadingContacts(false);
                setAllUserContacts([]);
                setSuggestedPayees([]);
            }
        });
        return () => unsubscribeAuth(); // Cleanup listener
    }, []);


  // Subscribe to contacts
    useEffect(() => {
        if (!isLoggedIn) return; // Don't subscribe if not logged in

        setIsLoadingContacts(true);
        const unsubscribe = subscribeToContacts(
            (contacts) => {
                setAllUserContacts(contacts);
                setIsLoadingContacts(false);
                // Refresh suggestions when contacts change (optional, depends on desired behavior)
                // fetchSuggestions(contacts);
            },
            (error) => {
                console.error("Error subscribing to contacts:", error);
                if (error.message !== "User not logged in.") { // Avoid duplicate if handled by auth state
                    toast({ variant: "destructive", title: "Error Loading Contacts" });
                }
                setIsLoadingContacts(false);
                setAllUserContacts([]); // Clear contacts on error
            }
        );

        return () => {
            if (unsubscribe) unsubscribe(); // Cleanup subscription
        };
    }, [isLoggedIn, toast]); // Add toast as dependency

  // Fetch AI-powered suggestions (only once on mount if logged in)
  useEffect(() => {
      if (!isLoggedIn) return;

      const fetchSuggestions = async (currentContacts: Payee[]) => {
          setIsLoadingSuggestions(true);
          try {
              const currentUserId = auth.currentUser?.uid;
              if (!currentUserId || currentContacts.length === 0) return;

              const recentContactsData: SmartPayeeSuggestionInput = {
                  userId: currentUserId,
                  recentContacts: currentContacts.slice(0, 10).map(c => c.id)
              };
              const result = await suggestFrequentContacts(recentContactsData);
              const suggestions = result.suggestedContacts
                  .map(id => currentContacts.find(p => p.id === id))
                  .filter((p): p is Payee => !!p);
              setSuggestedPayees(suggestions);
          } catch (error) {
              console.error("Failed to fetch suggestions:", error);
          } finally {
              setIsLoadingSuggestions(false);
          }
      };

      // Fetch suggestions based on the initial load of contacts
      // Ensure contacts are loaded before fetching suggestions
      if (!isLoadingContacts && allUserContacts.length > 0) {
            fetchSuggestions(allUserContacts);
        } else if (!isLoadingContacts && allUserContacts.length === 0) {
            setIsLoadingSuggestions(false); // Stop loading if no contacts
        }

       // Intentionally run only when isLoggedIn changes or contacts are loaded initially
       // This prevents re-fetching suggestions every time contacts update in real-time
   }, [isLoggedIn, isLoadingContacts, allUserContacts]);


   // Filter contacts based on search term (client-side filtering)
   const filteredPayees = useMemo(() => {
        if (!searchTerm.trim() || selectedPayee) {
            return [];
        }
        const lowerSearch = searchTerm.toLowerCase();
        return allUserContacts.filter(payee =>
            (type === 'mobile' ? payee.type === 'mobile' : true) && // Type filter
            (payee.name.toLowerCase().includes(lowerSearch) ||
             payee.identifier.toLowerCase().includes(lowerSearch))
        );
    }, [searchTerm, allUserContacts, type, selectedPayee]);


  const handleSelectPayee = (payee: Payee) => {
    setSelectedPayee(payee);
    setSearchTerm(payee.name); // Show name in search bar
    setManualIdentifier(''); // Clear manual input
    setVerifiedManualName(null); // Clear manual verification
    setManualVerificationError(null);
  };

  const handleClearSelection = () => {
    setSelectedPayee(null);
    setSearchTerm('');
    setManualIdentifier('');
    setVerifiedManualName(null);
    setManualVerificationError(null);
   }

   // Debounced UPI ID / Account Verification
    const verifyManualIdentifier = useCallback(async (identifier: string) => {
        if (!identifier || type !== 'bank' || identifier.length < 3) { // Basic length check for bank/upi
            setVerifiedManualName(null);
            setManualVerificationError(null);
            setIsVerifyingManual(false);
            return;
        }
        setIsVerifyingManual(true);
        setVerifiedManualName(null);
        setManualVerificationError(null);
        try {
            const verifiedName = await verifyUpiId(identifier); // Reuse verifyUpiId
            setVerifiedManualName(verifiedName);
            toast({ title: "Recipient Verified", description: `Name: ${verifiedName}` });
        } catch (error: any) {
            console.error("Manual verification failed:", error);
            setManualVerificationError("Invalid or non-existent ID.");
            // toast({ variant: "destructive", title: "Verification Failed" });
        } finally {
            setIsVerifyingManual(false);
        }
    }, [type, toast]);

     const debouncedVerifyManualIdentifier = useCallback(debounce(verifyManualIdentifier, 800), [verifyManualIdentifier]);


  // Trigger verification when manualIdentifier changes (for bank type)
   useEffect(() => {
        if (type === 'bank' && !selectedPayee) {
            debouncedVerifyManualIdentifier(manualIdentifier.trim());
        } else {
             // Clear verification status if type is not bank or a payee is selected
            setVerifiedManualName(null);
            setManualVerificationError(null);
             setIsVerifyingManual(false);
        }
   }, [manualIdentifier, type, selectedPayee, debouncedVerifyManualIdentifier]);


  const handleSendMoney = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetIdentifier = selectedPayee ? selectedPayee.identifier : manualIdentifier.trim();
     // Use verified name if manual, otherwise selected payee name, fallback to identifier
    const targetPayeeName = selectedPayee ? selectedPayee.name : (verifiedManualName || manualIdentifier || 'Recipient');

    if (!targetIdentifier || !amount || Number(amount) <= 0) {
      toast({ variant: "destructive", title: "Invalid Input" });
      return;
    }

    // Basic validation (simplified)
     if (type === 'mobile' && !targetIdentifier.match(/^[6-9]\d{9}$/)) {
        toast({ variant: "destructive", title: "Invalid Mobile Number" });
        return;
     }
     if (type === 'bank' && !targetIdentifier.match(/^[\w.-]+@[\w.-]+$/) && !targetIdentifier.match(/^\d{9,18}$/)) {
         toast({ variant: "destructive", title: "Invalid UPI ID or Account Number" });
         return;
     }
      if (type === 'bank' && !selectedPayee && !verifiedManualName) {
          toast({ variant: "destructive", title: "Recipient Not Verified", description:"Please enter a valid ID and wait for verification." });
          return;
      }

    setIsSending(true);
    console.log("Sending money:", { identifier: targetIdentifier, amount, type });

    try {
        // ** TODO: Integrate secure PIN entry here **
        const enteredPin = prompt("Enter UPI PIN (DEMO ONLY - DO NOT USE IN PROD)"); // SECURITY RISK
        if (!enteredPin) {
            toast({ title: "PIN Entry Cancelled" });
            setIsSending(false);
            return;
        }

        const paymentResult = await processUpiPayment(targetIdentifier, Number(amount), enteredPin, `Payment to ${targetPayeeName}`);

        await addTransaction({
            type: paymentResult.status === 'Completed' ? 'Sent' : 'Failed',
            name: targetPayeeName,
            description: `Sent via ${type === 'mobile' ? 'Mobile' : 'UPI/Bank'} ${paymentResult.message ? `- ${paymentResult.message}` : ''}`,
            amount: -Number(amount),
            status: paymentResult.status as Transaction['status'],
            upiId: targetIdentifier,
            billerId: undefined,
            avatarSeed: selectedPayee?.avatarSeed || targetPayeeName.toLowerCase().replace(/\s+/g, '')
        });

         if (paymentResult.status === 'Completed') {
             toast({ title: "Payment Successful" });
             router.push('/');
         } else {
             throw new Error(paymentResult.message || `Payment ${paymentResult.status}`);
         }

    } catch (error: any) {
        console.error("Payment failed:", error);
        toast({ variant: "destructive", title: "Payment Failed", description: error.message });
          try {
                await addTransaction({
                    type: 'Failed',
                    name: targetPayeeName,
                    description: `Payment Failed - ${error.message || 'Unknown Error'}`,
                    amount: -Number(amount),
                    status: 'Failed',
                    upiId: targetIdentifier,
                    billerId: undefined,
                    avatarSeed: selectedPayee?.avatarSeed || targetPayeeName.toLowerCase().replace(/\s+/g, '')
                });
          } catch (historyError) {
                console.error("Failed to add failed transaction to history:", historyError);
          }
    } finally {
       setIsSending(false);
    }
  };

  // Display either suggestions or filtered results based on search term
  const displayList = searchTerm.trim() === '' ? suggestedPayees : filteredPayees;
  const showSuggestions = searchTerm.trim() === '' && !selectedPayee;
  const showSearchResults = searchTerm.trim() !== '' && !selectedPayee;


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
             <CardDescription>
                 {type === 'mobile'
                 ? "Search contacts by name/number or enter mobile number directly."
                 : "Search contacts or enter UPI ID / Account Number directly."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendMoney} className="space-y-4">
              {/* Payee Search/Input */}
              <div className="space-y-2 relative">
                <Label htmlFor="payee-input">{pageDetails.identifierLabel} or Name</Label>
                 <div className="relative">
                    <Input
                        id="payee-input"
                        placeholder={pageDetails.placeholder}
                        value={selectedPayee ? selectedPayee.name : searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if (selectedPayee) setSelectedPayee(null); // Clear selection if user types again
                            setManualIdentifier(''); // Clear manual input when searching
                            setVerifiedManualName(null);
                             setManualVerificationError(null);
                        }}
                        disabled={!!selectedPayee} // Disable if a payee is selected
                        className="pr-10" // Space for clear button or loader
                    />
                     {(isLoadingContacts || isLoadingSuggestions) && !selectedPayee && (
                         <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                     )}
                      {searchTerm && !selectedPayee && !(isLoadingContacts || isLoadingSuggestions) && (
                         <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7" onClick={handleClearSelection}>
                            <X className="h-4 w-4 text-muted-foreground"/>
                        </Button>
                     )}
                 </div>

                 {/* Suggestions/Results Dropdown */}
                  {(showSuggestions || showSearchResults) && displayList.length > 0 && (
                    <div className="absolute z-10 w-[calc(100%-2rem)] mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        <p className="text-xs font-semibold p-2 text-muted-foreground">
                            {showSuggestions ? 'Suggested Contacts' : 'Search Results'}
                        </p>
                        {displayList.map((payee) => (
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
                    </div>
                 )}
                 {/* No results/suggestions message */}
                 {searchTerm && !selectedPayee && !isLoadingContacts && filteredPayees.length === 0 && (
                      <p className="text-xs text-muted-foreground pt-1">No contacts found matching "{searchTerm}". Enter details manually below.</p>
                 )}
                 {!searchTerm && !selectedPayee && !isLoadingSuggestions && suggestedPayees.length === 0 && (
                      <p className="text-xs text-muted-foreground pt-1">No suggested contacts. Search or enter details manually.</p>
                 )}
              </div>


              {/* Manual Identifier Input & Verification */}
               {!selectedPayee && (
                 <div className="space-y-1">
                    <Label htmlFor="manual-identifier">Enter {pageDetails.identifierLabel}</Label>
                     <div className="relative">
                        <Input
                            id="manual-identifier"
                            placeholder={`Manually enter ${pageDetails.identifierLabel}`}
                            value={manualIdentifier}
                            onChange={(e) => setManualIdentifier(e.target.value)}
                            required={!selectedPayee}
                        />
                         {isVerifyingManual && (
                            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                         )}
                    </div>
                     {/* Verification Status */}
                    {verifiedManualName && type === 'bank' && (
                         <p className="text-xs text-green-600 pt-1">✓ Verified: {verifiedManualName}</p>
                    )}
                     {manualVerificationError && type === 'bank' && (
                         <p className="text-xs text-destructive pt-1">⚠ {manualVerificationError}</p>
                    )}
                </div>
               )}

                 {/* Selected Payee Display (Moved lower for better flow) */}
              {selectedPayee && (
                <div className="flex items-center p-3 border border-primary rounded-md bg-primary/5 mt-4">
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
                    // Enable amount input only when a valid recipient is selected or manually entered+verified
                    disabled={(!selectedPayee && !manualIdentifier.trim()) || (type === 'bank' && !selectedPayee && !verifiedManualName)}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                 type="submit"
                 className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                 disabled={
                     (!selectedPayee && !manualIdentifier.trim()) || // No recipient selected or manually entered
                     !amount || Number(amount) <= 0 || // Invalid amount
                     (type === 'bank' && !selectedPayee && !verifiedManualName) || // Bank transfer without verification
                     isSending || // Already sending
                     isVerifyingManual // Still verifying manual input
                 }
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
