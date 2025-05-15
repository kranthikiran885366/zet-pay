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
  ParkingMeter,
  Fuel,
  CarTaxiFront as TaxiIcon,
  PhoneCall,
    Plane,
    ShoppingBag,
    Gift as GiftIcon,
    Home as HomeIcon,
    Car,
    Bike as Motorbike,
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
    Briefcase,
    Database,
    Gauge,
    Coins,
    Building2,
    Zap,
    Siren,
    Store,
    HeartPulse,
    Wrench,
    SprayCan,
    WashingMachine,
    Scissors,
    Package,
    BriefcaseBusiness,
    Dog,
    ScissorsLineDashed,
    MoreHorizontal,
    Receipt,
    ThermometerSnowflake,
    IndianRupee,
    Flame,
    HandCoins,
    Wallet,
    ListChecks,
    WandSparkles,
    Target,
    BedSingle,
    Play,
    BadgePercent,
    TrendingUp,
    Tv2,
    Drama, // Added Drama icon
} from "lucide-react";
import Image from 'next/image';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

interface Service {
    name: string;
    icon: React.ElementType;
    href: string;
    category: string;
    tags?: string[];
}

const rechargeBillPayServices: Service[] = [
   { name: "Mobile Recharge", icon: Smartphone, href: "/recharge/mobile", category: "Recharge & Bills", tags: ["phone", "topup"] },
   { name: "Mobile Postpaid", icon: Smartphone, href: "/bills/mobile-postpaid", category: "Recharge & Bills", tags: ["phone", "bill"] },
   { name: "DTH Recharge", icon: Tv, href: "/recharge/dth", category: "Recharge & Bills", tags: ["tv", "satellite"] },
   { name: "Electricity Bill", icon: Bolt, href: "/bills/electricity", category: "Recharge & Bills", tags: ["power", "utility"] },
   { name: "Rent Payment", icon: HomeIcon, href: "/rent-payment", category: "Recharge & Bills", tags: ["house", "emi"] },
   { name: "LPG Cylinder", icon: Flame, href: "/lpg-booking", category: "Recharge & Bills", tags: ["gas", "cooking"] },
   { name: "Broadband Bill", icon: Wifi, href: "/bills/broadband", category: "Recharge & Bills", tags: ["internet", "wifi", "landline"] },
   { name: "Water Bill", icon: Droplet, href: "/bills/water", category: "Recharge & Bills", tags: ["utility"] },
   { name: "Piped Gas", icon: Bolt, href: "/bills/gas", category: "Recharge & Bills", tags: ["utility", "cooking"] },
   { name: "Cable TV", icon: Tv2, href: "/cable-tv", category: "Recharge & Bills", tags: ["television"] },
   { name: "Data Card", icon: HardDrive, href: "/recharge/datacard", category: "Recharge & Bills", tags: ["internet", "dongle"] },
   { name: "Prepaid Electricity", icon: Power, href: "/recharge/electricity", category: "Recharge & Bills", tags: ["meter", "power"] },
];

const loanRepaymentServices: Service[] = [
    { name: "Pay Loan EMI", icon: Landmark, href: "/bills/loan", category: "Loan Repayment", tags: ["emi", "finance"]},
    { name: "Credit Card Bill", icon: CreditCard, href: "/bills/credit-card", category: "Loan Repayment", tags: ["cc", "finance"] },
];

const financialServices: Service[] = [
    { name: "Insurance Premium", icon: ShieldCheck, href: "/insurance/life", category: "Financial Services", tags: ["lic", "health", "car", "bike"]},
    { name: "Mutual Funds", icon: Briefcase, href: "/mutual-funds", category: "Financial Services", tags: ["invest", "sip"] },
    { name: "Stock Market", icon: TrendingUp, href: "/stocks", category: "Financial Services", tags: ["invest", "shares", "trading"]},
    { name: "Digital Gold", icon: Coins, href: "/gold", category: "Financial Services", tags: ["invest", "gold", "commodity"] },
    { name: "Deposits (FD/RD)", icon: Database, href: "/deposits", category: "Financial Services", tags: ["invest", "fixed", "recurring"] },
    { name: "Check Credit Score", icon: Gauge, href: "/credit-score", category: "Financial Services", tags: ["cibil", "loan", "report"] },
    { name: "Personal Loans", icon: Banknote, href: "/loans", category: "Financial Services", tags: ["borrow", "emi"] },
    { name: "Micro Loans / SNPL", icon: HandCoins, href: "/pocket-money", category: "Financial Services", tags: ["student", "small", "borrow", "education"] },
    { name: "Zet Mini Bank", icon: Building2, href: "/zet-bank", category: "Financial Services", tags: ["account", "digital", "neo"] },
    { name: "Pay Later (BNPL)", icon: Wallet, href: "/bnpl", category: "Financial Services", tags: ["credit", "later", "emi"] },
];

const travelServices: Service[] = [
    { name: "AI Travel Assistant", icon: WandSparkles, href: "/travels/assistant", category: "Travel", tags: ["plan", "book", "itinerary", "ask"] },
    { name: "Flights", icon: Plane, href: "/travels/flight", category: "Travel", tags: ["air", "ticket", "booking"]},
    { name: "Buses", icon: Bus, href: "/travels/bus", category: "Travel", tags: ["road", "ticket", "booking"]},
    { name: "Trains", icon: Train, href: "/travels/train", category: "Travel", tags: ["railway", "irctc", "ticket", "booking"]},
    { name: "Hotels", icon: Hotel, href: "/hostels", category: "Travel", tags: ["stay", "room", "booking"]}, // Link to hostels page for now
    { name: "Hostels", icon: BedSingle, href: "/hostels", category: "Travel", tags: ["stay", "budget", "backpack"]},
    { name: "Cab Booking", icon: TaxiIcon, href: "/cab", category: "Travel", tags: ["taxi", "ola", "uber"]},
    { name: "Car Rentals", icon: Car, href: "/travels/car", category: "Travel", tags: ["self-drive", "rent"] },
    { name: "Bike Rentals", icon: Motorbike, href: "/travels/bike", category: "Travel", tags: ["scooter", "motorcycle", "rent"] },
    { name: "EV Charging", icon: Zap, href: "/travels/ev-charging", category: "Travel", tags: ["electric", "vehicle", "station"] },
    { name: "Rest Stop Info", icon: Store, href: "/travels/rest-stop", category: "Travel", tags: ["highway", "food", "amenities"] },
    { name: "Live Bus Tracking", icon: MapPin, href: "/live/bus", category: "Travel", tags: ["eta", "status", "gps"] },
    { name: "Live Train Status", icon: MapPin, href: "/live/train", category: "Travel", tags: ["eta", "running", "gps", "pnr"] },
    { name: "Emergency Assist", icon: Siren, href: "/travels/assistance", category: "Travel", tags: ["sos", "roadside", "help"]},
];

const transitTollServices: Service[] = [
    { name: "Metro Recharge", icon: TramFront, href: "/recharge/metro", category: "Transit & Toll", tags: ["card", "delhi", "mumbai", "bangalore"]},
    { name: "FASTag Recharge", icon: RadioTower, href: "/recharge/fastag", category: "Transit & Toll", tags: ["toll", "highway", "nhai"] },
    { name: "Traffic Challan", icon: Receipt, href: "/challan", category: "Transit & Toll", tags: ["fine", "police", "rta"]},
    { name: "Parking Payments", icon: ParkingMeter, href: "/parking", category: "Transit & Toll", tags: ["car", "spot", "smart"] },
    { name: "Bus Pass", icon: Ticket, href: "/passes/bus", category: "Transit & Toll", tags: ["apply", "monthly", "student"]},
    { name: "My Passes", icon: Ticket, href: "/passes/my-passes", category: "Transit & Toll", tags: ["view", "qr", "active"]},
];

const foodAndShoppingServices: Service[] = [
    { name: "Order Food", icon: UtensilsCrossed, href: "/food", category: "Food & Shopping", tags: ["delivery", "zomato", "swiggy", "restaurant"]},
    { name: "Shop Groceries", icon: ShoppingBasket, href: "/shopping/grocery", category: "Food & Shopping", tags: ["bigbasket", "blinkit", "zepto"]},
    { name: "Shop Online", icon: ShoppingBag, href: "/shopping/online", category: "Food & Shopping", tags: ["ecommerce", "amazon", "flipkart", "myntra"]},
    { name: "Shopping Offers", icon: BadgePercent, href: "/offers?category=shopping", category: "Food & Shopping", tags: ["deals", "discount", "sale"]},
];

const entertainmentGamingServices: Service[] = [
     { name: "Movies", icon: Clapperboard, href: "/movies", category: "Entertainment & Gaming", tags: ["cinema", "tickets", "bookmyshow"] },
     { name: "Events", icon: Ticket, href: "/entertainment/events", category: "Entertainment & Gaming", tags: ["concert", "show", "tickets"] },
     { name: "Sports Tickets", icon: Gamepad2, href: "/entertainment/sports", category: "Entertainment & Gaming", tags: ["ipl", "isl", "cricket", "football"] },
     { name: "Comedy Shows", icon: Drama, href: "/entertainment/comedy", category: "Entertainment & Gaming", tags: ["standup", "tickets"] },
     { name: "OTT Subscriptions", icon: Tv, href: "/bills/subscription", category: "Entertainment & Gaming", tags: ["netflix", "hotstar", "prime"] },
     { name: "Gaming Vouchers", icon: Gamepad2, href: "/vouchers/gaming", category: "Entertainment & Gaming", tags: ["freefire", "pubg", "uc", "diamonds"] },
     { name: "Play Store Recharge", icon: Play, href: "/vouchers/digital", category: "Entertainment & Gaming", tags: ["google", "topup", "code"] },
     { name: "Game Zones", icon: Zap, href: "/entertainment/gamezone", category: "Entertainment & Gaming", tags: ["arcade", "amusement", "park"] },
     { name: "AR/VR Events", icon: Sparkles, href: "/entertainment/arvr", category: "Entertainment & Gaming", tags: ["virtual", "augmented", "reality", "metaverse"] },
     { name: "Group Booking", icon: Users, href: "/entertainment/group", category: "Entertainment & Gaming", tags: ["movie", "split", "invite"] },
     { name: "Watch Party", icon: Play, href: "/entertainment/watchparty", category: "Entertainment & Gaming", tags: ["sync", "online", "friends"] },
];

const templeServicesData: Service[] = [
  { name: "Book Darshan Slot", icon: CalendarCheck, href: "/temple/darshan", category: "Temple Services", tags: ["tirupati", "shirdi", "vaishno", "visit"] },
  { name: "Live Darshan", icon: Video, href: "/temple/live", category: "Temple Services", tags: ["stream", "watch", "online"] },
  { name: "Virtual Pooja", icon: Sparkles, href: "/temple/pooja", category: "Temple Services", tags: ["online", "remote", "ritual"] },
  { name: "Order Prasadam", icon: ShoppingBasket, href: "/temple/prasadam", category: "Temple Services", tags: ["delivery", "food", "blessing"] },
  { name: "Donate to Temple", icon: HeartHandshake, href: "/temple/donate", category: "Temple Services", tags: ["charity", "support", "fund"] },
  { name: "Temple Timings & Queue", icon: Clock, href: "/temple/info", category: "Temple Services", tags: ["queue", "status", "info"] },
  { name: "Aarti & Mantras", icon: Music, href: "/temple/audio", category: "Temple Services", tags: ["play", "listen", "bhajan"] },
  { name: "Book Events/Yatra", icon: Map, href: "/temple/events", category: "Temple Services", tags: ["pilgrimage", "tour", "festival"] },
  { name: "Nearby Accommodation", icon: Hotel, href: "/temple/accommodation", category: "Temple Services", tags: ["stay", "room", "guest house"] },
  { name: "Group Visit Booking", icon: Users, href: "/temple/group", category: "Temple Services", tags: ["bulk", "request", "permission"] },
  { name: "Smart Access Pass", icon: QrCode, href: "/temple/access", category: "Temple Services", tags: ["entry", "qr", "digital"] },
];

const healthcareServicesData: Service[] = [
    { name: "Doctor Appointments", icon: Stethoscope, href: "/healthcare/doctor", category: "Healthcare & Wellness", tags: ["consult", "clinic", "hospital"] },
    { name: "Video Consultation", icon: Video, href: "/healthcare/video-consult", category: "Healthcare & Wellness", tags: ["online", "telemedicine", "doctor"] },
    { name: "Lab Tests", icon: FlaskConical, href: "/healthcare/lab", category: "Healthcare & Wellness", tags: ["blood", "sample", "diagnostic", "report"] },
    { name: "Order Medicines", icon: Pill, href: "/healthcare/pharmacy", category: "Healthcare & Wellness", tags: ["pharmacy", "delivery", "prescription"] },
    { name: "Medicine Subscription", icon: Repeat, href: "/healthcare/med-subscription", category: "Healthcare & Wellness", tags: ["refill", "auto", "repeat"] },
    { name: "Hospital Beds/OPD", icon: BedDouble, href: "/healthcare/hospital", category: "Healthcare & Wellness", tags: ["admission", "emergency", "appointment"] },
    { name: "Fitness Trainers", icon: Dumbbell, href: "/healthcare/fitness", category: "Healthcare & Wellness", tags: ["gym", "yoga", "coach", "personal"] },
    { name: "Health Wallet", icon: FolderHeart, href: "/healthcare/wallet", category: "Healthcare & Wellness", tags: ["records", "report", "prescription", "digital"] },
    { name: "Health Packages", icon: BadgePercent, href: "/healthcare/offers", category: "Healthcare & Wellness", tags: ["checkup", "preventive", "discount"] },
    { name: "Ambulance", icon: Ambulance, href: "/healthcare/ambulance", category: "Healthcare & Wellness", tags: ["emergency", "sos", "medical", "transport"]},
];

const hyperlocalServicesData: Service[] = [
    { name: "Electrician/Plumber", icon: Wrench, href: "/hyperlocal/repair", category: "Hyperlocal Services", tags: ["home", "repair", "fix"] },
    { name: "AC Repair", icon: ThermometerSnowflake, href: "/hyperlocal/ac-repair", category: "Hyperlocal Services", tags: ["air conditioner", "service", "fix"] },
    { name: "Home Cleaning", icon: SprayCan, href: "/hyperlocal/cleaning", category: "Hyperlocal Services", tags: ["deep", "pest control", "sanitize"] },
    { name: "Laundry", icon: WashingMachine, href: "/hyperlocal/laundry", category: "Hyperlocal Services", tags: ["wash", "iron", "dry clean"] },
    { name: "Tailoring", icon: Scissors, href: "/hyperlocal/tailor", category: "Hyperlocal Services", tags: ["stitch", "alteration", "clothes"] },
    { name: "Car Wash", icon: Car, href: "/hyperlocal/carwash", category: "Hyperlocal Services", tags: ["doorstep", "clean", "vehicle"] },
    { name: "Courier", icon: Package, href: "/hyperlocal/courier", category: "Hyperlocal Services", tags: ["send", "parcel", "delivery", "instant"] },
    { name: "Coworking Space", icon: BriefcaseBusiness, href: "/hyperlocal/coworking", category: "Hyperlocal Services", tags: ["desk", "office", "rent"] },
    { name: "Pet Services", icon: Dog, href: "/hyperlocal/petcare", category: "Hyperlocal Services", tags: ["grooming", "vet", "dog", "cat"] },
    { name: "Salon/Barber", icon: ScissorsLineDashed, href: "/hyperlocal/salon", category: "Hyperlocal Services", tags: ["haircut", "beauty", "appointment"] },
];

const municipalServicesData: Service[] = [
    { name: "Property Tax", icon: HomeIcon, href: "/property-tax", category: "Municipal Services", tags: ["house", "tax", "bbmp", "mcgm"]},
    { name: "Housing Society", icon: Building2, href: "/housing-society", category: "Municipal Services", tags: ["maintenance", "apartment", "dues"]},
    { name: "Municipal Services", icon: Building2, href: "/municipal-services", category: "Municipal Services", tags: ["local", "government", "certificates"]},
];

const utilityToolsServices: Service[] = [
   { name: "Education Fees", icon: GraduationCap, href: "/bills/education", category: "Utilities & Tools", tags: ["school", "college", "university"] },
   { name: "Club Fees", icon: HeartHandshake, href: "/club-fees", category: "Utilities & Tools", tags: ["membership", "association"] },
   { name: "General Donations", icon: HeartHandshake, href: "/donations/general", category: "Utilities & Tools", tags: ["charity", "ngo", "support"] },
   { name: "Secure Vault", icon: FolderLock, href: "/vault", category: "Utilities & Tools", tags: ["documents", "store", "safe", "digital"] },
   { name: "Pocket Money", icon: PiggyBank, href: "/pocket-money", category: "Utilities & Tools", tags: ["kids", "child", "allowance", "parent"] },
   { name: "Bill Reminders", icon: BellRing, href: "/reminders", category: "Utilities & Tools", tags: ["alert", "due date", "payment"] },
   { name: "Subscription Mgr", icon: ListChecks, href: "/subscription-manager", category: "Utilities & Tools", tags: ["recurring", "cancel", "track"] },
   { name: "SIP Reminders", icon: Clock, href: "/sip-reminders", category: "Utilities & Tools", tags: ["invest", "mutual fund", "alert"]},
];

const vouchersMoreServices: Service[] = [
    { name: "Gift Cards", icon: GiftIcon, href: "/vouchers/giftcards", category: "Vouchers & More", tags: ["amazon", "flipkart", "shopping", "present"] },
    { name: "Intl Calling Cards", icon: PhoneCall, href: "/recharge/isd", category: "Vouchers & More", tags: ["international", "roaming", "talktime"] },
    { name: "Digital Vouchers", icon: Mailbox, href: "/vouchers/digital", category: "Vouchers & More", tags: ["google play", "app store", "uber"] },
    { name: "AI Gifting Assistant", icon: WandSparkles, href: "/ai-gifting", category: "Vouchers & More", tags: ["suggest", "present", "recommend", "idea"]},
];

const paymentsServicesData: Service[] = [
    { name: "Fuel Payment", icon: Fuel, href: "/fuel", category: "Payments", tags: ["petrol", "diesel", "bunk", "station"] },
    { name: "Cash Withdrawal", icon: IndianRupee, href: "/cash-withdrawal", category: "Payments", tags: ["atm", "cardless", "agent"] },
    { name: "Cab/Taxi Bill Pay", icon: TaxiIcon, href: "/cab", category: "Payments", tags: ["ola", "uber", "ride"] },
    { name: "Autopay (Mandates)", icon: Repeat, href: "/autopay", category: "Payments", tags: ["recurring", "subscription", "emi", "sip"]},
];

const eventsCelebrationsServices: Service[] = [
    { name: "Marriage Booking", icon: HeartHandshake, href: "/marriage-booking", category: "Events & Celebrations", tags: ["hall", "venue", "wedding", "reception"] },
];

const aiAndToolsServices: Service[] = [
     { name: "Ask PayFriend", icon: WandSparkles, href: "/conversation", category: "AI & Tools", tags: ["chat", "voice", "command", "assistant"]},
     { name: "Spending Analysis", icon: TrendingUp, href: "/analysis", category: "AI & Tools", tags: ["budget", "insight", "track", "expense"]},
     { name: "Savings Goals", icon: Target, href: "/goals", category: "AI & Tools", tags: ["piggy bank", "invest", "target", "save"]},
     { name: "AI Plan Recommender", icon: Star, href: "/recharge/mobile", category: "AI & Tools", tags: ["recharge", "mobile", "suggestion"]},
     { name: "AI Deal Finder", icon: BadgePercent, href: "/offers", category: "AI & Tools", tags: ["coupon", "discount", "auto apply"]},
     { name: "Smart Schedule", icon: CalendarClock, href: "/smart-schedule", category: "AI & Tools", tags: ["travel", "plan", "itinerary", "food"]},
];

const allServices: Service[] = [
    ...rechargeBillPayServices,
    ...loanRepaymentServices,
    ...financialServices,
    ...travelServices,
    ...transitTollServices,
    ...foodAndShoppingServices,
    ...entertainmentGamingServices,
    ...templeServicesData,
    ...healthcareServicesData,
    ...hyperlocalServicesData,
    ...municipalServicesData,
    ...utilityToolsServices,
    ...vouchersMoreServices,
    ...paymentsServicesData,
    ...eventsCelebrationsServices,
    ...aiAndToolsServices,
];

const uniqueServices = Array.from(new Map(allServices.map(service => [`${service.name}-${service.href}`, service])).values());


const groupServicesByCategory = (services: Service[]) => {
    const grouped: { [key: string]: Service[] } = {};
    const categoryOrder = [
        "Recharge & Bills",
        "Payments",
        "Transit & Toll",
        "Loan Repayment",
        "Financial Services",
        "Travel",
        "Food & Shopping",
        "Entertainment & Gaming",
        "Temple Services",
        "Healthcare & Wellness",
        "Hyperlocal Services",
        "Municipal Services",
        "Events & Celebrations",
        "Utilities & Tools",
        "Vouchers & More",
        "AI & Tools",
    ];

    categoryOrder.forEach(cat => { grouped[cat] = []; });

    services.forEach((service) => {
        let category = service.category;
         if (category === "Travel & Transit") category = "Travel";

         if (!grouped[category]) {
             console.warn(`Service category "${category}" not found in defined order. Adding dynamically.`);
              if (!categoryOrder.includes(category)) {
                  categoryOrder.push(category);
              }
              grouped[category] = [];
         }
         if (!grouped[category].some(s => s.name === service.name && s.href === service.href)) {
             grouped[category].push(service);
         }
    });

    const finalGrouped: { [key: string]: Service[] } = {};
    for (const cat of categoryOrder) {
        if (grouped[cat] && grouped[cat].length > 0) {
            finalGrouped[cat] = grouped[cat];
        }
    }
    return finalGrouped;
}

export default function AllServicesPage() {
    const groupedServices = groupServicesByCategory(uniqueServices);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCategories = Object.keys(groupedServices).filter(category => {
        if (!searchTerm.trim()) return true;
        if (category.toLowerCase().includes(searchTerm.toLowerCase())) return true;
        return groupedServices[category].some(service =>
            service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (service.tags && service.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
        );
    });

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-2 shadow-md">
                <Link href="/" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Sparkles className="h-6 w-6" />
                <h1 className="text-lg font-semibold flex-grow">All Services</h1>
                 <div className="relative w-full max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search services..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-9 bg-primary/20 text-primary-foreground placeholder:text-primary-foreground/70 border-primary-foreground/30 focus:bg-background focus:text-foreground"
                    />
                </div>
            </header>

            <main className="flex-grow p-4 space-y-6 pb-20">
                 {filteredCategories.length === 0 && searchTerm && (
                     <Card className="shadow-md text-center">
                         <CardContent className="p-6">
                             <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                             <p className="text-muted-foreground">No services found matching "{searchTerm}".</p>
                         </CardContent>
                     </Card>
                 )}
                 {filteredCategories.map((category) => {
                     const servicesInCategory = groupedServices[category].filter(service => {
                        if (!searchTerm.trim()) return true;
                        return service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               (service.tags && service.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
                     });

                     if(servicesInCategory.length === 0 && searchTerm) return null;

                    return (
                         <Card key={category} className="shadow-md">
                            <CardHeader>
                                <CardTitle>{category}</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-6 text-center">
                                {servicesInCategory.map((service: Service) => (
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
                     );
                 })}
            </main>
        </div>
    );
}
