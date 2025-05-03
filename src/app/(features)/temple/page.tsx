'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarCheck, // Darshan Booking
  Video, // Live Darshan
  Sparkles, // Virtual Pooja
  ShoppingBasket, // Prasadam Delivery
  HeartHandshake, // Donation
  Music, // Aarti/Mantras
  Map, // Events/Pilgrimage
  Hotel, // Accommodation
  Users, // Group Visit
  QrCode, // Smart Access
  Clock // Timings/Queue
} from "lucide-react";

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

const groupServicesByCategory = (services: typeof templeServices) => {
    const grouped: { [key: string]: typeof templeServices } = {};
    const categoryOrder = ["Booking", "Experience", "Info", "Support"]; // Define order

    categoryOrder.forEach(cat => { grouped[cat] = []; });

    services.forEach(service => {
        const category = service.category;
        if (!grouped[category]) {
            grouped[category] = []; // Fallback if category not in order list
        }
        grouped[category].push(service);
    });

    return grouped;
};

export default function TempleServicesPage() {
    const groupedServices = groupServicesByCategory(templeServices);
    const categories = Object.keys(groupedServices);

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
                <h1 className="text-lg font-semibold">Temple Services</h1>
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
