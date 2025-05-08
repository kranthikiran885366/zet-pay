'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'; // Added useRef
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, User, Landmark, Loader2, Send, X, UserPlus, ShieldCheck, ShieldAlert, ShieldQuestion, Search } from 'lucide-react'; // Added verification icons, Search
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
// Removed unused import: import { suggestFrequentContacts, SmartPayeeSuggestionInput } from '@/ai/flows/smart-payee-suggestion';
import { getContacts, savePayee, PayeeClient as Payee } from '@/services/contacts'; // Use client interface, use getContacts
import { processUpiPayment, verifyUpiId } from '@/services/upi'; // Import processUpiPayment
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"; // Removed AlertDialogTrigger
// import { AlertDialogTrigger from "@radix-ui/react-alert-dialog"; // Import trigger separately if needed - removed as not needed
import { Badge } from '@/components/ui/badge'; // Import Badge
import { getTransactionHistory, Transaction, TransactionFilters } from '@/services/transactions'; // Import transaction history service

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

// Interface for payee with verification status
interface DisplayPayee extends Payee {
    verificationStatus?: 'verified' | 'blacklisted' | 'unverified' | 'pending';
    verificationReason?: string; // Reason if blacklisted
}


export default function SendMoneyPage() {
  const params = useParams();
  const router = useRouter();
  const type = typeof params.type === 'string' ? (params.type === 'bank' ? 'bank' : 'mobile') : 'mobile';

  const [searchTerm, setSearchTerm] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedPayee, setSelectedPayee] = useState<DisplayPayee | null>(null); // Use DisplayPayee
  const [manualIdentifier, setManualIdentifier] = useState('');
  const [manualPayeeName, setManualPayeeName] = useState(''); // For saving new payee
  const [allUserContacts, setAllUserContacts] = useState<DisplayPayee[]>([]); // Use DisplayPayee
  const [recentPayees, setRecentPayees] = useState<DisplayPayee[]>([]); // Store recently paid contacts
  const [displayList, setDisplayList] = useState<DisplayPayee[]>([]); // List shown to user (suggestions or search results)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true); // Manage contact loading state
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);
  const [manualPayee, setManualPayee] = useState<DisplayPayee | null>(null); // Store manual entry details + verification
  const [isSending, setIsSending] = useState(false);
  const [showSavePayeeDialog, setShowSavePayeeDialog] = useState(false);
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // Store user ID

  const pageDetails = type === 'mobile'
    ? { icon: User, title: "Send to Mobile Contact", placeholder: "Enter Name or Mobile Number", identifierLabel: "Mobile Number" }
    : { icon: Landmark, title: "Send to Bank/UPI ID", placeholder: "Enter Name, UPI ID, or Account No.", identifierLabel: "UPI ID / Account Number" };

  const searchInputRef = useRef<HTMLInputElement>(null); // Ref for search input

    // Check login status and get user ID
    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            const loggedIn = !!user;
            setIsLoggedIn(loggedIn);
            setUserId(user ? user.uid : null);
            if (!loggedIn) {
                setIsLoadingContacts(false);
                setAllUserContacts([]);
                setDisplayList([]);
                setRecentPayees([]);
            } else {
                fetchContactsAndRecents(); // Fetch contacts and recent payments on login
            }
        });
        return () => unsubscribeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only on mount

  // Fetch initial contacts and recent payments
  const fetchContactsAndRecents = useCallback(async () => {
    if (!userId) return;
    setIsLoadingContacts(true);
    try {
        // Fetch saved contacts
        const contacts = await getContacts();
        const contactsWithStatus: DisplayPayee[] = contacts.map(c => ({
            ...c,
            verificationStatus: 'pending' // Default to pending until verified on payment/manual check
        }));
        setAllUserContacts(contactsWithStatus);

        // Fetch recent transactions to get recent payees
        const filters: TransactionFilters = { type: 'Sent', limit: 15 }; // Fetch recent 'Sent' transactions
        const history = await getTransactionHistory(filters);
        const recent: DisplayPayee[] = [];
        const seenIdentifiers = new Set<string>();

        for (const tx of history) {
            const identifier = tx.upiId || tx.identifier;
            if (identifier && !seenIdentifiers.has(identifier)) {
                // Avoid adding duplicates from recent history
                seenIdentifiers.add(identifier);
                 // Check if this recent payee is already in saved contacts
                const existingContact = contactsWithStatus.find(c => (c.identifier === identifier || c.upiId === identifier));
                 if (!existingContact) {
                    recent.push({
                        id: `recent-${identifier}`, // Create a temporary ID
                        name: tx.name || identifier,
                        identifier: identifier,
                        upiId: tx.upiId,
                        type: identifier.includes('@') ? 'bank' : 'mobile', // Basic type inference
                         verificationStatus: 'pending', // Default to pending
                    });
                 } else {
                    // Add saved contact to recent list if not already present for ordering
                     if (!recent.some(r => r.id === existingContact.id)) {
                         recent.push(existingContact);
                     }
                 }
            }
            if (recent.length >= 5) break; // Limit to 5 recent payees
        }
        setRecentPayees(recent);

        // Display recent payees initially if no search term
        if (!searchTerm && !selectedPayee) {
            setDisplayList(recent);
        }
    } catch (error) {
        console.error("Error fetching contacts/recents:", error);
        toast({ variant: "destructive", title: "Error Loading Data" });
        setAllUserContacts([]);
        setRecentPayees([]);
    } finally {
        setIsLoadingContacts(false);
    }
  }, [userId, toast, searchTerm, selectedPayee]); // Dependencies

   // Function to get mock verification status - REMOVED - Verification happens live


   // Filter contacts based on search term
   const filterContacts = useCallback((term: string) => {
        if (!term.trim()) {
            setDisplayList(recentPayees); // Show recents if search is cleared
            return;
        }
        const lowerSearch = term.toLowerCase();
        // Search within both saved contacts and recent payees (if different)
        const combinedList = [...allUserContacts, ...recentPayees.filter(rp => !allUserContacts.some(ac => ac.id === rp.id))];
        const filtered = combinedList.filter(payee =>
            (payee.name.toLowerCase().includes(lowerSearch) ||
             (payee.identifier && payee.identifier.toLowerCase().includes(lowerSearch)) ||
             (payee.upiId && payee.upiId.toLowerCase().includes(lowerSearch))
            ) && (type === 'mobile' ? (payee.type === 'mobile' || !payee.type) : (payee.type === 'bank' || !payee.type)) // Adjust type filter
        ).slice(0, 10); // Limit search results display
        setDisplayList(filtered);
   }, [allUserContacts, type, recentPayees]);

   const debouncedFilterContacts = useCallback(debounce(filterContacts, 300), [filterContacts]);

  useEffect(() => {
      if (!selectedPayee) {
          debouncedFilterContacts(searchTerm);
      } else {
          setDisplayList([]); // Clear list when payee is selected
      }
  }, [searchTerm, selectedPayee, debouncedFilterContacts]);


  const handleSelectPayee = (payee: DisplayPayee) => {
    setSelectedPayee(payee);
    setSearchTerm(payee.name); // Show name in search bar
    setManualIdentifier(''); // Clear manual input
    setManualPayee(null); // Clear manual details
    setDisplayList([]); // Hide dropdown
    searchInputRef.current?.blur(); // Hide keyboard
  };

  const handleClearSelection = () => {
    setSelectedPayee(null);
    setSearchTerm('');
    setManualIdentifier('');
    setManualPayee(null);
    setDisplayList([]); // Hide dropdown
    setDisplayList(recentPayees); // Show recents again
    searchInputRef.current?.focus(); // Focus search input
   }

   // Debounced UPI ID / Account Verification
    const verifyManualIdentifier = useCallback(async (identifier: string) => {
        const trimmedIdentifier = identifier.trim();
        if (!trimmedIdentifier || type !== 'bank' || trimmedIdentifier.length < 3) { // Basic length check for bank/upi
            setManualPayee(null); // Clear manual payee details
            setIsVerifyingManual(false);
            return;
        }
        setIsVerifyingManual(true);
        setManualPayee(null); // Reset before verifying

        try {
            // Call backend API to verify
            const result = await apiClient<{ verifiedName: string | null; isBlacklisted?: boolean; reason?: string }>(`/upi/verify?upiId=${encodeURIComponent(trimmedIdentifier)}`);

            let verificationStatus: DisplayPayee['verificationStatus'] = 'unverified';
            let verificationReason: string | undefined = undefined;

            if (result.isBlacklisted) {
                 verificationStatus = 'blacklisted';
                 verificationReason = result.reason || 'Flagged as suspicious';
            } else if (result.verifiedName) {
                verificationStatus = 'verified';
            }

            setManualPayee({
                id: `manual-${trimmedIdentifier}`, // Temporary ID
                name: result.verifiedName || trimmedIdentifier, // Use verified name or identifier itself
                identifier: trimmedIdentifier,
                type: 'bank', // Assume bank/UPI for manual verification
                verificationStatus: verificationStatus,
                verificationReason: verificationReason,
            });

        } catch (error: any) {
            console.error("Manual Verification failed:", error);
             let reason = "Verification failed. Please check the ID or try again.";
             if (error.message?.includes('404') || error.message?.toLowerCase().includes('not found')) {
                 reason = "UPI ID/Account not found.";
             }
             setManualPayee({
                id: `manual-${trimmedIdentifier}`,
                name: "Verification Failed",
                identifier: trimmedIdentifier,
                type: 'bank',
                verificationStatus: 'unverified',
                verificationReason: reason,
            });
        } finally {
            setIsVerifyingManual(false);
        }
    }, [type]);

     const debouncedVerifyManualIdentifier = useCallback(debounce(verifyManualIdentifier, 800), [verifyManualIdentifier]);

   useEffect(() => {
        if (type === 'bank' && !selectedPayee) {
            debouncedVerifyManualIdentifier(manualIdentifier);
        } else {
            setManualPayee(null);
            setIsVerifyingManual(false);
        }
   }, [manualIdentifier, type, selectedPayee, debouncedVerifyManualIdentifier]);


  const handleInitiateSavePayee = () => {
      if (manualPayee && manualPayee.verificationStatus === 'verified') {
           setManualPayeeName(manualPayee.name || ''); // Pre-fill verified name
           setShowSavePayeeDialog(true);
      } else if (selectedPayee && selectedPayee.id && !selectedPayee.id.startsWith('manual-') && !selectedPayee.id.startsWith('recent-')) { // Already selected a *saved* contact
          toast({description: "Contact already saved."})
      } else if (!manualIdentifier) {
          toast({description: "Enter identifier first."})
      } else if (!manualPayee || manualPayee.verificationStatus !== 'verified') {
           toast({description: "Identifier not verified or invalid."})
      }
  };

  const handleConfirmSavePayee = async () => {
     const identifierToSave = manualPayee?.identifier;
     if (!identifierToSave || !manualPayeeName) {
         toast({ variant: "destructive", title: "Missing Details", description: "Please enter identifier and name to save." });
         return;
     }
     try {
         const newPayeeData: Omit<Payee, 'id' | 'userId' | 'avatarSeed' | 'createdAt' | 'updatedAt'> = {
             name: manualPayeeName,
             identifier: identifierToSave,
             type: type === 'mobile' ? 'mobile' : 'bank', // Simplified type mapping
             upiId: type === 'bank' && identifierToSave.includes('@') ? identifierToSave : undefined,
             accountNumber: type === 'bank' && !identifierToSave.includes('@') ? identifierToSave : undefined,
             isFavorite: false,
         };
         const saved = await savePayee(newPayeeData);
         toast({ title: "Payee Saved", description: `${saved.name} added to your contacts.` });
         const savedWithStatus: DisplayPayee = {...saved, verificationStatus: 'verified' }; // Assume saved is verified now
         setAllUserContacts(prev => [...prev, savedWithStatus]);
         setShowSavePayeeDialog(false);
         handleSelectPayee(savedWithStatus); // Automatically select the newly saved payee
         setManualIdentifier(''); // Clear manual fields
         setManualPayee(null);
     } catch (error: any) {
         console.error("Failed to save payee:", error);
         toast({ variant: "destructive", title: "Save Failed", description: error.message });
     }
 };


  const handleSendMoney = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetIdentifier: string | undefined = '';
    let targetPayeeName = '';
    let verificationStatus: DisplayPayee['verificationStatus'] = 'unverified';

    if (selectedPayee) { // Use selected payee (saved, recent, or manual)
        targetIdentifier = selectedPayee.identifier || selectedPayee.upiId;
        targetPayeeName = selectedPayee.name;
        verificationStatus = selectedPayee.verificationStatus || 'unverified';
    } else {
        toast({ variant: "destructive", title: "Recipient Missing", description: "Please select or enter a recipient." });
        return;
    }

    if (!targetIdentifier || !amount || Number(amount) <= 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Please select/verify recipient and enter a valid amount." });
      return;
    }

    // Check blacklist status before proceeding
    if (verificationStatus === 'blacklisted') {
         toast({
             variant: "destructive",
             title: "Payment Blocked",
             description: `Cannot send payment: ${manualPayee?.verificationReason || 'Recipient is blacklisted.'}`,
             duration: 7000
         });
        return;
    }

    // Optional: Confirm before paying unverified ID
    if (verificationStatus === 'unverified' && type === 'bank') {
        if (!confirm(`The recipient (${targetIdentifier}) is not verified. Proceed with caution?`)) {
            return;
        }
    }


    setIsSending(true);
    console.log("Sending money via API:", { recipientIdentifier: targetIdentifier, amount, type });

    try {
         // In a real app, integrate a secure PIN pad component here
         const enteredPin = prompt(`DEMO ONLY: Enter UPI PIN to send ₹${amount} to ${targetPayeeName}`);

        if (!enteredPin) {
            toast({ title: "Payment Cancelled" });
            setIsSending(false);
            return;
        }

        // Call the UPI service function which interacts with the backend
        const paymentResult = await processUpiPayment(
            targetIdentifier,
            Number(amount),
            enteredPin, // Send PIN to backend for processing
            `Payment to ${targetPayeeName}`, // Optional note
             userId || undefined // Pass user ID if needed, though backend gets it from token
        );

        if (paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess') {
             toast({ title: "Payment Successful", description: paymentResult.message, duration: 5000 });
             setTimeout(() => router.push('/'), 1000); // Redirect home after delay
         } else {
             let errorDescription = paymentResult.message || 'Unknown error';
             if (paymentResult.ticketId) {
                  errorDescription += `. ${paymentResult.refundEta ? `Refund ETA: ${paymentResult.refundEta}` : ''}`;
             }
              // Show specific error from backend result
             toast({
                 variant: "destructive",
                 title: `Payment Failed ${paymentResult.ticketId ? `(Ticket: ${paymentResult.ticketId})` : ''}`,
                 description: errorDescription,
                 duration: paymentResult.ticketId ? 10000 : 7000
             });
         }

    } catch (error: any) {
        console.error("Payment processing failed:", error);
        toast({ variant: "destructive", title: "Payment Failed", description: error.message || "An unexpected error occurred." });
    } finally {
       setIsSending(false);
    }
  };

  const showContactList = !selectedPayee && displayList.length > 0 && !manualIdentifier; // Show only if not manually typing
  const showManualInputField = !selectedPayee;
  const showNoResultsFound = !selectedPayee && searchTerm.trim().length > 0 && !isLoadingContacts && displayList.length === 0;
  const showNoSuggestionsOrContacts = !selectedPayee && searchTerm.trim().length === 0 && !isLoadingContacts && !isLoadingSuggestions && allUserContacts.length === 0 && recentPayees.length === 0;
  const currentPayeeForDisplay = selectedPayee || manualPayee; // Use selected payee or manually verified details for display

  const getVerificationIcon = (status?: DisplayPayee['verificationStatus']) => {
      switch(status) {
          case 'verified': return <ShieldCheck className="h-4 w-4 text-green-600" title="Verified"/>;
          case 'blacklisted': return <ShieldAlert className="h-4 w-4 text-destructive" title="Blacklisted/Suspicious"/>;
          case 'pending': return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" title="Verifying..."/>;
          default: return <ShieldQuestion className="h-4 w-4 text-muted-foreground" title="Unverified"/>; // unverified or undefined
      }
  }

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <pageDetails.icon className="h-6 w-6" />
        <h1 className="text-lg font-semibold">{pageDetails.title}</h1>
      </header>

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
              {/* Payee Search/Select/Manual Area */}
              <div className="space-y-2">
                 <Label htmlFor="payee-input">To</Label>
                  <div className="relative">
                    <Input
                        id="payee-input"
                        ref={searchInputRef}
                        placeholder={pageDetails.placeholder}
                        value={selectedPayee?.id ? selectedPayee.name : searchTerm} // Show name if selected, else search term
                        onChange={(e) => {
                            if (selectedPayee) handleClearSelection(); // Clear selection if user starts typing again
                            setSearchTerm(e.target.value);
                            setManualIdentifier(''); // Clear manual if searching
                        }}
                        disabled={!!selectedPayee && selectedPayee.id && !selectedPayee.id.startsWith('manual-')} // Disable only if a *saved* payee is selected
                        className="pr-10"
                    />
                     {(isLoadingContacts || isLoadingSuggestions || isVerifyingManual) && (
                         <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                     )}
                      {(selectedPayee || searchTerm) && !(isLoadingContacts || isLoadingSuggestions || isVerifyingManual) && (
                         <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7" onClick={handleClearSelection} type="button">
                            <X className="h-4 w-4 text-muted-foreground"/>
                        </Button>
                     )}
                 </div>

                  {/* Search Results / Suggestions Dropdown */}
                   {showContactList && (
                      <div className="mt-1 border border-border rounded-md shadow-sm max-h-60 overflow-y-auto bg-background z-10 absolute w-[calc(100%-2rem)]">
                          <p className="text-xs font-semibold p-2 text-muted-foreground">
                              {searchTerm.trim() === '' ? 'Recents & Suggestions' : 'Search Results'}
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
                                  <div className="flex-grow overflow-hidden">
                                      <p className="text-sm font-medium truncate">{payee.name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{payee.identifier || payee.upiId}</p>
                                  </div>
                                  {/* Display verification status fetched with contacts/recents */}
                                  <div className="ml-2 shrink-0">{getVerificationIcon(payee.verificationStatus)}</div>
                              </div>
                          ))}
                      </div>
                  )}
                  {showNoResultsFound && <p className="text-xs text-muted-foreground pt-1">No contacts found. Enter details manually below.</p>}
                  {showNoSuggestionsOrContacts && <p className="text-xs text-muted-foreground pt-1">No contacts or suggestions. Enter details manually below.</p>}

                  {/* Manual Input Area */}
                  {showManualInputField && (
                    <div className="space-y-1 border-t border-dashed pt-3 mt-3">
                        <Label htmlFor="manual-identifier">Or Enter {pageDetails.identifierLabel}</Label>
                        <div className="relative">
                            <Input
                                id="manual-identifier"
                                placeholder={`Manually enter ${pageDetails.identifierLabel}`}
                                value={manualIdentifier}
                                onChange={(e) => setManualIdentifier(e.target.value)}
                                required={!selectedPayee && !searchTerm}
                                className={(manualPayee?.verificationStatus === 'blacklisted' || manualPayee?.verificationReason?.includes('not found')) ? 'border-destructive focus-visible:ring-destructive' : ''}
                            />
                            {isVerifyingManual && (
                                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                        </div>
                        {/* Verification Status for Manual Input */}
                         {manualPayee && (
                             <div className="flex justify-between items-center pt-1">
                                <p className={`text-xs flex items-center gap-1 ${manualPayee.verificationStatus === 'verified' ? 'text-green-600' : (manualPayee.verificationStatus === 'blacklisted' || manualPayee.verificationReason?.includes('not found')) ? 'text-destructive' : 'text-muted-foreground'}`}>
                                     {getVerificationIcon(manualPayee.verificationStatus)}
                                     {manualPayee.verificationStatus === 'verified' ? `Verified: ${manualPayee.name}` : manualPayee.verificationReason || 'Verification Pending/Failed'}
                                </p>
                                 {manualPayee.verificationStatus === 'verified' && (
                                    <Button type="button" variant="link" size="sm" className="text-xs h-auto p-0" onClick={handleInitiateSavePayee}>
                                        <UserPlus className="h-3 w-3 mr-1"/> Save Payee
                                    </Button>
                                 )}
                            </div>
                         )}
                    </div>
                  )}
              </div>

              {/* Selected Payee Display (Covers saved, recent, and manually verified) */}
              {currentPayeeForDisplay && (
                <div className={`flex items-center p-3 border rounded-md mt-4 ${
                     currentPayeeForDisplay.verificationStatus === 'verified' ? 'border-green-500 bg-green-50' :
                     currentPayeeForDisplay.verificationStatus === 'blacklisted' ? 'border-destructive bg-destructive/10' :
                     'border-border bg-muted/50'
                 }`}>
                  <Avatar className="h-9 w-9 mr-3">
                     <AvatarImage src={`https://picsum.photos/seed/${currentPayeeForDisplay.avatarSeed || currentPayeeForDisplay.id}/40/40`} alt={currentPayeeForDisplay.name} data-ai-hint="person avatar"/>
                    <AvatarFallback>{currentPayeeForDisplay.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow overflow-hidden">
                    <p className="text-sm font-medium truncate">{currentPayeeForDisplay.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{currentPayeeForDisplay.identifier || currentPayeeForDisplay.upiId}</p>
                     <Badge variant={
                         currentPayeeForDisplay.verificationStatus === 'verified' ? 'default' :
                         currentPayeeForDisplay.verificationStatus === 'blacklisted' ? 'destructive' :
                         'secondary'
                      } className={`mt-1 text-xs ${currentPayeeForDisplay.verificationStatus === 'verified' ? 'bg-green-100 text-green-700' : currentPayeeForDisplay.verificationStatus === 'blacklisted' ? '' : 'bg-yellow-100 text-yellow-700'}`}>
                      {getVerificationIcon(currentPayeeForDisplay.verificationStatus)}
                      <span className='ml-1'>{capitalize(currentPayeeForDisplay.verificationStatus || 'unverified')}</span>
                     </Badge>
                      {currentPayeeForDisplay.verificationStatus === 'blacklisted' && <p className='text-xs text-destructive mt-1'>{currentPayeeForDisplay.verificationReason}</p>}
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
                    disabled={!currentPayeeForDisplay || isSending || isVerifyingManual}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                 type="submit"
                 className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                 disabled={
                    !currentPayeeForDisplay || // No recipient selected or manually entered
                    !amount || Number(amount) <= 0 || // Invalid amount
                    currentPayeeForDisplay?.verificationStatus === 'blacklisted' || // Recipient blacklisted
                    isSending || // Already processing
                    isVerifyingManual // Currently verifying manual input
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
                         <Input id="save-identifier" value={manualPayee?.identifier || ''} disabled />
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
                     <AlertDialogCancel onClick={() => setManualPayeeName(manualPayee?.name || '')}>Cancel</AlertDialogCancel> {/* Reset name on cancel */}
                     <AlertDialogAction onClick={handleConfirmSavePayee} disabled={!manualPayeeName}>Save Payee</AlertDialogAction>
                 </AlertDialogFooter>
             </AlertDialogContent>
         </AlertDialog>

      </main>
    </div>
  );
}

const capitalize = (s?: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
