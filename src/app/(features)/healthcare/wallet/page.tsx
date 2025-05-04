'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, FolderHeart, Upload, View } from 'lucide-react';
import Link from 'next/link';

export default function HealthWalletPage() {

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/healthcare" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <FolderHeart className="h-6 w-6" />
        <h1 className="text-lg font-semibold">Health Wallet</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 flex items-center justify-center">
        <Card className="shadow-md w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Your Digital Health Records</CardTitle>
            <CardDescription>Securely store and manage health records.</CardDescription>
          </CardHeader>
          <CardContent>
             <FolderHeart className="h-20 w-20 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Upload and store prescriptions, lab reports, vaccination records, and other important health documents securely in one place. Share easily with doctors. Coming Soon!
            </p>
             <div className="flex flex-col gap-2">
                <Button disabled><Upload className="mr-2 h-4 w-4"/> Upload Document (Coming Soon)</Button>
                 <Button variant="outline" disabled><View className="mr-2 h-4 w-4"/> View Records (Coming Soon)</Button>
             </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
