
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Smartphone, Tv, Bolt, Droplet, ShieldCheck, RadioTower, Banknote, Tag, LifeBuoy, Wifi, FileText, MoreHorizontal, Bus, Ticket, Clapperboard, TramFront, Train, MapPinned, Gamepad2, HardDrive, Power, Mailbox, CreditCard, Gift as GiftIcon, PhoneCall, Tv2 } from 'lucide-react'; // Added specific icons
import Link from 'next/link';

// Expanded list of services - add more as needed
const allServices = [
  // Recharge
  { name: "Mobile Recharge", icon: Smartphone, href: "/recharge/mobile", category: "Recharge" },
  { name: "DTH", icon: Tv, href: "/recharge/dth", category: "Recharge" },
  { name: "FASTag Recharge", icon: RadioTower, href: "/recharge/fastag", category: "Recharge" },
  { name: "Data Card", icon: HardDrive, href: "/recharge/datacard", category: "Recharge" },
  { name: "Prepaid Electricity", icon: Power, href: "/recharge/electricity", category: "Recharge" },
  { name: "Metro Card", icon: TramFront, href: "/recharge/metro", category: "Recharge" }, // Public Transit under Recharge
  // Bill Payments
  { name: "Electricity", icon: Bolt, href: "/bills/electricity", category: "Bill Payments" },
  { name: "Credit Card Bill", icon: CreditCard, href: "/bills/credit-card", category: "Bill Payments" },
  { name: "Water", icon: Droplet, href: "/bills/water", category: "Bill Payments" },
  { name: "Insurance", icon: ShieldCheck, href: "/bills/insurance", category: "Bill Payments" },
  { name: "Loan Repayment", icon: LifeBuoy, href: "/bills/loan", category: "Bill Payments" },
  { name: "Broadband/Landline", icon: Wifi, href: "/bills/broadband", category: "Bill Payments" },
  { name: "Piped Gas", icon: Tag, href: "/bills/gas", category: "Bill Payments" },
  { name: "Rent Payment", icon: FileText, href: "/pay/rent", category: "Bill Payments" },
  { name: "Subscription Services", icon: Tv2, href: "/bills/subscription", category: "Bill Payments" },
  // Tickets & Travel
  { name: "Bus Pass", icon: Ticket, href: "/passes/bus", category: "Tickets & Travel" },
  { name: "Bus Tickets", icon: Bus, href: "/travels/bus", category: "Tickets & Travel" },
  { name: "Movie Tickets", icon: Clapperboard, href: "/movies", category: "Tickets & Travel" },
  { name: "Train Tickets", icon: Train, href: "/travels/train", category: "Tickets & Travel" },
   // Live Tracking
  { name: "Live Bus Tracking", icon: MapPinned, href: "/live/bus", category: "Live Tracking" },
  { name: "Live Train Tracking", icon: MapPinned, href: "/live/train", category: "Live Tracking" }, // Reuse icon
   // Vouchers & More
   { name: "Gaming Cards", icon: Gamepad2, href: "/vouchers/gaming", category: "Vouchers & More" },
   { name: "Gift Cards", icon: GiftIcon, href: "/vouchers/giftcards", category: "Vouchers & More" },
   { name: "Intl. Calling Cards", icon: PhoneCall, href: "/recharge/isd", category: "Vouchers & More" },
   { name: "Digital Vouchers", icon: Mailbox, href: "/vouchers/digital", category: "Vouchers & More" },
  // Others
  // ... add other less common services here or categorize them
];

// Group services by category
const groupedServices = allServices.reduce((acc, service) => {
  const category = service.category || "Other Services";
  if (!acc[category]) {
    acc[category] = [];
  }
  acc[category].push(service);
  return acc;
}, {} as Record<string, typeof allServices>);


export default function AllServicesPage() {
  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <MoreHorizontal className="h-6 w-6" />
        <h1 className="text-lg font-semibold">All Services</h1>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-6 pb-20"> {/* Added pb-20 for bottom nav */}
        {Object.entries(groupedServices).sort(([catA], [catB]) => { // Sort categories if needed
            const order = ["Recharge", "Bill Payments", "Tickets & Travel", "Live Tracking", "Vouchers & More", "Other Services"];
            return order.indexOf(catA) - order.indexOf(catB);
        }).map(([category, services]) => (
          <Card key={category} className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-md font-semibold text-primary">{category}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-x-4 gap-y-6 text-center">
              {services.map((link) => (
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
        ))}
      </main>
    </div>
  );
}
