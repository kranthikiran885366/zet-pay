'use client';

import { useState, useEffect, useRef } from 'react'; // Added useRef
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { sendOtpToPhoneNumber, verifyOtpAndSignIn, updateNewUserProfile, VerifyOtpResult } from '@/services/auth'; // Updated auth service functions
import { Loader2, LogIn, Phone, MessageSquare, UserPlus } from 'lucide-react';
import { auth } from '@/lib/firebase'; 
import type { ConfirmationResult, RecaptchaVerifier as FirebaseRecaptchaVerifierType } from 'firebase/auth'; // Import types
import { RecaptchaVerifier } from 'firebase/auth'; // Import actual class for instantiation

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState(''); // For new user profile setup
  const [email, setEmail] = useState(''); // For new user profile setup
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isNewUserFlowActive, setIsNewUserFlowActive] = useState(false); // Controls new user profile form
  const [confirmationResultState, setConfirmationResultState] = useState<ConfirmationResult | null>(null);
  const [currentUserForSetup, setCurrentUserForSetup] = useState<any | null>(null); // Store user object for setup

  const router = useRouter();
  const { toast } = useToast();
  const recaptchaContainerRef = useRef<HTMLDivElement>(null); // Ref for reCAPTCHA container
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<FirebaseRecaptchaVerifierType | null>(null);


  useEffect(() => {
    if (typeof window !== 'undefined' && !recaptchaVerifier && auth && recaptchaContainerRef.current) {
      try {
          const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
            'size': 'invisible',
            'callback': (response: any) => {
              console.log("reCAPTCHA solved:", response);
            },
            'expired-callback': () => {
              toast({ variant: 'destructive', title: 'reCAPTCHA Expired', description: 'Please try sending OTP again.' });
            }
          });
          setRecaptchaVerifier(verifier);
      } catch (error) {
          console.error("Error initializing RecaptchaVerifier:", error);
          toast({ variant: 'destructive', title: 'reCAPTCHA Error', description: 'Failed to initialize reCAPTCHA. Please refresh.'})
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


  const handleSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phoneNumber.match(/^\+?[1-9]\d{1,14}$/)) { 
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
      setIsNewUserFlowActive(false); // Reset new user flow until OTP is verified
      toast({ title: 'OTP Sent', description: `An OTP has been sent to ${phoneNumber}.` });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Send OTP',
        description: error.message || 'Could not send OTP. Please try again.',
      });
      // Consider resetting reCAPTCHA if visible, invisible usually handles it.
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
      setCurrentUserForSetup(user); // Store user for profile setup if new

      if (isNewUser) {
        setIsNewUserFlowActive(true); // Show profile setup form
        toast({ title: 'OTP Verified', description: 'Welcome! Please complete your profile.' });
      } else {
        toast({ title: 'Login Successful', description: 'Welcome back to PayFriend!' });
        router.push('/'); // Redirect existing user to homepage
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'Invalid OTP or an unexpected error occurred.',
      });
      setIsNewUserFlowActive(false); // Ensure profile setup isn't shown on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteProfileSetup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) { // Basic validation for name
        toast({ variant: 'destructive', title: 'Name Required', description: 'Please enter your full name.' });
        return;
    }
    // Email can be optional, or add validation if required
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
      await updateNewUserProfile(currentUserForSetup, name, email || ''); // Pass empty string if email is optional and blank
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
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-1">
          <LogIn className="mx-auto h-10 w-10 text-primary" />
          <CardTitle className="text-2xl">Welcome to PayFriend</CardTitle>
          <CardDescription>
            {!otpSent 
              ? 'Sign in or create an account with your phone number' 
              : isNewUserFlowActive 
                ? 'Please complete your profile' 
                : 'Enter the OTP sent to your phone'}
          </CardDescription>
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
              <div id="recaptcha-container" ref={recaptchaContainerRef}></div> {/* Visible reCAPTCHA placeholder or for invisible anchor */}
              <Button type="submit" className="w-full" disabled={isLoading || !recaptchaVerifier}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </form>
          ) : !isNewUserFlowActive ? (
            <form onSubmit={handleVerifyOtpAndSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text" 
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
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </Button>
              <Button variant="link" size="sm" onClick={() => { setOtpSent(false); setConfirmationResultState(null); setIsNewUserFlowActive(false); }} disabled={isLoading}>
                Change Phone Number
              </Button>
            </form>
          ) : (
            // New User Profile Setup Form
            <form onSubmit={handleCompleteProfileSetup} className="space-y-4">
               <div className="space-y-2">
                <Label htmlFor="otp-new-user">OTP (Sent to {phoneNumber})</Label>
                <Input
                  id="otp-new-user"
                  type="text"
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
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                {isLoading ? 'Setting Up Profile...' : 'Complete Setup & Login'}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
           <Link href="/forgot-password" passHref legacyBehavior>
             <a className="text-sm text-primary hover:underline">Trouble signing in?</a>
           </Link>
           {/* Removed "Create Account" link */}
        </CardFooter>
      </Card>
    </div>
  );
}
