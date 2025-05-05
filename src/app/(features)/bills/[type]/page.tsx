'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bolt, Droplet, ShieldCheck, Banknote, RadioTower, Loader2, Info, Power, GraduationCap } from 'lucide-react'; // Added Power, GraduationCap
import Link from 'next/link';
import { getBillers, Biller } from '@/services/recharge'; // Still use recharge service for getting billers list
import { fetchBillAmount, processBillPayment } from '@/services/bills'; // Use new bills service
import { useToast } from "@/hooks/use-toast"; // Import toast
import { auth } from '@/lib/firebase'; // Import auth

// Helper to capitalize first letter
const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

// Map types to icons and titles
const billTypeDetails: { [key: string]: { icon: React.ElementType; title: string, identifierLabel: string, billerType: string } } = {
  electricity: { icon: Bolt, title: "Electricity Bill", identifierLabel: "Consumer Number", billerType: "Electricity" },
  water: { icon: Droplet, title: "Water Bill", identifierLabel: "Connection ID", billerType: "Water" },
  insurance: { icon: ShieldCheck, title: "Insurance Premium", identifierLabel: "Policy Number", billerType: "Insurance" },
  'credit-card': { icon: Banknote, title: "Credit Card Bill", identifierLabel: "Card Number", billerType: "Credit Card"},
  fastag: { icon: RadioTower, title: "FASTag Recharge", identifierLabel: "Vehicle Number", billerType: "Fastag"},
  loan: { icon: Banknote, title: "Loan Repayment", identifierLabel: "Loan Account Number", billerType: "Loan" },
  broadband: { icon: RadioTower, title: "Broadband/Landline", identifierLabel: "Account/Phone Number", billerType: "Broadband" },
  gas: { icon: Bolt, title: "Piped Gas", identifierLabel: "Consumer ID", billerType: "Gas" },
  education: { icon: GraduationCap, title: "Education Fees", identifierLabel: "Student ID / Roll Number", billerType: "Education"},
  'prepaid-electricity': { icon: Power, title: "Prepaid Electricity", identifierLabel: "Meter Number", billerType: "Electricity"}, // Example specific type
  // Add more bill types as needed
};

export default function BillPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const type = typeof params.type === 'string' ? params.type : 'electricity'; // Default

  const [billers, setBillers] = useState<Biller[]>([]);
  const [selectedBillerId, setSelectedBillerId] = useState<string>('');
  const [selectedBillerName, setSelectedBillerName] = useState<string>(''); // Store name for display
  const [identifier, setIdentifier] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [fetchedAmount, setFetchedAmount] = useState<number | null>(null); // Store fetched bill amount
  const [isFetchingAmount, setIsFetchingAmount] = useState<boolean>(false);
  const [isLoadingBillers, setIsLoadingBillers] = useState<boolean>(true); // Start loading initially
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // Track login state
  const { toast } = useToast(); // Initialize toast

  const details = billTypeDetails[type] || billTypeDetails.electricity; // Fallback

  // Check login status
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setIsLoggedIn(!!user);
      if (!user) {
        setIsLoadingBillers(false); // Stop loading if not logged in
      }
    });
    return () => unsubscribe();
  }, []);


  // Fetch Billers only when logged in
  useEffect(() => {
    if (isLoggedIn === null) return; // Wait for auth state to be determined

    if (!isLoggedIn) {
        setIsLoadingBillers(false); // Ensure loading stops
        setError("Please log in to pay bills."); // Set error message
        return; // Don't fetch if not logged in
    }

    async function fetchBillers() {
      setIsLoadingBillers(true);
      setError(null);
      try {
        // getBillers service will now throw error if not authenticated
        const fetchedBillers = await getBillers(details.billerType);
        setBillers(fetchedBillers);
      } catch (err: any) {
          if (err.message === "User not authenticated.") {
              setError("Authentication error. Please log in again.");
              // Optionally redirect or show login prompt
          } else {
              setError('Failed to load providers. Please try again.');
          }
          console.error(err);
          setBillers([]); // Clear billers on error
          toast({ variant: "destructive", title: "Error Loading Providers" });
      } finally {
        setIsLoadingBillers(false);
      }
    }
    fetchBillers();
  }, [isLoggedIn, details.billerType, toast]);

  // Handle Biller Selection
  const handleBillerChange = (billerId: string) => {
    setSelectedBillerId(billerId);
    const biller = billers.find(b => b.billerId === billerId);
    setSelectedBillerName(biller?.billerName || '');
    setFetchedAmount(null); // Reset fetched amount when biller changes
    setAmount(''); // Optionally clear manual amount
    setError(null); // Clear errors
  };

   // Handle Identifier Change - trigger fetch amount automatically
   useEffect(() => {
       if (selectedBillerId && identifier) {
            handleFetchBill();
       } else {
           setFetchedAmount(null); // Clear fetched amount if identifier or biller is missing
           setAmount(''); // Clear manual amount too
       }
       // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [identifier, selectedBillerId]); // Rerun when identifier or billerId changes


  // Fetch Bill Amount
  const handleFetchBill = async () => {
     if (!selectedBillerId || !identifier) {
        // Don't show toast if user is just clearing fields
        // toast({ variant: "destructive", title: "Missing Details", description: "Please select a provider and enter the identifier." });
        return;
     }
     setIsFetchingAmount(true);
     setError(null);
     setFetchedAmount(null); // Clear previous fetched amount
     setAmount(''); // Clear manual amount

     try {
         const billDetails = await fetchBillAmount(selectedBillerId, identifier);
         if (billDetails && billDetails.amount !== undefined && billDetails.amount !== null) {
             setFetchedAmount(billDetails.amount);
             setAmount(billDetails.amount.toString()); // Set amount input automatically
             toast({ title: "Bill Fetched", description: `Outstanding amount: ₹${billDetails.amount.toFixed(2)}${billDetails.dueDate ? ` (Due: ${format(billDetails.dueDate, 'PP')})` : ''}` });
         } else {
             toast({ title: "Manual Entry Required", description: "Could not fetch bill details automatically. Please enter the amount." });
             // Allow manual entry if fetch returns null or no amount
         }
     } catch (err: any) {
         console.error("Failed to fetch bill amount:", err);
         setError("Could not fetch bill details. Please enter the amount manually.");
         toast({ variant: "destructive", title: "Error Fetching Bill", description: err.message || "Please try again." });
     } finally {
         setIsFetchingAmount(false);
     }
  }

  // Process Payment
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
        setError("Please log in to make payments.");
        return;
    }
    setError(null);

    if (!selectedBillerId || !identifier || !amount || Number(amount) <= 0) {
        setError("Please fill in all required fields with valid values.");
        toast({ variant: "destructive", title: "Invalid Input" });
        return;
    }

    setIsProcessingPayment(true);

    try {
        const paymentDetails = {
            billerId: selectedBillerId,
            identifier: identifier,
            amount: Number(amount),
            billerType: details.billerType,
            billerName: selectedBillerName || details.title, // Use fetched name or default title
        };
        // Process payment through backend API (which handles logging)
        const transactionResult = await apiClient<Transaction>('/bills/:type'.replace(':type', type), {
            method: 'POST',
            body: JSON.stringify(paymentDetails),
        });

        if (transactionResult.status === 'Completed') {
             toast({
                 title: "Payment Successful",
                 description: `Paid ₹${amount} for ${transactionResult.name}.`,
             });
             // Optionally reset form or navigate away
             router.push('/history'); // Redirect to history after success
        } else {
             // Backend should ideally return the transaction object even if pending/failed
             setError(`Payment ${transactionResult.status}. ${transactionResult.description || ''}`);
             toast({
                 variant: "destructive",
                 title: `Payment ${transactionResult.status}`,
                 description: transactionResult.description || "Please check history for details.",
             });
        }

    } catch (err: any) {
        console.error("Bill payment failed:", err);
        setError(err.message || "Payment failed. Please try again.");
        toast({ variant: "destructive", title: "Payment Failed", description: err.message || "Please check details and try again." });
    } finally {
        setIsProcessingPayment(false);
    }
  };

  const isAmountInputDisabled = fetchedAmount !== null || isFetchingAmount || isProcessingPayment;

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <details.icon className="h-6 w-6" />
        <h1 className="text-lg font-semibold">{details.title}</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Enter Bill Details</CardTitle>
            <CardDescription>Please provide the details for your {details.title}.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoggedIn === false && (
                <p className="text-destructive text-center p-4">Please log in to pay bills.</p>
             )}
             {isLoggedIn && (
                <form onSubmit={handlePayment} className="space-y-4">
                    {/* Biller/Provider Select */}
                    <div className="space-y-2">
                        <Label htmlFor="biller">Provider / Biller</Label>
                        <Select value={selectedBillerId} onValueChange={handleBillerChange} required disabled={isLoadingBillers || billers.length === 0}>
                        <SelectTrigger id="biller" className={isLoadingBillers ? 'opacity-50' : ''}>
                            <SelectValue placeholder={isLoadingBillers ? "Loading..." : (billers.length === 0 ? "No providers found" : "Select Provider")} />
                        </SelectTrigger>
                        <SelectContent>
                            {billers.map((biller) => (
                            <SelectItem key={biller.billerId} value={biller.billerId}>
                                {biller.billerName}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    {error && error.includes("providers") && <p className="text-sm text-destructive">{error}</p>}
                    {error && error.includes("Authentication") && <p className="text-sm text-destructive">{error}</p>}


                    {/* Identifier Input */}
                    <div className="space-y-2">
                        <Label htmlFor="identifier">{details.identifierLabel}</Label>
                        <Input
                        id="identifier"
                        type="text" // Keep as text for various ID formats
                        placeholder={`Enter ${details.identifierLabel}`}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                        disabled={isProcessingPayment}
                        />
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="amount">Amount (₹)</Label>
                            {/* Show Fetch Bill button only if amount not fetched/fetching */}
                            {fetchedAmount === null && !isFetchingAmount && (
                                <Button type="button" variant="link" size="sm" onClick={handleFetchBill} disabled={!selectedBillerId || !identifier || isFetchingAmount || isProcessingPayment}>
                                    {isFetchingAmount ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch Bill"}
                                </Button>
                            )}
                            {isFetchingAmount && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                        </div>

                        <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                            <Input
                            id="amount"
                            type="number"
                            placeholder={isFetchingAmount ? "Fetching..." : (fetchedAmount === null ? "Enter Amount or Fetch Bill" : "Bill Amount Fetched")}
                            value={amount}
                            onChange={(e) => {
                                setAmount(e.target.value);
                                // If user types manually after fetch, clear fetchedAmount state
                                if (fetchedAmount !== null) setFetchedAmount(null);
                            }}
                            required
                            min="0.01"
                            step="0.01"
                            className="pl-7"
                            disabled={isAmountInputDisabled}
                            />
                        </div>
                        {fetchedAmount !== null && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1"><Info className="h-3 w-3"/> Fetched bill amount: ₹{fetchedAmount.toFixed(2)}</p>
                        )}
                         {error && !error.includes("providers") && !error.includes("Authentication") && <p className="text-sm text-destructive mt-1">{error}</p>}
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white"
                        disabled={isProcessingPayment || isFetchingAmount || !selectedBillerId || !identifier || !amount || Number(amount) <= 0}
                    >
                        {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isProcessingPayment ? 'Processing...' : `Proceed to Pay ₹${amount || '0'}`}
                    </Button>
                </form>
              )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// Removed duplicate interfaces/types as they are imported now
import type { Transaction } from '@/services/transactions';
import { format } from 'date-fns';
