
'use client';

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QrCode, ScanLine, User, Banknote, Landmark, Smartphone, Tv, Bolt, Wifi, FileText, Bus, Ticket, Clapperboard, TramFront, Train, MapPinned, UtensilsCrossed, Gamepad2, HardDrive, Power, Mailbox, CreditCard, ShieldCheck, RadioTower, Gift, History, Settings, LifeBuoy, MoreHorizontal, Tv2, Plane, ShoppingBag, BadgePercent, Loader2, Wallet, Mic } from "lucide-react"; // Added Mic
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { subscribeToTransactionHistory, Transaction } from '@/services/transactions';
import { useToast } from "@/hooks/use-toast";
import type { Unsubscribe } from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import { format } from 'date-fns';
import { useVoiceCommands } from '@/hooks/useVoiceCommands'; // Import the new hook

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
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const { toast } = useToast();
  const { isListening, transcript, startListening, stopListening, error: voiceError } = useVoiceCommands(); // Use the hook

  // Handle voice command results (placeholder)
  useEffect(() => {
    if (transcript) {
      toast({ title: "Voice Command (Simulated)", description: `Recognized: "${transcript}". Processing... (Not Implemented)` });
      // TODO: Add NLP processing and action dispatching here
    }
  }, [transcript, toast]);

  // Handle voice command errors (placeholder)
  useEffect(() => {
    if (voiceError) {
      toast({ variant: "destructive", title: "Voice Command Error", description: voiceError });
    }
  }, [voiceError, toast]);


  // Subscribe to recent transactions on component mount
  useEffect(() => {
    setIsLoadingTransactions(true);
    console.log("Subscribing to recent transactions...");

    // Check if user is logged in before subscribing
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      let unsubscribeFromTransactions: Unsubscribe | null = null;
      if (user) {
        unsubscribeFromTransactions = subscribeToTransactionHistory(
          (transactions) => {
            console.log("Received recent transactions update:", transactions);
            setRecentTransactions(transactions);
            setIsLoadingTransactions(false);
          },
          (error) => {
            console.error("Failed to subscribe to recent transactions:", error);
             // No toast here if handled by useRealtimeData hook or parent
            setIsLoadingTransactions(false);
            setRecentTransactions([]); // Clear on error
          },
          undefined, // No specific filters for home page recent list
          3 // Limit to latest 3 transactions
        );

      } else {
        console.log("User is not logged in. Not subscribing to transactions.");
        setRecentTransactions([]);
        setIsLoadingTransactions(false);
      }
      // Cleanup subscription on unmount or when user changes
      return () => {
          if (unsubscribeFromTransactions) {
            console.log("Unsubscribing from recent transactions.");
            unsubscribeFromTransactions();
          }
      };
    });

    // Cleanup auth state listener on unmount
    return () => {
      unsubscribeAuth();
    };
  }, []); // Removed toast dependency as errors should be handled centrally if possible


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
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarImage src="https://picsum.photos/seed/user1/40/40" alt="User" data-ai-hint="user profile"/>
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </Link>
          {/* Location can be dynamic later */}
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
          {/* Voice Command Button */}
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80 h-9 w-9" onClick={handleVoiceButtonClick}>
             <Mic className={`h-5 w-5 ${isListening ? 'text-red-400 animate-pulse' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-4 pb-20">
        {/* Send Money Section */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-primary">Send Money</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-x-4 gap-y-6 text-center">
            <Link href="/scan" passHref>
              <div className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="bg-primary/10 text-primary p-3 rounded-full">
                  <ScanLine className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-foreground">Scan &amp; Pay</span>
              </div>
            </Link>
            <Link href="/send/mobile" passHref>
              <div className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="bg-primary/10 text-primary p-3 rounded-full">
                  <User className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-foreground">To Mobile</span>
              </div>
            </Link>
            <Link href="/send/bank" passHref>
              <div className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="bg-primary/10 text-primary p-3 rounded-full">
                  <Landmark className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-foreground">To Bank/UPI ID</span>
              </div>
            </Link>
             <Link href="/balance" passHref>
              <div className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="bg-primary/10 text-primary p-3 rounded-full">
                  <Banknote className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-foreground">Check Balance</span>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Quick Links: Recharge, Bills, Tickets Section */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-primary">Recharge, Bills & More</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-x-4 gap-y-6 text-center">
            {quickLinks.map((link) => (
              <Link key={link.name} href={link.href} passHref>
                <div className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity">
                  <div className="bg-primary/10 text-primary p-3 rounded-full">
                    <link.icon className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-medium text-foreground">{link.name}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

         {/* Offers Section */}
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold text-primary">Offers</CardTitle>
            <Link href="/offers" passHref>
              <Button variant="link" size="sm" className="text-primary p-0 h-auto">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
             {offers.slice(0, 3).map((offer) => (
              <Link href={`/offers/${offer.id}`} key={offer.id} passHref>
                <div className="relative rounded-lg overflow-hidden cursor-pointer group">
                  <Image
                    src={offer.imageUrl}
                    alt={offer.title}
                    width={200}
                    height={100}
                    className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint={offer.dataAiHint}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-2 text-white">
                      <p className="text-sm font-semibold">{offer.title}</p>
                      <p className="text-xs opacity-90">{offer.description}</p>
                  </div>
                </div>
              </Link>
             ))}
          </CardContent>
        </Card>

        {/* Switch Section */}
        <Card className="shadow-md">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold text-primary">PayFriend Switch</CardTitle>
            {/* Link to a dedicated Switch page if needed */}
           </CardHeader>
           <CardContent className="grid grid-cols-4 gap-4 text-center">
             {switchApps.map((app) => (
                 <Link key={app.id} href={app.href} passHref legacyBehavior>
                    <a className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity" data-testid={`switch-app-${app.id}`}>
                      <div className={`${app.bgColor} ${app.color} p-3 rounded-full`}>
                        <app.icon className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-medium text-foreground">{app.name}</span>
                    </a>
                </Link>
             ))}
           </CardContent>
        </Card>

         {/* Recent Transactions Section */}
         <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold text-primary">Recent Transactions</CardTitle>
             <Link href="/history" passHref>
                <Button variant="link" size="sm" className="text-primary p-0 h-auto">View History</Button>
             </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingTransactions ? (
                 <div className="flex justify-center items-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground ml-2">Loading transactions...</p>
                 </div>
            ) : recentTransactions.length === 0 ? (
                 <p className="text-sm text-muted-foreground text-center py-4">No recent transactions.</p>
            ) : (
                 recentTransactions.map((tx) => (
                 <div key={tx.id} className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <Avatar className="h-9 w-9">
                       <AvatarImage src={`https://picsum.photos/seed/${tx.avatarSeed || tx.id}/40/40`} alt={tx.name} data-ai-hint="person avatar"/>
                       <AvatarFallback>{tx.name?.charAt(0) || '?'}</AvatarFallback>
                     </Avatar>
                     <div>
                       <p className="text-sm font-medium text-foreground">{tx.name}</p>
                       <p className="text-xs text-muted-foreground">{format(tx.date, "PPp")}</p> {/* Use formatted date */}
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
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg flex justify-around items-center p-2">
         <Link href="/" passHref>
            <Button variant="ghost" className="flex flex-col items-center h-auto p-1 text-primary">
                <Landmark className="h-5 w-5 mb-1" />
                <span className="text-xs">Home</span>
            </Button>
         </Link>
          <Link href="/services" passHref>
             <Button variant="ghost" className="flex flex-col items-center h-auto p-1 text-muted-foreground hover:text-primary">
                 <Bolt className="h-5 w-5 mb-1" />
                 <span className="text-xs">Services</span>
             </Button>
          </Link>
         <Link href="/history" passHref>
            <Button variant="ghost" className="flex flex-col items-center h-auto p-1 text-muted-foreground hover:text-primary">
                <History className="h-5 w-5 mb-1" />
                <span className="text-xs">History</span>
            </Button>
         </Link>
          <Link href="/profile" passHref>
             <Button variant="ghost" className="flex flex-col items-center h-auto p-1 text-muted-foreground hover:text-primary">
                <User className="h-5 w-5 mb-1" /> {/* Changed Settings to User for clarity */}
                <span className="text-xs">Profile</span>
             </Button>
         </Link>
      </nav>
    </div>
  );
}
