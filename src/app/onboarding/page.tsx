'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Zap, Send, Smartphone, Plane, Gift, CheckCircle, ArrowRight, ArrowLeft, Circle, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const onboardingSlides = [
  {
    icon: Zap,
    title: "⚡ Zet Speed. Zet Smart.",
    description: "Every transaction completed in seconds. Experience the power of speed, security, and simplicity — only with Zet Pay.",
    bgColor: "bg-gradient-to-br from-primary via-primary/90 to-teal-600",
    textColor: "text-primary-foreground",
    dataAiHint: "speed smart technology"
  },
  {
    icon: Send,
    title: "💸 Send Money in Seconds",
    description: "Experience lightning-fast UPI transfers — pay anyone, anytime, with just a tap. Safe, simple, and secure.",
    bgColor: "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700",
    textColor: "text-white",
    dataAiHint: "upi payment money transfer"
  },
  {
    icon: Smartphone,
    title: "📲 Recharge & Pay Bills Easily",
    description: "From mobile and DTH to electricity, broadband, and metro — pay everything in one powerful app.",
    bgColor: "bg-gradient-to-br from-green-500 via-green-600 to-green-700",
    textColor: "text-white",
    dataAiHint: "bill payment recharge mobile"
  },
  {
    icon: Plane,
    title: "🧳 Travel Smarter, Book Faster",
    description: "Bus, train, flight, hotel, and even movie tickets — plan your trips and fun moments all in one place.",
    bgColor: "bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700",
    textColor: "text-white",
    dataAiHint: "travel booking tickets flight"
  },
  {
    icon: Gift,
    title: "🎁 Save More with Every Spend",
    description: "Enjoy a secure wallet, real-time spending insights, and exciting cashback rewards just for using the app.",
    bgColor: "bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600",
    textColor: "text-gray-800",
    dataAiHint: "rewards cashback savings wallet"
  },
];

export default function OnboardingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % onboardingSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + onboardingSlides.length) % onboardingSlides.length);
  };

  const handleGetStarted = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    router.push('/login');
  };

  const slide = onboardingSlides[currentSlide];
  const IconComponent = slide.icon;

  return (
    <div className={cn("min-h-screen flex flex-col items-center justify-between p-6 transition-all duration-500 ease-in-out", slide.bgColor, slide.textColor)}>
      <div className="flex-grow flex flex-col items-center justify-center text-center w-full max-w-md">
        <Card className="bg-card/80 backdrop-blur-sm shadow-2xl w-full animate-fade-in-up">
          <CardHeader className="pt-8">
            <IconComponent size={64} className="mx-auto mb-4" />
            <CardTitle className={cn("text-3xl font-bold", slide.textColor === "text-gray-800" ? "text-foreground": slide.textColor)}>{slide.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className={cn("text-lg leading-relaxed min-h-[6em]", slide.textColor === "text-gray-800" ? "text-muted-foreground": slide.textColor, "opacity-90")}>
              {slide.description}
            </CardDescription>
             <Image 
                src={`https://picsum.photos/seed/${slide.title.split(' ')[0]}/400/200`} 
                alt={slide.title} 
                width={400} 
                height={200} 
                className="rounded-lg mt-6 object-cover aspect-video"
                data-ai-hint={slide.dataAiHint}
             />
          </CardContent>
        </Card>
      </div>

      <div className="w-full max-w-md pb-4">
        <div className="flex justify-center items-center mb-6 space-x-2">
          {onboardingSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-all duration-300",
                currentSlide === index ? "bg-current p-1.5 ring-2 ring-offset-2 ring-offset-transparent ring-current" : "bg-current opacity-30 hover:opacity-60"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {currentSlide < onboardingSlides.length - 1 ? (
          <div className="flex justify-between items-center">
            <Button variant="ghost" onClick={prevSlide} className={cn("hover:bg-white/20", slide.textColor)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <Button variant="ghost" onClick={nextSlide} className={cn("hover:bg-white/20", slide.textColor)}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            className="w-full text-lg font-semibold bg-lime-400 hover:bg-lime-500 text-gray-800 shadow-lg"
            onClick={handleGetStarted}
          >
            Get Started <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
