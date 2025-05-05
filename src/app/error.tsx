'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
        <Card className="w-full max-w-md shadow-lg text-center">
            <CardHeader>
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <CardTitle className="text-2xl text-destructive">Something went wrong!</CardTitle>
                <CardDescription>An unexpected error occurred.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    We apologize for the inconvenience. You can try again or report the issue.
                </p>
                 {/* Optionally display error message in development */}
                 {process.env.NODE_ENV === 'development' && (
                    <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-2 text-left text-xs text-muted-foreground overflow-auto max-h-40">
                        <code>{error.message}</code>
                         {error.digest && <code className="block mt-1 text-[10px]">Digest: {error.digest}</code>}
                    </pre>
                 )}
                <Button
                    onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                    }
                    className="w-full"
                >
                    Try again
                </Button>
                 <Button variant="outline" className="w-full" onClick={() => window.location.href = '/'}>
                    Go to Homepage
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
