'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { sendPasswordReset } from '@/services/auth'; // Import your auth service
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setIsEmailSent(false);
    try {
      await sendPasswordReset(email);
      toast({ title: 'Password Reset Email Sent', description: 'Check your inbox for instructions.' });
      setIsEmailSent(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Sending Email',
        description: error.message || 'Could not send password reset email.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-1">
          <Mail className="mx-auto h-10 w-10 text-primary" />
          <CardTitle className="text-2xl">Forgot Password?</CardTitle>
          <CardDescription>
            {isEmailSent
              ? 'A password reset link has been sent to your email address.'
              : 'Enter your email address and we will send you a link to reset your password.'}
          </CardDescription>
        </CardHeader>
        {!isEmailSent ? (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          </CardContent>
        ) : (
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              If you don&apos;t see the email, please check your spam folder or try again later.
            </p>
             <Button variant="outline" onClick={() => setIsEmailSent(false)} className="w-full">
                Resend Email
            </Button>
          </CardContent>
        )}
        <CardFooter className="flex justify-center">
          <Link href="/login" passHref legacyBehavior>
            <a className="text-sm text-primary hover:underline flex items-center">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to Login
            </a>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
