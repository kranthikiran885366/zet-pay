'use client';

// Generic Bill Payment page - mirrors recharge structure
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bolt, Droplet, ShieldCheck, Banknote, RadioTower } from 'lucide-react'; // Add necessary icons
import Link from 'next/link';
import { getBillers, Biller } from '@/services/recharge'; // Using recharge service for billers

// Helper to capitalize first letter
const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

// Map types to icons and titles
const billTypeDetails: { [key: string]: { icon: React.ElementType; title: string, identifierLabel: string, billerType: string } } = {
  electricity: { icon: Bolt, title: "Electricity Bill", identifierLabel: "Consumer Number", billerType: "Electricity" },
  water: { icon: Droplet, title: "Water Bill", identifierLabel: "Connection ID", billerType: "Water" },
  insurance: { icon: ShieldCheck, title: "Insurance Premium", identifierLabel: "Policy Number", billerType: "Insurance" },
  'credit-card': { icon: Banknote, title: "Credit Card Bill", identifierLabel: "Card Number", billerType: "Credit Card"}, // Added credit card
  fastag: { icon: RadioTower, title: "FASTag Recharge", identifierLabel: "Vehicle Number", billerType: "FASTag"}, // Added FASTag (though often under recharge)
  // Add more bill types as needed
};

export default function BillPaymentPage() {
  const params = useParams();
  const type = typeof params.type === 'string' ? params.type : 'electricity'; // Default

  const [billers, setBillers] = useState<Biller[]>([]);
  const [selectedBiller, setSelectedBiller] = useState<string>('');
  const [identifier, setIdentifier] = useState<string>('');
  const [amount, setAmount] = useState<string>(''); // Amount might be fetched for some bills
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const details = billTypeDetails[type] || billTypeDetails.electricity; // Fallback

  useEffect(() => {
    async function fetchBillers() {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch billers based on the mapped billerType
        const fetchedBillers = await getBillers(details.billerType);
        setBillers(fetchedBillers);
      } catch (err) {
        setError('Failed to load providers. Please try again.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBillers();
  }, [details.billerType]); // Depend on details.billerType

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    // Add validation
     if (!selectedBiller || !identifier || !amount) { // Basic check, amount might not be needed if fetched
        setError("Please fill in all required fields.");
        return;
    }
    setError(null);
    console.log("Processing bill payment:", { type: details.billerType, selectedBiller, identifier, amount });
    // TODO: Integrate with actual bill payment API (might differ from recharge)
    alert(`Payment initiated for ${details.title}: ${identifier}, Provider: ${selectedBiller}, Amount: ${amount}`);
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
            <form onSubmit={handlePayment} className="space-y-4">
               {/* Biller/Provider Select */}
              {billers.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="biller">Provider / Biller</Label>
                    <Select value={selectedBiller} onValueChange={setSelectedBiller} required>
                      <SelectTrigger id="biller">
                        <SelectValue placeholder={isLoading ? "Loading..." : "Select Provider"} />
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
              )}
               {isLoading && !billers.length && <p className="text-sm text-muted-foreground">Loading providers...</p>}
               {error && <p className="text-sm text-destructive">{error}</p>}

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
                />
              </div>

              {/* Amount Input - Might be conditional based on biller fetching amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter Amount or Fetch Bill"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required // Make optional if bill amount can be fetched
                  min="1"
                />
                {/* Add a button here to "Fetch Bill" if applicable */}
              </div>

              {error && !isLoading && <p className="text-sm text-destructive mt-2">{error}</p>}

              <Button type="submit" className="w-full bg-[#32CD32] hover:bg-[#2AAE2A] text-white">
                Proceed to Pay
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
