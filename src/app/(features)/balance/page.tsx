
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Landmark, Eye, EyeOff, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { BankAccount, checkBalance, linkBankAccount } from '@/services/upi'; // Use actual service

// Mock Linked Accounts (replace with actual data fetching)
const mockLinkedAccounts: BankAccount[] = [
  { bankName: "State Bank of India", accountNumber: "******1234", upiId: "user123@oksbi" },
  { bankName: "HDFC Bank", accountNumber: "******5678", upiId: "user.hdfc@okhdfcbank" },
];

interface AccountBalance extends BankAccount {
    balance?: number;
    isLoading?: boolean;
    error?: string | null;
    isHidden?: boolean;
}

export default function CheckBalancePage() {
  const [accounts, setAccounts] = useState<AccountBalance[]>(
      mockLinkedAccounts.map(acc => ({...acc, isHidden: true})) // Initialize with hidden state
  );
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const { toast } = useToast();

  // Function to fetch balance for a single account
  const fetchBalance = async (upiId: string) => {
    setAccounts(prev => prev.map(acc =>
      acc.upiId === upiId ? { ...acc, isLoading: true, error: null } : acc
    ));

    try {
      // Simulate PIN entry if required - in a real app, this needs a secure modal/input
      // const pin = await promptForPin();
      // if (!pin) throw new Error("PIN entry cancelled");

      const balance = await checkBalance(upiId); // Call actual service
      setAccounts(prev => prev.map(acc =>
        acc.upiId === upiId ? { ...acc, balance: balance, isLoading: false, isHidden: false } : acc // Show balance on success
      ));
      toast({ title: `Balance updated for ${upiId}` });
    } catch (error: any) {
      console.error(`Failed to fetch balance for ${upiId}:`, error);
      const errorMessage = error.message || 'Failed to fetch balance. Please try again.';
      setAccounts(prev => prev.map(acc =>
        acc.upiId === upiId ? { ...acc, isLoading: false, error: errorMessage, balance: undefined } : acc
      ));
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    }
  };

  // Function to refresh all balances
  const refreshAllBalances = async () => {
     setIsRefreshingAll(true);
     // In a real app, you might need sequential PIN entries or a different flow
     // For demo, fetch balances concurrently (assuming PIN is handled per request or cached)
     await Promise.all(accounts.map(acc => fetchBalance(acc.upiId)));
     setIsRefreshingAll(false);
     toast({title: "All balances refreshed."})
  }

  // Toggle balance visibility
  const toggleVisibility = (upiId: string) => {
     setAccounts(prev => prev.map(acc =>
      acc.upiId === upiId ? { ...acc, isHidden: !acc.isHidden } : acc
    ));
  }

  // TODO: Add functionality to link a new bank account
  const handleLinkNewAccount = async () => {
     alert("Link New Account functionality not implemented yet.");
     // Example:
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
      <main className="flex-grow p-4 space-y-4">
        {accounts.length === 0 && !isRefreshingAll && (
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

        {accounts.map((account) => (
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
                       <Button variant="destructive" size="sm" onClick={() => fetchBalance(account.upiId)}>Retry</Button>
                   ) : account.balance !== undefined ? (
                        <div className="flex items-center gap-2">
                            <span className={`text-lg font-semibold ${account.isHidden ? 'blur-sm' : ''}`}>
                                {account.isHidden ? '₹ ****.**' : `₹${account.balance.toFixed(2)}`}
                            </span>
                            <Button variant="ghost" size="icon" onClick={() => toggleVisibility(account.upiId)} className="h-7 w-7">
                                {account.isHidden ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                            </Button>
                        </div>
                   ) : (
                       <Button size="sm" onClick={() => fetchBalance(account.upiId)}>Check Balance</Button>
                   )}
               </div>
            </CardHeader>
             {account.error && (
                 <CardContent className="pt-2 pb-3 px-6 bg-destructive/10 border-t border-destructive/30">
                     <p className="text-xs text-destructive">{account.error}</p>
                 </CardContent>
             )}
          </Card>
        ))}

        <Button variant="outline" className="w-full mt-6" onClick={handleLinkNewAccount}>
          <Landmark className="mr-2 h-4 w-4" /> Link New Bank Account
        </Button>
      </main>
    </div>
  );
}
