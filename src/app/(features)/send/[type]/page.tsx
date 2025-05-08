
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'; // Added useRef
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Lock, Loader2, CheckCircle, XCircle, Info, Wallet, MessageCircle, Users, Landmark, Clock, HelpCircle, Ticket, CircleAlert, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
// Removed unused import: import { suggestFrequentContacts, SmartPayeeSuggestionInput } from '@/ai/flows/smart-payee-suggestion';
import { getContacts, savePayee, PayeeClient as Payee } from '@/services/contacts'; // Use client interface, use getContacts
import { processUpiPayment, verifyUpiId } from '@/services/upi'; // Import processUpiPayment
import type { Transaction } from '@/services/types'; // Import Transaction
import { payViaWallet, getWalletBalance } from '@/services/wallet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { auth } from '@/lib/firebase';
import { format } from "date-fns";
import { Badge } from '@/components/ui/badge'; // Import Badge
import { cn } from "@/lib/utils";
import { getBankStatus } from '@/services/upi';

// Helper to parse UPI URL (basic example)
const parseUpiUrl = (url: string): { payeeName?: string; payeeAddress?: string; amount?: string, note?: string } => {
    try {
        const decodedUrl = decodeURIComponent(url);
        const params = new URLSearchParams(decodedUrl.substring(decodedUrl.indexOf('?') + 1));
        return {
            payeeName: params.get('pn') || undefined,
            payeeAddress: params.get('pa') || undefined,
            amount: params.get('am') || undefined,
            note: params.get('tn') || undefined,
            // addtnlDetails: params.get('tr') || undefined, // Example - Tnx Reference
        };
    } catch (error) {
        console.error("Failed to parse UPI URL:", error);
        return {};
    }
};

type PaymentSource = 'upi' | 'wallet';

// Interface extending PayeeClient with additional properties for UI
interface DisplayPayee extends Payee {
    verificationStatus?: 'verified' | 'blacklisted' | 'unverified' | 'pending';
    verificationReason?: string; // Reason if blacklisted
}


export default function SendMoneyPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const type = typeof params.type === 'string' ? (params.type === 'bank' ? 'bank' : 'mobile') : 'mobile';
  const [searchTerm, setSearchTerm] = useState('');
  const [amount, setAmount] = useState('');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedPayee, setSelectedPayee] = useState<DisplayPayee | null>(null); // Saved contact or Recent Payment
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [bankStatuses, setBankStatuses] = useState<Record<string, 'Active' | 'Slow' | 'Down'>>({}); // Bank statuses for all accounts
  const [newContactDetails, setNewContactDetails] = useState<{ upiId?: string; name?: string }>({}); // For saving new contact
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAccountUpiId, setSelectedAccountUpiId] = useState('');

    useEffect(() => {
         const fetchBankStatusesForAccounts = async () => {
             if (accounts && accounts.length > 0) {
                 const statuses: Record<string, 'Active' | 'Slow' | 'Down'> = {};
                 for (const acc of accounts) {
                     const bankIdentifier = acc.upiId.split('@')[1];
                     if (bankIdentifier) {
                         statuses[acc.upiId] = await getBankStatus(bankIdentifier);
                     }
                 }
                 setBankStatuses(statuses);
             }
         };
         fetchBankStatusesForAccounts();
    }, [accounts]);

  // Load contacts (simulated for now)
  useEffect(() => {
    async function loadContacts() {
      setIsLoadingContacts(true);
      try {
        //  contacts  come from service api contacts.ts
          const data = await getContacts();
          setAllContacts(data);
      } catch (err) {
        setHasError(true);
        console.log(err);
      } finally {
        setIsLoadingContacts(false);
      }
    }
    loadContacts();
  }, []);

  const [contacts, setContacts] = useState<DisplayPayee[]>([]);
    useEffect(() => {
        if (!searchTerm) {
            setContacts(allContacts);
        } else {
            // Search logic
            const results = allContacts.filter(contact =>
                contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.upiId?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setContacts(results);
        }
    }, [searchTerm, allContacts]);

  // Reset selected payee when the identifier type changes
  useEffect(() => {
    setSelectedPayee(null);
  }, [type]);

  const handleClearSelection = () => {
    setSelectedPayee(null);
    setSearchTerm('');
  };

  const handleSelectContact = (contact: DisplayPayee) => {
    setSelectedPayee(contact);
    setSearchTerm(contact.name);
  };

  const handleMakePayment = async () => {
    if (!selectedPayee) {
      toast({
        title: "Recipient Missing",
        description: "Select or add a contact to pay.",
      });
      return;
    }

    if (!amount) {
      toast({
        variant: "destructive",
        title: "Please Enter Amount",
      });
      return;
    }

    setShowConfirmation(true);

      // Create the transaction here
      // In real implementation, call a function to make backend request to process payment
      // Also create the transaction
    await addTransaction();

     toast({
      title: "Payment Success",
      description: "You Have Successfully Transfer Payment to the Recipient .",
    });
  };

  const addContact = async () => {
    if (!newContactDetails.name || !newContactDetails.upiId) {
      toast({
        variant: "destructive",
        title: "Please Enter The Fields",
      });
      return;
    }
    const newContact = { name: newContactDetails.name, upiId: newContactDetails.upiId, identifier: newContactDetails.upiId };
    // Add the new contact to the list of contacts
     await savePayee(newContact as any);
    toast({
      title: "Save New contact",
    });
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
        <Send className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Pay Via Mobile Contact</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Pay Your Payee</CardTitle>
            <CardDescription>Select a contact and enter transaction details</CardDescription>
          </CardHeader>
          <CardContent>
             {!isLoadingContacts && (
                <div className="space-y-4">
                  <div className="space-y-2">
                  <Label htmlFor="name">Enter search Your Contact</Label>
                    <Input
                        id="name"
                        type="text"
                        placeholder="Enter search Your Contact"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                      {searchTerm ? (
                          <>
                          {contacts &&
                           contacts.map((contact) => (
                                <Button key={contact.id} variant="secondary" className="w-full justify-start" onClick={() => handleSelectContact(contact)}>
                                  <User className="mr-2 h-4 w-4" />
                                 {contact.name}  ({contact.upiId})
                                </Button>
                            ))}
                             {(contacts.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No matching contacts found.</p>}
                          </>
                      ) : (
                        // If all contacts are showing , the short logic
                          contacts &&
                         contacts.map((contact) => (
                            <Button key={contact.id} variant="secondary" className="w-full justify-start" onClick={() => handleSelectContact(contact)}>
                              <User className="mr-2 h-4 w-4" />
                              {contact.name} - ({contact.identifier})
                            </Button>
                            ))
                      )}
                  </div>

                  <div className="space-y-2">
                     <Label htmlFor="name">Enter Amount</Label>
                    <Input
                      id="name"
                      type="number"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                   <Separator className="my-4"/>
                     <div>
                        <Label htmlFor="name">Add UPI ID to the contact list</Label>
                     <div className="space-y-2">
                         <Input
                            id="name"
                            type="text"
                            placeholder="Enter New Contact Name"
                            value={newContactDetails.name}
                            onChange={(e) => setNewContactDetails({ ...newContactDetails, name: e.target.value })}
                        />
                         <Input
                            id="name"
                            type="text"
                            placeholder="Enter New Contact UPI ID"
                            value={newContactDetails.upiId}
                            onChange={(e) => setNewContactDetails({ ...newContactDetails, upiId: e.target.value })}
                        />

                      </div>
                      <Button onClick={addContact}>Add UPI ID </Button>
                  </div>
                   <Separator className="my-4"/>
                    <Button
                        type="button"
                        onClick={handleMakePayment}
                        className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                      >
                        Send
                    </Button>
                    </div>
                )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
    