'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Loader2, RefreshCw, Banknote, ArrowLeft, Lock, WifiOff } from 'lucide-react'; // Added Lock, WifiOff
import { getLinkedAccounts, BankAccount, checkBalance, getBankStatus } from '@/services/upi'; // Use the service function
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge'; // Import Badge
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert

// Interface extending BankAccount with UI state
interface AccountBalance extends BankAccount {
    balance?: number | null; // Allow null to reset
    isLoading?: boolean;
    error?: string | null;
    bankStatus?: 'Active' | 'Slow' | 'Down'; // Add bank status
}

export default function CheckBalancePage() {
  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [accountToCheck, setAccountToCheck] = useState<AccountBalance | null>(null);
  const [upiPin, setUpiPin] = useState<string>('');
  const { toast } = useToast();

   // Load accounts and their statuses on mount
   useEffect(() => {
     const fetchAccountsAndStatuses = async () => {
       setIsLoadingAccounts(true);
       try {
         const fetchedAccounts = await getLinkedAccounts();
         const accountsWithState: AccountBalance[] = await Promise.all(
            fetchedAccounts.map(async (acc) => {
                const bankIdentifier = acc.upiId.split('@')[1]; // Simplified
                const status = bankIdentifier ? await getBankStatus(bankIdentifier) : 'Active'; // Fetch status or default
                return { ...acc, balance: null, isLoading: false, error: null, bankStatus: status };
            })
         );
         setAccounts(accountsWithState);
       } catch (error: any) {
         console.error("Failed to fetch accounts:", error);
         toast({ variant: "destructive", title: "Error Loading Accounts", description: error.message || "Could not load accounts." });
         setAccounts([]);
       } finally {
         setIsLoadingAccounts(false);
       }
     };
     fetchAccountsAndStatuses();
   }, [toast]);


   const handleCheckBalanceClick = (account: AccountBalance) => {
       if (account.isLoading) return;
       // Check bank status before prompting for PIN
       if (account.bankStatus === 'Down') {
           toast({ variant: "destructive", title: "Bank Server Down", description: `Cannot check balance for ${account.bankName} currently.` });
           return;
       }
       setAccountToCheck(account);
       setUpiPin(''); // Clear previous PIN
       setIsPinDialogOpen(true);
   };

   const handlePinCancel = () => {
       setIsPinDialogOpen(false);
       setAccountToCheck(null);
   };

   const handlePinSubmit = async () => {
       if (!accountToCheck || !upiPin) return;

       const expectedLength = accountToCheck.pinLength;
       const isValidPin = expectedLength ? upiPin.length === expectedLength : (upiPin.length === 4 || upiPin.length === 6);

       if (!isValidPin) {
           toast({ variant: "destructive", title: "Invalid PIN", description: `Please enter your ${expectedLength || '4 or 6'} digit UPI PIN.` });
           return;
       }

       setIsPinDialogOpen(false); // Close dialog immediately
       // Set loading state for the specific account
       setAccounts(prev => prev.map(acc => (acc.upiId === accountToCheck.upiId ? { ...acc, isLoading: true, error: null, balance: null } : acc)));

       try {
            const balance = await checkBalance(accountToCheck.upiId, upiPin);
            // Update balance for the specific account
            setAccounts(prev => prev.map(acc => (acc.upiId === accountToCheck!.upiId ? { ...acc, balance, isLoading: false, error: null } : acc)));
            toast({ title: "Balance Fetched", description: `Balance for ...${accountToCheck.accountNumber.slice(-4)} is ₹${balance.toFixed(2)}`});
       } catch (error: any) {
            console.error(`Balance check failed for ${accountToCheck.upiId}:`, error);
            // Update error state for the specific account
            setAccounts(prev => prev.map(acc => (acc.upiId === accountToCheck!.upiId ? { ...acc, isLoading: false, error: error.message || "Could not retrieve balance.", balance: null } : acc)));
            toast({ variant: "destructive", title: "Balance Check Failed", description: error.message || "Could not retrieve balance." });
       } finally {
           setAccountToCheck(null); // Clear the account being checked
           setUpiPin(''); // Clear PIN state
           // Note: Individual isLoading state is reset within the map functions above
       }
   };

   // Refresh all accounts sequentially
    const handleRefreshAll = async () => {
        setIsRefreshingAll(true);
        toast({ title: "Refreshing Balances", description: "Fetching status and preparing to check balances..." });

        // Refetch statuses first
        const accountsWithState: AccountBalance[] = await Promise.all(
            accounts.map(async (acc) => {
                const bankIdentifier = acc.upiId.split('@')[1];
                const status = bankIdentifier ? await getBankStatus(bankIdentifier) : 'Active';
                return { ...acc, balance: null, isLoading: false, error: null, bankStatus: status }; // Reset balance/error/loading
            })
         );
         setAccounts(accountsWithState); // Update statuses

        toast({ description: "Statuses updated. You may need to enter PIN for each account if checking balance." });
        setIsRefreshingAll(false);
        // Note: The user still needs to click 'Check Balance' for each account individually
        // to trigger the PIN prompt and actual balance fetch. Auto-checking all is not
        // feasible due to PIN requirement.
    };

     const getBankStatusBadge = (status: 'Active' | 'Slow' | 'Down' | undefined) => {
         switch(status) {
             case 'Active': return null; // Don't show badge for active
             case 'Slow': return <Badge variant="secondary" className="ml-2 text-xs bg-yellow-100 text-yellow-700">Slow</Badge>;
             case 'Down': return <Badge variant="destructive" className="ml-2 text-xs">Server Down</Badge>;
             default: return null;
         }
     };

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Banknote className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Check Balance</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-4 pb-20">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Linked Accounts</CardTitle>
            <Button variant="outline" size="sm" onClick={handleRefreshAll} disabled={isLoadingAccounts || isRefreshingAll}>
                {isRefreshingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {isRefreshingAll ? "Refreshing..." : "Refresh Statuses"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingAccounts ? (
              <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No linked accounts found.</p>
            ) : (
              accounts.map((account) => (
                <div key={account.upiId} className="border rounded-md p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{account.bankName} {getBankStatusBadge(account.bankStatus)}</p>
                      <p className="text-sm text-muted-foreground">A/C: {account.accountNumber}</p>
                      <p className="text-xs text-primary flex items-center gap-1">UPI ID: {account.upiId}</p>
                       {account.bankStatus === 'Slow' && <p className="text-xs text-yellow-600 mt-1">Bank server is slow, balance check might take longer.</p>}
                       {account.bankStatus === 'Down' && <p className="text-xs text-destructive mt-1">Bank server is down, balance check unavailable.</p>}
                    </div>
                     <div className="text-right">
                       {account.isLoading ? (
                           <Loader2 className="h-5 w-5 animate-spin" />
                       ) : account.error ? (
                            <XCircle className="h-5 w-5 text-destructive" title={account.error}/>
                       ) : account.balance !== undefined && account.balance !== null ? (
                         <>
                           <p className="text-lg font-bold">₹{account.balance.toFixed(2)}</p>
                           <CheckCircle className="h-4 w-4 text-green-500 inline-block align-middle ml-1"/>
                         </>
                       ) : null}
                     </div>
                  </div>
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={() => handleCheckBalanceClick(account)}
                     disabled={account.isLoading || account.bankStatus === 'Down'}
                     className="w-full sm:w-auto"
                  >
                       {account.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                       {account.isLoading ? 'Checking...' : 'Check Balance'}
                  </Button>
                   {account.error && <p className="text-xs text-destructive mt-1">{account.error}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>

       {/* UPI PIN Dialog */}
       <AlertDialog open={isPinDialogOpen} onOpenChange={(open) => { if (!open) handlePinCancel(); }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Enter UPI PIN</AlertDialogTitle>
                     <AlertDialogDescription>
                          Enter your {accountToCheck?.pinLength || '4 or 6'} digit UPI PIN for {accountToCheck?.bankName || 'your account'} ending in ...{accountToCheck?.accountNumber.slice(-4)} to check balance.
                     </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                    <Label htmlFor="pin-input-dialog" className="sr-only">UPI PIN</Label>
                    <Input
                        id="pin-input-dialog"
                        type="password"
                        inputMode="numeric"
                        maxLength={accountToCheck?.pinLength || 6} // Use dynamic length or default 6
                        value={upiPin}
                        onChange={(e) => setUpiPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="text-center text-xl tracking-[0.3em]"
                        placeholder={accountToCheck?.pinLength === 4 ? "****" : "******"} // Dynamic placeholder
                        autoFocus
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handlePinCancel}>Cancel</AlertDialogCancel>
                     <AlertDialogAction
                        onClick={handlePinSubmit}
                        disabled={!(
                            (accountToCheck?.pinLength === 4 && upiPin.length === 4) ||
                            (accountToCheck?.pinLength === 6 && upiPin.length === 6) ||
                            (!accountToCheck?.pinLength && (upiPin.length === 4 || upiPin.length === 6)) // Fallback check
                        )}
                    >
                        <Lock className="mr-2 h-4 w-4" /> Confirm
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );