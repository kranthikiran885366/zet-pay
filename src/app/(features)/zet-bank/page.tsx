
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Building2, TrendingUp, Landmark, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import Image from "next/image";

export default function ZetBankPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/services" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Building2 className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Zet Mini Bank</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex flex-col items-center justify-center">
        <Card className="shadow-xl w-full max-w-lg text-center">
          <CardHeader className="pb-4">
            <Building2 className="h-20 w-20 text-primary mx-auto mb-4" />
            <CardTitle className="text-3xl font-bold">Welcome to Zet Mini Bank</CardTitle>
            <CardDescription className="text-md text-muted-foreground">Your Smart Digital Banking Experience - Coming Soon!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Image
                src="https://placehold.co/600x300.png"
                alt="Zet Mini Bank Concept"
                width={600}
                height={300}
                className="rounded-lg object-cover aspect-video"
                data-ai-hint="digital bank mobile app interface"
            />
            <p className="text-muted-foreground">
              Zet Mini Bank aims to redefine your banking by integrating seamlessly with your PayFriend super app.
              Manage your finances, save smarter, and access exclusive banking features all in one place.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-primary mt-1 flex-shrink-0"/>
                    <div>
                        <h4 className="font-semibold text-sm">Smart Savings</h4>
                        <p className="text-xs text-muted-foreground">AI-powered tools to help you save and invest effortlessly.</p>
                    </div>
                </div>
                 <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Landmark className="h-6 w-6 text-primary mt-1 flex-shrink-0"/>
                    <div>
                        <h4 className="font-semibold text-sm">Integrated Payments</h4>
                        <p className="text-xs text-muted-foreground">Link your Zet Mini Bank account for instant UPI and wallet transactions.</p>
                    </div>
                </div>
                 <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <ShieldCheck className="h-6 w-6 text-primary mt-1 flex-shrink-0"/>
                    <div>
                        <h4 className="font-semibold text-sm">Enhanced Security</h4>
                        <p className="text-xs text-muted-foreground">Bank-grade security features to keep your funds safe.</p>
                    </div>
                </div>
                 <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Wallet className="h-6 w-6 text-primary mt-1 flex-shrink-0"/>
                    <div>
                        <h4 className="font-semibold text-sm">Zero Balance Account</h4>
                        <p className="text-xs text-muted-foreground">Enjoy the benefits of a digital account with no minimum balance requirements (planned).</p>
                    </div>
                </div>
            </div>
            <Button disabled size="lg" className="mt-6">Open Your Zet Account (Coming Soon)</Button>
             <p className="text-xs text-muted-foreground mt-2">Zet Mini Bank is a planned feature and will be offered in partnership with RBI-licensed banking partners.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// Re-added Wallet icon import as it's used above
import { Wallet } from 'lucide-react';
