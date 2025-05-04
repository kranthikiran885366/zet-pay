'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import {
  ArrowLeft,
  Landmark,
  PlusCircle,
  Trash2,
  CheckCircle,
  Copy,
  Loader2,
  Smartphone,
  Tv,
  Bolt,
  Droplet,
  ShieldCheck,
  RadioTower,
  Banknote,
  Tag,
  LifeBuoy,
  Wifi,
  FileText,
  Bus,
  Ticket,
  Clapperboard,
  TramFront,
  Train,
  MapPin,
  UtensilsCrossed,
  Gamepad2,
  HardDrive,
  Power,
  Mailbox,
  CreditCard,
  Settings,
  Info,
  History,
  ParkingMeter, // Corrected icon
  Fuel, // Corrected icon
  CarTaxiFront as TaxiIcon, // Use alias
  PhoneCall,
    Plane,
    ShoppingBag,
    Gift as GiftIcon, //Alias Gift to avoid conflict
    Home, // Added Temple icon (using Home as placeholder)
    Car,
    Bike as Motorbike, // Use alias
    CalendarCheck,
    Video,
    Sparkles,
  ShoppingBasket,
  HeartHandshake,
  Music,
    Map,
    Hotel,
    Users,
    QrCode,
    Clock,
    Briefcase, // For Mutual Funds
    Database, // For Deposits
    Gauge, // For Credit Score
    Coins, // For Gold
    Building2, // For Zet Bank
    Zap, // For EV Charging
    Siren, // For Emergency Assistance
    Store, // For Rest Stop (placeholder)
    HeartPulse, // For Healthcare
    Wrench, // Electrician/Plumber
    SprayCan, // Home Cleaning/Pest Control
    WashingMachine, // Laundry
    Scissors, // Tailoring
    // CarWash icon replaced with Car
    Package, // Courier
    BriefcaseBusiness, // Coworking
    Dog, // Pet Grooming/Vet
    ScissorsLineDashed, // Barber/Salon
    MoreHorizontal, // Added MoreHorizontal back
    FolderLock, // For Secure Vault
    GraduationCap, // Added for Education Fees
    PiggyBank, // Added for Pocket Money
} from "lucide-react"; // Added specific icons
import Image from 'next/image';
import { useState } from 'react'; // Import useState

const templeServices = [
  { name: "Book Darshan Slot", icon: CalendarCheck, href: "/temple/darshan", category: "Temple Services" },
  { name: "Live Darshan", icon: Video, href: "/temple/live", category: "Temple Services" },
  { name: "Virtual Pooja", icon: Sparkles, href: "/temple/pooja", category: "Temple Services" },
  { name: "Order Prasadam", icon: ShoppingBasket, href: "/temple/prasadam", category: "Temple Services" },
  { name: "Donate to Temple", icon: HeartHandshake, href: "/temple/donate", category: "Temple Services" },
  { name: "Temple Timings & Queue", icon: Clock, href: "/temple/info", category: "Temple Services" },
  { name: "Aarti & Mantras", icon: Music, href: "/temple/audio", category: "Temple Services" },
  { name: "Book Events/Yatra", icon: Map, href: "/temple/events", category: "Temple Services" },
  { name: "Nearby Accommodation", icon: Hotel, href: "/temple/accommodation", category: "Temple Services" },
  { name: "Group Visit Booking", icon: Users, href: "/temple/group", category: "Temple Services" },
  { name: "Smart Access Pass", icon: QrCode, href: "/temple/access", category: "Temple Services" },
];

const travelServices = [
    { name: "Car Rentals", icon: Car, href: "/travels/car", category: "Travel" },
    { name: "Bike Rentals", icon: Motorbike, href: "/travels/bike", category: "Travel" },
    { name: "Book Bus Tickets", icon: Bus, href: "/travels/bus", category: "Travel"},
    { name: "Book Flight Tickets", icon: Plane, href: "/travels/flight", category: "Travel"},
    { name: "Book Train Tickets", icon: Train, href: "/travels/train", category: "Travel"},
    { name: "EV Charging Stations", icon: Zap, href: "/travels/ev-charging", category: "Travel" },
    { name: "Rest Stop Booking", icon: Store, href: "/travels/rest-stop", category: "Travel" },
    { name: "Emergency Assistance", icon: Siren, href: "/travels/assistance", category: "Travel" },
];

const financialServices = [
    { name: "Pay Loan EMI", icon: Landmark, href: "/bills/loan", category: "Financial Services"},
    { name: "Insurance Premium", icon: ShieldCheck, href: "/bills/insurance", category: "Financial Services"},
    { name: "Mutual Funds", icon: Briefcase, href: "/mutual-funds", category: "Financial Services" },
    { name: "Deposits (FD/RD)", icon: Database, href: "/deposits", category: "Financial Services" },
    { name: "Check Credit Score", icon: Gauge, href: "/credit-score", category: "Financial Services" },
    { name: "Personal Loans", icon: Banknote, href: "/loans", category: "Financial Services" },
    { name: "Digital Gold", icon: Coins, href: "/gold", category: "Financial Services" },
    { name: "Zet Mini Bank", icon: Building2, href: "/zet-bank", category: "Financial Services" },
    { name: "SIP Reminders", icon: Clock, href: "/sip-reminders", category: "Financial Services" },
    { name: "Pocket Money", icon: PiggyBank, href: "/pocket-money", category: "Financial Services" }, // Added Pocket Money
];

const entertainmentServices = [
     { name: "Movies & Events", icon: Ticket, href: "/entertainment", category: "Entertainment" },
];

const healthcareServices = [
     { name: "Healthcare & Wellness", icon: HeartPulse, href: "/healthcare", category: "Healthcare" },
];

const hyperlocalServices = [
    { name: "Electrician/Plumber", icon: Wrench, href: "/hyperlocal/repair", category: "Hyperlocal Services" },
    { name: "Home Cleaning", icon: SprayCan, href: "/hyperlocal/cleaning", category: "Hyperlocal Services" },
    { name: "Laundry Pickup", icon: WashingMachine, href: "/hyperlocal/laundry", category: "Hyperlocal Services" },
    { name: "Tailoring Services", icon: Scissors, href: "/hyperlocal/tailor", category: "Hyperlocal Services" },
    { name: "Car Wash", icon: Car, href: "/hyperlocal/carwash", category: "Hyperlocal Services" }, // Use Car icon
    { name: "Courier Service", icon: Package, href: "/hyperlocal/courier", category: "Hyperlocal Services" },
    { name: "Coworking Space", icon: BriefcaseBusiness, href: "/hyperlocal/coworking", category: "Hyperlocal Services" },
    { name: "Pet Services", icon: Dog, href: "/hyperlocal/petcare", category: "Hyperlocal Services" },
    { name: "Salon/Barber", icon: ScissorsLineDashed, href: "/hyperlocal/salon", category: "Hyperlocal Services" },
];

// Utility & Tools Category
const utilityServices = [
   { name: "Secure Vault", icon: FolderLock, href: "/vault", category: "Utilities & Tools" },
   // Add other tools here later if needed
];

const otherServices = [
   // Recharge & Bill Payments (Example subset)
    { name: "Mobile Recharge", icon: Smartphone, href: "/recharge/mobile", category: "Recharge & Bills" },
    { name: "DTH Recharge", icon: Tv, href: "/recharge/dth", category: "Recharge & Bills" },
    { name: "Electricity Bill", icon: Bolt, href: "/bills/electricity", category: "Recharge & Bills" },
    { name: "Credit Card Bill", icon: CreditCard, href: "/bills/credit-card", category: "Recharge & Bills" },
    { name: "Education Fees", icon: GraduationCap, href: "/bills/education", category: "Recharge & Bills" }, // Added Education Fees
    { name: "FASTag Recharge", icon: RadioTower, href: "/recharge/fastag", category: "Recharge & Bills" },
    { name: "Broadband Bill", icon: Wifi, href: "/bills/broadband", category: "Recharge & Bills" },
    { name: "Water Bill", icon: Droplet, href: "/bills/water", category: "Recharge & Bills" },
    { name: "Data Card", icon: HardDrive, href: "/recharge/datacard", category: "Recharge & Bills" },
    { name: "Prepaid Electricity", icon: Power, href: "/recharge/electricity", category: "Recharge & Bills" }, // Note: Duplicate href, maybe differentiate later
    { name: "Intl Calling", icon: PhoneCall, href: "/recharge/isd", category: "Recharge & Bills" },
    { name: "Bus Pass", icon: Ticket, href: "/passes/bus", category: "Recharge & Bills" },

    // Vouchers & More
    { name: "Gift Cards", icon: GiftIcon, href: "/vouchers/giftcards", category: "Vouchers & More" },
    { name: "Gaming Vouchers", icon: Gamepad2, href: "/vouchers/gaming", category: "Vouchers & More" },
    { name: "Digital Vouchers", icon: Mailbox, href: "/vouchers/digital", category: "Vouchers & More" },

    // Other Payments
    { name: "Metro Recharge", icon: TramFront, href: "/recharge/metro", category: "Payments" },
    { name: "Fuel Payment", icon: Fuel, href: "/fuel", category: "Payments" },
    { name: "Parking Payments", icon: ParkingMeter, href: "/parking", category: "Payments" }, // Smart Parking
    { name: "Cab/Taxi Bill Payments", icon: TaxiIcon, href: "/cab", category: "Payments" }, // Cab/Taxi payment integration

];

const groupServicesByCategory = (services: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    // Define order, ensuring all categories are included
    const categoryOrder = ["Recharge & Bills", "Travel", "Temple Services", "Healthcare", "Entertainment", "Hyperlocal Services", "Financial Services", "Utilities & Tools", "Vouchers & More", "Payments"]; // Updated Order

    // Initialize categories from the defined order
    categoryOrder.forEach(cat => { grouped[cat] = []; });

    services.forEach((service) => {
        const category = service.category;
         if (!grouped[category]) {
             console.warn(`Service category "${category}" not found in defined order. Add it to categoryOrder.`);
             grouped[category] = []; // Create if missing (helps catch errors)
         }
         grouped[category].push(service);
    });

     // Filter out empty categories
     const finalGrouped: { [key: string]: any[] } = {};
     for (const cat of categoryOrder) {
         if (grouped[cat] && grouped[cat].length > 0) {
             finalGrouped[cat] = grouped[cat];
         }
     }

    return finalGrouped;
}

export default function AllServicesPage() {
    const allServices = [
        ...templeServices,
        ...travelServices,
        ...financialServices,
        ...entertainmentServices,
        ...healthcareServices,
        ...hyperlocalServices,
        ...utilityServices, // Added utility services
        ...otherServices
    ];
    const groupedServices = groupServicesByCategory(allServices);
    const categories = Object.keys(groupedServices);

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Sparkles className="h-6 w-6" />
                <h1 className="text-lg font-semibold">All Services</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-6 pb-20">
                 {categories.map((category) => {
                     if (groupedServices[category].length === 0) return null; // Skip rendering empty categories
                    return (
                         <Card key={category} className="shadow-md">
                            <CardHeader>
                                <CardTitle>{category}</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-6 text-center">
                                {groupedServices[category].map((service: any) => (
                                     <Link key={service.name} href={service.href} passHref legacyBehavior>
                                        <a className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity">
                                            <div className="bg-primary/10 text-primary p-3 rounded-full">
                                                <service.icon className="h-6 w-6" />
                                            </div>
                                            <span className="text-xs font-medium text-foreground">{service.name}</span>
                                        </a>
                                    </Link>
                                ))}
                            </CardContent>
                        </Card>
                     )
                 })}
            </main>
        </div>
    );
}
