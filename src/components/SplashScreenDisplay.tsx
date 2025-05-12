'use client';

import { Zap } from 'lucide-react';

const SplashScreenDisplay = () => {
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
      {/* 
        Ensure the 'animate-progress-bar' keyframes are defined in globals.css 
        or via Tailwind config if this animation is desired.
        Example for globals.css:
        @keyframes progress-bar {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress-bar {
          animation: progress-bar 2.5s ease-out forwards;
        }
      */}
    </div>
  );
};

export default SplashScreenDisplay;
