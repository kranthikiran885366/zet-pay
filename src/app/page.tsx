
'use client'; // Add this directive to make it a Client Component

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { QrCode, ScanLine, Search, User, Banknote, Landmark, Smartphone, Tv, Bolt, Droplet, ShieldCheck, RadioTower, Tag, Plane, ShoppingBag, BadgePercent, Gift, History, Settings, LifeBuoy, Wifi, FileText, Bus, Ticket, Clapperboard, TramFront, Train, MapPinned, UtensilsCrossed } from "lucide-react"; // Added Bus, Ticket, Clapperboard, TramFront, Train, MapPinned, UtensilsCrossed
import Image from 'next/image';

// Mock data (replace with actual data fetching)
const recentTransactions = [
  { id: 1, name: "Alice Smith", amount: -50.00, date: "Today", avatar: "/avatars/01.png" },
  { id: 2, name: "Bob Johnson", amount: 200.00, date: "Yesterday", avatar: "/avatars/02.png" },
  { id: 3, name: "Pizza Place", amount: -25.50, date: "Yesterday", avatar: "/avatars/03.png" },
];

const offers = [
  { id: 1, title: "50% off on Movies", description: "Book tickets via PayFriend", imageUrl: "https://picsum.photos/seed/movie/200/100", dataAiHint: "movie ticket discount" },
  { id: 2, title: "Flat ₹100 Cashback", description: "On Electricity Bill Payment", imageUrl: "https://picsum.photos/seed/electricity/200/100", dataAiHint: "cashback electricity bill" },
  { id: 3, title: "Upto ₹50 Cashback", description: "On Mobile Recharge", imageUrl: "https://picsum.photos/seed/recharge/200/100", dataAiHint: "mobile recharge offer" },
];

const switchApps = [
  { id: 1, name: "Book Flights", icon: Plane, color: "text-blue-500", bgColor: "bg-blue-100", dataAiHint: "travel flight booking", href: "/travels/bus" }, // Use bus booking page as placeholder
  { id: 2, name: "Shop Online", icon: ShoppingBag, color: "text-purple-500", bgColor: "bg-purple-100", dataAiHint: "ecommerce online shopping", href: "/" }, // Link to home for now
  { id: 3, name: "Order Food", icon: UtensilsCrossed, color: "text-orange-500", bgColor: "bg-orange-100", dataAiHint: "food delivery restaurant", href: "/food"}, // Updated icon & href
  { id: 4, name: "Book Hotels", icon: Landmark, color: "text-red-500", bgColor: "bg-red-100", dataAiHint: "hotel booking accommodation", href: "/" }, // Link to home for now
];

const quickLinks = [
  // Recharge & Bill Payments
  { name: "Mobile Recharge", icon: Smartphone, href: "/recharge/mobile" },
  { name: "DTH", icon: Tv, href: "/recharge/dth" },
  { name: "Electricity", icon: Bolt, href: "/bills/electricity" },
  { name: "Credit Card", icon: Banknote, href: "/bills/credit-card" },
  { name: "FASTag", icon: RadioTower, href: "/recharge/fastag" },
  // Travel & Tickets
  { name: "Bus Tickets", icon: Bus, href: "/travels/bus" },
  { name: "Movie Tickets", icon: Clapperboard, href: "/movies" },
  { name: "See All", icon: BadgePercent, href: "/services" }, // Keep "See All" last in this section or move it
];

export default function Home() {
  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Link href="/profile" passHref>
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarImage src="https://picsum.photos/seed/user/40/40" alt="User" data-ai-hint="user profile"/>
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </Link>
          <div>
            {/* Location can be dynamic later */}
            {/* <div className="text-sm font-medium">Your Location</div>
            <div className="text-xs opacity-80">City, State</div> */}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/scan" passHref>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
              <ScanLine className="h-5 w-5" />
            </Button>
          </Link>
          {/* Search might be implemented later */}
          {/* <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <Search className="h-5 w-5" />
          </Button> */}
          <Link href="/scan?showMyQR=true" passHref>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
              <QrCode className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-4 pb-20">
        {/* Send Money Section */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-primary">Send Money</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-4 text-center">
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
            <CardTitle className="text-lg font-semibold text-primary">Recharge, Bills & Tickets</CardTitle>
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
             {offers.slice(0, 3).map((offer) => ( // Show only first 3 offers
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
             {/* <Button variant="link" size="sm" className="text-primary p-0 h-auto">See More</Button> */}
           </CardHeader>
           <CardContent className="grid grid-cols-4 gap-4 text-center">
             {switchApps.map((app) => (
                 <Link key={app.id} href={app.href} passHref>
                    <div className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity"> {/* Removed onClick */}
                      <div className={`${app.bgColor} ${app.color} p-3 rounded-full`}>
                        <app.icon className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-medium text-foreground">{app.name}</span>
                    </div>
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
            {recentTransactions.slice(0, 3).map((tx) => ( // Show only first 3 transactions
             <div key={tx.id} className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <Avatar className="h-9 w-9">
                   <AvatarImage src={`https://picsum.photos/seed/${tx.id}/40/40`} alt={tx.name} data-ai-hint="person avatar"/>
                   <AvatarFallback>{tx.name.charAt(0)}</AvatarFallback>
                 </Avatar>
                 <div>
                   <p className="text-sm font-medium text-foreground">{tx.name}</p>
                   <p className="text-xs text-muted-foreground">{tx.date}</p>
                 </div>
               </div>
               <p className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-foreground'}`}>
                 {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
               </p>
             </div>
            ))}
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
                 <Bolt className="h-5 w-5 mb-1" /> {/* Example: Bills Icon */}
                 <span className="text-xs">Bills</span>
             </Button>
          </Link>
          <Link href="/live/bus" passHref> {/* Link to Live Tracking */}
            <Button variant="ghost" className="flex flex-col items-center h-auto p-1 text-muted-foreground hover:text-primary">
            <MapPinned className="h-5 w-5 mb-1" />
            <span className="text-xs">Live Tracking</span>
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
                <Settings className="h-5 w-5 mb-1" />
                <span className="text-xs">Settings</span>
             </Button>
         </Link>
      </nav>
    </div>
  );
}
