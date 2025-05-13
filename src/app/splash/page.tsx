'use client';

import { useEffect }
from 'react';
import { useRouter } from 'next/navigation';
// import { auth } from '@/lib/firebase'; // Original import, not needed for bypass
import SplashScreenDisplay from '@/components/SplashScreenDisplay';

const SplashScreenRedirectPage = () => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      // --- TEMPORARY BYPASS FOR TESTING ---
      console.log("Splash Page - DEV MODE: Redirecting to /");
      router.replace('/');
      // --- END TEMPORARY BYPASS ---

      /* --- ORIGINAL AUTH LOGIC - COMMENTED OUT FOR TESTING ---
      const unsubscribe = auth.onAuthStateChanged(user => {
        unsubscribe(); // Unsubscribe after first check to prevent multiple navigations
        if (user) {
          console.log("Splash Page: User logged in, redirecting to /");
          router.replace('/');
        } else {
          // Check if onboarding has been completed
          const onboardingCompleted = localStorage.getItem('onboardingCompleted');
          if (onboardingCompleted === 'true') {
            console.log("Splash Page: User not logged in, onboarding complete, redirecting to /login");
            router.replace('/login');
          } else {
            console.log("Splash Page: User not logged in, onboarding not complete, redirecting to /onboarding");
            router.replace('/onboarding');
          }
        }
      });
       --- END ORIGINAL AUTH LOGIC --- */
    }, 2800); // Slightly shorter than the animation in SplashScreenDisplay for smoother transition

    return () => clearTimeout(timer);
  }, [router]);

  return <SplashScreenDisplay />;
};

export default SplashScreenRedirectPage;
