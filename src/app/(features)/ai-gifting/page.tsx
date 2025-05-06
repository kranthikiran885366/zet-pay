'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Gift, Sparkles, Search } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

export default function AiGiftingPage() {

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
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Find the Perfect Gift</CardTitle>
            <CardDescription>Let AI help you choose gifts based on occasion, recipient, and budget.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex justify-center gap-4 mb-6 text-primary">
                 <Sparkles className="h-16 w-16" />
                 <Gift className="h-16 w-16" />
             </div>
            <p className="text-muted-foreground mb-4">
              Tell our AI assistant about the occasion (birthday, anniversary), the recipient (age, relation, interests), and your budget. Get personalized gift suggestions and links to purchase. Coming Soon!
            </p>
             <Button disabled><Search className="mr-2 h-4 w-4"/> Find Gift Ideas (Coming Soon)</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
