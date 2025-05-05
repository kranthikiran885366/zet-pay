'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import {
  ArrowLeft, Landmark, PlusCircle, Trash2, CheckCircle, Copy, Loader2, Smartphone, Tv, Bolt, Droplet, ShieldCheck, RadioTower, Banknote, Tag, LifeBuoy, Wifi, FileText, Bus, Ticket, Clapperboard, TramFront, Train, MapPin, UtensilsCrossed, Gamepad2, HardDrive, Power, Mailbox, CreditCard, Settings, Info, History, ParkingMeter, Fuel, CarTaxiFront as TaxiIcon, PhoneCall, Plane, ShoppingBag, Gift as GiftIcon, Home as HomeIcon, Car, Bike as Motorbike, CalendarCheck, Video, Sparkles, ShoppingBasket, HeartHandshake, Music, Map, Hotel, Users, QrCode, Clock, Briefcase, Database, Gauge, Coins, Building2, Zap, Siren, Store, HeartPulse, Wrench, SprayCan, WashingMachine, Scissors, Package, BriefcaseBusiness, Dog, ScissorsLineDashed, MoreHorizontal, FolderLock, GraduationCap, PiggyBank, IndianRupee, TrendingUp, BookUser, Receipt, WandSparkles, Heart, Flame, Building, HandCoins,
  // New Icons needed for additional services
  Home, // For Rent Payment, Property Tax, Housing Society
  BookOpen, // For Education Fees (already used for Mobile Postpaid, can reuse or find alternative)
  Building as MunicipalIcon, // Placeholder for Municipal Services
  Car as RentVehicleIcon, // Placeholder for Rent Vehicle
  Play, // Placeholder for Google Play
  Apple, // Placeholder for App Store
  BedSingle // For Hostel Booking
} from "lucide-react"; // Added specific icons
import Image from 'next/image';
import { useState } from 'react'; // Import useState

const templeServices = [
  { name: "Book Darshan Slot", icon: CalendarCheck, href: "/temple/darshan", category: "Temple Services" },
  { name: "Live Darshan", icon: Video, href: "/temple/live", category: "Temple Services" },
  { name: "Virtual Pooja", icon: Sparkles, href: "/temple/pooja", category: "Temple Services" },
  { name: "Order Prasadam", icon: ShoppingBasket, href: "/temple/prasadam", category: "Temple Services" },
  { name: "Temple Donations", icon: HeartHandshake, href: "/temple/donate", category: "Temple Services" },
  { name: "Temple Timings & Queue", icon: Clock, href: "/temple/info", category: "Temple Services" },
  { name: "Aarti & Mantras", icon: Music, href: "/temple/audio", category: "Temple Services" },
  { name: "Book Events/Yatra", icon: Map, href: "/temple/events", category: "Temple Services" },
  { name: "Nearby Accommodation", icon: Hotel, href: "/temple/accommodation", category: "Temple Services" },
  { name: "Group Visit Booking", icon: Users, href: "/temple/group", category: "Temple Services" },
  { name: "Smart Access Pass", icon: QrCode, href: "/temple/access", category: "Temple Services" },
];

const travelServices = [
    { name: "Travel Assistant", icon: WandSparkles, href: "/travels/assistant", category: "Travel" },
    { name: "Flights", icon: Plane, href: "/travels/flight", category: "Travel"},
    { name: "Buses", icon: Bus, href: "/travels/bus", category: "Travel"},
    { name: "Trains", icon: Train, href: "/travels/train", category: "Travel"},
    { name: "Hotels", icon: Hotel, href: "/hostels", category: "Travel"}, // Renamed for clarity
    { name: "Hostels", icon: BedSingle, href: "/hostels", category: "Travel"}, // Added Hostels
    { name: "Car Rentals", icon: Car, href: "/travels/car", category: "Travel" },
    { name: "Bike Rentals", icon: Motorbike, href: "/travels/bike", category: "Travel" },
    { name: "Cab Booking", icon: TaxiIcon, href: "/cab", category: "Travel"}, // Moved Cab Booking
    { name: "Metro Recharge", icon: TramFront, href: "/recharge/metro", category: "Travel" }, // Moved Metro
    { name: "EV Charging", icon: Zap, href: "/travels/ev-charging", category: "Travel" },
    { name: "Rest Stop Info", icon: Store, href: "/travels/rest-stop", category: "Travel" },
    { name: "Emergency Assist", icon: Siren, href: "/travels/assistance", category: "Travel" },
    { name: "Live Bus Tracking", icon: Bus, href: "/live/bus", category: "Travel"},
    { name: "Live Train Tracking", icon: Train, href: "/live/train", category: "Travel"},
];

const financialServices = [
    { name: "Pay Loan EMI", icon: Landmark, href: "/bills/loan", category: "Financial Services"},
    { name: "Credit Card Bill", icon: CreditCard, href: "/bills/credit-card", category: "Financial Services" },
    { name: "Insurance Premium", icon: ShieldCheck, href: "/insurance/life", category: "Financial Services"}, // Link to generic or specific type
    { name: "Mutual Funds", icon: Briefcase, href: "/mutual-funds", category: "Financial Services" },
    { name: "Stock Market", icon: TrendingUp, href: "/stocks", category: "Financial Services"},
    { name: "Digital Gold", icon: Coins, href: "/gold", category: "Financial Services" },
    { name: "Deposits (FD/RD)", icon: Database, href: "/deposits", category: "Financial Services" },
    { name: "Check Credit Score", icon: Gauge, href: "/credit-score", category: "Financial Services" },
    { name: "Personal Loans", icon: Banknote, href: "/loans", category: "Financial Services" },
    { name: "Pocket Money", icon: PiggyBank, href: "/pocket-money", category: "Financial Services" },
    { name: "Zet Mini Bank", icon: Building2, href: "/zet-bank", category: "Financial Services" },
    { name: "SIP Reminders", icon: Clock, href: "/sip-reminders", category: "Financial Services" },
];

const rechargeBillPayServices = [
   { name: "Mobile Recharge", icon: Smartphone, href: "/recharge/mobile", category: "Recharge & Bills" },
   { name: "Mobile Postpaid", icon: BookUser, href: "/bills/mobile-postpaid", category: "Recharge & Bills"},
   { name: "DTH Recharge", icon: Tv, href: "/recharge/dth", category: "Recharge & Bills" },
   { name: "Electricity Bill", icon: Bolt, href: "/bills/electricity", category: "Recharge & Bills" },
   { name: "Rent Payment", icon: Home, href: "/rent-payment", category: "Recharge & Bills" },
   { name: "LPG Cylinder", icon: Flame, href: "/lpg-booking", category: "Recharge & Bills" },
   { name: "Broadband Bill", icon: Wifi, href: "/bills/broadband", category: "Recharge & Bills" },
   { name: "Education Fees", icon: GraduationCap, href: "/bills/education", category: "Recharge & Bills" },
   { name: "Water Bill", icon: Droplet, href: "/bills/water", category: "Recharge & Bills" },
   { name: "Piped Gas", icon: Bolt, href: "/bills/gas", category: "Recharge & Bills" },
   { name: "Property Tax", icon: Home, href: "/property-tax", category: "Recharge & Bills" },
   { name: "Housing Society", icon: Building, href: "/housing-society", category: "Recharge & Bills" },
   { name: "Cable TV", icon: Tv2, href: "/cable-tv", category: "Recharge & Bills" },
   { name: "FASTag Recharge", icon: RadioTower, href: "/recharge/fastag", category: "Recharge & Bills" },
   { name: "Data Card", icon: HardDrive, href: "/recharge/datacard", category: "Recharge & Bills" },
   { name: "Prepaid Electricity", icon: Power, href: "/recharge/electricity", category: "Recharge & Bills" },
   { name: "Intl Calling", icon: PhoneCall, href: "/recharge/isd", category: "Recharge & Bills" },
   { name: "Traffic Challan", icon: Receipt, href: "/challan", category: "Recharge & Bills"},
];

const entertainmentServices = [
     { name: "Movies", icon: Clapperboard, href: "/movies", category: "Entertainment" },
     { name: "Events", icon: Ticket, href: "/entertainment/events", category: "Entertainment" },
     { name: "Sports Tickets", icon: Gamepad2, href: "/entertainment/sports", category: "Entertainment" },
     { name: "Comedy Shows", icon: Info, href: "/entertainment/comedy", category: "Entertainment" }, // Using Info as placeholder
     { name: "OTT Subscriptions", icon: Tv2, href: "/bills/subscription", category: "Entertainment" },
     { name: "Gaming Vouchers", icon: Gamepad2, href: "/vouchers/gaming", category: "Entertainment" },
     { name: "Game Zones", icon: Zap, href: "/entertainment/gamezone", category: "Entertainment" },
    // { name: "AR/VR Events", icon: Sparkles, href: "/entertainment/arvr", category: "Entertainment" }, // Keep if implemented
];

const healthcareServices = [
     { name: "Doctor Consult", icon: Stethoscope, href: "/healthcare/doctor", category: "Healthcare" },
     { name: "Lab Tests", icon: FlaskConical, href: "/healthcare/lab", category: "Healthcare" },
     { name: "Pharmacy", icon: Pill, href: "/healthcare/pharmacy", category: "Healthcare" },
     { name: "Ambulance", icon: Ambulance, href: "/healthcare/ambulance", category: "Healthcare" },
     { name: "Health Wallet", icon: FolderHeart, href: "/healthcare/wallet", category: "Healthcare" },
    // { name: "Medicine Subscription", icon: Repeat, href: "/healthcare/med-subscription", category: "Healthcare" },
    // { name: "Video Consultation", icon: Video, href: "/healthcare/video-consult", category: "Healthcare" },
    // { name: "Health Packages", icon: BadgePercent, href: "/healthcare/offers", category: "Healthcare" },
    // { name: "Fitness Trainers", icon: Dumbbell, href: "/healthcare/fitness", category: "Healthcare" },
    // { name: "Hospital Beds/OPD", icon: BedDouble, href: "/healthcare/hospital", category: "Healthcare" },
];

const hyperlocalServices = [
    { name: "Order Food", icon: UtensilsCrossed, href: "/food", category: "Hyperlocal Services"},
    { name: "Shop Groceries", icon: ShoppingBasket, href: "/", category: "Hyperlocal Services"}, // Link to grocery page
    { name: "Rent Vehicle", icon: RentVehicleIcon, href: "/rent-vehicle", category: "Hyperlocal Services"}, // Added Rent Vehicle
    { name: "Electrician/Plumber", icon: Wrench, href: "/hyperlocal/repair", category: "Hyperlocal Services" },
    { name: "Home Cleaning", icon: SprayCan, href: "/hyperlocal/cleaning", category: "Hyperlocal Services" },
    { name: "Laundry", icon: WashingMachine, href: "/hyperlocal/laundry", category: "Hyperlocal Services" },
    { name: "Tailoring", icon: Scissors, href: "/hyperlocal/tailor", category: "Hyperlocal Services" },
    { name: "Car Wash", icon: Car, href: "/hyperlocal/carwash", category: "Hyperlocal Services" },
    { name: "Courier", icon: Package, href: "/hyperlocal/courier", category: "Hyperlocal Services" },
    { name: "Coworking Space", icon: BriefcaseBusiness, href: "/hyperlocal/coworking", category: "Hyperlocal Services" },
    { name: "Pet Services", icon: Dog, href: "/hyperlocal/petcare", category: "Hyperlocal Services" },
    { name: "Salon/Barber", icon: ScissorsLineDashed, href: "/hyperlocal/salon", category: "Hyperlocal Services" },
];

// Utility & Tools Category
const utilityToolsServices = [
   { name: "Secure Vault", icon: FolderLock, href: "/vault", category: "Utilities & Tools" },
   { name: "Municipal Services", icon: MunicipalIcon, href: "/municipal-services", category: "Utilities & Tools"}, // Added Municipal Services
   { name: "Club Fees", icon: HandCoins, href: "/club-fees", category: "Utilities & Tools" },
   { name: "General Donations", icon: Heart, href: "/donations/general", category: "Utilities & Tools" },
];

const vouchersMoreServices = [
    { name: "Gift Cards", icon: GiftIcon, href: "/vouchers/giftcards", category: "Vouchers & More" },
    { name: "Google Play", icon: Play, href: "/vouchers/digital", category: "Vouchers & More"}, // Specific voucher
    { name: "App Store", icon: Apple, href: "/vouchers/digital", category: "Vouchers & More"}, // Specific voucher
    { name: "Intl Calling Cards", icon: PhoneCall, href: "/recharge/isd", category: "Vouchers & More" }, // Moved here
    { name: "Digital Vouchers", icon: Mailbox, href: "/vouchers/digital", category: "Vouchers & More" },
];


const otherServices = [
    // Payments Category (Moved from otherServices)
    { name: "Fuel Payment", icon: Fuel, href: "/fuel", category: "Payments" },
    { name: "Parking Payments", icon: ParkingMeter, href: "/parking", category: "Payments" },
    { name: "Cash Withdrawal", icon: IndianRupee, href: "/cash-withdrawal", category: "Payments" },
];

const groupServicesByCategory = (services: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    // Define NEW category order
    const categoryOrder = [
        "Recharge & Bills",
        "Travel",
        "Financial Services",
        "Hyperlocal Services",
        "Healthcare",
        "Entertainment",
        "Temple Services",
        "Payments",
        "Utilities & Tools",
        "Vouchers & More"
    ];

    // Initialize categories from the defined order
    categoryOrder.forEach(cat => { grouped[cat] = []; });

    services.forEach((service) => {
        const category = service.category;
         if (!grouped[category]) {
             console.warn(`Service category "${category}" not found in defined order. Add it to categoryOrder.`);
             grouped[category] = []; // Create if missing
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
    const [allServices, setAllServices] = useState<any[]>([]); // Initialize empty

    // Combine all service arrays
    useEffect(() => {
         const combinedServices = [
            ...rechargeBillPayServices,
            ...travelServices,
            ...financialServices,
            ...hyperlocalServices,
            ...healthcareServices,
            ...entertainmentServices,
            ...templeServices,
            ...utilityToolsServices,
            ...vouchersMoreServices,
            ...otherServices // Includes Payments category now
        ];
        setAllServices(combinedServices);
    }, []);

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
