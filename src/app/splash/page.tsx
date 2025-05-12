'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react'; // Using Zap as a placeholder logo icon

const SplashScreen = () => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/login'); // Redirect to the new phone login page
    }, 3000); // Display splash for 3 seconds

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-primary text-primary-foreground">
      <div className="text-center animate-pulse">
        <Zap size={80} className="mx-auto mb-4" />
        <h1 className="text-5xl font-bold mb-2">PayFriend</h1>
        <p className="text-lg text-primary-foreground/80">Your Everyday Super App</p>
      </div>
      <div className="absolute bottom-10 text-center w-full">
        <p className="text-sm text-primary-foreground/70">Loading your world...</p>
        <div className="w-32 h-1 bg-primary-foreground/30 rounded-full mx-auto mt-2 overflow-hidden">
          <div className="h-1 bg-lime-300 animate-progress-bar"></div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes progress-bar {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress-bar {
          animation: progress-bar 2.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
