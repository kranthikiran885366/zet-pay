import type { BusLiveStatus, TrainLiveStatus, BusStopStatus, TrainStopStatus } from '@/services/liveTracking';
import { format, addMinutes, addHours } from 'date-fns';

// Existing Mock Data for Bus Live Status
export const mockBusLiveStatusData: BusLiveStatus = {
    busNumber: 'KA01F1234',
    routeName: 'Route 500D - Majestic to Silk Board',
    operatorName: 'BMTC',
    vehicleType: 'Volvo AC',
    currentLocationDescription: `Near Forum Mall, Koramangala (${format(new Date(), 'p')})`,
    nextStop: "St. John's Hospital",
    etaNextStop: "3 mins",
    delayMinutes: 2,
    stops: [
        { name: "Majestic", eta: "Departed", status: 'Departed', scheduledTime: '09:00 AM' },
        { name: "Richmond Circle", eta: "Departed", status: 'Departed', scheduledTime: '09:15 AM' },
        { name: "Forum Mall", eta: "Arriving Now", status: 'Arriving', scheduledTime: '09:30 AM' },
        { name: "St. John's Hospital", eta: "3 mins", status: 'Upcoming', scheduledTime: '09:35 AM' },
        { name: "Silk Board", eta: "15 mins", status: 'Upcoming', scheduledTime: '09:50 AM' },
    ],
    mapUrlPlaceholder: `https://picsum.photos/seed/KA01F1234/600/300`,
    lastUpdated: new Date(),
};

// Existing Mock Data for Train Live Status (can be expanded)
export const mockTrainLiveStatusData: TrainLiveStatus = {
    trainNumber: "12658",
    trainName: "Bengaluru Mail",
    currentStatus: `Delayed by 12 mins`,
    currentLocationDescription: "Departed Katpadi Jn (KPD), Next Arakkonam Jn (AJJ)",
    lastStationCode: "KPD",
    lastStationName: "Katpadi Jn",
    nextStationCode: "AJJ",
    nextStationName: "Arakkonam Jn",
    etaNextStation: "10:57 AM",
    delayMinutes: 12,
    route: [
        { stationName: "KSR Bengaluru City Jn", stationCode: "SBC", scheduledDeparture: "22:40", actualDeparture: "22:45", status: 'Departed', platform: 1, dayOfJourney: 1 },
        { stationName: "Katpadi Jn", stationCode: "KPD", scheduledArrival: "02:23", actualArrival: "02:35", scheduledDeparture: "02:25", actualDeparture: "02:40", status: 'Departed', platform: 2, dayOfJourney: 2 },
        { stationName: "Arakkonam Jn", stationCode: "AJJ", scheduledArrival: "03:18", status: 'Upcoming', platform: 1, dayOfJourney: 2 },
        { stationName: "MGR Chennai Central", stationCode: "MAS", scheduledArrival: "04:30", status: 'Upcoming', platform: 5, dayOfJourney: 2 },
    ],
    mapUrlPlaceholder: `https://picsum.photos/seed/12658/600/300`,
    lastUpdated: new Date(),
};


// --- New Mock Data for NBS Features ---

export interface BusRoute {
    id: string;
    operator: string;
    type: string; // e.g., 'AC Sleeper', 'Non-AC Seater'
    from: string;
    to: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    price: number;
    seatsAvailable: number;
    rating: number;
    amenities?: string[];
}

export const mockBusRoutesData: BusRoute[] = [
    { id: 'route1', operator: 'KSRTC Swift', type: 'AC Sleeper (2+1)', from: 'Bangalore', to: 'Chennai', departureTime: '22:00', arrivalTime: '05:30', duration: '7h 30m', price: 950, seatsAvailable: 12, rating: 4.3, amenities: ['Live Tracking', 'Charging Point', 'Blanket'] },
    { id: 'route2', operator: 'Orange Travels', type: 'Volvo Multi-Axle Semi-Sleeper', from: 'Hyderabad', to: 'Vijayawada', departureTime: '23:00', arrivalTime: '04:00', duration: '5h 0m', price: 700, seatsAvailable: 25, rating: 4.5, amenities: ['Wi-Fi', 'Water Bottle'] },
    { id: 'route3', operator: 'APSRTC Garuda Plus', type: 'AC Luxury', from: 'Visakhapatnam', to: 'Hyderabad', departureTime: '21:30', arrivalTime: '07:00', duration: '9h 30m', price: 1100, seatsAvailable: 5, rating: 4.1 },
];

export interface NearbyBusStop {
    id: string;
    name: string;
    distance: string;
    city: string;
    services?: string[]; // e.g. ['APSRTC', 'Local City Bus']
}
export const mockNearbyBusStopsData: NearbyBusStop[] = [
    { id: 'stop1', name: 'Majestic Bus Station', distance: '0.5 km', city: 'Bangalore', services: ['BMTC', 'KSRTC'] },
    { id: 'stop2', name: 'Koyambedu Omni Bus Stand', distance: '1.2 km', city: 'Chennai', services: ['SETC', 'Private Omni'] },
    { id: 'stop3', name: 'MGBS Hyderabad', distance: '0.8 km', city: 'Hyderabad', services: ['TSRTC', 'Interstate'] },
];

export interface ReservationStatus {
    reservationId: string;
    passengerName: string;
    operator: string;
    from: string;
    to: string;
    journeyDate: string; // YYYY-MM-DD
    currentStatus: string; // e.g., 'Bus departed from starting point'
    liveLocation: string; // e.g., 'Passing through Electronic City Toll'
    etaDestination: string; // e.g., '05:30 AM'
    busNumber?: string;
}

export const mockReservationStatusData: { [key: string]: ReservationStatus } = {
    'TKT12345': { reservationId: 'TKT12345', passengerName: 'Ravi Kumar', operator: 'KSRTC Swift', from: 'Bangalore', to: 'Chennai', journeyDate: '2024-08-10', currentStatus: 'En route, near Krishnagiri', liveLocation: 'Approaching Krishnagiri Toll Plaza', etaDestination: '05:15 AM', busNumber: 'KA01AB1234' },
    'TKT67890': { reservationId: 'TKT67890', passengerName: 'Priya Sharma', operator: 'Orange Travels', from: 'Hyderabad', to: 'Vijayawada', journeyDate: '2024-08-10', currentStatus: 'Reached Vijayawada, Terminal A', liveLocation: 'Vijayawada Bus Stand', etaDestination: 'Arrived', busNumber: 'TS09CD5678'},
};

export interface FavoriteRoute {
    id: string; // e.g., 'route_from_to' or 'stop_id'
    type: 'route' | 'stop';
    name: string; // e.g., "Home to Office" or "Majestic Bus Stop"
    details: any; // Store route (from/to) or stop info
}

export const mockNbsEmergencyContacts = [
    { name: 'National Emergency Helpline', number: '112' },
    { name: 'Ambulance', number: '108' },
    { name: 'Police', number: '100' },
    { name: 'APSRTC Helpline', number: '0866-2570005' }, // Example
    { name: 'TSRTC Helpline', number: '040-69440000' }, // Example
];

export const mockFeedbackCategories = ['Bus Condition', 'Driver Behavior', 'Punctuality', 'App Experience', 'Safety', 'Other'];

export const nbsAboutText = `Welcome to National Bus Services (NBS) — your unified platform for real-time bus tracking, ticket booking, and public transport information across all Indian states.

We bring together the official transport data and live tracking from:
- APSRTC (Andhra Pradesh)
- TSRTC (Telangana)
- KSRTC (Karnataka)
- MSRTC (Maharashtra)
- TNSTC (Tamil Nadu)
- Kerala RTC
- UPSRTC (Uttar Pradesh)
- RSRTC (Rajasthan)
- HRTC (Himachal Pradesh)
And many more...

Key Features:
- Track buses in real-time by vehicle number or reservation.
- Search for buses between cities and districts across states.
- Book tickets securely using our platform (Coming Soon!).
- Access emergency services and provide feedback easily.
- Save your favorite routes and buses for quicker access.
- Get accurate ETAs, delays, and route details instantly.

Our Vision:
To create a single national platform that connects India's diverse state transport systems, improving commuter convenience, safety, and transparency.

Contact & Support:
Email: support@nationalbus.zet (Example)
Phone: 1800-ZET-NBUS (Toll-Free Example)
Website: www.zetpay.app/nbs (Example)`;

// Mock data for city/station selection (can be expanded or fetched)
export const mockNbsCities: {id: string, name: string, state: string}[] = [
    {id: 'BLR', name: 'Bangalore', state: 'Karnataka'},
    {id: 'CHE', name: 'Chennai', state: 'Tamil Nadu'},
    {id: 'HYD', name: 'Hyderabad', state: 'Telangana'},
    {id: 'MUM', name: 'Mumbai', state: 'Maharashtra'},
    {id: 'DEL', name: 'Delhi', state: 'Delhi'},
    {id: 'PUN', name: 'Pune', state: 'Maharashtra'},
    {id: 'VIZ', name: 'Visakhapatnam', state: 'Andhra Pradesh'},
    {id: 'VIJ', name: 'Vijayawada', state: 'Andhra Pradesh'},
];
export const mockNbsStates: string[] = ["Andhra Pradesh", "Telangana", "Karnataka", "Maharashtra", "Tamil Nadu", "Delhi"];


// Helper function to get live status (re-exported from services/liveTracking.ts if used there)
export const getMockBusLiveStatus = async (identifier: string): Promise<BusLiveStatus | null> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (identifier.toUpperCase() === 'KA01F1234' || identifier === '500D') {
        return { ...mockBusLiveStatusData, busNumber: identifier.toUpperCase(), lastUpdated: new Date() };
    }
    // Add more mock cases based on other identifiers if needed
    return null;
};

// Function to simulate fetching bus routes
export const searchMockBusRoutes = async (from: string, to: string, date: string): Promise<BusRoute[]> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockBusRoutesData.filter(
        route => route.from.toLowerCase() === from.toLowerCase() &&
                 route.to.toLowerCase() === to.toLowerCase()
    );
};

// Function to simulate fetching nearby stops
export const findMockNearbyStops = async (lat: number, lon: number): Promise<NearbyBusStop[]> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    // Simulate some logic based on lat/lon if needed, or just return all
    return mockNearbyBusStopsData.map(stop => ({...stop, distance: `${(Math.random() * 5).toFixed(1)} km`}));
};

// Function to simulate fetching reservation status
export const getMockReservationStatus = async (resId: string): Promise<ReservationStatus | null> => {
    await new Promise(resolve => setTimeout(resolve, 700));
    return mockReservationStatusData[resId] || null;
};
