'use client';

import { Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ShapeStyle {
  width: string;
  height: string;
  top: string;
  left: string;
  animationDelay: string;
  transform: string;
  opacity: number;
}

const SplashScreenDisplay = () => {
  const [loadingText, setLoadingText] = useState('');
  const fullLoadingText = "Loading your world...";
  const [shapeStyles, setShapeStyles] = useState<ShapeStyle[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true); // Component has mounted on the client

    let index = 0;
    const intervalId = setInterval(() => {
      setLoadingText(fullLoadingText.substring(0, index + 1));
      index++;
      if (index === fullLoadingText.length) {
        clearInterval(intervalId);
      }
    }, 100); // Adjust typing speed here

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // Generate styles only on the client after mount
    if (isMounted) {
      const newStyles: ShapeStyle[] = [...Array(10)].map(() => ({
        width: `${Math.random() * 150 + 50}px`,
        height: `${Math.random() * 150 + 50}px`,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        transform: `translate(-50%, -50%) scale(${Math.random() * 0.5 + 0.5})`,
        opacity: Math.random() * 0.2 + 0.1,
      }));
      setShapeStyles(newStyles);
    }
  }, [isMounted]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-primary via-primary/80 to-teal-600 text-primary-foreground overflow-hidden relative">
      {/* Subtle animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        {isMounted && shapeStyles.map((style, i) => (
          <div
            key={`bg-shape-${i}`}
            className="absolute rounded-full bg-white/10 animate-pulse-slow"
            style={style}
          />
        ))}
      </div>

      <div className="text-center animate-fade-in-up z-10">
        {/* Pulsating Logo */}
        <div className="relative inline-block animate-logo-pulse">
          <Zap size={90} className="mx-auto mb-6 text-lime-300 drop-shadow-lg" />
           {/* Shine effect */}
          <div className="absolute top-0 left-0 w-full h-full animate-shine bg-white/20 rounded-full blur-md"></div>
        </div>
        <h1 className="text-6xl font-extrabold mb-3 tracking-tight animate-slide-in-bottom [animation-delay:0.2s]">
          PayFriend
        </h1>
        <p className="text-xl text-primary-foreground/80 animate-slide-in-bottom [animation-delay:0.4s]">
          Your Everyday Super App
        </p>
      </div>

      <div className="absolute bottom-12 text-center w-full px-4 z-10">
        <p className="text-base text-primary-foreground/80 mb-3 min-h-[24px] animate-fade-in [animation-delay:0.6s]">
          {loadingText}
          <span className="animate-cursor-blink">|</span>
        </p>
        <div className="w-48 h-1.5 bg-primary-foreground/30 rounded-full mx-auto overflow-hidden animate-fade-in [animation-delay:0.8s]">
          <div className="h-full bg-gradient-to-r from-lime-300 via-lime-400 to-green-400 animate-progress-bar-enhanced rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreenDisplay;
