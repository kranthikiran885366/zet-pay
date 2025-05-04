'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import {
  ArrowLeft,
  Stethoscope, // Doctor Appointments
  BedDouble, // Hospital Beds
  FlaskConical, // Lab Tests
  Dumbbell, // Fitness Trainer
  Pill, // Pharmacy
  Ambulance, // Emergency Ambulance
  FolderHeart, // Health Wallet
  Repeat, // Medicine Subscription
  Video, // Video Consultation
  BadgePercent, // Health Offers
  HeartPulse // Main Icon
} from "lucide-react";

const healthcareServices = [
  { name: "Doctor Appointments", icon: Stethoscope, href: "/healthcare/doctor", category: "Consultation" },
  { name: "Video Consultation", icon: Video, href: "/healthcare/video-consult", category: "Consultation" },
  { name: "Lab Tests", icon: FlaskConical, href: "/healthcare/lab", category: "Diagnostics" },
  { name: "Order Medicines", icon: Pill, href: "/healthcare/pharmacy", category: "Pharmacy" },
  { name: "Medicine Subscription", icon: Repeat, href: "/healthcare/med-subscription", category: "Pharmacy" },
  { name: "Hospital Beds/OPD", icon: BedDouble, href: "/healthcare/hospital", category: "Hospital Services" },
  { name: "Emergency Ambulance", icon: Ambulance, href: "/healthcare/ambulance", category: "Emergency" },
  { name: "Fitness Trainers", icon: Dumbbell, href: "/healthcare/fitness", category: "Wellness" },
  { name: "Health Wallet", icon: FolderHeart, href: "/healthcare/wallet", category: "Records" },
  { name: "Health Packages", icon: BadgePercent, href: "/healthcare/offers", category: "Offers" },
];

const groupServicesByCategory = (services: typeof healthcareServices) => {
    const grouped: { [key: string]: typeof healthcareServices } = {};
    const categoryOrder = ["Consultation", "Diagnostics", "Pharmacy", "Hospital Services", "Wellness", "Emergency", "Records", "Offers"]; // Define order

    categoryOrder.forEach(cat => { grouped[cat] = []; });

    services.forEach(service => {
        const category = service.category;
        if (!grouped[category]) {
            grouped[category] = []; // Fallback if category not in order list
        }
        grouped[category].push(service);
    });

    // Filter out empty categories
    const finalGrouped: { [key: string]: typeof healthcareServices } = {};
     for (const cat of categoryOrder) {
         if (grouped[cat] && grouped[cat].length > 0) {
             finalGrouped[cat] = grouped[cat];
         }
     }
    return finalGrouped;
};

export default function HealthcareServicesPage() {
    const groupedServices = groupServicesByCategory(healthcareServices);
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
                <HeartPulse className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Healthcare & Wellness</h1>
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
