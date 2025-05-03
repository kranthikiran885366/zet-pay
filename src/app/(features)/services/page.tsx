'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
// Assuming these functions exist - removed unused imports
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge"; // Import Badge component
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
  Taxi as TaxiIcon,
  MoreHorizontal, // Keep one import
   PhoneCall,
    Plane,
    ShoppingBag,
    Gift as GiftIcon, //Alias Gift to avoid conflict
    Home, // Added Temple icon (using Home as placeholder)
    Car,
    Motorcycle,
} from "lucide-react"; // Added specific icons
import Image from 'next/image';
import { useEffect, useState } from 'react'; // Import useEffect and useState

const templeServices = [
  { name: "Book Darshan Slot", icon: CalendarCheck, href: "/temple/darshan", category: "Booking" },
  { name: "Live Darshan", icon: Video, href: "/temple/live", category: "Experience" },
  { name: "Virtual Pooja", icon: Sparkles, href: "/temple/pooja", category: "Experience" },
  { name: "Order Prasadam", icon: ShoppingBasket, href: "/temple/prasadam", category: "Booking" },
  { name: "Donate to Temple", icon: HeartHandshake, href: "/temple/donate", category: "Support" },
  { name: "Temple Timings & Queue", icon: Clock, href: "/temple/info", category: "Info" },
  { name: "Aarti & Mantras", icon: Music, href: "/temple/audio", category: "Experience" },
  { name: "Book Events/Yatra", icon: Map, href: "/temple/events", category: "Booking" },
  { name: "Nearby Accommodation", icon: Hotel, href: "/temple/accommodation", category: "Info" },
  { name: "Group Visit Booking", icon: Users, href: "/temple/group", category: "Booking" },
  { name: "Smart Access Pass", icon: QrCode, href: "/temple/access", category: "Booking" },
];

const travelServices = [
    { name: "Car Rentals", icon: Car, href: "/travels/car", category: "Travel" },
    { name: "Bike Rentals", icon: Motorcycle, href: "/travels/bike", category: "Travel" },
    { name: "Book Bus Tickets", icon: Bus, href: "/travels/bus", category: "Travel"},
    { name: "Book Flight Tickets", icon: Plane, href: "/travels/flight", category: "Travel"},
    { name: "Book Train Tickets", icon: Train, href: "/travels/train", category: "Travel"},
];


const groupServicesByCategory = (services: any) => {
    const grouped: { [key: string]: any } = {};
    const categoryOrder = ["Transfers & Payments", "Recharge & Bill Payments", "Tickets & Travel", "Services", "Travel"]; // Define order

    categoryOrder.forEach(cat => { grouped[cat] = []; });

    services.forEach((service: any) => {
        const category = service.category;
        if (!grouped[category]) {
            grouped[category] = []; // Fallback if category not in order list
        }
        grouped[category].push(service);
    });

    return grouped;
}

export default function TempleServicesPage() {
    const [selectedTemple, setSelectedTemple] = useState<string>('');
    const allServices = [...templeServices, ...travelServices];
    const groupedServices = groupServicesByCategory(allServices);
    const categories = Object.keys(groupedServices);
//     const categories = {
//   "Transfers & Payments": [
//     "Send to Contact",
//     "Send to Bank",
//     "Request Money",
//     "Check Balance",
//     "Scan QR Code",
//     "UPI",
//     "Linked Accounts"
//   ],
//   "Recharge & Bill Payments": [
//     "Mobile",
//     "DTH",
//     "Electricity",
//     "Credit Card",
//     "FASTag"
//   ],
//   "Tickets & Travel": [
//     "Movies",
//     "Bus",
//     "Train"
//   ],
//   "Services": [
//     "Help & Support",
//     "Offers"
//   ]
// };
    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/services" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                {/* Using Home icon as placeholder for Temple */}
                <Sparkles className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Services</h1>
            </header>
            {/* Main Content */}
            <main className="flex-grow p-4 space-y-6 pb-20">
                {categories.map((category) => (
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
                ))}
            </main>
        </div>
    );
}

