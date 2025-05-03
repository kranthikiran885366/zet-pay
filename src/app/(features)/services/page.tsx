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
  CarTaxiFront as TaxiIcon, // Corrected icon import
  PhoneCall,
  Plane,
  ShoppingBag,
  Gift as GiftIcon, //Alias Gift to avoid conflict
  Home, // Added Temple icon (using Home as placeholder)
  Car,
  Bike as Motorbike, // Corrected icon name
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
];

const otherServices = [
   // Recharge & Bill Payments (Example subset)
    { name: "Mobile Recharge", icon: Smartphone, href: "/recharge/mobile", category: "Recharge & Bills" },
    { name: "DTH Recharge", icon: Tv, href: "/recharge/dth", category: "Recharge & Bills" },
    { name: "Electricity Bill", icon: Bolt, href: "/bills/electricity", category: "Recharge & Bills" },
    { name: "Credit Card Bill", icon: CreditCard, href: "/bills/credit-card", category: "Recharge & Bills" },
    { name: "FASTag Recharge", icon: RadioTower, href: "/recharge/fastag", category: "Recharge & Bills" },
    { name: "Broadband Bill", icon: Wifi, href: "/bills/broadband", category: "Recharge & Bills" },

    // Tickets
    { name: "Movie Tickets", icon: Clapperboard, href: "/movies", category: "Tickets" },
    // Bus, Train, Flight moved to Travel

    // Vouchers & More
    { name: "Gift Cards", icon: GiftIcon, href: "/vouchers/giftcards", category: "Vouchers & More" },
    { name: "Gaming Vouchers", icon: Gamepad2, href: "/vouchers/gaming", category: "Vouchers & More" },
    { name: "Digital Vouchers", icon: Mailbox, href: "/vouchers/digital", category: "Vouchers & More" },

    // Financial Services (Placeholder)
    { name: "Pay Loan EMI", icon: Landmark, href: "/bills/loan", category: "Financial Services"},
    { name: "Insurance Premium", icon: ShieldCheck, href: "/bills/insurance", category: "Financial Services"},

    // Other Payments
    { name: "Metro Recharge", icon: TramFront, href: "/recharge/metro", category: "Payments" },
    { name: "Fuel Payment", icon: Fuel, href: "/fuel", category: "Payments" },
    { name: "Parking Payments", icon: ParkingMeter, href: "/parking", category: "Payments" }, // Smart Parking
    { name: "Cab/Taxi Bill Payments", icon: TaxiIcon, href: "/cab", category: "Payments" }, // Cab/Taxi payment integration
    { name: "Data Card", icon: HardDrive, href: "/recharge/datacard", category: "Payments" },
    { name: "Prepaid Electricity", icon: Power, href: "/recharge/electricity", category: "Payments" },
    { name: "Intl Calling", icon: PhoneCall, href: "/recharge/isd", category: "Payments" },
    { name: "Bus Pass", icon: Ticket, href: "/passes/bus", category: "Payments" },

];


const groupServicesByCategory = (services: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    const categoryOrder = ["Recharge & Bills", "Travel", "Tickets", "Temple Services", "Vouchers & More", "Financial Services", "Payments"]; // Define order

    // Initialize categories
    categoryOrder.forEach(cat => { grouped[cat] = []; });
     grouped["Other"] = []; // Catch-all for unlisted categories

    services.forEach((service) => {
        const category = service.category;
        if (grouped[category]) {
            grouped[category].push(service);
        } else {
             console.warn(`Service category "${category}" not found in defined order. Adding to "Other".`);
             grouped["Other"].push(service);
        }
    });

     // Filter out empty categories except "Other" if it's also empty
     const finalGrouped: { [key: string]: any[] } = {};
     for (const cat of categoryOrder) {
         if (grouped[cat].length > 0) {
             finalGrouped[cat] = grouped[cat];
         }
     }
     if (grouped["Other"].length > 0) {
        finalGrouped["Other"] = grouped["Other"];
     }


    return finalGrouped;
}


export default function AllServicesPage() {
    const allServices = [...templeServices, ...travelServices, ...otherServices];
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
