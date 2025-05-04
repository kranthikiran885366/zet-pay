
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, User, Landmark, Loader2, Send, X, UserPlus } from 'lucide-react'; // Added UserPlus
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { suggestFrequentContacts, SmartPayeeSuggestionInput } from '@/ai/flows/smart-payee-suggestion';
import { subscribeToContacts, savePayee, PayeeClient as Payee } from '@/services/contacts'; // Use client interface
import { processUpiPayment, verifyUpiId } from '@/services/upi';
// Transaction import not needed here as processUpiPayment handles logging internally
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
import type { Unsubscribe } from 'firebase/firestore'; // Import Unsubscribe
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  const [manualPayeeName, setManualPayeeName] = useState(''); // For saving new payee
  const [allUserContacts, setAllUserContacts] = useState<Payee[]>([]); // Store all contacts from subscription
  const [suggestedPayees, setSuggestedPayees] = useState<Payee[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true); // Manage contact loading state
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);
  const [verifiedManualName, setVerifiedManualName] = useState<string | null>(null);
  const [manualVerificationError, setManualVerificationError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showSavePayeeDialog, setShowSavePayeeDialog] = useState(false);
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
            // Pass searchTerm here ONLY if you want server-side filtering (requires index setup)
            // For client-side filtering, handle it in useMemo below
        );

        // Cleanup function
        return () => {
            if (unsubscribe) {
                console.log("Unsubscribing from contacts");
                unsubscribe();
            }
        };
    }, [isLoggedIn, toast]); // Add toast as dependency

  // Fetch AI-powered suggestions (only once on mount if logged in and contacts available)
  useEffect(() => {
      if (!isLoggedIn || isLoadingContacts) return; // Wait for login and contacts load

      const fetchSuggestions = async (currentContacts: Payee[]) => {
          setIsLoadingSuggestions(true);
          try {
              const currentUserId = auth.currentUser?.uid;
              // Only fetch if contacts exist
              if (!currentUserId || currentContacts.length === 0) {
                   setIsLoadingSuggestions(false); // Stop loading if no contacts
                   return;
               }

              const recentContactsData: SmartPayeeSuggestionInput = {
                  userId: currentUserId,
                  // Use actual contact IDs for suggestions
                  recentContacts: currentContacts.slice(0, 10).map(c => c.id)
              };
              const result = await suggestFrequentContacts(recentContactsData);
              const suggestions = result.suggestedContacts
                  .map(id => currentContacts.find(p => p.id === id))
                  .filter((p): p is Payee => !!p); // Type guard
              setSuggestedPayees(suggestions);
          } catch (error) {
              console.error("Failed to fetch suggestions:", error);
              // Optionally inform user that suggestions failed
          } finally {
              setIsLoadingSuggestions(false);
          }
      };

      // Fetch suggestions once contacts are loaded
      fetchSuggestions(allUserContacts);

   }, [isLoggedIn, isLoadingContacts, allUserContacts]); // Dependencies ensure it runs when logged in and contacts are ready


   // Filter contacts based on search term (client-side filtering)
   const filteredPayees = useMemo(() => {
        if (!searchTerm.trim() || selectedPayee) {
            return []; // No results if nothing searched or payee already selected
        }
        const lowerSearch = searchTerm.toLowerCase();
        // Filter from the real-time updated contact list
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
    setManualPayeeName(''); // Clear name for saving
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
            setManualPayeeName(verifiedName); // Pre-fill name for saving
            toast({ title: "Recipient Verified", description: `Name: ${verifiedName}` });
        } catch (error: any) {
            console.error("Manual verification failed:", error);
            setManualVerificationError("Invalid or non-existent ID.");
            setManualPayeeName(''); // Clear name on error
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
             setManualPayeeName(''); // Clear name if switching away
        }
   }, [manualIdentifier, type, selectedPayee, debouncedVerifyManualIdentifier]);

  const handleInitiateSavePayee = () => {
      // Pre-fill name if verified
      if (verifiedManualName && !selectedPayee) {
          setManualPayeeName(verifiedManualName);
      }
      setShowSavePayeeDialog(true);
  };

  const handleConfirmSavePayee = async () => {
     if (!manualIdentifier || !manualPayeeName) {
         toast({ variant: "destructive", title: "Missing Details", description: "Please enter identifier and name to save." });
         return;
     }
     try {
         const newPayeeData: Omit<Payee, 'id' | 'userId' | 'avatarSeed' | 'createdAt' | 'updatedAt'> = {
             name: manualPayeeName,
             identifier: manualIdentifier,
             type: type, // Use current page type
             // Optionally add upiId, accountNumber, ifsc based on input type
             upiId: type === 'bank' && manualIdentifier.includes('@') ? manualIdentifier : undefined,
             accountNumber: type === 'bank' && !manualIdentifier.includes('@') ? manualIdentifier : undefined,
             isFavorite: false, // Default favorite status
         };
         const saved = await savePayee(newPayeeData);
         toast({ title: "Payee Saved", description: `${saved.name} added to your contacts.` });
         setShowSavePayeeDialog(false);
         handleSelectPayee(saved); // Auto-select the newly saved payee
     } catch (error: any) {
         console.error("Failed to save payee:", error);
         toast({ variant: "destructive", title: "Save Failed", description: error.message });
     }
 };


  const handleSendMoney = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetIdentifier = selectedPayee ? selectedPayee.identifier : manualIdentifier.trim();
     // Use verified name if manual, otherwise selected payee name, fallback to identifier
    const targetPayeeName = selectedPayee ? selectedPayee.name : (verifiedManualName || manualPayeeName || manualIdentifier || 'Recipient');

    if (!targetIdentifier || !amount || Number(amount) <= 0) {
      toast({ variant: "destructive", title: "Invalid Input" });
      return;
    }

    // Basic validation (simplified)
     if (type === 'mobile' && !targetIdentifier.match(/^[6-9]\d{9}$/)) {
        toast({ variant: "destructive", title: "Invalid Mobile Number" });
        return;
     }
     // Basic check for UPI ID (@) or Account Number (digits)
     if (type === 'bank' && !targetIdentifier.includes('@') && !targetIdentifier.match(/^\d{9,18}$/)) {
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

        // processUpiPayment now handles transaction logging internally
        const paymentResult = await processUpiPayment(
            targetIdentifier,
            Number(amount),
            enteredPin,
            `Payment to ${targetPayeeName}`, // Pass note
            auth.currentUser?.uid, // Pass user ID
            undefined // Let backend select default source account or implement UI selection
        );

        if (paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess') {
             toast({ title: "Payment Successful", description: paymentResult.message });
             // Redirect to home or history AFTER success
             setTimeout(() => router.push('/'), 500); // Slight delay before redirect
         } else {
             // Error toast will be shown by processUpiPayment if logging works
             // If processUpiPayment itself throws, catch block handles it.
             // Display ticket info if available
             if (paymentResult.ticketId) {
                  toast({
                     variant: "destructive",
                     title: `Payment Failed (Ticket: ${paymentResult.ticketId})`,
                     description: `${paymentResult.message}. ${paymentResult.refundEta ? `Refund ETA: ${paymentResult.refundEta}` : ''}`,
                     duration: 10000
                 });
             } else {
                 toast({
                     variant: "destructive",
                     title: "Payment Failed",
                     description: paymentResult.message || 'Unknown error',
                     duration: 7000
                 });
             }
         }

    } catch (error: any) {
        // This catch block handles errors thrown by processUpiPayment (e.g., network issues, major failures)
        console.error("Payment processing failed:", error);
        toast({ variant: "destructive", title: "Payment Failed", description: error.message || "An unexpected error occurred." });
          // Transaction logging for failure is handled within processUpiPayment
    } finally {
       setIsSending(false);
    }
  };

  // Display either suggestions or filtered results based on search term
  const displayList = searchTerm.trim() === '' && !selectedPayee ? suggestedPayees : filteredPayees;
  const showSuggestions = searchTerm.trim() === '' && !selectedPayee && suggestedPayees.length > 0;
  const showSearchResults = searchTerm.trim() !== '' && !selectedPayee && filteredPayees.length > 0;
  const showManualInputArea = !selectedPayee; // Show manual input if no payee is selected
  const showNoResults = searchTerm.trim() !== '' && !selectedPayee && !isLoadingContacts && filteredPayees.length === 0;
  const showNoSuggestions = searchTerm.trim() === '' && !selectedPayee && !isLoadingSuggestions && suggestedPayees.length === 0;

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
                 ? "Search contacts or enter mobile number."
                 : "Search contacts or enter UPI ID / Account No."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendMoney} className="space-y-4">
              {/* Payee Search Input */}
              <div className="space-y-2 relative">
                <Label htmlFor="payee-input">Search / Enter {pageDetails.identifierLabel}</Label>
                 <div className="relative">
                    <Input
                        id="payee-input"
                        placeholder={pageDetails.placeholder}
                        value={selectedPayee ? selectedPayee.name : searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if (selectedPayee) handleClearSelection(); // Clear selection if user types again
                        }}
                        disabled={!!selectedPayee} // Disable if a payee is selected
                        className="pr-10" // Space for clear button or loader
                    />
                     {(isLoadingContacts || isLoadingSuggestions || isVerifyingManual) && !selectedPayee && (
                         <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                     )}
                      {searchTerm && !selectedPayee && !(isLoadingContacts || isLoadingSuggestions || isVerifyingManual) && (
                         <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7" onClick={handleClearSelection} type="button">
                            <X className="h-4 w-4 text-muted-foreground"/>
                        </Button>
                     )}
                 </div>

                 {/* Suggestions/Results Dropdown */}
                  {(showSuggestions || showSearchResults) && (
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
                 {showNoResults && <p className="text-xs text-muted-foreground pt-1">No contacts found. Enter details manually?</p>}
                 {showNoSuggestions && <p className="text-xs text-muted-foreground pt-1">No suggestions. Search or enter details manually.</p>}
              </div>


              {/* Manual Input Area (Conditional) */}
              {showManualInputArea && (
                 <div className="space-y-1 border-t border-dashed pt-3 mt-3">
                    <Label htmlFor="manual-identifier">Or Enter {pageDetails.identifierLabel}</Label>
                     <div className="relative">
                        <Input
                            id="manual-identifier"
                            placeholder={`Manually enter ${pageDetails.identifierLabel}`}
                            value={manualIdentifier}
                            onChange={(e) => setManualIdentifier(e.target.value)}
                            required={!selectedPayee} // Required only if no contact is selected
                        />
                         {isVerifyingManual && (
                            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                         )}
                    </div>
                     {/* Verification Status */}
                    {verifiedManualName && type === 'bank' && (
                        <div className="flex justify-between items-center pt-1">
                             <p className="text-xs text-green-600">✓ Verified: {verifiedManualName}</p>
                             {/* Add Save Payee Button */}
                              <Button type="button" variant="link" size="sm" className="text-xs h-auto p-0" onClick={handleInitiateSavePayee}>
                                <UserPlus className="h-3 w-3 mr-1"/> Save Payee
                              </Button>
                        </div>
                    )}
                     {manualVerificationError && type === 'bank' && (
                         <p className="text-xs text-destructive pt-1">⚠ {manualVerificationError}</p>
                    )}
                </div>
               )}

              {/* Selected Payee Display */}
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
                   <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleClearSelection} type="button">
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

        {/* Save Payee Dialog */}
         <AlertDialog open={showSavePayeeDialog} onOpenChange={setShowSavePayeeDialog}>
             <AlertDialogContent>
                 <AlertDialogHeader>
                     <AlertDialogTitle>Save New Payee</AlertDialogTitle>
                     <AlertDialogDescription>
                         Save the details for future payments.
                     </AlertDialogDescription>
                 </AlertDialogHeader>
                  <div className="py-4 space-y-3">
                     <div className="space-y-1">
                         <Label htmlFor="save-identifier">Identifier ({pageDetails.identifierLabel})</Label>
                         <Input id="save-identifier" value={manualIdentifier} disabled />
                     </div>
                      <div className="space-y-1">
                         <Label htmlFor="save-name">Payee Name</Label>
                         <Input
                            id="save-name"
                            placeholder="Enter name for contact"
                            value={manualPayeeName}
                            onChange={(e) => setManualPayeeName(e.target.value)}
                            required
                         />
                     </div>
                 </div>
                 <AlertDialogFooter>
                     <AlertDialogCancel>Cancel</AlertDialogCancel>
                     <AlertDialogAction onClick={handleConfirmSavePayee} disabled={!manualPayeeName}>Save Payee</AlertDialogAction>
                 </AlertDialogFooter>
             </AlertDialogContent>
         </AlertDialog>

      </main>
    </div>
  );
}
