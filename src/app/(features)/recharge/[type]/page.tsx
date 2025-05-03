'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Smartphone, Tv, Bolt } from 'lucide-react';
import Link from 'next/link';
import { getBillers, Biller } from '@/services/recharge'; // Import service

// Helper to capitalize first letter
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Map types to icons and titles
const rechargeTypeDetails: { [key: string]: { icon: React.ElementType; title: string } } = {
  mobile: { icon: Smartphone, title: "Mobile Recharge" },
  dth: { icon: Tv, title: "DTH Recharge" },
  electricity: { icon: Bolt, title: "Electricity Bill" },
  // Add more types as needed
};

export default function RechargePage() {
  const params = useParams();
  const type = typeof params.type === 'string' ? params.type : 'mobile'; // Default to mobile if invalid

  const [billers, setBillers] = useState<Biller[]>([]);
  const [selectedBiller, setSelectedBiller] = useState<string>('');
  const [identifier, setIdentifier] = useState<string>(''); // e.g., Mobile number, DTH ID
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const details = rechargeTypeDetails[type] || rechargeTypeDetails.mobile; // Fallback to mobile details
  const identifierLabel = type === 'mobile' ? 'Mobile Number' : type === 'dth' ? 'DTH Subscriber ID' : 'Consumer Number';

  useEffect(() => {
    async function fetchBillers() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedBillers = await getBillers(capitalize(type)); // Assuming API expects capitalized type
        setBillers(fetchedBillers);
        if (fetchedBillers.length > 0) {
           // Pre-select if only one or based on logic
           // setSelectedBiller(fetchedBillers[0].billerId);
        }
      } catch (err) {
        setError('Failed to load operators. Please try again.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBillers();
  }, [type]);

  const handleRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    // Add validation here
    if (!selectedBiller || !identifier || !amount) {
        setError("Please fill in all fields.");
        return;
    }
    setError(null);
    console.log("Processing recharge:", { type, selectedBiller, identifier, amount });
    // TODO: Integrate with processRecharge API
    alert(`Recharge initiated for ${identifierLabel}: ${identifier}, Operator: ${selectedBiller}, Amount: ${amount}`);
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
            <CardTitle>Enter Details</CardTitle>
            <CardDescription>Please provide the details for your {type} payment.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRecharge} className="space-y-4">
              {/* Identifier Input (Mobile No, DTH ID, etc.) */}
              <div className="space-y-2">
                <Label htmlFor="identifier">{identifierLabel}</Label>
                <Input
                  id="identifier"
                  type={type === 'mobile' ? 'tel' : 'text'}
                  placeholder={`Enter ${identifierLabel}`}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>

              {/* Operator/Biller Select */}
              {billers.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="biller">Operator</Label>
                    <Select value={selectedBiller} onValueChange={setSelectedBiller} required>
                      <SelectTrigger id="biller">
                        <SelectValue placeholder={isLoading ? "Loading..." : "Select Operator"} />
                      </SelectTrigger>
                      <SelectContent>
                        {billers.map((biller) => (
                          <SelectItem key={biller.billerId} value={biller.billerId}>
                            {biller.billerName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                     {error && <p className="text-sm text-destructive">{error}</p>}
                  </div>
              )}
               {isLoading && !billers.length && <p className="text-sm text-muted-foreground">Loading operators...</p>}


              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min="1" // Basic validation
                />
              </div>

              {error && <p className="text-sm text-destructive mt-2">{error}</p>}

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
