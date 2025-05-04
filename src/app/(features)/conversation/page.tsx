'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ConversationalUI } from '@/components/conversational-ui';

export default function ConversationPage() {
  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Conversational Actions</h1>
      </header>

      {/* Main Content - Full Height Chat */}
      <main className="flex-grow flex items-center justify-center p-4">
        <ConversationalUI />
      </main>
    </div>
  );
}
