
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Heart, Siren, MessageCircle, BadgeInfo, Search, TicketCheck, MapPin, Route, Loader2, Bus as BusIcon, Clock, Users, Filter as FilterIcon, Edit, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from '@/lib/utils';

interface FeatureCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    href: string;
    disabled?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon: Icon, href, disabled }) => (
    <Link href={disabled ? '#' : href} passHref legacyBehavior>
        <a className={cn(
            "block",
            disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:opacity-80 transition-opacity'
        )}>
            <Card className="shadow-md hover:shadow-lg transition-shadow text-center h-full flex flex-col hover:border-primary/50 active:bg-accent/50" aria-disabled={disabled}>
                <CardHeader className="pb-3 items-center pt-4">
                    <div className={cn("p-3 rounded-full mb-2 transition-colors", disabled ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground")}>
                        <Icon className="h-7 w-7" />
                    </div>
                    <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow pb-4">
                    <CardDescription className="text-xs">{description}</CardDescription>
                </CardContent>
            </Card>
        </a>
    </Link>
);


export default function NationalBusServicesPage() {
    // State for managing dialogs/modals previously used can be removed if navigation is solely page-based.
    // For this example, we'll keep the structure for a hub page linking to sub-pages.

    const features: FeatureCardProps[] = [
        { title: "Track by Vehicle No.", description: "Live location of a bus by its registration.", icon: Route, href: "/live/bus/track-vehicle" },
        { title: "Search Buses", description: "Find buses between two locations.", icon: Search, href: "/live/bus/search" },
        { title: "Track Reservation", description: "Track your booked bus by PNR/Ticket ID.", icon: TicketCheck, href: "/live/bus/track-reservation" },
        { title: "Nearby Bus Stops", description: "Discover bus stops around you.", icon: MapPin, href: "/live/bus/nearby-stops" },
        { title: "My Favourites", description: "Access your saved routes & stops.", icon: Heart, href: "/live/bus/favorites" },
        { title: "Emergency Help", description: "Quick access to helpline numbers.", icon: Siren, href: "/live/bus/emergency" },
        { title: "Customer Feedback", description: "Share your experience or report issues.", icon: MessageCircle, href: "/live/bus/feedback" },
        { title: "About NBS", description: "Learn more about National Bus Services.", icon: BadgeInfo, href: "/live/bus/about" },
    ];

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                    <Link href="/travels" passHref>
                        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <BusIcon className="h-6 w-6" />
                    <h1 className="text-lg font-semibold">National Bus Services</h1>
                </div>
                <div className="flex items-center gap-1">
                    <Link href="/live/bus/favorites" passHref>
                        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80 h-8 w-8">
                            <Heart className="h-4 w-4"/>
                        </Button>
                    </Link>
                    <Link href="/live/bus/emergency" passHref>
                         <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80 h-8 w-8">
                            <Siren className="h-4 w-4"/>
                        </Button>
                    </Link>
                </div>
            </header>

            <main className="flex-grow p-4 space-y-4 pb-20">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>Bus Services Dashboard</CardTitle>
                        <CardDescription>Your one-stop portal for all bus-related services and information.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {features.map(feature => (
                            <FeatureCard
                                key={feature.title}
                                title={feature.title}
                                description={feature.description}
                                icon={feature.icon}
                                href={feature.href}
                                disabled={feature.disabled}
                            />
                        ))}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
