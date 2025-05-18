
/**
 * @fileOverview Service functions for fetching live tracking information.
 */

export interface BusStopStatus {
    name: string;
    eta: string; // e.g., "10:30 AM", "5 mins", "Departed", "Arriving Now"
    status: 'Departed' | 'Arriving' | 'Upcoming' | 'Skipped';
    scheduledTime?: string; // Optional scheduled time
}

export interface BusLiveStatus {
    busNumber: string; // Service number or registration
    routeName: string;
    currentLocationDescription: string; // e.g., "Near Silk Board Flyover"
    nextStop: string;
    etaNextStop: string; // e.g., "5 mins"
    delayMinutes?: number; // Optional delay
    stops: BusStopStatus[];
    mapUrlPlaceholder?: string; // Placeholder for map integration
    lastUpdated: Date;
    operatorName?: string; // Optional operator name
    vehicleType?: string; // Optional e.g., "AC Sleeper", "Volvo"
}

export interface TrainStopStatus {
    stationName: string;
    stationCode: string;
    scheduledArrival?: string; // e.g., "10:30"
    actualArrival?: string; // e.g., "10:35"
    scheduledDeparture?: string; // e.g., "10:32"
    actualDeparture?: string; // e.g., "10:37"
    delayMinutes?: number;
    platform?: string | number; // Added platform number
    status: 'Departed' | 'Arrived' | 'Skipped' | 'Upcoming';
    distanceFromSource?: number; // Optional distance
    dayOfJourney?: number; // e.g., 1, 2, 3
}

export interface TrainLiveStatus {
    trainNumber: string;
    trainName: string;
    currentStatus: string; // e.g., "Running On Time", "Delayed by 15 mins", "Arrived at Destination"
    currentStationCode?: string; // The station the train is currently at (if arrived)
    currentLocationDescription: string; // e.g., "Departed KPD, next AJJ", "Arrived at SBC"
    lastStationCode: string; // Last departed station Code
    lastStationName?: string; // Last departed station Name
    nextStationCode: string; // Next station Code
    nextStationName?: string; // Next station Name
    etaNextStation: string; // e.g., "11:05 AM"
    delayMinutes?: number;
    route: TrainStopStatus[];
    mapUrlPlaceholder?: string; // Placeholder
    lastUpdated: Date;
    averageSpeed?: number; // Optional speed km/h
    distanceToDestination?: number; // Optional distance km
}

/**
 * Simulates fetching the live status of a bus.
 * @param busIdentifier Service number or registration number.
 * @returns A promise resolving to the BusLiveStatus or null if not found.
 */
export async function getBusLiveStatus(busIdentifier: string): Promise<BusLiveStatus | null> {
    console.log(`Fetching live status for bus: ${busIdentifier}`);
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API delay

    if (busIdentifier.toUpperCase() === 'KA01F1234' || busIdentifier === '500D' || busIdentifier.toUpperCase() === 'AP28Z5566') {
        return {
            busNumber: busIdentifier.toUpperCase(),
            routeName: 'Route 500D - Majestic to Silk Board (Example)',
            operatorName: 'BMTC (Example)',
            vehicleType: 'Volvo AC',
            currentLocationDescription: "Near Forum Mall, Koramangala",
            nextStop: "St. John's Hospital",
            etaNextStop: "3 mins",
            delayMinutes: Math.random() > 0.7 ? Math.floor(Math.random() * 15) : 0, // Simulate delay sometimes
            stops: [
                { name: "Majestic", eta: "Departed", status: 'Departed', scheduledTime: '09:00 AM' },
                { name: "Town Hall", eta: "Departed", status: 'Departed', scheduledTime: '09:10 AM' },
                { name: "Richmond Circle", eta: "Departed", status: 'Departed', scheduledTime: '09:15 AM' },
                { name: "Forum Mall", eta: "Arriving Now", status: 'Arriving', scheduledTime: '09:30 AM' },
                { name: "St. John's Hospital", eta: "3 mins", status: 'Upcoming', scheduledTime: '09:35 AM' },
                { name: "Koramangala Water Tank", eta: "8 mins", status: 'Upcoming', scheduledTime: '09:42 AM' },
                { name: "Silk Board", eta: "15 mins", status: 'Upcoming', scheduledTime: '09:50 AM' },
                { name: "Central Silk Board", eta: "20 mins", status: 'Upcoming', scheduledTime: '09:55 AM' },
            ],
            mapUrlPlaceholder: `https://placehold.co/600x300.png`, // Placeholder image
            lastUpdated: new Date(),
        };
    }
    if (busIdentifier.toUpperCase() === 'RJ01PA1000') {
         return {
            busNumber: busIdentifier.toUpperCase(),
            routeName: 'Jaipur Local Route 7',
            operatorName: 'RSRTC',
            vehicleType: 'City Bus',
            currentLocationDescription: "Near Albert Hall Museum",
            nextStop: "SMS Hospital",
            etaNextStop: "5 mins",
            delayMinutes: 0,
            stops: [
                { name: "Chandpole Gate", eta: "Departed", status: 'Departed', scheduledTime: '10:00 AM' },
                { name: "MI Road", eta: "Arriving Now", status: 'Arriving', scheduledTime: '10:15 AM' },
                { name: "SMS Hospital", eta: "5 mins", status: 'Upcoming', scheduledTime: '10:22 AM' },
                { name: "Gopalpura Mod", eta: "15 mins", status: 'Upcoming', scheduledTime: '10:35 AM' },
            ],
            mapUrlPlaceholder: `https://placehold.co/600x300.png`,
            lastUpdated: new Date(),
        };
    }

    return null; // Not found
}

/**
 * Simulates fetching the live running status of a train.
 * @param trainIdentifier Train number or name.
 * @returns A promise resolving to the TrainLiveStatus or null if not found.
 */
export async function getTrainLiveStatus(trainIdentifier: string): Promise<TrainLiveStatus | null> {
    console.log(`Fetching live status for train: ${trainIdentifier}`);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay

    if (trainIdentifier === '12658' || trainIdentifier.toLowerCase().includes('bengaluru mail')) {
        return {
            trainNumber: "12658",
            trainName: "Bengaluru Mail",
            currentStatus: "Delayed by 12 mins",
            currentLocationDescription: "Departed Katpadi Jn (KPD), Next Arakkonam Jn (AJJ)",
            lastStationCode: "KPD",
            lastStationName: "Katpadi Jn",
            nextStationCode: "AJJ",
            nextStationName: "Arakkonam Jn",
            etaNextStation: "10:57 AM", 
            delayMinutes: 12,
            averageSpeed: 75,
            distanceToDestination: 105,
            route: [
                { stationName: "KSR Bengaluru City Jn", stationCode: "SBC", scheduledDeparture: "22:40", actualDeparture: "22:45", status: 'Departed', delayMinutes: 5, platform: 1, dayOfJourney: 1 },
                { stationName: "Bengaluru Cantt.", stationCode: "BNC", scheduledArrival: "22:50", actualArrival: "22:56", scheduledDeparture: "22:52", actualDeparture: "22:58", status: 'Departed', delayMinutes: 6, platform: 2, dayOfJourney: 1 },
                { stationName: "Jolarpettai Jn", stationCode: "JTJ", scheduledArrival: "01:08", actualArrival: "01:15", scheduledDeparture: "01:10", actualDeparture: "01:18", status: 'Departed', delayMinutes: 8, platform: 3, dayOfJourney: 2 },
                { stationName: "Katpadi Jn", stationCode: "KPD", scheduledArrival: "02:23", actualArrival: "02:35", scheduledDeparture: "02:25", actualDeparture: "02:40", status: 'Departed', delayMinutes: 15, platform: 2, dayOfJourney: 2 },
                { stationName: "Arakkonam Jn", stationCode: "AJJ", scheduledArrival: "03:18", status: 'Upcoming', delayMinutes: 12, platform: 1, dayOfJourney: 2 }, 
                { stationName: "Perambur", stationCode: "PER", scheduledArrival: "04:08", status: 'Upcoming', platform: 3, dayOfJourney: 2 },
                { stationName: "MGR Chennai Central", stationCode: "MAS", scheduledArrival: "04:30", status: 'Upcoming', platform: 5, dayOfJourney: 2 },
            ],
            mapUrlPlaceholder: `https://placehold.co/600x300.png`, 
            lastUpdated: new Date(),
        };
    }

     if (trainIdentifier === '22691' || trainIdentifier.toLowerCase().includes('rajdhani')) {
        return {
            trainNumber: "22691",
            trainName: "Rajdhani Express",
            currentStatus: "Arrived at Nagpur Jn",
            currentStationCode: "NGP",
            currentLocationDescription: "Arrived at Nagpur Jn (NGP)",
            lastStationCode: "BPQ",
            lastStationName: "Balharshah",
            nextStationCode: "BPL",
            nextStationName: "Bhopal Jn",
            etaNextStation: "19:50",
            delayMinutes: 0,
            averageSpeed: 90,
            distanceToDestination: 700,
            route: [
                 { stationName: "KSR Bengaluru City Jn", stationCode: "SBC", scheduledDeparture: "20:00", actualDeparture: "20:00", status: 'Departed', platform: 8, dayOfJourney: 1 },
                 { stationName: "SSS Hubballi Jn", stationCode: "UBL", scheduledArrival: "01:45", actualArrival: "01:45", scheduledDeparture: "01:55", actualDeparture: "01:55", status: 'Departed', platform: 1, dayOfJourney: 2 },
                 { stationName: "Balharshah", stationCode: "BPQ", scheduledArrival: "11:00", actualArrival: "11:00", scheduledDeparture: "11:05", actualDeparture: "11:05", status: 'Departed', platform: 2, dayOfJourney: 2 },
                 { stationName: "Nagpur Jn", stationCode: "NGP", scheduledArrival: "14:10", actualArrival: "14:10", scheduledDeparture: "14:15", status: 'Arrived', platform: 1, dayOfJourney: 2 },
                 { stationName: "Bhopal Jn", stationCode: "BPL", scheduledArrival: "19:50", status: 'Upcoming', platform: 3, dayOfJourney: 2 },
                 { stationName: "V Lakshmibai Jhansi Jn", stationCode: "VGLJ", scheduledArrival: "23:25", status: 'Upcoming', platform: 2, dayOfJourney: 2 },
                 { stationName: "Agra Cantt.", stationCode: "AGC", scheduledArrival: "02:00", status: 'Upcoming', platform: 1, dayOfJourney: 3 },
                 { stationName: "Hazrat Nizamuddin", stationCode: "NZM", scheduledArrival: "05:30", status: 'Upcoming', platform: 4, dayOfJourney: 3 },
            ],
            mapUrlPlaceholder: `https://placehold.co/600x300.png`,
            lastUpdated: new Date(),
        };
    }


    return null; // Not found
}
