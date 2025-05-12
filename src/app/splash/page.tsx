'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Loader2 } from 'lucide-react'; // Using Zap as a placeholder logo icon
import { auth } from '@/lib/firebase'; // Import auth to check login state
import SplashScreenDisplay from '@/components/SplashScreenDisplay'; // Import the display component

const SplashScreenRedirectPage = () => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      const user = auth.currentUser;
      if (user) {
        console.log("Splash Page: User logged in, redirecting to /");
        router.replace('/'); // If user is somehow logged in, redirect to home
      } else {
        console.log("Splash Page: User not logged in, redirecting to /login");
        router.replace('/login'); // Redirect to the new phone login page
      }
    }, 3000); // Display splash for 3 seconds

    return () => clearTimeout(timer);
  }, [router]);

  return <SplashScreenDisplay />; // Use the display component
};

export default SplashScreenRedirectPage;
