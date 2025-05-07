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
import { suggestFrequentContacts, SmartPayeeSuggestionInput } from '@/ai/flows/smart-payee-suggestion';
import { getContacts, savePayee, PayeeClient as Payee } from '@/services/contacts'; // Use client interface, use getContacts
import { processUpiPayment, verifyUpiId } from '@/services/upi'; // Import processUpiPayment
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"; // Removed AlertDialogTrigger
// import { AlertDialogTrigger } from "@radix-ui/react-alert-dialog"; // Import trigger separately if needed - removed as not needed
import { Badge } from '@/components/ui/badge'; // Import Badge

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
  const [displayList, setDisplayList] = useState<DisplayPayee[]>([]); // List shown to user (suggestions or search results)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true); // Manage contact loading state
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);
  const [verifiedManualName, setVerifiedManualName] = useState<string | null>(null);
  const [manualVerificationError, setManualVerificationError] = useState<string | null>(null);
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
            } else {
                fetchContacts(); // Fetch contacts on login
            }
        });
        return () => unsubscribeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only on mount

  // Fetch initial contacts and suggestions
  const fetchContacts = useCallback(async () => {
    if (!userId) return;
    setIsLoadingContacts(true);
    try {
      const contacts = await getContacts(); // Fetch all saved contacts initially
      // Simulate fetching verification status (replace with backend logic)
      const contactsWithStatus: DisplayPayee[] = contacts.map(c => ({
        ...c,
        verificationStatus: getMockVerificationStatus(c.identifier || c.upiId)
      }));
      setAllUserContacts(contactsWithStatus);
      // Fetch suggestions only if no search term and no payee selected
      if (!searchTerm && !selectedPayee) {
         fetchSuggestions(contactsWithStatus); // Pass contacts with status
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast({ variant: "destructive", title: "Error Loading Contacts" });
      setAllUserContacts([]);
    } finally {
      setIsLoadingContacts(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, toast, searchTerm, selectedPayee]); // Dependencies for fetchContacts

   // Fetch AI suggestions based on fetched contacts
   const fetchSuggestions = useCallback(async (currentContacts: DisplayPayee[]) => {
        if (!userId || currentContacts.length === 0) {
            setDisplayList([]); // Show empty if no contacts or user
            return;
        }
        setIsLoadingSuggestions(true);
        try {
             // Simulate AI suggestion - use first 5 contacts as mock suggestions
             await new Promise(res => setTimeout(res, 500)); // Simulate delay
             const suggestions = currentContacts.slice(0, 5);
             setDisplayList(suggestions);
            // TODO: Integrate actual AI flow if needed
            // const recentContactsData: SmartPayeeSuggestionInput = { userId, recentContacts: currentContacts.slice(0, 10).map(c => c.id) };
            // const result = await suggestFrequentContacts(recentContactsData);
            // const suggestions = result.suggestedContacts
            //     .map(id => currentContacts.find(p => p.id === id))
            //     .filter((p): p is DisplayPayee => !!p);
            // setDisplayList(suggestions);
        } catch (error) {
             console.error("Failed to fetch suggestions:", error);
             setDisplayList(currentContacts.slice(0,5)); // Fallback to recent contacts
        } finally {
             setIsLoadingSuggestions(false);
        }
    }, [userId]);

   // Function to get mock verification status
   const getMockVerificationStatus = (identifier?: string): DisplayPayee['verificationStatus'] => {
        if (!identifier) return 'unverified';
        if (identifier.toLowerCase().includes('verified')) return 'verified';
        if (identifier.toLowerCase().includes('scammer') || identifier.toLowerCase().includes('blacklisted')) return 'blacklisted';
        // Simulate random verification for others
        const rand = Math.random();
        if (rand < 0.6) return 'verified';
        if (rand < 0.9) return 'unverified';
        return 'pending'; // Less likely state
   };

   // Filter contacts based on search term
   const filterContacts = useCallback((term: string) => {
        if (!term.trim()) {
            fetchSuggestions(allUserContacts); // Show suggestions if search is cleared
            return;
        }
        const lowerSearch = term.toLowerCase();
        const filtered = allUserContacts.filter(payee =>
            (payee.name.toLowerCase().includes(lowerSearch) ||
             (payee.identifier && payee.identifier.toLowerCase().includes(lowerSearch)) ||
             (payee.upiId && payee.upiId.toLowerCase().includes(lowerSearch))
            ) && (type === 'mobile' ? payee.type === 'mobile' : true) // Filter by type if 'mobile'
        );
        setDisplayList(filtered);
   }, [allUserContacts, type, fetchSuggestions]);

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
    setManualIdentifier('');
    setVerifiedManualName(null);
    setManualVerificationError(null);
    setDisplayList([]); // Hide dropdown
  };

  const handleClearSelection = () => {
    setSelectedPayee(null);
    setSearchTerm('');
    setManualIdentifier('');
    setVerifiedManualName(null);
    setManualVerificationError(null);
    setManualPayeeName('');
    setDisplayList([]); // Hide dropdown
    fetchSuggestions(allUserContacts); // Show suggestions again
    searchInputRef.current?.focus(); // Focus search input
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
            // Simulate verification based on input
            await new Promise(res => setTimeout(res, 800));
            let nameResult = null;
            let errorResult = null;
             let verificationStatus: DisplayPayee['verificationStatus'] = 'unverified';

            if (identifier.includes('@') && identifier.length > 5) { // Basic UPI check
                 if (identifier.toLowerCase().includes('fail')) {
                     errorResult = "Invalid or non-existent ID.";
                     verificationStatus = 'unverified';
                 } else if (identifier.toLowerCase().includes('blacklisted')) {
                     errorResult = "This UPI ID is blacklisted.";
                     verificationStatus = 'blacklisted';
                 } else {
                     nameResult = identifier.split('@')[0].replace('.', ' ').split(' ').map(capitalize).join(' ') || "Verified Name";
                     verificationStatus = 'verified';
                 }
            } else if (!identifier.includes('@') && identifier.match(/^[0-9]{9,18}$/)) { // Basic Account # check
                nameResult = "Account Holder Name"; // Cannot verify account name usually
                verificationStatus = 'verified'; // Assume account number exists if format matches
            } else {
                errorResult = "Invalid UPI ID or Account Number format.";
                verificationStatus = 'unverified';
            }

            if (nameResult) {
                setVerifiedManualName(nameResult);
                setManualPayeeName(nameResult);
                // Use a temporary object for setting status if payee not selected
                // This state is only for display while typing manually
            } else {
                setManualVerificationError(errorResult);
                setManualPayeeName('');
            }
             // Set display status for manual input (this state doesn't affect the actual payee object until saved)
            if (!selectedPayee) {
                setSelectedPayee({ identifier: identifier, verificationStatus } as any); // Temporary object for display
            }


        } catch (error: any) {
            setManualVerificationError("Verification failed. Please try again.");
            setManualPayeeName('');
             if (!selectedPayee) {
                 setSelectedPayee({ identifier: identifier, verificationStatus: 'unverified' } as any);
             }
        } finally {
            setIsVerifyingManual(false);
        }
    }, [type, selectedPayee]);

     const debouncedVerifyManualIdentifier = useCallback(debounce(verifyManualIdentifier, 800), [verifyManualIdentifier]);

   useEffect(() => {
        if (type === 'bank' && !selectedPayee) {
            debouncedVerifyManualIdentifier(manualIdentifier.trim());
        } else {
            setVerifiedManualName(null);
            setManualVerificationError(null);
            setIsVerifyingManual(false);
            setManualPayeeName('');
            // Clear the temporary payee display if switching away from manual
             if (selectedPayee && selectedPayee.id === undefined) { // Check if it's the temporary object
                 setSelectedPayee(null);
             }
        }
   }, [manualIdentifier, type, selectedPayee, debouncedVerifyManualIdentifier]);


  const handleInitiateSavePayee = () => {
      if (!selectedPayee && manualIdentifier && verifiedManualName) { // Only allow saving verified manual input
           setManualPayeeName(verifiedManualName || ''); // Pre-fill verified name
           setShowSavePayeeDialog(true);
      } else if (selectedPayee && selectedPayee.id !== undefined) { // Already selected a saved contact
          toast({description: "Contact already saved."})
      } else if (!manualIdentifier) {
          toast({description: "Enter identifier first."})
      } else if (!verifiedManualName) {
           toast({description: "Identifier not verified yet."})
      }
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
             type: type === 'mobile' ? 'mobile' : 'bank', // Simplified type mapping
             upiId: type === 'bank' && manualIdentifier.includes('@') ? manualIdentifier : undefined,
             accountNumber: type === 'bank' && !manualIdentifier.includes('@') ? manualIdentifier : undefined,
             isFavorite: false,
         };
         const saved = await savePayee(newPayeeData);
         toast({ title: "Payee Saved", description: `${saved.name} added to your contacts.` });
         const savedWithStatus: DisplayPayee = {...saved, verificationStatus: getMockVerificationStatus(saved.identifier)}; // Add status
         setAllUserContacts(prev => [...prev, savedWithStatus]);
         setShowSavePayeeDialog(false);
         handleSelectPayee(savedWithStatus);
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

    if (selectedPayee && selectedPayee.id !== undefined) { // Use selected saved payee
        targetIdentifier = selectedPayee.identifier || selectedPayee.upiId;
        targetPayeeName = selectedPayee.name;
        verificationStatus = selectedPayee.verificationStatus || 'unverified';
    } else if (!selectedPayee && manualIdentifier.trim()) { // Use manually entered details
        targetIdentifier = manualIdentifier.trim();
        targetPayeeName = verifiedManualName || targetIdentifier; // Use verified name or fallback
        verificationStatus = verifiedManualName ? 'verified' : (manualVerificationError?.includes('blacklisted') ? 'blacklisted' : 'unverified');
    } else {
        toast({ variant: "destructive", title: "Recipient Missing", description: "Please select or enter a recipient." });
        return;
    }

    if (!targetIdentifier || !amount || Number(amount) <= 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Please select/verify recipient and enter a valid amount." });
      return;
    }
    if (verificationStatus === 'blacklisted') {
        toast({ variant: "destructive", title: "Payment Blocked", description: "Cannot send payment to a blacklisted recipient." });
        return;
    }
    if (verificationStatus === 'unverified' && type === 'bank') {
        if (!confirm("The recipient UPI/Account is not verified. Proceed with caution?")) {
            return;
        }
    }


    setIsSending(true);
    console.log("Sending money via API:", { recipientIdentifier: targetIdentifier, amount, type });

    try {
        const enteredPin = await new Promise<string | null>((resolve) => {
            const pin = prompt(`DEMO ONLY: Enter UPI PIN to send ₹${amount} to ${targetPayeeName}`);
            resolve(pin);
        });

        if (!enteredPin) {
            toast({ title: "Payment Cancelled" });
            setIsSending(false);
            return;
        }

        const paymentResult = await processUpiPayment(
            targetIdentifier,
            Number(amount),
            enteredPin,
            `Payment to ${targetPayeeName}`,
            userId || undefined
        );

        if (paymentResult.status === 'Completed' || paymentResult.status === 'FallbackSuccess') {
             toast({ title: "Payment Successful", description: paymentResult.message });
             setTimeout(() => router.push('/'), 500);
         } else {
             let errorDescription = paymentResult.message || 'Unknown error';
             if (paymentResult.ticketId) {
                  errorDescription += `. ${paymentResult.refundEta ? `Refund ETA: ${paymentResult.refundEta}` : ''}`;
             }
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

  const showContactList = !selectedPayee && displayList.length > 0;
  const showManualInputField = !selectedPayee;
  const showNoResultsFound = !selectedPayee && searchTerm.trim().length > 0 && !isLoadingContacts && displayList.length === 0;
  const showNoSuggestionsOrContacts = !selectedPayee && searchTerm.trim().length === 0 && !isLoadingContacts && !isLoadingSuggestions && allUserContacts.length === 0;

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
                        value={selectedPayee?.id !== undefined ? selectedPayee.name : searchTerm} // Show name if selected, otherwise search term
                        onChange={(e) => {
                            if (selectedPayee) handleClearSelection();
                            setSearchTerm(e.target.value);
                            setManualIdentifier('');
                        }}
                        disabled={!!selectedPayee && selectedPayee.id !== undefined} // Disable if a *saved* payee is selected
                        className="pr-10"
                    />
                     {(isLoadingContacts || isLoadingSuggestions || (isVerifyingManual && !selectedPayee)) && (
                         <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                     )}
                      {(searchTerm || manualIdentifier) && !selectedPayee && !(isLoadingContacts || isLoadingSuggestions || isVerifyingManual) && (
                         <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7" onClick={handleClearSelection} type="button">
                            <X className="h-4 w-4 text-muted-foreground"/>
                        </Button>
                     )}
                 </div>

                  {/* Search Results / Suggestions Dropdown */}
                   {showContactList && (
                      <div className="mt-1 border border-border rounded-md shadow-sm max-h-60 overflow-y-auto bg-background z-10 absolute w-[calc(100%-2rem)]">
                          <p className="text-xs font-semibold p-2 text-muted-foreground">
                              {searchTerm.trim() === '' ? 'Suggestions' : 'Search Results'}
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
                                // Required only if no contact is selected and search term is empty? Adjust logic as needed.
                                required={!selectedPayee && !searchTerm}
                                className={manualVerificationError ? 'border-destructive focus-visible:ring-destructive' : ''}
                            />
                            {isVerifyingManual && (
                                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                        </div>
                        {/* Verification Status for Manual Input */}
                        {type === 'bank' && !selectedPayee && manualIdentifier && (
                             <div className="flex justify-between items-center pt-1">
                                <p className={`text-xs flex items-center gap-1 ${verifiedManualName ? 'text-green-600' : (manualVerificationError ? 'text-destructive' : 'text-muted-foreground')}`}>
                                    {getVerificationIcon(selectedPayee?.verificationStatus)}
                                    {verifiedManualName ? `Verified: ${verifiedManualName}` : manualVerificationError || 'Enter ID to verify'}
                                </p>
                                 {verifiedManualName && !manualVerificationError && (
                                      <AlertDialogTrigger asChild>
                                        <Button type="button" variant="link" size="sm" className="text-xs h-auto p-0" onClick={handleInitiateSavePayee}>
                                          <UserPlus className="h-3 w-3 mr-1"/> Save Payee
                                        </Button>
                                      </AlertDialogTrigger>
                                 )}
                            </div>
                         )}
                    </div>
                  )}
              </div>

              {/* Selected Payee Display (for saved contacts) */}
              {selectedPayee && selectedPayee.id !== undefined && (
                <div className="flex items-center p-3 border border-primary rounded-md bg-primary/5 mt-4">
                  <Avatar className="h-9 w-9 mr-3">
                     <AvatarImage src={`https://picsum.photos/seed/${selectedPayee.avatarSeed || selectedPayee.id}/40/40`} alt={selectedPayee.name} data-ai-hint="person avatar"/>
                    <AvatarFallback>{selectedPayee.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow overflow-hidden">
                    <p className="text-sm font-medium truncate">{selectedPayee.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{selectedPayee.identifier || selectedPayee.upiId}</p>
                     {selectedPayee.verificationStatus && (
                        <Badge variant={
                            selectedPayee.verificationStatus === 'verified' ? 'default' :
                            selectedPayee.verificationStatus === 'blacklisted' ? 'destructive' :
                            'secondary'
                         } className={`mt-1 text-xs ${selectedPayee.verificationStatus === 'verified' ? 'bg-green-100 text-green-700' : selectedPayee.verificationStatus === 'blacklisted' ? '' : 'bg-yellow-100 text-yellow-700'}`}>
                         {getVerificationIcon(selectedPayee.verificationStatus)}
                         <span className='ml-1'>{capitalize(selectedPayee.verificationStatus)}</span>
                        </Badge>
                     )}
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
                    disabled={
                        (!selectedPayee && !manualIdentifier.trim()) || // No recipient
                        (type === 'bank' && !selectedPayee && !verifiedManualName) // Bank type not verified manually
                    }
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                 type="submit"
                 className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                 disabled={
                    (!selectedPayee && !manualIdentifier.trim()) ||
                    !amount || Number(amount) <= 0 ||
                    (type === 'bank' && !selectedPayee && !verifiedManualName) ||
                    isSending ||
                    isVerifyingManual ||
                    selectedPayee?.verificationStatus === 'blacklisted' // Disable if selected payee is blacklisted
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
                     <AlertDialogCancel onClick={() => setManualPayeeName(verifiedManualName || '')}>Cancel</AlertDialogCancel> {/* Reset name on cancel */}
                     <AlertDialogAction onClick={handleConfirmSavePayee} disabled={!manualPayeeName}>Save Payee</AlertDialogAction>
                 </AlertDialogFooter>
             </AlertDialogContent>
         </AlertDialog>

      </main>
    </div>
  );
}

const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
