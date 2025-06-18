
// src/mock-data/hyperlocal.ts

export interface HyperlocalProvider {
    id: string;
    name: string;
    rating?: number;
    basePrice?: number; // e.g., starting price for a service
    area?: string; // Area they primarily serve
    contact?: string;
    logoUrl?: string;
}

export interface HyperlocalService {
    type: string; // e.g., 'Electrician', 'Plumber', 'AC Repair'
    displayName: string; // User-friendly name
    icon?: string; // Icon name from lucide-react or path
    description?: string;
    providers?: HyperlocalProvider[];
}

export const mockHyperlocalServicesData: HyperlocalService[] = [
    {
        type: 'Electrician',
        displayName: 'Electrician Services',
        icon: 'Lightbulb',
        description: 'Book certified electricians for all your electrical needs.',
        providers: [
            { id: 'elec1', name: 'Sparky Electricians', rating: 4.5, basePrice: 250, area: "Koramangala", logoUrl: "https://picsum.photos/seed/sparky/50/50" },
            { id: 'elec2', name: 'QuickFix Electricals', rating: 4.2, basePrice: 300, area: "Indiranagar", logoUrl: "https://picsum.photos/seed/quickfix/50/50" },
        ]
    },
    {
        type: 'Plumber',
        displayName: 'Plumbing Services',
        icon: 'Wrench',
        description: 'Reliable plumbers for leaks, installations, and repairs.',
        providers: [
            { id: 'plumb1', name: 'FlowMasters Plumbing', rating: 4.6, basePrice: 350, area: "Jayanagar", logoUrl: "https://picsum.photos/seed/flowmasters/50/50" },
        ]
    },
    {
        type: 'AC Repair',
        displayName: 'AC Service & Repair',
        icon: 'ThermometerSnowflake',
        description: 'Expert AC technicians for servicing, repair, and installation.',
        providers: [
            { id: 'ac1', name: 'CoolCare AC Services', rating: 4.7, basePrice: 499, area: "Whitefield", logoUrl: "https://picsum.photos/seed/coolcare/50/50" },
        ]
    },
    {
        type: 'Car Wash',
        displayName: 'Car Wash at Home',
        icon: 'Car',
        description: 'Convenient car wash services at your doorstep.',
        providers: [
            { id: 'cw1', name: 'Sparkle Wheels', rating: 4.8, basePrice: 399, area: "All Bangalore", logoUrl: "https://picsum.photos/seed/sparklewheels/50/50" },
        ]
    },
    // Add other service types like Cleaning, Laundry, Tailor, Pet Care, Salon, Courier, Coworking etc.
];

// Mock slots data: providerId-YYYY-MM-DD -> array of time strings
export const mockHyperlocalSlotsData: { [key: string]: string[] } = {
    'elec1-2024-08-15': ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'],
    'ac1-2024-08-16': ['10:00 AM', '01:00 PM', '03:30 PM'],
};
