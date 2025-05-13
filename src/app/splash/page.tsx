'use client';

import { useEffect }
from 'react';
import { useRouter } from 'next/navigation';
// import { auth } from '@/lib/firebase'; // Original import, not needed for direct home display
import SplashScreenDisplay from '@/components/SplashScreenDisplay';

const SplashScreenRedirectPage = () => {
  const router = useRouter();

  useEffect(() => {
    console.log("[Splash Page] Starting splash screen timer...");
    const timer = setTimeout(() => {
      // Directly redirect to the Home page ('/')
      console.log("Splash Page: Timer finished. Redirecting to / (Home Page).");
      router.replace('/');
    }, 2800); // Display splash for 2.8 seconds then redirect

    return () => {
      console.log("[Splash Page] Clearing splash screen timer.");
      clearTimeout(timer);
    };
  }, [router]);

  return <SplashScreenDisplay />;
};

export default SplashScreenRedirectPage;

