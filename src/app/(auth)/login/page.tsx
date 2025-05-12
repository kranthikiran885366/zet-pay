'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { sendOtpToPhoneNumber, verifyOtpAndSignIn } from '@/services/auth'; // Updated auth service functions
import { Loader2, LogIn, Phone, MessageSquare } from 'lucide-react';
import { auth } from '@/lib/firebase'; // Import auth for RecaptchaVerifier
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth'; // Import types
import { RecaptchaVerifier as FirebaseRecaptchaVerifier } from 'firebase/auth'; // Import actual class


export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResultState, setConfirmationResultState] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  // Initialize reCAPTCHA verifier
  useEffect(() => {
    if (typeof window !== 'undefined' && !recaptchaVerifier && auth) {
      const verifier = new FirebaseRecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible', // Use invisible reCAPTCHA
        'callback': (response: any) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
          console.log("reCAPTCHA solved:", response);
        },
        'expired-callback': () => {
          // Response expired. Ask user to solve reCAPTCHA again.
          toast({ variant: 'destructive', title: 'reCAPTCHA Expired', description: 'Please try sending OTP again.' });
        }
      });
      setRecaptchaVerifier(verifier);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]); // Removed toast from deps as it's stable


  const handleSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phoneNumber.match(/^\+?[1-9]\d{1,14}$/)) { // Basic phone number validation
        toast({ variant: 'destructive', title: 'Invalid Phone Number', description: 'Please enter a valid phone number with country code (e.g., +91XXXXXXXXXX).' });
        return;
    }
    if (!recaptchaVerifier) {
        toast({ variant: 'destructive', title: 'reCAPTCHA Error', description: 'reCAPTCHA not initialized. Please wait or refresh.' });
        return;
    }
    setIsLoading(true);
    try {
      const confirmationResult = await sendOtpToPhoneNumber(phoneNumber, recaptchaVerifier);
      setConfirmationResultState(confirmationResult);
      setOtpSent(true);
      toast({ title: 'OTP Sent', description: `An OTP has been sent to ${phoneNumber}.` });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Send OTP',
        description: error.message || 'Could not send OTP. Please try again.',
      });
      // Reset reCAPTCHA if it was used. Firebase handles this internally for invisible reCAPTCHA often.
      // Or, if using visible reCAPTCHA: recaptchaVerifier.render().then((widgetId) => { grecaptcha.reset(widgetId); });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!confirmationResultState || !otp.match(/^\d{6}$/)) {
        toast({ variant: 'destructive', title: 'Invalid OTP', description: 'Please enter the 6-digit OTP.' });
        return;
    }
    setIsLoading(true);
    try {
      await verifyOtpAndSignIn(confirmationResultState, otp);
      toast({ title: 'Login Successful', description: 'Welcome to PayFriend!' });
      router.push('/'); // Redirect to homepage after login
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'Invalid OTP or an unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-1">
          <LogIn className="mx-auto h-10 w-10 text-primary" />
          <CardTitle className="text-2xl">Welcome to PayFriend</CardTitle>
          <CardDescription>{otpSent ? 'Enter the OTP sent to your phone' : 'Sign in with your phone number'}</CardDescription>
        </CardHeader>
        <CardContent>
          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div id="recaptcha-container"></div> {/* reCAPTCHA placeholder */}
              <Button type="submit" className="w-full" disabled={isLoading || !recaptchaVerifier}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text" // Use text to allow easy input, pattern validates
                  inputMode="numeric"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0,6))}
                  required
                  minLength={6}
                  maxLength={6}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                {isLoading ? 'Verifying...' : 'Verify OTP & Login'}
              </Button>
              <Button variant="link" size="sm" onClick={() => { setOtpSent(false); setConfirmationResultState(null);}} disabled={isLoading}>
                Change Phone Number
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
           <Link href="/forgot-password" passHref legacyBehavior>
             <a className="text-sm text-primary hover:underline">Trouble signing in?</a>
           </Link>
          <p className="text-sm text-muted-foreground">
            New to PayFriend?{' '}
            <Link href="/signup" passHref legacyBehavior>
              <a className="font-semibold text-primary hover:underline">Create Account</a>
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
