'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Loader2, RefreshCw, Banknote } from 'lucide-react';
import { getLinkedAccounts, BankAccount, checkBalance } from '@/services/upi';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Interface extending BankAccount with UI state
interface AccountBalance extends BankAccount {
    balance?: number;
    isLoading?: boolean;
    error?: string | null;
}

export default function CheckBalancePage() {
  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const { toast } = useToast();
   // Store the promise resolver for the PIN dialog
  const pinPromiseResolverRef = useRef<{ resolve: (pin: string | null) => void } | null>(null);

  // Load accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      setIsLoadingAccounts(true);
      try {
        const fetchedAccounts = await getLinkedAccounts();
        // Initialize each account with balance-related state
        setAccounts(fetchedAccounts.map(acc => ({ ...acc, balance: null, isLoading: false, error: null })));
      } catch (error: any) {
        console.error("Failed to fetch accounts:", error);
        toast({ variant: "destructive", title: "Error Loading Accounts", description: error.message || "Could not load accounts." });
        setAccounts([]);
      } finally {
        setIsLoadingAccounts(false);
      }
    };
    fetchAccounts();
  }, [toast]);

   const promptForPin = (): Promise<string | null> => {
        return new Promise((resolve) => {
            pinPromiseResolverRef.current = { resolve }; // Store the resolver
        });
    };


    const handleCheckBalance = async (account: AccountBalance) => {
        if (account.isLoading) return; // Prevent multiple clicks
        setAccounts(prev => prev.map(acc => (acc.upiId === account.upiId ? { ...acc, isLoading: true, error: null } : acc)));

        try {
             const pin = await new Promise<string | null>((resolve) => {
                const enteredPin = prompt("Enter UPI PIN (DEMO ONLY - DO NOT USE IN PROD)");
                resolve(enteredPin);
            });
            if (pin === null) {
                // Treat null as cancellation
                setAccounts(prev => prev.map(acc => (acc.upiId === account.upiId ? { ...acc, isLoading: false, error: "PIN entry cancelled." } : acc)));
                return;
            }
            const balance = await checkBalance(account.upiId, pin);
             setAccounts(prev => prev.map(acc => (acc.upiId === account.upiId ? { ...acc, balance, isLoading: false, error: null } : acc)));
        } catch (error: any) {
             console.error(`Balance check failed for ${account.upiId}:`, error);
             setAccounts(prev => prev.map(acc => (acc.upiId === account.upiId ? { ...acc, isLoading: false, error: error.message || "Could not retrieve balance." } : acc)));
        } finally {
            setIsLoadingAccounts(false); // Make sure loading is always reset
        }
    };

    // Refresh all accounts sequentially
    const handleRefreshAll = async () => {
        setIsRefreshingAll(true);
        toast({title: "Refreshing Balances", description: "You may need to enter PIN for each account."})

        for (const account of accounts) {
            await handleCheckBalance(account);
        }

        setIsRefreshingAll(false);
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
      <main className="flex-grow p-4 space-y-4">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Linked Accounts</CardTitle>
            <Button variant="outline" size="sm" onClick={handleRefreshAll} disabled={isLoadingAccounts || isRefreshingAll}>
                {isRefreshingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {isRefreshingAll ? "Refreshing..." : "Refresh All"}
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
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{account.bankName}</p>
                      <p className="text-sm text-muted-foreground">A/C: {account.accountNumber}</p>
                      <p className="text-xs text-primary flex items-center gap-1">UPI ID: {account.upiId}</p>
                    </div>
                    <div>
                      {account.isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                      ) : account.error ? (
                           <p className="text-red-500 text-sm">{account.error}</p>
                      ) : account.balance !== undefined && account.balance !== null ? (
                        <>
                          <p className="text-right text-lg font-bold">₹{account.balance.toFixed(2)}</p>
                          <CheckCircle className="h-4 w-4 text-green-500 inline-block align-middle ml-1"/>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={() => handleCheckBalance(account)}
                     disabled={account.isLoading}
                  >
                       {account.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                       {account.isLoading ? 'Checking...' : 'Check Balance'}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
