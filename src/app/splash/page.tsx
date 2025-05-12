'use client';

import { useEffect }
from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import SplashScreenDisplay from '@/components/SplashScreenDisplay';

const SplashScreenRedirectPage = () => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
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
    }, 2800); // Slightly shorter than the animation in SplashScreenDisplay for smoother transition

    return () => clearTimeout(timer);
  }, [router]);

  return <SplashScreenDisplay />;
};

export default SplashScreenRedirectPage;
