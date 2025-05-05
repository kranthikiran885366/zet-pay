'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
       <Card className="w-full max-w-md shadow-lg text-center">
            <CardHeader>
                <MapPin className="h-16 w-16 text-primary mx-auto mb-4" />
                <CardTitle className="text-3xl font-bold">404 - Page Not Found</CardTitle>
                <CardDescription>Oops! It seems you've taken a wrong turn.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                    The page you are looking for does not exist or has been moved.
                </p>
                 <Link href="/">
                    <Button className="w-full">Go Back Home</Button>
                </Link>
            </CardContent>
        </Card>
    </div>
  )
}
