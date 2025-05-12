'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase'; 
import SplashScreenDisplay from '@/components/SplashScreenDisplay'; 

const SplashScreenRedirectPage = () => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      const user = auth.currentUser;
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
    }, 3000); 

    return () => clearTimeout(timer);
  }, [router]);

  return <SplashScreenDisplay />;
};

export default SplashScreenRedirectPage;
