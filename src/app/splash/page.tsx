'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const SplashScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading process
    const timer = setTimeout(() => {
      setLoading(false);
      router.replace('/'); // Replace splash screen with the main page
    }, 3000); // Adjust the time as needed

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-primary text-primary-foreground">
      {/* 3D Logo Placeholder */}
      <div className="text-4xl font-bold mb-4 animate-pulse">
        PayFriend 
      </div>

      {/* Loading message */}
      {loading ? (
        <p className="text-lg">Loading...</p>
      ) : (
        <p className="text-lg">Welcome to PayFriend!</p>
      )}
    </div>
  );
};

export default SplashScreen;
