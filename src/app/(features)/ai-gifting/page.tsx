'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Gift, Sparkles, Search } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Import Label
import { useState } from 'react'; // Import useState
import { useToast } from "@/hooks/use-toast"; // Import useToast

export default function AiGiftingPage() {
    const [occasion, setOccasion] = useState('');
    const [recipient, setRecipient] = useState('');
    const [budget, setBudget] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleFindGifts = async () => {
        if (!occasion || !recipient || !budget) {
             toast({variant: "destructive", title: "Missing Details", description: "Please fill in all fields to get suggestions."});
             return;
        }
        setIsLoading(true);
        console.log("Finding gifts for:", { occasion, recipient, budget });
        // TODO: Call Genkit AI Gifting Assistant Flow here
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate AI call
        setIsLoading(false);
        toast({ title: "Gift Suggestions", description: "AI is finding the perfect gift ideas... (Implementation pending)" });
        // TODO: Display results from the AI flow
    };

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Gift className="h-6 w-6" />
        <h1 className="text-lg font-semibold">AI Gifting Assistant</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <Card className="shadow-md w-full max-w-md">
          <CardHeader className="text-center">
             <Sparkles className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Find the Perfect Gift</CardTitle>
            <CardDescription>Let AI help you choose gifts based on occasion, recipient, and budget.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
                <Label htmlFor="occasion">Occasion</Label>
                <Input id="occasion" placeholder="e.g., Birthday, Anniversary, Diwali" value={occasion} onChange={(e) => setOccasion(e.target.value)} />
            </div>
             <div className="space-y-1">
                <Label htmlFor="recipient">Recipient Details</Label>
                <Input id="recipient" placeholder="e.g., Mom (likes gardening), Friend (tech gadget)" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            </div>
             <div className="space-y-1">
                <Label htmlFor="budget">Budget (₹)</Label>
                <Input id="budget" type="number" placeholder="e.g., 1000" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
            <Button onClick={handleFindGifts} disabled={isLoading} className="w-full">
                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>}
                 {isLoading ? 'Finding...' : 'Find Gift Ideas'}
             </Button>
             {/* TODO: Add area to display gift suggestions */}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// Added Loader2 import
import { Loader2 } from 'lucide-react';

