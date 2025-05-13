'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SplashScreenDisplay from '@/components/SplashScreenDisplay'; 
// import { auth } from '@/lib/firebase'; // Original import
import { useRouter } from 'next/navigation';
import { Loader2, QrCode, ScanLine, User, Banknote, Landmark, Smartphone, Tv, Bolt, Wifi, Bus, Ticket, Clapperboard, RadioTower, CreditCard, Gift, History, MoreHorizontal, Plane, ShoppingBag, UtensilsCrossed, Wallet as WalletIcon, Mic, HelpCircle, RefreshCw, Home as HomeIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { cn } from '@/lib/utils';
import { useRealtimeBalance } from '@/hooks/useRealtimeBalance';
import { useRealtimeTransactions } from '@/hooks/useRealtimeTransactions';
import type { Transaction } from '@/services/types';

// Static data (can be fetched later if needed)
const offers = [
  { id: 1, title: "50% off on Movies", description: "Book tickets via PayFriend", imageUrl: "https://picsum.photos/seed/movie/200/100", dataAiHint: "movie ticket discount" },
  { id: 2, title: "Flat ₹100 Cashback", description: "On Electricity Bill Payment", imageUrl: "https://picsum.photos/seed/electricity/200/100", dataAiHint: "cashback electricity bill" },
  { id: 3, title: "Upto ₹50 Cashback", description: "On Mobile Recharge", imageUrl: "https://picsum.photos/seed/recharge/200/100", dataAiHint: "mobile recharge offer" },
];

const switchApps = [
  { id: 1, name: "Book Flights", icon: Plane, color: "text-blue-500", bgColor: "bg-blue-100", dataAiHint: "travel flight booking", href: "/travels/flight" },
  { id: 2, name: "Shop Online", icon: ShoppingBag, color: "text-purple-500", bgColor: "bg-purple-100", dataAiHint: "ecommerce online shopping", href: "/shopping/online" },
  { id: 3, name: "Order Food", icon: UtensilsCrossed, color: "text-orange-500", bgColor: "bg-orange-100", dataAiHint: "food delivery restaurant", href: "/food"},
  { id: 4, name: "Book Hotels", icon: Landmark, color: "text-red-500", bgColor: "bg-red-100", dataAiHint: "hotel booking accommodation", href: "/hostels" },
];

const quickLinks = [
  { name: "Mobile", icon: Smartphone, href: "/recharge/mobile" },
  { name: "DTH", icon: Tv, href: "/recharge/dth" },
  { name: "Electricity", icon: Bolt, href: "/bills/electricity" },
  { name: "Credit Card", icon: CreditCard, href: "/bills/credit-card" },
  { name: "FASTag", icon: RadioTower, href: "/recharge/fastag" },
  { name: "Broadband", icon: Wifi, href: "/bills/broadband" },
  { name: "Pay Later", icon: WalletIcon, href: "/bnpl" },
  { name: "See All", icon: MoreHorizontal, href: "/services" },
];


export default function Home() {
  // --- TEMPORARY BYPASS FOR TESTING ---
  const [showAppSplash, setShowAppSplash] = useState(true); // Keep splash for UI feel
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(true); // Assume logged in
  const [initialAuthCheckDone, setInitialAuthCheckDone] = useState(true); // Assume auth check done
  const [isLoadingPage, setIsLoadingPage] = useState(false); // Assume page not loading
  const router = useRouter(); // Keep router
  const { toast } = useToast(); // Keep toast

  // Simulate auth.currentUser for UI elements
  const mockAuthUser = {
    uid: 'mockUser123',
    photoURL: `https://picsum.photos/seed/mockUser123/40/40`,
    displayName: 'Dev User'
  };
  const auth = { currentUser: mockAuthUser };
  // --- END TEMPORARY BYPASS ---


  /* --- ORIGINAL AUTH LOGIC - COMMENTED OUT FOR TESTING ---
  const [showAppSplash, setShowAppSplash] = useState(true); 
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [initialAuthCheckDone, setInitialAuthCheckDone] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true); 
  const router = useRouter();
  const { toast } = useToast();
  --- END ORIGINAL AUTH LOGIC --- */


  const [walletBalance, isLoadingBalance, refreshBalance] = useRealtimeBalance();
  const [recentTransactions, isLoadingTransactions, refreshTransactions] = useRealtimeTransactions({ limit: 5 });
  const { isListening, transcript, startListening, stopListening, error: voiceError } = useVoiceCommands();

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      console.log("Homepage: Minimum splash screen display time finished.");
      setShowAppSplash(false); 
    }, 1000); 

    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    if (showAppSplash) return;

    /* --- ORIGINAL AUTH LOGIC - COMMENTED OUT FOR TESTING ---
    console.log("Homepage: Auth check initiated (or re-confirmed client-side).");
    const unsubscribe = auth.onAuthStateChanged(user => {
      console.log(`Homepage: Client auth state changed. User ${user ? 'found' : 'not found'}.`);
      setIsLoggedIn(!!user);
      setInitialAuthCheckDone(true); 
      setIsLoadingPage(false); 

      if (!user) {
        console.log("Homepage: No user (client-side check), ensuring redirect to login if not already there.");
        if (router.pathname !== '/login' && router.pathname !== '/splash' && router.pathname !== '/onboarding') { 
          router.replace('/login');
        }
      }
    });
    return () => unsubscribe();
     --- END ORIGINAL AUTH LOGIC --- */
    
    // For DEV MODE, if we assume logged in, this useEffect might not be strictly needed,
    // but if you had other logic here that depended on `isLoggedIn`, you'd adapt it.
    console.log("Homepage - DEV MODE: Assumed logged in. isLoadingPage set to false.");
    setIsLoadingPage(false); // Ensure loading page is false when bypassing auth for dev

  }, [showAppSplash, router]);


  useEffect(() => {
    if (transcript) {
      toast({ title: "Voice Command Received", description: `Processing: "${transcript}"...` });
       if (transcript.trim()) {
          router.push(`/conversation?query=${encodeURIComponent(transcript)}`);
       }
    }
  }, [transcript, toast, router]);

  useEffect(() => {
    if (voiceError) {
      toast({ variant: "destructive", title: "Voice Command Error", description: voiceError });
    }
  }, [voiceError, toast]);

  const handleVoiceButtonClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (showAppSplash || isLoadingPage || isLoggedIn === null ) { 
    return <SplashScreenDisplay />;
  }
  
  if (!isLoggedIn) {
    // This state should ideally not be reached in DEV MODE due to earlier bypass.
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-secondary">
            <Loader2 className="h-12 w-12 animate-spin text-primary"/>
            <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
        </div>
    );
  }

  // Main content when logged in and splash is done
  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Link href="/profile" passHref>
            <Avatar className="h-8 w-8 cursor-pointer border-2 border-primary-foreground/50">
              <AvatarImage src={auth.currentUser?.photoURL || `https://picsum.photos/seed/${auth.currentUser?.uid || 'default'}/40/40`} alt="User" data-ai-hint="user profile"/>
              <AvatarFallback>{auth.currentUser?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
          </Link>
           <div className="text-xs flex items-center gap-1 cursor-pointer" onClick={refreshBalance}>
                <WalletIcon size={14} />
                 {isLoadingBalance ? (
                    <Loader2 size={14} className="animate-spin"/>
                 ) : (
                    <span>₹{walletBalance?.toFixed(2) ?? '0.00'}</span>
                 )}
                 {!isLoadingBalance && <RefreshCw size={10} className="opacity-60 hover:opacity-100"/>}
            </div>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/scan" passHref>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80 h-9 w-9">
              <ScanLine className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/scan?showMyQR=true" passHref>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80 h-9 w-9">
              <QrCode className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/support" passHref>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80 h-9 w-9">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80 h-9 w-9" onClick={handleVoiceButtonClick}>
             <Mic className={cn("h-5 w-5", isListening ? "text-red-400 animate-pulse" : "")} />
          </Button>
        </div>
      </header>

      <main className="flex-grow p-4 space-y-4 pb-20">
        <Card className="shadow-md">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-base font-semibold text-primary">Send Money</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-x-2 gap-y-4 text-center p-3">
            <Link href="/scan" passHref legacyBehavior>
              <a className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="bg-primary/10 text-primary p-3 rounded-full">
                  <ScanLine className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-foreground">Scan &amp; Pay</span>
              </a>
            </Link>
            <Link href="/send/mobile" passHref legacyBehavior>
              <a className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="bg-primary/10 text-primary p-3 rounded-full">
                  <User className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-foreground">To Mobile</span>
              </a>
            </Link>
            <Link href="/send/bank" passHref legacyBehavior>
              <a className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="bg-primary/10 text-primary p-3 rounded-full">
                  <Landmark className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-foreground">To Bank/UPI</span>
              </a>
            </Link>
             <Link href="/balance" passHref legacyBehavior>
              <a className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="bg-primary/10 text-primary p-3 rounded-full">
                  <Banknote className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-foreground">Check Balance</span>
              </a>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-base font-semibold text-primary">Recharge, Bills & More</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-x-2 gap-y-4 text-center p-3">
            {quickLinks.map((link) => (
              <Link key={link.name} href={link.href} passHref legacyBehavior>
                <a className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity">
                  <div className="bg-primary/10 text-primary p-3 rounded-full">
                    <link.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-foreground">{link.name}</span>
                </a>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-3">
            <CardTitle className="text-base font-semibold text-primary">Offers For You</CardTitle>
            <Link href="/offers" passHref legacyBehavior>
              <a className="text-xs text-primary hover:underline">View All</a>
            </Link>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
             {offers.slice(0, 3).map((offer) => (
              <Link href={`/offers/${offer.id}`} key={offer.id} passHref legacyBehavior>
                <a className="block relative rounded-lg overflow-hidden cursor-pointer group">
                  <Image
                    src={offer.imageUrl}
                    alt={offer.title}
                    width={200}
                    height={100}
                    className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint={offer.dataAiHint}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-1.5 text-white">
                      <p className="text-xs font-semibold">{offer.title}</p>
                      <p className="text-[10px] opacity-90">{offer.description}</p>
                  </div>
                </a>
              </Link>
             ))}
          </CardContent>
        </Card>

        <Card className="shadow-md">
           <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-3">
            <CardTitle className="text-base font-semibold text-primary">PayFriend Switch</CardTitle>
           </CardHeader>
           <CardContent className="grid grid-cols-4 gap-3 text-center p-3">
             {switchApps.map((app) => (
                 <Link key={app.id} href={app.href} passHref legacyBehavior>
                    <a className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity" data-testid={`switch-app-${app.id}`}>
                      <div className={`${app.bgColor} ${app.color} p-3 rounded-full`}>
                        <app.icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium text-foreground">{app.name}</span>
                    </a>
                </Link>
             ))}
           </CardContent>
        </Card>

         <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-3">
            <CardTitle className="text-base font-semibold text-primary">Recent Activity</CardTitle>
             <Link href="/history" passHref legacyBehavior>
                <a className="text-xs text-primary hover:underline">View All</a>
             </Link>
          </CardHeader>
          <CardContent className="space-y-2 p-3 divide-y divide-border">
            {isLoadingTransactions ? (
                 <div className="flex justify-center items-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                 </div>
            ) : recentTransactions.length === 0 ? (
                 <p className="text-xs text-muted-foreground text-center py-4">No recent transactions.</p>
            ) : (
                 recentTransactions.map((tx: Transaction) => (
                 <div key={tx.id} className="flex items-center justify-between pt-2">
                   <div className="flex items-center gap-2 overflow-hidden">
                     <Avatar className="h-8 w-8">
                       <AvatarImage src={`https://picsum.photos/seed/${tx.avatarSeed || tx.id}/40/40`} alt={tx.name} data-ai-hint="person avatar"/>
                       <AvatarFallback>{tx.name?.charAt(0) || '?'}</AvatarFallback>
                     </Avatar>
                     <div className="overflow-hidden">
                       <p className="text-sm font-medium text-foreground truncate">{tx.name}</p>
                       <p className="text-xs text-muted-foreground">{format(new Date(tx.date), "PP HH:mm")}</p>
                     </div>
                   </div>
                   <p className={`text-sm font-semibold ${Number(tx.amount) > 0 ? 'text-green-600' : 'text-foreground'}`}>
                     {Number(tx.amount) > 0 ? '+' : ''}₹{Math.abs(Number(tx.amount)).toFixed(2)}
                   </p>
                 </div>
                ))
            )}
          </CardContent>
         </Card>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg flex justify-around items-center p-1">
         <Link href="/" passHref legacyBehavior>
            <a className="flex flex-col items-center h-auto p-1 text-primary">
                <HomeIcon className="h-5 w-5 mb-0.5" />
                <span className="text-[10px]">Home</span>
            </a>
         </Link>
          <Link href="/services" passHref legacyBehavior>
             <a className="flex flex-col items-center h-auto p-1 text-muted-foreground hover:text-primary">
                 <Bolt className="h-5 w-5 mb-0.5" />
                 <span className="text-[10px]">Services</span>
             </a>
          </Link>
         <Link href="/history" passHref legacyBehavior>
            <a className="flex flex-col items-center h-auto p-1 text-muted-foreground hover:text-primary">
                <History className="h-5 w-5 mb-0.5" />
                <span className="text-[10px]">History</span>
            </a>
         </Link>
          <Link href="/profile" passHref legacyBehavior>
             <a className="flex flex-col items-center h-auto p-1 text-muted-foreground hover:text-primary">
                <User className="h-5 w-5 mb-0.5" />
                <span className="text-[10px]">Profile</span>
             </a>
         </Link>
      </nav>
    </div>
  );
}
