
'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function FeatureError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Feature Section Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
        <Card className="w-full max-w-md shadow-lg text-center">
            <CardHeader>
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <CardTitle className="text-xl text-destructive">Feature Unavailable</CardTitle>
                <CardDescription>There was an error loading this feature.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    We encountered a problem. Please try again or navigate back to safety.
                </p>
                 {/* Optionally display error message in development */}
                 {process.env.NODE_ENV === 'development' && (
                    <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-2 text-left text-xs text-muted-foreground overflow-auto max-h-40">
                        <code>{error.message}</code>
                        {error.digest && <code className="block mt-1 text-[10px]">Digest: {error.digest}</code>}
                    </pre>
                 )}
                <Button
                    onClick={() => reset()}
                    className="w-full"
                >
                    Retry Feature
                </Button>
                 <Link href="/" passHref>
                    <Button variant="outline" className="w-full">
                        Go to Homepage
                    </Button>
                 </Link>
            </CardContent>
        </Card>
    </div>
  );
}
