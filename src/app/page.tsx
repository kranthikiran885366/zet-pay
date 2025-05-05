'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QrCode, ScanLine, User, Banknote, Landmark, Smartphone, Tv, Bolt, Wifi, Bus, Ticket, Clapperboard, RadioTower, CreditCard, Gift, History, Settings, MoreHorizontal, Plane, ShoppingBag, UtensilsCrossed, Wallet, Mic, MessageSquare, Loader2, HelpCircle, RefreshCw } from "lucide-react"; // Added RefreshCw
import Image from 'next/image';
import { subscribeToTransactionHistory, Transaction } from '@/services/transactions'; // Use service with subscription
import { useToast } from "@/hooks/use-toast";
import { auth } from '@/lib/firebase';
import { format } from 'date-fns';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation'; // Import useRouter
import { useRealtimeBalance } from '@/hooks/useRealtimeBalance'; // Import the balance hook
import { useRealtimeTransactions } from '@/hooks/useRealtimeTransactions'; // Import the transaction hook

// Static data (can be fetched later if needed)
const offers = [
  { id: 1, title: "50% off on Movies", description: "Book tickets via PayFriend", imageUrl: "https://picsum.photos/seed/movie/200/100", dataAiHint: "movie ticket discount" },
  { id: 2, title: "Flat ₹100 Cashback", description: "On Electricity Bill Payment", imageUrl: "https://picsum.photos/seed/electricity/200/100", dataAiHint: "cashback electricity bill" },
  { id: 3, title: "Upto ₹50 Cashback", description: "On Mobile Recharge", imageUrl: "https://picsum.photos/seed/recharge/200/100", dataAiHint: "mobile recharge offer" },
];

const switchApps = [
  { id: 1, name: "Book Flights", icon: Plane, color: "text-blue-500", bgColor: "bg-blue-100", dataAiHint: "travel flight booking", href: "/travels/flight" },
  { id: 2, name: "Shop Online", icon: ShoppingBag, color: "text-purple-500", bgColor: "bg-purple-100", dataAiHint: "ecommerce online shopping", href: "/" }, // Placeholder href
  { id: 3, name: "Order Food", icon: UtensilsCrossed, color: "text-orange-500", bgColor: "bg-orange-100", dataAiHint: "food delivery restaurant", href: "/food"},
  { id: 4, name: "Book Hotels", icon: Landmark, color: "text-red-500", bgColor: "bg-red-100", dataAiHint: "hotel booking accommodation", href: "/" }, // Placeholder href
];

const quickLinks = [
  // Recharge & Bill Payments
  { name: "Mobile", icon: Smartphone, href: "/recharge/mobile" },
  { name: "DTH", icon: Tv, href: "/recharge/dth" },
  { name: "Electricity", icon: Bolt, href: "/bills/electricity" },
  { name: "Credit Card", icon: CreditCard, href: "/bills/credit-card" }, // Added Credit Card
  { name: "FASTag", icon: RadioTower, href: "/recharge/fastag" },
  { name: "Broadband", icon: Wifi, href: "/bills/broadband" },
  { name: "Pay Later", icon: Wallet, href: "/bnpl" }, // Added Pay Later link
  { name: "See All", icon: MoreHorizontal, href: "/services" },
];

export default function Home() {
  const [recentTransactions, isLoadingTransactions, refreshTransactions] = useRealtimeTransactions({ limit: 5 }); // Use the hook
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // Track login state
  const [walletBalance, isLoadingBalance, refreshBalance] = useRealtimeBalance(); // Use the balance hook
  const { toast } = useToast();
  const { isListening, transcript, startListening, stopListening, error: voiceError } = useVoiceCommands(); // Use the voice hook
  const router = useRouter();

  // Handle voice command results
  useEffect(() => {
    if (transcript) {
      toast({ title: "Voice Command Received", description: `Processing: "${transcript}"...` });
       if (transcript.trim()) {
          // Navigate to conversational UI with the query
          router.push(`/conversation?query=${encodeURIComponent(transcript)}`);
       }
    }
  }, [transcript, toast, router]);

  // Handle voice command errors
  useEffect(() => {
    if (voiceError) {
      toast({ variant: "destructive", title: "Voice Command Error", description: voiceError });
    }
  }, [voiceError, toast]);


  // Check auth state on mount
  useEffect(() => {
    setIsLoadingTransactions(true); // Set loading true initially
    console.log("Setting up auth listener for homepage...");
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
        const loggedIn = !!user;
        console.log(`Auth state changed on homepage. User ${loggedIn ? 'logged in' : 'logged out'}.`);
        setIsLoggedIn(loggedIn);
        if (!loggedIn) {
             setIsLoadingTransactions(false); // Stop loading if logged out
        }
        // Transaction subscription is handled by the useRealtimeTransactions hook
    });

    // Cleanup auth listener
    return () => {
      console.log("Cleaning up homepage auth listener.");
      unsubscribeAuth();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount


  const handleVoiceButtonClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };


  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Link href="/profile" passHref>
            <Avatar className="h-8 w-8 cursor-pointer border-2 border-primary-foreground/50">
              <AvatarImage src={auth.currentUser?.photoURL || `https://picsum.photos/seed/${auth.currentUser?.uid || 'default'}/40/40`} alt="User" data-ai-hint="user profile"/>
              <AvatarFallback>{auth.currentUser?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
          </Link>
           {/* Wallet Balance Display */}
           <div className="text-xs flex items-center gap-1 cursor-pointer" onClick={refreshBalance}>
                <Wallet size={14} />
                 {isLoadingBalance ? (
                    <Loader2 size={14} className="animate-spin"/>
                 ) : (
                    <span>₹{walletBalance?.toFixed(2) ?? '0.00'}</span>
                 )}
                  {/* Show refresh icon only when not loading */}
                 {!isLoadingBalance && <RefreshCw size={10} className="opacity-60 hover:opacity-100"/>}
            </div>
        </div>
        <div className="flex items-center gap-1"> {/* Reduced gap */}
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
           {/* Help Button */}
          <Link href="/support" passHref>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80 h-9 w-9">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </Link>
          {/* Voice Command Button */}
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80 h-9 w-9" onClick={handleVoiceButtonClick}>
             <Mic className={cn("h-5 w-5", isListening ? "text-red-400 animate-pulse" : "")} />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-4 pb-20"> {/* Adjusted padding */}
        {/* Send Money Section */}
        <Card className="shadow-md">
          <CardHeader className="pb-2 pt-3 px-3"> {/* Adjusted padding */}
            <CardTitle className="text-base font-semibold text-primary">Send Money</CardTitle> {/* Adjusted size */}
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-x-2 gap-y-4 text-center p-3"> {/* Adjusted padding and gap */}
            <Link href="/scan" passHref legacyBehavior>
              <a className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="bg-primary/10 text-primary p-3 rounded-full">
                  <ScanLine className="h-5 w-5" /> {/* Adjusted size */}
                </div>
                <span className="text-xs font-medium text-foreground">Scan &amp; Pay</span>
              </a>
            </Link>
            <Link href="/send/mobile" passHref legacyBehavior>
              <a className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="bg-primary/10 text-primary p-3 rounded-full">
                  <User className="h-5 w-5" /> {/* Adjusted size */}
                </div>
                <span className="text-xs font-medium text-foreground">To Mobile</span>
              </a>
            </Link>
            <Link href="/send/bank" passHref legacyBehavior>
              <a className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="bg-primary/10 text-primary p-3 rounded-full">
                  <Landmark className="h-5 w-5" /> {/* Adjusted size */}
                </div>
                <span className="text-xs font-medium text-foreground">To Bank/UPI</span>
              </a>
            </Link>
             <Link href="/balance" passHref legacyBehavior>
              <a className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="bg-primary/10 text-primary p-3 rounded-full">
                  <Banknote className="h-5 w-5" /> {/* Adjusted size */}
                </div>
                <span className="text-xs font-medium text-foreground">Check Balance</span>
              </a>
            </Link>
          </CardContent>
        </Card>

        {/* Conversational Action Link */}
        <Link href="/conversation" passHref legacyBehavior>
            <a className="block">
                <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                    <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-6 w-6"/>
                            <div>
                                <p className="font-semibold text-sm">Ask PayFriend</p>
                                <p className="text-xs opacity-90">Try: "Recharge my Jio number"</p>
                            </div>
                        </div>
                        <Mic className="h-5 w-5"/>
                    </CardContent>
                </Card>
            </a>
        </Link>

        {/* Quick Links: Recharge, Bills & More Section */}
        <Card className="shadow-md">
          <CardHeader className="pb-2 pt-3 px-3"> {/* Adjusted padding */}
            <CardTitle className="text-base font-semibold text-primary">Recharge, Bills & More</CardTitle> {/* Adjusted size */}
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-x-2 gap-y-4 text-center p-3"> {/* Adjusted padding and gap */}
            {quickLinks.map((link) => (
              <Link key={link.name} href={link.href} passHref legacyBehavior>
                <a className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity">
                  <div className="bg-primary/10 text-primary p-3 rounded-full">
                    <link.icon className="h-5 w-5" /> {/* Adjusted size */}
                  </div>
                  <span className="text-xs font-medium text-foreground">{link.name}</span>
                </a>
              </Link>
            ))}
          </CardContent>
        </Card>

         {/* Offers Section */}
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-3"> {/* Adjusted padding */}
            <CardTitle className="text-base font-semibold text-primary">Offers For You</CardTitle> {/* Adjusted size */}
            <Link href="/offers" passHref legacyBehavior>
              <a className="text-xs text-primary hover:underline">View All</a>
            </Link>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3"> {/* Adjusted gap and padding */}
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
                  <div className="absolute bottom-0 left-0 p-1.5 text-white"> {/* Adjusted padding */}
                      <p className="text-xs font-semibold">{offer.title}</p> {/* Adjusted size */}
                      <p className="text-[10px] opacity-90">{offer.description}</p> {/* Adjusted size */}
                  </div>
                </a>
              </Link>
             ))}
          </CardContent>
        </Card>

        {/* Switch Section */}
        <Card className="shadow-md">
           <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-3"> {/* Adjusted padding */}
            <CardTitle className="text-base font-semibold text-primary">PayFriend Switch</CardTitle> {/* Adjusted size */}
            {/* Link to a dedicated Switch page if needed */}
           </CardHeader>
           <CardContent className="grid grid-cols-4 gap-3 text-center p-3"> {/* Adjusted padding */}
             {switchApps.map((app) => (
                 <Link key={app.id} href={app.href} passHref legacyBehavior>
                    <a className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity" data-testid={`switch-app-${app.id}`}>
                      <div className={`${app.bgColor} ${app.color} p-3 rounded-full`}>
                        <app.icon className="h-5 w-5" /> {/* Adjusted size */}
                      </div>
                      <span className="text-xs font-medium text-foreground">{app.name}</span>
                    </a>
                </Link>
             ))}
           </CardContent>
        </Card>

         {/* Recent Transactions Section */}
         <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-3"> {/* Adjusted padding */}
            <CardTitle className="text-base font-semibold text-primary">Recent Activity</CardTitle> {/* Adjusted size */}
             <Link href="/history" passHref legacyBehavior>
                <a className="text-xs text-primary hover:underline">View All</a>
             </Link>
          </CardHeader>
          <CardContent className="space-y-2 p-3 divide-y divide-border"> {/* Adjusted padding */}
            {isLoadingTransactions && isLoggedIn !== false ? ( // Show loader only if logged in or status unknown
                 <div className="flex justify-center items-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                 </div>
            ) : !isLoggedIn ? (
                 <p className="text-xs text-muted-foreground text-center py-4">Log in to view transactions.</p>
            ) : recentTransactions.length === 0 ? (
                 <p className="text-xs text-muted-foreground text-center py-4">No recent transactions.</p>
            ) : (
                 recentTransactions.map((tx) => (
                 <div key={tx.id} className="flex items-center justify-between pt-2"> {/* Add padding top for separation */}
                   <div className="flex items-center gap-2 overflow-hidden"> {/* Reduced gap */}
                     <Avatar className="h-8 w-8"> {/* Adjusted size */}
                       <AvatarImage src={`https://picsum.photos/seed/${tx.avatarSeed || tx.id}/40/40`} alt={tx.name} data-ai-hint="person avatar"/>
                       <AvatarFallback>{tx.name?.charAt(0) || '?'}</AvatarFallback>
                     </Avatar>
                     <div className="overflow-hidden">
                       <p className="text-sm font-medium text-foreground truncate">{tx.name}</p>
                       {/* Ensure tx.date is a Date object before formatting */}
                       <p className="text-xs text-muted-foreground">{format(new Date(tx.date), "PP HH:mm")}</p>
                     </div>
                   </div>
                   <p className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-foreground'}`}>
                     {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                   </p>
                 </div>
                ))
            )}
          </CardContent>
         </Card>

      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg flex justify-around items-center p-1"> {/* Reduced padding */}
         <Link href="/" passHref legacyBehavior>
            <a className="flex flex-col items-center h-auto p-1 text-primary">
                <Landmark className="h-5 w-5 mb-0.5" /> {/* Adjusted spacing */}
                <span className="text-[10px]">Home</span> {/* Adjusted size */}
            </a>
         </Link>
          <Link href="/services" passHref legacyBehavior>
             <a className="flex flex-col items-center h-auto p-1 text-muted-foreground hover:text-primary">
                 <Bolt className="h-5 w-5 mb-0.5" /> {/* Adjusted spacing */}
                 <span className="text-[10px]">Services</span> {/* Adjusted size */}
             </a>
          </Link>
         <Link href="/history" passHref legacyBehavior>
            <a className="flex flex-col items-center h-auto p-1 text-muted-foreground hover:text-primary">
                <History className="h-5 w-5 mb-0.5" /> {/* Adjusted spacing */}
                <span className="text-[10px]">History</span> {/* Adjusted size */}
            </a>
         </Link>
          <Link href="/profile" passHref legacyBehavior>
             <a className="flex flex-col items-center h-auto p-1 text-muted-foreground hover:text-primary">
                <User className="h-5 w-5 mb-0.5" /> {/* Changed Settings to User, Adjusted spacing */}
                <span className="text-[10px]">Profile</span> {/* Adjusted size */}
             </a>
         </Link>
      </nav>
    </div>
  );
}
