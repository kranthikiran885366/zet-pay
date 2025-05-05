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
    Package, // Courier
    BriefcaseBusiness, // Coworking
    Dog, // Pet Grooming/Vet
    ScissorsLineDashed, // Barber/Salon
    MoreHorizontal, // Added MoreHorizontal back
    FolderLock, // Secure Vault
    GraduationCap, // Education Fees
    PiggyBank, // Pocket Money
    IndianRupee, // Cash Withdrawal / General Currency
    TrendingUp, // Stocks
    BookUser, // Mobile Postpaid / User related bills
    Receipt, // Challan / Receipts
    WandSparkles, // AI Assistant
    Heart, // General Donations
    Flame, // LPG
    Building, // Housing Society
    LucideIcon, // Generic placeholder if needed
    Tv2, // Added Tv2 icon
    Stethoscope, // Doctor Appointments
    BedDouble, // Hospital Beds
    FlaskConical, // Lab Tests
    Dumbbell, // Fitness Trainer
    Pill, // Pharmacy
    Ambulance, // Emergency Ambulance
    Repeat, // Medicine Subscription
    BadgePercent, // Health Offers
    BedSingle, // Added BedSingle icon
    Play, // Added Play icon
    BellRing, // Added BellRing icon
    Target, // Added Target icon
    Wallet, // Added Wallet icon
    Drama, // Import Drama icon
} from "lucide-react"; // Added specific icons
import Image from 'next/image';
import { useState } from 'react'; // Import useState

// --- Define Service Data (Organized by Planned Categories) ---

const rechargeBillPayServices = [
   { name: "Mobile Recharge", icon: Smartphone, href: "/recharge/mobile", category: "Recharge & Bills" },
   { name: "Mobile Postpaid", icon: BookUser, href: "/bills/mobile-postpaid", category: "Recharge & Bills"},
   { name: "DTH Recharge", icon: Tv, href: "/recharge/dth", category: "Recharge & Bills" },
   { name: "Electricity Bill", icon: Bolt, href: "/bills/electricity", category: "Recharge & Bills" },
   { name: "Rent Payment", icon: Home, href: "/rent-payment", category: "Recharge & Bills" },
   { name: "LPG Cylinder", icon: Flame, href: "/lpg-booking", category: "Recharge & Bills" },
   { name: "Broadband Bill", icon: Wifi, href: "/bills/broadband", category: "Recharge & Bills" },
   { name: "Water Bill", icon: Droplet, href: "/bills/water", category: "Recharge & Bills" },
   { name: "Piped Gas", icon: Bolt, href: "/bills/gas", category: "Recharge & Bills" },
   { name: "Cable TV", icon: Tv2, href: "/cable-tv", category: "Recharge & Bills" },
   { name: "Data Card", icon: HardDrive, href: "/recharge/datacard", category: "Recharge & Bills" },
   { name: "Prepaid Electricity", icon: Power, href: "/recharge/electricity", category: "Recharge & Bills" }, // Maybe link to electricity?
];

const loanRepaymentServices = [
    { name: "Pay Loan EMI", icon: Landmark, href: "/bills/loan", category: "Loan Repayment"},
    { name: "Credit Card Bill", icon: CreditCard, href: "/bills/credit-card", category: "Loan Repayment" },
];

const financialServices = [
    { name: "Insurance Premium", icon: ShieldCheck, href: "/insurance/life", category: "Financial Services"}, // Link to generic or specific type
    { name: "Mutual Funds", icon: Briefcase, href: "/mutual-funds", category: "Financial Services" },
    { name: "Stock Market", icon: TrendingUp, href: "/stocks", category: "Financial Services"}, // Link to stocks page
    { name: "Digital Gold", icon: Coins, href: "/gold", category: "Financial Services" },
    { name: "Deposits (FD/RD)", icon: Database, href: "/deposits", category: "Financial Services" },
    { name: "Check Credit Score", icon: Gauge, href: "/credit-score", category: "Financial Services" },
    { name: "Personal Loans", icon: Banknote, href: "/loans", category: "Financial Services" },
    { name: "Zet Mini Bank", icon: Building2, href: "/zet-bank", category: "Financial Services" }, // Link to Zet Bank page
    { name: "Pay Later", icon: Wallet, href: "/bnpl", category: "Financial Services" }, // Added Pay Later link
];

const travelServices = [
    { name: "Travel Assistant", icon: WandSparkles, href: "/travels/assistant", category: "Travel" }, // Link to Travel Assistant
    { name: "Flights", icon: Plane, href: "/travels/flight", category: "Travel"},
    { name: "Buses", icon: Bus, href: "/travels/bus", category: "Travel"},
    { name: "Trains", icon: Train, href: "/travels/train", category: "Travel"},
    { name: "Hotels", icon: Hotel, href: "/hostels", category: "Travel"}, // Link to hostels page for now
    { name: "Hostels", icon: BedSingle, href: "/hostels", category: "Travel"},
    { name: "Cab Booking", icon: TaxiIcon, href: "/cab", category: "Travel"},
    { name: "Car Rentals", icon: Car, href: "/travels/car", category: "Travel" },
    { name: "Bike Rentals", icon: Motorbike, href: "/travels/bike", category: "Travel" },
    { name: "Metro Recharge", icon: TramFront, href: "/recharge/metro", category: "Travel" },
    { name: "EV Charging", icon: Zap, href: "/travels/ev-charging", category: "Travel" }, // Link to EV Charging page
    { name: "Rest Stop Info", icon: Store, href: "/travels/rest-stop", category: "Travel" }, // Link to Rest Stop page
];

const transitTollServices = [
    { name: "FASTag Recharge", icon: RadioTower, href: "/recharge/fastag", category: "Transit & Toll" },
    { name: "Traffic Challan", icon: Receipt, href: "/challan", category: "Transit & Toll"},
    { name: "Parking Payments", icon: ParkingMeter, href: "/parking", category: "Transit & Toll" }, // Smart Parking
];

const foodAndShoppingServices = [
    { name: "Order Food", icon: UtensilsCrossed, href: "/food", category: "Food & Shopping"},
    { name: "Shop Groceries", icon: ShoppingBasket, href: "/", category: "Food & Shopping"}, // Link to grocery page
];

const entertainmentServices = [
     { name: "Movies", icon: Clapperboard, href: "/movies", category: "Entertainment & Gaming" },
     { name: "Events", icon: Ticket, href: "/entertainment/events", category: "Entertainment & Gaming" },
     { name: "Sports Tickets", icon: Gamepad2, href: "/entertainment/sports", category: "Entertainment & Gaming" },
     { name: "Comedy Shows", icon: Drama, href: "/entertainment/comedy", category: "Entertainment & Gaming" }, // Using Drama icon
     { name: "OTT Subscriptions", icon: Tv2, href: "/bills/subscription", category: "Entertainment & Gaming" },
     { name: "Gaming Vouchers", icon: Gamepad2, href: "/vouchers/gaming", category: "Entertainment & Gaming" },
     { name: "Play Store Recharge", icon: Play, href: "/vouchers/digital", category: "Entertainment & Gaming" }, // Using Play Store
     { name: "Game Zones", icon: Zap, href: "/entertainment/gamezone", category: "Entertainment & Gaming" }, // Link to Game Zone page
     { name: "AR/VR Events", icon: Sparkles, href: "/entertainment/arvr", category: "Entertainment & Gaming" },
     { name: "Group Booking", icon: Users, href: "/entertainment/group", category: "Entertainment & Gaming" },
     { name: "Event Reminders", icon: BellRing, href: "/reminders?category=Event", category: "Entertainment & Gaming" }, // Link to reminders with filter
     { name: "Discover Events", icon: MapPin, href: "/entertainment/discover", category: "Entertainment & Gaming" },
     { name: "Watch Party", icon: Users, href: "/entertainment/watchparty", category: "Entertainment & Gaming" },
];

const templeServices = [
  { name: "Book Darshan Slot", icon: CalendarCheck, href: "/temple/darshan", category: "Temple Services" },
  { name: "Live Darshan", icon: Video, href: "/temple/live", category: "Temple Services" },
  { name: "Virtual Pooja", icon: Sparkles, href: "/temple/pooja", category: "Temple Services" },
  { name: "Order Prasadam", icon: ShoppingBasket, href: "/temple/prasadam", category: "Temple Services" },
  { name: "Donate to Temple", icon: HeartHandshake, href: "/temple/donate", category: "Temple Services" },
  { name: "Temple Timings & Queue", icon: Clock, href: "/temple/info", category: "Temple Services" },
  { name: "Aarti & Mantras", icon: Music, href: "/temple/audio", category: "Temple Services" }, // Combine Info & Audio
  { name: "Book Events/Yatra", icon: Map, href: "/temple/events", category: "Temple Services" },
  { name: "Nearby Accommodation", icon: Hotel, href: "/temple/accommodation", category: "Temple Services" },
  { name: "Group Visit Booking", icon: Users, href: "/temple/group", category: "Temple Services" },
  { name: "Smart Access Pass", icon: QrCode, href: "/temple/access", category: "Temple Services" },
];

const hyperlocalServices = [
    { name: "Electrician/Plumber", icon: Wrench, href: "/hyperlocal/repair", category: "Hyperlocal Services" },
    { name: "Home Cleaning", icon: SprayCan, href: "/hyperlocal/cleaning", category: "Hyperlocal Services" },
    { name: "Laundry", icon: WashingMachine, href: "/hyperlocal/laundry", category: "Hyperlocal Services" },
    { name: "Tailoring", icon: Scissors, href: "/hyperlocal/tailor", category: "Hyperlocal Services" },
    { name: "Car Wash", icon: Car, href: "/hyperlocal/carwash", category: "Hyperlocal Services" }, // Using Car icon
    { name: "Courier", icon: Package, href: "/hyperlocal/courier", category: "Hyperlocal Services" },
    { name: "Coworking Space", icon: BriefcaseBusiness, href: "/hyperlocal/coworking", category: "Hyperlocal Services" },
    { name: "Pet Services", icon: Dog, href: "/hyperlocal/petcare", category: "Hyperlocal Services" },
    { name: "Salon/Barber", icon: ScissorsLineDashed, href: "/hyperlocal/salon", category: "Hyperlocal Services" },
];

const municipalServices = [
    { name: "Property Tax", icon: Home, href: "/property-tax", category: "Municipal Services" },
    { name: "Housing Society", icon: Building, href: "/housing-society", category: "Municipal Services" },
    { name: "Municipal Services", icon: Building2, href: "/municipal-services", category: "Municipal Services"}, // Generic placeholder if needed
];

const utilityToolsServices = [
   { name: "Education Fees", icon: GraduationCap, href: "/bills/education", category: "Utilities & Tools" },
   { name: "Club Fees", icon: HeartHandshake, href: "/club-fees", category: "Utilities & Tools" }, // Used HeartHandshake as substitute for HandCoins
   { name: "General Donations", icon: Heart, href: "/donations/general", category: "Utilities & Tools" },
   { name: "Secure Vault", icon: FolderLock, href: "/vault", category: "Utilities & Tools" },
   { name: "Pocket Money", icon: PiggyBank, href: "/pocket-money", category: "Utilities & Tools" },
   { name: "SIP Reminders", icon: Clock, href: "/sip-reminders", category: "Utilities & Tools" }, // Added SIP Reminders
   { name: "Bill Reminders", icon: BellRing, href: "/reminders", category: "Utilities & Tools" }, // Add Bill Reminders
];

const vouchersMoreServices = [
    { name: "Gift Cards", icon: GiftIcon, href: "/vouchers/giftcards", category: "Vouchers & More" },
    { name: "Intl Calling Cards", icon: PhoneCall, href: "/recharge/isd", category: "Vouchers & More" },
    // { name: "App Store Code", icon: Apple, href: "/vouchers/digital", category: "Vouchers & More"}, // Merged with Gaming/Play Store
    { name: "Digital Vouchers", icon: Mailbox, href: "/vouchers/digital", category: "Vouchers & More" }, // Generic placeholder if needed
];

const paymentsServices = [
    { name: "Fuel Payment", icon: Fuel, href: "/fuel", category: "Payments" },
    { name: "Cash Withdrawal", icon: IndianRupee, href: "/cash-withdrawal", category: "Payments" },
    { name: "Cab Bill Payment", icon: TaxiIcon, href: "/cab", category: "Payments" }, // Cab/Taxi payment integration
];

const healthcareServices = [
    { name: "Doctor Appointments", icon: Stethoscope, href: "/healthcare/doctor", category: "Healthcare & Wellness" },
    { name: "Video Consultation", icon: Video, href: "/healthcare/video-consult", category: "Healthcare & Wellness" },
    { name: "Lab Tests", icon: FlaskConical, href: "/healthcare/lab", category: "Healthcare & Wellness" },
    { name: "Order Medicines", icon: Pill, href: "/healthcare/pharmacy", category: "Healthcare & Wellness" },
    { name: "Medicine Subscription", icon: Repeat, href: "/healthcare/med-subscription", category: "Healthcare & Wellness" },
    { name: "Hospital Beds/OPD", icon: BedDouble, href: "/healthcare/hospital", category: "Healthcare & Wellness" },
    { name: "Emergency Ambulance", icon: Ambulance, href: "/healthcare/ambulance", category: "Emergency" },
    { name: "Fitness Trainers", icon: Dumbbell, href: "/healthcare/fitness", category: "Wellness" },
    { name: "Health Wallet", icon: FolderLock, href: "/healthcare/wallet", category: "Records" },
    { name: "Health Packages", icon: BadgePercent, href: "/healthcare/offers", category: "Offers" },
];

const aiAndToolsServices = [
     { name: "Ask PayFriend", icon: WandSparkles, href: "/conversation", category: "AI & Tools"}, // Conversational AI
     { name: "Spending Analysis", icon: TrendingUp, href: "/analysis", category: "AI & Tools"}, // Spending Analysis
     { name: "Savings Goals", icon: Target, href: "/goals", category: "AI & Tools"}, // Goal-based planning
];

// --- Combine All Services ---
const allServices = [
    ...rechargeBillPayServices,
    ...paymentsServices, // Moved Payments higher
    ...travelServices,
    ...foodAndShoppingServices,
    ...entertainmentServices,
    ...healthcareServices, // Moved Healthcare higher
    ...hyperlocalServices,
    ...templeServices,
    ...transitTollServices,
    ...financialServices,
    ...loanRepaymentServices,
    ...municipalServices,
    ...utilityToolsServices,
    ...vouchersMoreServices,
    ...aiAndToolsServices,
];


const groupServicesByCategory = (services: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    // Define NEW category order reflecting broader scope
    const categoryOrder = [
        "Recharge & Bills",
        "Payments", // Group pure payment actions
        "Travel",
        "Food & Shopping",
        "Entertainment & Gaming",
        "Healthcare & Wellness",
        "Hyperlocal Services",
        "Temple Services",
        "Transit & Toll",
        "Financial Services",
        "Loan Repayment", // Moved lower maybe?
        "Municipal Services",
        "AI & Tools", // Added AI & Tools category
        "Utilities & Tools",
        "Vouchers & More",
        // Categories below might be empty depending on final service assignments
        "Emergency",
        "Wellness",
        "Records",
        "Offers",


        // Add more categories as needed
    ];

    // Initialize categories from the defined order
    categoryOrder.forEach(cat => { grouped[cat] = []; });

    services.forEach((service) => {
        const category = service.category;
         if (!grouped[category]) {
             console.warn(`Service category "${category}" not found in defined order. Adding it dynamically.`);
             grouped[category] = []; // Create if missing
         }
         grouped[category].push(service);
    });

     // Filter out empty categories that were initialized but had no services assigned
     const finalGrouped: { [key: string]: any[] } = {};
     for (const cat of categoryOrder) {
         if (grouped[cat] && grouped[cat].length > 0) {
             finalGrouped[cat] = grouped[cat];
         }
      }
      // Add any dynamically created categories (those not in categoryOrder) at the end
      for (const cat in grouped) {
         if (!finalGrouped[cat] && grouped[cat].length > 0) {
              finalGrouped[cat] = grouped[cat];
         }
      }

    return finalGrouped;
}

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
