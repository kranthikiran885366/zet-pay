
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { BankAccount, linkBankAccount /*, getLinkedAccounts, removeUpiId, setDefaultAccount */ } from '@/services/upi'; // Assuming these functions exist
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
  ParkingMeter, // Replaced Parking with ParkingMeter
  Fuel, // Replaced GasPump with Fuel
  Taxi,
  MoreHorizontal, // Keep one import
   PhoneCall,
    Plane,
    ShoppingBag,
    Gift as GiftIcon, //Alias Gift to avoid conflict

} from "lucide-react"; // Added specific icons
import Image from 'next/image';
import { useEffect, useState } from 'react'; // Import useEffect and useState


// Expanded list of services - add more as needed
const allServices = [
  // Recharge
  { name: "Mobile", icon: Smartphone, href: "/recharge/mobile", category: "Recharge" },
  { name: "DTH", icon: Tv, href: "/recharge/dth", category: "Recharge" },
  { name: "FASTag", icon: RadioTower, href: "/recharge/fastag", category: "Recharge" },
  { name: "Data Card", icon: HardDrive, href: "/recharge/datacard", category: "Recharge" },
  { name: "Prepaid Electricity", icon: Power, href: "/recharge/electricity", category: "Recharge" },
  { name: "Metro Card", icon: TramFront, href: "/recharge/metro", category: "Recharge" }, // Public Transit under Recharge
  { name: "Loan Repayment", icon: LifeBuoy, href: "/bills/loan", category: "Recharge" },
  { name: "Intl. Calling Cards", icon: PhoneCall, href: "/recharge/isd", category: "Recharge" },
  // Bill Payments
  { name: "Electricity", icon: Bolt, href: "/bills/electricity", category: "Bill Payments" },
  { name: "Credit Card Bill", icon: CreditCard, href: "/bills/credit-card", category: "Bill Payments" },
  { name: "Water", icon: Droplet, href: "/bills/water", category: "Bill Payments" },
  { name: "Insurance", icon: ShieldCheck, href: "/bills/insurance", category: "Bill Payments" },
  { name: "Broadband/Landline", icon: Wifi, href: "/bills/broadband", category: "Bill Payments" },
  { name: "Piped Gas", icon: Fuel, href: "/bills/gas", category: "Bill Payments" }, // Changed Icon
  { name: "Subscription Services", icon: Tv, href: "/bills/subscription", category: "Bill Payments" },
  // Travel & Tickets
  { name: "Bus Pass", icon: Ticket, href: "/passes/bus", category: "Tickets & Travel" }, // Moved category
  { name: "Bus Tickets", icon: Bus, href: "/travels/bus", category: "Tickets & Travel" }, // Moved category
  { name: "Train Tickets", icon: Train, href: "/travels/train", category: "Tickets & Travel" }, // Moved category
  { name: "Flight Tickets", icon: Plane, href: "/travels/flight", category: "Tickets & Travel" }, // Moved category
  { name: "Movie Tickets", icon: Clapperboard, href: "/movies", category: "Tickets & Travel" }, // Moved category
  // Live Tracking
  { name: "Live Bus Tracking", icon: MapPin, href: "/live/bus", category: "Live Tracking" },
  { name: "Live Train Status", icon: MapPin, href: "/live/train", category: "Live Tracking" },
  // Payments
  { name: "Order Food", icon: UtensilsCrossed, href: "/food", category: "Payments" },
  { name: "FASTag Issuance", icon: RadioTower, href: "/fastag/issuance", category: "Payments" }, // Separate issuance?
  { name: "Fuel Payments", icon: Fuel, href: "/fuel", category: "Payments" }, // Can assume payment flow
  { name: "Parking Payments", icon: ParkingMeter, href: "/parking", category: "Payments" }, // Smart Parking - Changed Icon
  { name: "Cab/Taxi Bill Payments", icon: Taxi, href: "/cab", category: "Payments" }, // Cab/Taxi payment integration
  // Vouchers & More
   { name: "Gift Cards", icon: GiftIcon, href: "/vouchers/giftcards", category: "Vouchers & More" },
   { name: "Digital Vouchers", icon: Mailbox, href: "/vouchers/digital", category: "Vouchers & More" },
   { name: "Gaming Cards", icon: Gamepad2, href: "/vouchers/gaming", category: "Vouchers & More" },
   // Others
   { name: "See All", icon: MoreHorizontal, href: "/services", category: "Others" },
];

const groupServicesByCategory = (services: typeof allServices) => {
    const grouped: { [key: string]: typeof allServices } = {};
    services.forEach(service => {
        if (!grouped[service.category]) {
            grouped[service.category] = [];
        }
        // Avoid duplicates if 'See All' is listed multiple times
        if (service.name !== 'See All' || !grouped[service.category].some(s => s.name === 'See All')) {
           grouped[service.category].push(service);
        }
    });
    // Ensure 'Others' category is last if it exists
    if (grouped['Others']) {
        const others = grouped['Others'];
        delete grouped['Others'];
        grouped['Others'] = others;
    }
    return grouped;
};

export default function AllServicesPage() {
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
                <Settings className="h-6 w-6" /> {/* Using Settings icon as a generic 'services' icon */}
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
                            {groupedServices[category].map((service) => (
                                <Link key={service.name} href={service.href} passHref>
                                    <div className="flex flex-col items-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity">
                                        <div className="bg-primary/10 text-primary p-3 rounded-full">
                                            <service.icon className="h-6 w-6" />
                                        </div>
                                        <span className="text-xs font-medium text-foreground">{service.name}</span>
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
