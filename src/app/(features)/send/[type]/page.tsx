
'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, User, Landmark, Banknote, Loader2, Send } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { suggestFrequentContacts, SmartPayeeSuggestionInput, SmartPayeeSuggestionOutput } from '@/ai/flows/smart-payee-suggestion';

// Mock Contact/Payee Data (replace with actual data fetching/search)
interface Payee {
  id: string;
  name: string;
  identifier: string; // Phone number or UPI ID/Account
  type: 'mobile' | 'bank';
  avatar?: string;
}

const mockContacts: Payee[] = [
  { id: '1', name: "Alice Smith", identifier: "+919876543210", type: 'mobile', avatar: "/avatars/01.png" },
  { id: '2', name: "Bob Johnson", identifier: "bob.j@okbank", type: 'bank', avatar: "/avatars/02.png" },
  { id: '3', name: "Charlie Brown", identifier: "+919988776655", type: 'mobile', avatar: "/avatars/03.png" },
  { id: '4', name: "David Williams", identifier: "david.will@ybl", type: 'bank', avatar: "/avatars/04.png" },
  { id: '5', name: "Eve Davis", identifier: "9876543210@paytm", type: 'bank', avatar: "/avatars/05.png" },
];


export default function SendMoneyPage() {
  const params = useParams();
  const type = typeof params.type === 'string' ? (params.type === 'bank' ? 'bank' : 'mobile') : 'mobile'; // Default to mobile

  const [searchTerm, setSearchTerm] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedPayee, setSelectedPayee] = useState<Payee | null>(null);
  const [filteredPayees, setFilteredPayees] = useState<Payee[]>([]);
  const [suggestedPayees, setSuggestedPayees] = useState<Payee[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const pageDetails = type === 'mobile'
    ? { icon: User, title: "Send to Mobile Contact", placeholder: "Enter Name or Mobile Number", identifierLabel: "Mobile Number" }
    : { icon: Landmark, title: "Send to Bank/UPI ID", placeholder: "Enter Name, UPI ID, or Account No.", identifierLabel: "UPI ID / Account Number" };

  // Fetch AI-powered suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        // Simulate fetching recent contacts/transactions for the user
        const recentContactsData: SmartPayeeSuggestionInput = {
          userId: 'currentUser123', // Replace with actual user ID
          recentContacts: mockContacts.slice(0, 3).map(c => c.id) // Use mock recent contacts for demo
        };
        const result = await suggestFrequentContacts(recentContactsData);
        // Map suggested IDs back to full Payee objects
        const suggestions = result.suggestedContacts
          .map(id => mockContacts.find(p => p.id === id))
          .filter((p): p is Payee => !!p); // Type guard to remove undefined
        setSuggestedPayees(suggestions);
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
        toast({ variant: "destructive", title: "Could not load suggestions" });
      } finally {
        setIsLoadingSuggestions(false);
      }
    };
    fetchSuggestions();
  }, [toast]); // Re-fetch isn't necessary on type change for this demo

  // Filter payees based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPayees([]);
      setSelectedPayee(null); // Clear selection if search term is cleared
      return;
    }
    const lowerCaseSearch = searchTerm.toLowerCase();
    const results = mockContacts.filter(payee =>
      (payee.type === type || type === 'bank') && // Match type or allow any for bank transfer search
      (payee.name.toLowerCase().includes(lowerCaseSearch) ||
       payee.identifier.toLowerCase().includes(lowerCaseSearch))
    );
    setFilteredPayees(results);
  }, [searchTerm, type]);

  const handleSelectPayee = (payee: Payee) => {
    setSelectedPayee(payee);
    setSearchTerm(payee.name); // Fill search bar with name
    setFilteredPayees([]); // Hide dropdown
  };

  const handleSendMoney = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayee || !amount || Number(amount) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Please select a payee and enter a valid amount.",
      });
      return;
    }

    setIsSending(true);
    console.log("Sending money:", { payee: selectedPayee, amount });

    // Simulate API call
    setTimeout(() => {
      setIsSending(false);
      toast({
        title: "Payment Successful",
        description: `₹${amount} sent to ${selectedPayee.name}`,
      });
      // Reset form or navigate away
      setSelectedPayee(null);
      setSearchTerm('');
      setAmount('');
    }, 2000);
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
        <pageDetails.icon className="h-6 w-6" />
        <h1 className="text-lg font-semibold">{pageDetails.title}</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Enter Payment Details</CardTitle>
            <CardDescription>Search for a contact or enter details manually.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendMoney} className="space-y-4">
              {/* Payee Search/Input */}
              <div className="space-y-2 relative">
                <Label htmlFor="payee-search">{pageDetails.identifierLabel}</Label>
                <Input
                  id="payee-search"
                  placeholder={pageDetails.placeholder}
                  value={searchTerm}
                  onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (selectedPayee && e.target.value !== selectedPayee.name) {
                          setSelectedPayee(null); // Deselect if user modifies search after selection
                      }
                  }}
                  required={!selectedPayee} // Required if no payee is selected from list
                  className="pr-10" // Make space for potential icon
                />
                 {/* Suggestions/Results Dropdown */}
                 {(filteredPayees.length > 0 || (searchTerm.trim() === '' && suggestedPayees.length > 0)) && !selectedPayee && (
                    <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        <p className="text-xs font-semibold p-2 text-muted-foreground">
                            {searchTerm.trim() === '' ? 'Suggested Contacts' : 'Search Results'}
                        </p>
                        {(searchTerm.trim() === '' ? suggestedPayees : filteredPayees).map((payee) => (
                            <div
                            key={payee.id}
                            className="flex items-center p-2 hover:bg-accent cursor-pointer"
                            onClick={() => handleSelectPayee(payee)}
                            >
                            <Avatar className="h-8 w-8 mr-3">
                                <AvatarImage src={`https://picsum.photos/seed/${payee.id}/40/40`} alt={payee.name} data-ai-hint="person avatar"/>
                                <AvatarFallback>{payee.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-medium">{payee.name}</p>
                                <p className="text-xs text-muted-foreground">{payee.identifier}</p>
                            </div>
                            </div>
                        ))}
                        {isLoadingSuggestions && searchTerm.trim() === '' && <p className="p-2 text-sm text-muted-foreground">Loading suggestions...</p>}
                    </div>
                 )}
              </div>

              {/* Selected Payee Display */}
              {selectedPayee && (
                <div className="flex items-center p-3 border border-border rounded-md bg-muted/50">
                  <Avatar className="h-9 w-9 mr-3">
                     <AvatarImage src={`https://picsum.photos/seed/${selectedPayee.id}/40/40`} alt={selectedPayee.name} data-ai-hint="person avatar"/>
                    <AvatarFallback>{selectedPayee.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{selectedPayee.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedPayee.identifier}</p>
                  </div>
                   <Button variant="ghost" size="sm" className="ml-auto text-xs text-destructive" onClick={() => { setSelectedPayee(null); setSearchTerm(''); }}>Change</Button>
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
                    className="pl-7" // Make space for the Rupee symbol
                    disabled={!selectedPayee && !searchTerm} // Disable if no recipient is clear
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white" disabled={!selectedPayee || !amount || Number(amount) <= 0 || isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Send Money
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
