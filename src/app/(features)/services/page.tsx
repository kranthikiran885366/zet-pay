'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Landmark, PlusCircle, Trash2, CheckCircle, Copy, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { BankAccount, linkBankAccount /*, getLinkedAccounts, removeUpiId, setDefaultAccount */ } from '@/services/upi'; // Assuming these functions exist
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge"; // Import Badge component
import {
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
  MoreHorizontal,
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
    Parking,
    GasPump,
    Taxi,
  MoreHorizontal,
} from "lucide-react"; // Added specific icons
import Image from 'next/image';
import { useEffect, useState } from 'react'; // Import useEffect and useState

// Define Parking, GasPump, Taxi for icon usage
declare module 'lucide-react' {
  const Parking: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>>;
  const GasPump: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>>;
	const Taxi: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>>;
}

// Expanded list of services - add more as needed
const allServices = [
  // Recharge
  { name: "Mobile Recharge", icon: Smartphone, href: "/recharge/mobile", category: "Recharge" },
  { name: "DTH", icon: Tv, href: "/recharge/dth", category: "Recharge" },
  { name: "FASTag Recharge", icon: RadioTower, href: "/recharge/fastag", category: "Recharge" },
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
  { name: "Piped Gas", icon: Tag, href: "/bills/gas", category: "Bill Payments" },
  { name: "Subscription Services", icon: Tv, href: "/bills/subscription", category: "Bill Payments" },
  // Travel
  { name: "Bus Pass", icon: Ticket, href: "/passes/bus", category: "Travel" },
  { name: "Bus Tickets", icon: Bus, href: "/travels/bus", category: "Travel" },
  { name: "Train Tickets", icon: Train, href: "/travels/train", category: "Travel" },
  { name: "Flight Tickets", icon: Plane, href: "/travels/flight", category: "Travel" },
   // Tickets & Travel - Corrected and Added New
  { name: "Movie Tickets", icon: Clapperboard, href: "/movies", category: "Tickets & Travel" },
  // Payments
  { name: "FASTag Recharge & Issuance", icon: RadioTower, href: "/fastag", category: "Payments" }, // Combined, can reuse icon
    { name: "Fuel Payments", icon: GasPump, href: "/fuel", category: "Payments" }, // Can assume payment flow
    { name: "Parking Payments", icon: Parking, href: "/parking", category: "Payments" }, // Smart Parking
    { name: "Cab/Taxi Bill Payments", icon: Taxi, href: "/cab", category: "Payments" }, // Cab/Taxi payment integration

  // Live Tracking
  { name: "Live Bus Tracking", icon: MapPin, href: "/live/bus", category: "Live Tracking" },
  { name: "Live Train Tracking", icon: MapPin, href: "/live/train", category: "Live Tracking" }, // Reuse icon

   // Vouchers & More
   { name: "Gaming Cards", icon: Gamepad2, href: "/vouchers/gaming", category: "Vouchers & More" },
   { name: "Gift Cards", icon: GiftIcon, href: "/vouchers/giftcards", category: "Vouchers & More" },
   { name: "Digital Vouchers", icon: Mailbox, href: "/vouchers/digital", category: "Vouchers & More" },
  // Others
  { name: "See All", icon: MoreHorizontal, href: "/services", category: "Others" },
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
