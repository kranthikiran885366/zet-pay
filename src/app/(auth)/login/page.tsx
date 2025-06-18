'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { sendOtpToPhoneNumber, verifyOtpAndSignIn, updateNewUserProfile, VerifyOtpResult } from '@/services/auth';
import { Loader2, LogIn, Phone, MessageSquare, UserPlus, ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/firebase';
import type { ConfirmationResult, RecaptchaVerifier as FirebaseRecaptchaVerifierType } from 'firebase/auth';
import { RecaptchaVerifier } from 'firebase/auth';

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isNewUserFlowActive, setIsNewUserFlowActive] = useState(false);
  const [confirmationResultState, setConfirmationResultState] = useState<ConfirmationResult | null>(null);
  const [currentUserForSetup, setCurrentUserForSetup] = useState<any | null>(null); // Using 'any' as Firebase User type can be complex

  const router = useRouter();
  const { toast } = useToast();
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<FirebaseRecaptchaVerifierType | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && auth && recaptchaContainerRef.current && !recaptchaVerifier) {
      console.log("LoginPage: Initializing RecaptchaVerifier...");
      try {
        const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          'size': 'invisible',
          'callback': (response: any) => {
            console.log("reCAPTCHA solved successfully (invisible):", response);
            // This callback is for invisible reCAPTCHA, usually triggered before sending OTP.
            // If using Send OTP button, this might not be strictly necessary for that button's click action
            // but it's good to have the setup.
          },
          'expired-callback': () => {
            toast({ variant: 'destructive', title: 'reCAPTCHA Expired', description: 'Please try sending OTP again.' });
            // Re-render reCAPTCHA if it was visible, or re-initialize if needed for invisible
            // For invisible, Firebase typically handles re-verification on next action.
            setRecaptchaVerifier(null); // Force re-initialization on next attempt
            initializeRecaptcha();
          }
        });
        setRecaptchaVerifier(verifier);
        console.log("LoginPage: RecaptchaVerifier initialized.");
      } catch (error) {
        console.error("Error initializing RecaptchaVerifier:", error);
        toast({ variant: 'destructive', title: 'reCAPTCHA Error', description: 'Failed to initialize reCAPTCHA. Please refresh or check console.' });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recaptchaVerifier]); // Re-run if recaptchaVerifier becomes null


  const initializeRecaptcha = useCallback(() => {
    if (typeof window !== 'undefined' && auth && recaptchaContainerRef.current) {
        if (recaptchaVerifier) { // Clear previous instance if any
            recaptchaVerifier.clear();
        }
        try {
             const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
                'size': 'invisible',
                'callback': (response: any) => console.log("reCAPTCHA re-solved:", response),
                'expired-callback': () => {
                  toast({ variant: 'destructive', title: 'reCAPTCHA Expired', description: 'Please try sending OTP again.' });
                  setRecaptchaVerifier(null);
                  initializeRecaptcha(); // Retry initialization
                }
             });
            setRecaptchaVerifier(verifier);
        } catch(error) {
             console.error("Error re-initializing RecaptchaVerifier:", error);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recaptchaVerifier]); // Re-run if recaptchaVerifier becomes null


  const handleSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phoneNumber.match(/^\+?[1-9]\d{1,14}$/)) {
      toast({ variant: 'destructive', title: 'Invalid Phone Number', description: 'Please enter a valid phone number with country code (e.g., +91XXXXXXXXXX).' });
      return;
    }
    if (!recaptchaVerifier) {
      toast({ variant: 'destructive', title: 'reCAPTCHA Error', description: 'reCAPTCHA not ready. Please wait or refresh.' });
      initializeRecaptcha(); // Try to re-initialize
      return;
    }
    setIsLoading(true);
    try {
      // Ensure reCAPTCHA is rendered (for invisible, this means it's ready)
      // If not already rendered and cleared, render it
      if (recaptchaVerifier && !recaptchaVerifier.verificationId) {
         // For invisible, this might be automatic, but explicit call if needed
         // await recaptchaVerifier.render(); // This line might cause issues if not correctly handled. Firebase handles render usually.
      }
      const confirmationResult = await sendOtpToPhoneNumber(phoneNumber, recaptchaVerifier);
      setConfirmationResultState(confirmationResult);
      setOtpSent(true);
      setIsNewUserFlowActive(false);
      toast({ title: 'OTP Sent', description: `An OTP has been sent to ${phoneNumber}.` });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Send OTP',
        description: error.message || 'Could not send OTP. Check console for Firebase errors or reCAPTCHA issues.',
      });
      console.error("Send OTP Error Details:", error);
      recaptchaVerifier.clear(); // Clear the reCAPTCHA widget
      initializeRecaptcha(); // Re-initialize for next attempt
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpAndSetup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!confirmationResultState || !otp.match(/^\d{6}$/)) {
      toast({ variant: 'destructive', title: 'Invalid OTP', description: 'Please enter the 6-digit OTP.' });
      return;
    }
    setIsLoading(true);
    try {
      const { user, isNewUser }: VerifyOtpResult = await verifyOtpAndSignIn(confirmationResultState, otp);
      setCurrentUserForSetup(user);

      if (isNewUser) {
        setIsNewUserFlowActive(true);
        toast({ title: 'OTP Verified', description: 'Welcome! Please complete your profile.' });
      } else {
        toast({ title: 'Login Successful', description: 'Welcome back to PayFriend!' });
        router.push('/');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'Invalid OTP or an unexpected error occurred.',
      });
      setIsNewUserFlowActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteProfileSetup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Name Required', description: 'Please enter your full name.' });
      return;
    }
    if (email.trim() && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast({ variant: 'destructive', title: 'Invalid Email', description: 'Please enter a valid email address or leave it blank.' });
      return;
    }
    if (!currentUserForSetup) {
      toast({ variant: 'destructive', title: 'Error', description: 'User session not found for profile setup.' });
      return;
    }

    setIsLoading(true);
    try {
      await updateNewUserProfile(currentUserForSetup, name, email || '');
      toast({ title: 'Profile Setup Successful', description: 'Welcome to PayFriend!' });
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Profile Setup Failed',
        description: error.message || 'Could not save your profile information.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/80 to-teal-600 p-4">
      <Card className="w-full max-w-md shadow-xl bg-card/90 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2 pt-8">
          <LogIn className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-3xl font-bold text-card-foreground">
            {isNewUserFlowActive ? 'Complete Your Profile' : otpSent ? 'Verify OTP' : 'Login or Sign Up'}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {!otpSent
              ? 'Enter your phone number to get started with PayFriend.'
              : isNewUserFlowActive
                ? 'Help us get to know you better.'
                : `Enter the 6-digit OTP sent to ${phoneNumber}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-8">
          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-card-foreground">Phone Number</Label>
                <div className="flex items-center border border-input rounded-md focus-within:ring-2 focus-within:ring-ring">
                    <Phone className="h-5 w-5 text-muted-foreground mx-3"/>
                    <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 text-lg border-0 focus-visible:ring-0 flex-1"
                    />
                </div>
              </div>
              <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
              <Button type="submit" className="w-full h-12 text-base" disabled={isLoading || !recaptchaVerifier}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </form>
          ) : !isNewUserFlowActive ? (
            <form onSubmit={handleVerifyOtpAndSetup} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-card-foreground">Enter OTP</Label>
                 <div className="flex items-center border border-input rounded-md focus-within:ring-2 focus-within:ring-ring">
                    <MessageSquare className="h-5 w-5 text-muted-foreground mx-3"/>
                    <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    minLength={6}
                    maxLength={6}
                    disabled={isLoading}
                    className="h-12 text-lg tracking-[0.2em] text-center border-0 focus-visible:ring-0 flex-1"
                    />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {isLoading ? 'Verifying...' : 'Verify OTP & Proceed'}
              </Button>
              <div className="text-center">
                <Button variant="link" size="sm" onClick={() => { setOtpSent(false); setConfirmationResultState(null); setIsNewUserFlowActive(false); initializeRecaptcha(); }} disabled={isLoading}>
                  <ArrowLeft className="mr-1 h-4 w-4"/> Change Phone Number or Resend OTP
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCompleteProfileSetup} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-card-foreground">Full Name</Label>
                <div className="flex items-center border border-input rounded-md focus-within:ring-2 focus-within:ring-ring">
                    <UserPlus className="h-5 w-5 text-muted-foreground mx-3"/>
                    <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11 text-base border-0 focus-visible:ring-0 flex-1"
                    />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-card-foreground">Email Address (Optional)</Label>
                <div className="flex items-center border border-input rounded-md focus-within:ring-2 focus-within:ring-ring">
                    <Mail className="h-5 w-5 text-muted-foreground mx-3"/>
                    <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-11 text-base border-0 focus-visible:ring-0 flex-1"
                    />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {isLoading ? 'Setting Up Profile...' : 'Complete Setup & Login'}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center pb-8">
          {!otpSent && (
            <Link href="/forgot-password" passHref legacyBehavior>
              <a className="text-sm text-primary-foreground/80 hover:text-primary-foreground hover:underline">
                Trouble signing in?
              </a>
            </Link>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
