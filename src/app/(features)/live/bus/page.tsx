'use client';

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Bus, Search, TicketCheck, MapPin, Heart, Siren, MessageCircle, BadgeInfo, Route } from 'lucide-react'; // Added Route for consistency

interface FeatureCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    href: string; // Link to the dedicated page for the feature
    disabled?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon: Icon, href, disabled }) => (
    <Link href={disabled ? '#' : href} passHref legacyBehavior={disabled}>
        <a className={disabled ? 'pointer-events-none' : ''}>
            <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer text-center h-full flex flex-col hover:border-primary/50 active:bg-accent/50" aria-disabled={disabled}>
                <CardHeader className="pb-3 items-center pt-4">
                    <div className="bg-primary/10 text-primary p-3 rounded-full mb-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
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

export default function NationalBusServicesPage() {
    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                    <Link href="/travels" passHref>
                        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <Bus className="h-6 w-6" />
                    <h1 className="text-lg font-semibold">National Bus Services</h1>
                </div>
                {/* Header actions can be added here if needed */}
            </header>

            <main className="flex-grow p-4 space-y-4 pb-20">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
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
                </div>
            </main>
        </div>
    );
}
