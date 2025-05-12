'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { signup } from '@/services/auth'; // Import your auth service
import { Loader2, UserPlus, ShieldCheck } from 'lucide-react'; // Added ShieldCheck for trust

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match' });
      return;
    }
    if (password.length < 6) {
        toast({ variant: 'destructive', title: 'Password Too Short', description: 'Password must be at least 6 characters long.' });
        return;
    }
    setIsLoading(true);
    try {
      await signup(name, email, password);
      toast({ title: 'Signup Successful', description: 'Welcome to PayFriend! Please log in.' });
      router.push('/login'); // Redirect to login after signup
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-secondary to-secondary p-4 selection:bg-primary/20">
      <Card className="w-full max-w-md shadow-2xl rounded-xl border-primary/20 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2 pt-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-3 border-2 border-primary/30">
                <UserPlus className="h-8 w-8 text-primary" />
            </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">Create Your Account</CardTitle>
          <CardDescription className="text-muted-foreground">Join PayFriend for seamless payments and more.</CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={isLoading}
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={isLoading}
                className="h-11 text-base"
              />
            </div>
            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserPlus className="mr-2 h-5 w-5" />}
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </Button>
             <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1 pt-2">
                <ShieldCheck className="h-3 w-3 text-green-600"/> Your information is secure with us.
            </p>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center pt-4 pb-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" passHref legacyBehavior>
              <a className="font-semibold text-primary hover:underline">Log In</a>
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
