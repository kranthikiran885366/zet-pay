
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Landmark, Eye, EyeOff, RefreshCw, Loader2, Lock } from 'lucide-react'; // Added Lock icon
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { BankAccount, checkBalance, getLinkedAccounts, linkBankAccount, setDefaultAccount } from '@/services/upi'; // Use actual service functions
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"; // For PIN prompt
import { Input } from "@/components/ui/input"; // For PIN input
import { Label } from "@/components/ui/label";

// Interface extending BankAccount with UI state
interface AccountBalance extends BankAccount {
    balance?: number;
    isLoading?: boolean;
    error?: string | null;
    isHidden?: boolean;
}

export default function CheckBalancePage() {
  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [currentUpiIdForPin, setCurrentUpiIdForPin] = useState<string | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const { toast } = useToast();

   // Fetch linked accounts on mount
   useEffect(() => {
       const fetchAccounts = async () => {
           setIsLoadingAccounts(true);
           try {
               const fetchedAccounts = await getLinkedAccounts(); // Use service
               setAccounts(fetchedAccounts.map(acc => ({ ...acc, isHidden: true }))); // Initialize with hidden state
           } catch (error) {
               console.error("Failed to fetch linked accounts:", error);
               toast({ variant: "destructive", title: "Could not load accounts" });
                setAccounts([]); // Set empty on error
           } finally {
               setIsLoadingAccounts(false);
           }
       };
       fetchAccounts();
   }, [toast]);

   // Prompt for PIN using a dialog
   const promptForPin = (upiId: string): Promise<string | null> => {
       return new Promise((resolve) => {
           setCurrentUpiIdForPin(upiId);
           setEnteredPin(''); // Clear previous PIN
           setPinDialogOpen(true);
           // The promise resolves when the dialog action/cancel is clicked
           // We need a way to pass the resolve function to the dialog handlers
           (window as any).resolvePinPromise = resolve; // Store resolve globally (not ideal, but simple for demo)
       });
   };

   const handlePinSubmit = () => {
        if (enteredPin.length === 4 || enteredPin.length === 6) {
             setPinDialogOpen(false);
             if ((window as any).resolvePinPromise) {
                 (window as any).resolvePinPromise(enteredPin);
                 delete (window as any).resolvePinPromise; // Clean up
             }
        } else {
             toast({ variant: "destructive", title: "Invalid PIN", description: "Please enter a 4 or 6 digit UPI PIN." });
        }
    };

    const handlePinCancel = () => {
         setPinDialogOpen(false);
         if ((window as any).resolvePinPromise) {
             (window as any).resolvePinPromise(null); // Resolve with null on cancel
              delete (window as any).resolvePinPromise; // Clean up
         }
    };


  // Function to fetch balance for a single account
  const fetchBalance = async (upiId: string, pinRequired = true) => {
     // Find the account to prevent unnecessary state updates if ID is invalid
     const accountIndex = accounts.findIndex(acc => acc.upiId === upiId);
     if (accountIndex === -1) return;


     setAccounts(prev => prev.map((acc, index) =>
      index === accountIndex ? { ...acc, isLoading: true, error: null } : acc
    ));

    let pin: string | null = null;
    if(pinRequired){
         pin = await promptForPin(upiId);
         if (!pin) {
             console.log("PIN entry cancelled for", upiId);
              setAccounts(prev => prev.map((acc, index) =>
                index === accountIndex ? { ...acc, isLoading: false, error: "PIN entry cancelled." } : acc
              ));
             return; // Don't proceed if PIN was cancelled
         }
    }


    try {
      const balance = await checkBalance(upiId, pin || undefined); // Pass PIN to actual service
      setAccounts(prev => prev.map((acc, index) =>
        index === accountIndex ? { ...acc, balance: balance, isLoading: false, isHidden: false } : acc // Show balance on success
      ));
      toast({ title: `Balance updated for ${upiId}` });
    } catch (error: any) {
      console.error(`Failed to fetch balance for ${upiId}:`, error);
      const errorMessage = error.message || 'Failed to fetch balance. Please try again.';
      setAccounts(prev => prev.map((acc, index) =>
        index === accountIndex ? { ...acc, isLoading: false, error: errorMessage, balance: undefined } : acc
      ));
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    }
  };

  // Function to refresh all balances
  const refreshAllBalances = async () => {
     setIsRefreshingAll(true);
     toast({title: "Refreshing Balances", description: "You may need to enter PIN for each account."})
     // Fetch balances sequentially to handle PIN prompts one by one
     for (const account of accounts) {
         // Skip if already loading or has balance shown (unless explicitly refreshing)
         if (!account.isLoading && (account.balance === undefined || account.isHidden)) {
             await fetchBalance(account.upiId, true); // Force PIN prompt for refresh
         }
     }
     setIsRefreshingAll(false);
     toast({title: "Balance Refresh Complete"})
  }

  // Toggle balance visibility
  const toggleVisibility = (upiId: string) => {
     setAccounts(prev => prev.map(acc =>
      acc.upiId === upiId ? { ...acc, isHidden: !acc.isHidden } : acc
    ));
  }

  // TODO: Implement linking new account flow
  const handleLinkNewAccount = async () => {
     // This would typically navigate to a bank selection/linking flow
     toast({title: "Coming Soon!", description: "Linking new accounts is not yet implemented."});
     // Example:
     // router.push('/link-account');
     // const newAccountDetails = await getNewAccountDetailsFromUser();
     // const success = await linkBankAccount(newAccountDetails);
     // if (success) { fetch accounts again or add manually }
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
        <Landmark className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Bank Accounts</h1>
         <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-primary-foreground hover:bg-primary/80"
            onClick={refreshAllBalances}
            disabled={isRefreshingAll || accounts.some(acc => acc.isLoading)}
            title="Refresh All Balances"
            >
            {isRefreshingAll ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-4 pb-20">
         {isLoadingAccounts && (
             <div className="flex justify-center items-center py-10">
                 <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                 <p className="ml-2 text-muted-foreground">Loading accounts...</p>
             </div>
         )}

        {!isLoadingAccounts && accounts.length === 0 && (
             <Card className="shadow-md text-center">
                <CardHeader>
                    <CardTitle>No Linked Accounts</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">You haven't linked any bank accounts yet.</p>
                    <Button onClick={handleLinkNewAccount}>Link Bank Account</Button>
                </CardContent>
            </Card>
        )}

        {!isLoadingAccounts && accounts.map((account) => (
          <Card key={account.upiId} className="shadow-md overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-background">
              <div>
                <CardTitle className="text-base font-medium">{account.bankName}</CardTitle>
                <CardDescription>A/C: {account.accountNumber}</CardDescription>
                 <p className="text-xs text-muted-foreground">{account.upiId}</p>
              </div>
               {/* Balance Display/Action Area */}
               <div className="text-right">
                   {account.isLoading ? (
                       <Loader2 className="h-5 w-5 animate-spin text-primary" />
                   ) : account.error ? (
                       <Button variant="destructive" size="sm" onClick={() => fetchBalance(account.upiId, true)}>Retry</Button> // Always prompt PIN on retry
                   ) : account.balance !== undefined ? (
                        <div className="flex items-center gap-2">
                             {/* Use blur for hiding instead of placeholder text */}
                            <span className={`text-lg font-semibold transition-all duration-300 ${account.isHidden ? 'blur-sm select-none' : ''}`}>
                                {account.isHidden ? '₹ ******' : `₹${account.balance.toFixed(2)}`}
                            </span>
                            <Button variant="ghost" size="icon" onClick={() => toggleVisibility(account.upiId)} className="h-7 w-7">
                                {account.isHidden ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                            </Button>
                        </div>
                   ) : (
                       <Button size="sm" onClick={() => fetchBalance(account.upiId, true)}>Check Balance</Button> // Prompt for PIN initially
                   )}
               </div>
            </CardHeader>
             {account.error && !account.isLoading && (
                 <CardContent className="pt-2 pb-3 px-6 bg-destructive/10 border-t border-destructive/30">
                     <p className="text-xs text-destructive font-medium">{account.error}</p>
                 </CardContent>
             )}
          </Card>
        ))}

         {!isLoadingAccounts && accounts.length > 0 && (
            <Button variant="outline" className="w-full mt-6" onClick={handleLinkNewAccount}>
              <Landmark className="mr-2 h-4 w-4" /> Link New Bank Account
            </Button>
         )}

           {/* UPI PIN Dialog */}
           <AlertDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Enter UPI PIN</AlertDialogTitle>
                    <AlertDialogDescription>
                        Enter your 4 or 6 digit UPI PIN for {accounts.find(a => a.upiId === currentUpiIdForPin)?.bankName || 'your account'}.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                         <Label htmlFor="pin-input" className="sr-only">UPI PIN</Label>
                        <Input
                            id="pin-input"
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={enteredPin}
                            onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="text-center text-xl tracking-[0.3em]"
                            placeholder="****"
                            autoFocus
                        />
                    </div>
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={handlePinCancel}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePinSubmit} disabled={enteredPin.length !== 4 && enteredPin.length !== 6}>
                        <Lock className="mr-2 h-4 w-4" /> Submit PIN
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

      </main>
    </div>
  );
}

