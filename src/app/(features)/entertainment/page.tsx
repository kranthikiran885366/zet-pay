'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import {
  ArrowLeft,
  Ticket, // Generic Event/Ticket
  Clapperboard, // Movies
  Gamepad2, // Gaming/Sports
  Drama, // Comedy/Standup (Using Drama as placeholder)
  Sparkles, // AR/VR or Special Events
  Users, // Group Booking/Watch Party
  BellRing, // Reminders
  MapPin, // Location/Discovery
  CalendarClock, // Scheduling/Sync
  Zap, // Game Zone/Amusement Park
  Film // OTT
} from "lucide-react";

const entertainmentServices = [
  { name: "Event Tickets", icon: Ticket, href: "/entertainment/events", category: "Booking" },
  { name: "Movie Tickets", icon: Clapperboard, href: "/movies", category: "Booking" }, // Link to existing movie page
  { name: "Sports Matches", icon: Gamepad2, href: "/entertainment/sports", category: "Booking" },
  { name: "Comedy Shows", icon: Drama, href: "/entertainment/comedy", category: "Booking" },
  { name: "OTT Subscriptions", icon: Film, href: "/bills/subscription", category: "Booking" }, // Link to existing subscription page
  { name: "Game Zones", icon: Zap, href: "/entertainment/gamezone", category: "Booking" },
  { name: "AR/VR Events", icon: Sparkles, href: "/entertainment/arvr", category: "Experience" },
  { name: "Group Booking", icon: Users, href: "/entertainment/group", category: "Tools" },
  { name: "Event Reminders", icon: BellRing, href: "/reminders?category=Event", category: "Tools" }, // Link to reminders with filter
  { name: "Discover Events", icon: MapPin, href: "/entertainment/discover", category: "Tools" },
  { name: "Watch Party", icon: Users, href: "/entertainment/watchparty", category: "Tools" },
];

const groupServicesByCategory = (services: typeof entertainmentServices) => {
    const grouped: { [key: string]: typeof entertainmentServices } = {};
    const categoryOrder = ["Booking", "Experience", "Tools"]; // Define order

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

export default function EntertainmentServicesPage() {
    const groupedServices = groupServicesByCategory(entertainmentServices);
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
                <Ticket className="h-6 w-6" /> {/* Using generic Ticket icon */}
                <h1 className="text-lg font-semibold">Entertainment & Events</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-6 pb-20">
                {categories.map((category) => {
                    if (groupedServices[category].length === 0) return null; // Skip empty categories
                    return (
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
                    );
                })}
            </main>
        </div>
    );
}