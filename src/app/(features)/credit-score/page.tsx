'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Gauge, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { getCreditScore, CreditScoreData } from '@/services/creditScore'; // New service
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const getScoreColor = (score: number): string => {
  if (score >= 750) return 'text-green-600';
  if (score >= 650) return 'text-yellow-500';
  if (score >= 550) return 'text-orange-500';
  return 'text-red-600';
};

export default function CreditScorePage() {
  const [creditInfo, setCreditInfo] = useState<CreditScoreData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setIsLoggedIn(!!user);
      if (!user) {
        setIsLoading(false);
        setError("Please log in to check your credit score.");
      } else {
        // Optionally auto-fetch on load if desired
        // fetchCreditScore();
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchCreditScore = async () => {
    if (!isLoggedIn) {
      toast({ variant: "destructive", title: "Not Logged In", description: "Please log in first." });
      return;
    }
    setIsLoading(true);
    setError(null);
    setCreditInfo(null);
    try {
      const data = await getCreditScore();
      setCreditInfo(data);
      toast({ title: "Credit Score Updated", description: `Your score is ${data.score} as of ${new Date(data.reportDate).toLocaleDateString()}` });
    } catch (err: any) {
      console.error("Failed to fetch credit score:", err);
      setError(err.message || "Could not fetch your credit score. Please try again.");
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to fetch credit score." });
    } finally {
      setIsLoading(false);
    }
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
        <Gauge className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Credit Score</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex flex-col items-center">
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <Gauge className="h-16 w-16 text-primary mx-auto mb-3" />
            <CardTitle>Your Credit Score</CardTitle>
            <CardDescription>Check your CIBIL score and credit report summary.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading && (
              <div className="flex flex-col items-center justify-center p-6">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-3" />
                <p className="text-muted-foreground">Fetching your score...</p>
              </div>
            )}
            {!isLoading && error && (
              <div className="text-destructive p-4 border border-destructive/50 bg-destructive/10 rounded-md">
                <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                <p>{error}</p>
              </div>
            )}
            {!isLoading && !error && creditInfo && (
              <div className="space-y-3">
                <p className={`text-6xl font-bold ${getScoreColor(creditInfo.score)}`}>
                  {creditInfo.score}
                </p>
                <p className="text-sm text-muted-foreground">
                  Score provided by {creditInfo.provider} as of {new Date(creditInfo.reportDate).toLocaleDateString()}
                </p>
                <Badge variant={creditInfo.score >= 750 ? "default" : "secondary"} className={creditInfo.score >= 750 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                  {creditInfo.score >= 750 ? 'Excellent' : creditInfo.score >= 650 ? 'Good' : 'Needs Improvement'}
                </Badge>
                {/* Placeholder for more details */}
                <p className="text-xs text-muted-foreground pt-2">Full credit report analysis coming soon.</p>
              </div>
            )}
            {!isLoading && !error && !creditInfo && isLoggedIn && (
                 <p className="text-muted-foreground py-4">Click the button below to check your latest credit score.</p>
            )}
             {!isLoading && !isLoggedIn && (
                 <p className="text-muted-foreground py-4">Please log in to check your credit score.</p>
            )}

            <Button onClick={fetchCreditScore} disabled={isLoading || !isLoggedIn} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {creditInfo ? 'Refresh Score' : 'Check Score Now'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Powered by our trusted credit bureau partners.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
