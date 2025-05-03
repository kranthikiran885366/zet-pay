
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Landmark, PlusCircle, Trash2, CheckCircle, Copy, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { BankAccount, linkBankAccount /*, getLinkedAccounts, removeUpiId, setDefaultAccount */ } from '@/services/upi'; // Assuming these functions exist
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Mock Data (Replace with actual API calls via useEffect)
const mockLinkedAccounts: BankAccount[] = [
  { bankName: "State Bank of India", accountNumber: "******1234", upiId: "user123@oksbi" },
  { bankName: "HDFC Bank", accountNumber: "******5678", upiId: "user.hdfc@okhdfcbank" },
  { bankName: "ICICI Bank", accountNumber: "******9012", upiId: "user@okicici" },
];

// Assume one account is default
const defaultUpiId = "user123@oksbi";

export default function UPISettingsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // Track which UPI ID is being updated/deleted
  const { toast } = useToast();

   // Fetch linked accounts on mount
   useEffect(() => {
       const fetchAccounts = async () => {
           setIsLoading(true);
           try {
               // TODO: Replace with actual API call: const fetchedAccounts = await getLinkedAccounts();
               await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
               setAccounts(mockLinkedAccounts);
           } catch (error) {
               console.error("Failed to fetch linked accounts:", error);
               toast({ variant: "destructive", title: "Could not load accounts" });
           } finally {
               setIsLoading(false);
           }
       };
       fetchAccounts();
   }, [toast]);


   const handleLinkNewAccount = async () => {
     alert("Link New Account functionality not implemented yet.");
     // Example flow:
     // 1. Trigger bank selection UI
     // 2. Initiate account linking process (SMS verification etc.)
     // 3. Call linkBankAccount service on success
     // 4. Re-fetch accounts list
   };

   const handleSetDefault = async (upiId: string) => {
        if (upiId === defaultUpiId) return; // Already default
        setIsUpdating(upiId);
        try {
            console.log(`Setting ${upiId} as default...`);
            // TODO: Replace with actual API call: await setDefaultAccount(upiId);
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate update
             // Update state to reflect new default (mock implementation)
             // In a real app, re-fetch or trust API success
             // For mock: update `defaultUpiId` variable locally (won't persist)
             // defaultUpiId = upiId; // This is incorrect state management, just for demo
             toast({ title: "Default Account Updated", description: `${upiId} is now your primary account.` });
        } catch (error) {
             console.error("Failed to set default account:", error);
             toast({ variant: "destructive", title: "Update Failed", description: "Could not set default account." });
        } finally {
             setIsUpdating(null);
             // Force re-render if needed, or ideally re-fetch accounts
        }
    };

    const handleDeleteUpiId = async (upiId: string) => {
        setIsUpdating(upiId);
        try {
            console.log(`Deleting UPI ID ${upiId}...`);
            // TODO: Replace with actual API call: await removeUpiId(upiId);
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate deletion
            setAccounts(prev => prev.filter(acc => acc.upiId !== upiId)); // Remove from local state
            toast({ title: "UPI ID Removed", description: `${upiId} has been unlinked.` });
        } catch (error) {
             console.error("Failed to remove UPI ID:", error);
             toast({ variant: "destructive", title: "Removal Failed", description: "Could not remove UPI ID." });
        } finally {
             setIsUpdating(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast({ title: "Copied to clipboard", description: text });
        }).catch(err => {
             console.error('Failed to copy: ', err);
             toast({ variant: "destructive", title: "Copy Failed" });
        });
    };


  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/profile" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Landmark className="h-6 w-6" />
        <h1 className="text-lg font-semibold">UPI & Payment Settings</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-6">
          {isLoading ? (
               <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
               </div>
          ) : accounts.length === 0 ? (
                <Card className="shadow-md text-center">
                    <CardHeader>
                        <CardTitle>No Linked Accounts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Link a bank account to start using UPI.</p>
                        <Button onClick={handleLinkNewAccount}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Link Bank Account
                        </Button>
                    </CardContent>
                </Card>
          ) : (
             <>
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Linked Bank Accounts</CardTitle>
                        <CardDescription>Manage your UPI IDs and set default account.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {accounts.map((account) => (
                        <div key={account.upiId} className="border border-border rounded-md p-4 relative">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold">{account.bankName}</p>
                                    <p className="text-sm text-muted-foreground">A/C: {account.accountNumber}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                        <p className="text-sm font-medium text-primary">{account.upiId}</p>
                                         <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(account.upiId)}>
                                            <Copy className="h-3 w-3 text-muted-foreground"/>
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end space-y-1">
                                    {account.upiId === defaultUpiId ? (
                                        <Badge variant="default" className="bg-green-100 text-green-700 pointer-events-none">
                                            <CheckCircle className="h-3 w-3 mr-1" /> Primary
                                        </Badge>
                                    ) : (
                                         <Button
                                            variant="outline"
                                            size="xs" // Custom size or adjust padding
                                            className="text-xs h-6 px-2"
                                            onClick={() => handleSetDefault(account.upiId)}
                                            disabled={isUpdating === account.upiId}
                                        >
                                            {isUpdating === account.upiId ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Set as Primary'}
                                        </Button>
                                    )}
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" disabled={isUpdating === account.upiId}>
                                                 {isUpdating === account.upiId && isUpdating !== defaultUpiId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                             </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Remove UPI ID?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to remove the UPI ID <span className="font-semibold">{account.upiId}</span>? You won't be able to use it for payments.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteUpiId(account.upiId)} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                             {isUpdating === account.upiId && (
                                <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                </div>
                             )}
                        </div>
                        ))}
                    </CardContent>
                </Card>

                <Button variant="outline" className="w-full mt-6" onClick={handleLinkNewAccount}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Another Bank Account
                </Button>
            </>
          )}
      </main>
    </div>
  );
}

// Define Button size xs if not present in shadcn theme
// Add this potentially in globals.css or manage via utility classes if preferred:
/*
.btn-xs {
  @apply h-6 px-2 text-xs;
}
*/
// Or use `className="text-xs h-6 px-2"` directly as done above.
