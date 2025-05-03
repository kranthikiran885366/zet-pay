
/**
 * @fileOverview Service functions for fetching live tracking information.
 */

export interface BusStopStatus {
    name: string;
    eta: string; // e.g., "10:30 AM", "5 mins", "Departed"
    status: 'Departed' | 'Arriving' | 'Upcoming' | 'Skipped';
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
}

export interface TrainStopStatus {
    stationName: string;
    stationCode: string;
    scheduledArrival?: string; // e.g., "10:30"
    actualArrival?: string; // e.g., "10:35"
    scheduledDeparture?: string; // e.g., "10:32"
    actualDeparture?: string; // e.g., "10:37"
    delayMinutes?: number;
    status: 'Departed' | 'Arrived' | 'Skipped' | 'Upcoming';
    distanceFromSource?: number; // Optional distance
}

export interface TrainLiveStatus {
    trainNumber: string;
    trainName: string;
    currentStatus: string; // e.g., "Running On Time", "Delayed by 15 mins", "Arrived at Destination"
    currentLocationDescription: string; // e.g., "Approaching SBC", "Departed from KPD"
    lastStation: string; // Station Code
    lastStationName?: string; // Station Name
    nextStation: string; // Station Code
    nextStationName?: string; // Station Name
    etaNextStation: string; // e.g., "11:05 AM"
    delayMinutes?: number;
    route: TrainStopStatus[];
    mapUrlPlaceholder?: string; // Placeholder
    lastUpdated: Date;
}

/**
 * Simulates fetching the live status of a bus.
 * @param busIdentifier Service number or registration number.
 * @returns A promise resolving to the BusLiveStatus or null if not found.
 */
export async function getBusLiveStatus(busIdentifier: string): Promise<BusLiveStatus | null> {
    console.log(`Fetching live status for bus: ${busIdentifier}`);
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API delay

    // Mock Data (adjust based on identifier if needed)
    if (busIdentifier.toUpperCase() === 'KA01F1234' || busIdentifier === '500D') {
        return {
            busNumber: busIdentifier.toUpperCase(),
            routeName: 'Route 500D - Majestic to Silk Board',
            currentLocationDescription: "Near Forum Mall, Koramangala",
            nextStop: "St. John's Hospital",
            etaNextStop: "3 mins",
            delayMinutes: 2,
            stops: [
                { name: "Majestic", eta: "Departed", status: 'Departed' },
                { name: "Richmond Circle", eta: "Departed", status: 'Departed' },
                { name: "Forum Mall", eta: "Arriving", status: 'Arriving' },
                { name: "St. John's Hospital", eta: "3 mins", status: 'Upcoming' },
                { name: "Silk Board", eta: "15 mins", status: 'Upcoming' },
            ],
            mapUrlPlaceholder: `https://picsum.photos/seed/${busIdentifier}/600/300`, // Replace with actual map later
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

    // Mock Data
    if (trainIdentifier === '12658' || trainIdentifier.toLowerCase().includes('bengaluru mail')) {
        return {
            trainNumber: "12658",
            trainName: "Bengaluru Mail",
            currentStatus: "Delayed by 10 mins",
            currentLocationDescription: "Departed from Katpadi Jn (KPD)",
            lastStation: "KPD",
            lastStationName: "Katpadi Jn",
            nextStation: "AJJ",
            nextStationName: "Arakkonam Jn",
            etaNextStation: "10:55 AM", // Example ETA
            delayMinutes: 10,
            route: [
                { stationName: "KSR Bengaluru City Jn", stationCode: "SBC", scheduledDeparture: "22:40", actualDeparture: "22:45", status: 'Departed', delayMinutes: 5 },
                { stationName: "Bengaluru Cantt.", stationCode: "BNC", scheduledArrival: "22:50", actualArrival: "22:56", scheduledDeparture: "22:52", actualDeparture: "22:58", status: 'Departed', delayMinutes: 6 },
                { stationName: "Jolarpettai Jn", stationCode: "JTJ", scheduledArrival: "01:08", actualArrival: "01:15", scheduledDeparture: "01:10", actualDeparture: "01:18", status: 'Departed', delayMinutes: 8 },
                { stationName: "Katpadi Jn", stationCode: "KPD", scheduledArrival: "02:23", actualArrival: "02:35", scheduledDeparture: "02:25", actualDeparture: "02:40", status: 'Departed', delayMinutes: 15 },
                { stationName: "Arakkonam Jn", stationCode: "AJJ", scheduledArrival: "03:18", etaNextStation: "03:30", status: 'Upcoming', delayMinutes: 12 }, // Use etaNextStation here for display
                { stationName: "Perambur", stationCode: "PER", scheduledArrival: "04:08", status: 'Upcoming' },
                { stationName: "MGR Chennai Central", stationCode: "MAS", scheduledArrival: "04:30", status: 'Upcoming' },
            ].map(stop => ({...stop, actualArrival: stop.actualArrival || stop.etaNextStation})), // Use ETA if actual arrival not set for upcoming
            mapUrlPlaceholder: `https://picsum.photos/seed/${trainIdentifier}/600/300`, // Replace with actual map later
            lastUpdated: new Date(),
        };
    }

     if (trainIdentifier === '22691' || trainIdentifier.toLowerCase().includes('rajdhani')) {
        return {
            trainNumber: "22691",
            trainName: "Rajdhani Express",
            currentStatus: "Running On Time",
            currentLocationDescription: "Approaching Nagpur Jn (NGP)",
            lastStation: "BPQ",
            lastStationName: "Balharshah",
            nextStation: "NGP",
            nextStationName: "Nagpur Jn",
            etaNextStation: "14:10",
            delayMinutes: 0,
            route: [
                 { stationName: "KSR Bengaluru City Jn", stationCode: "SBC", scheduledDeparture: "20:00", actualDeparture: "20:00", status: 'Departed' },
                 { stationName: "SSS Hubballi Jn", stationCode: "UBL", scheduledArrival: "01:45", actualArrival: "01:45", scheduledDeparture: "01:55", actualDeparture: "01:55", status: 'Departed' },
                 { stationName: "Balharshah", stationCode: "BPQ", scheduledArrival: "11:00", actualArrival: "11:00", scheduledDeparture: "11:05", actualDeparture: "11:05", status: 'Departed' },
                 { stationName: "Nagpur Jn", stationCode: "NGP", scheduledArrival: "14:10", etaNextStation: "14:10", status: 'Upcoming' },
                 { stationName: "Bhopal Jn", stationCode: "BPL", scheduledArrival: "19:50", status: 'Upcoming' },
                 { stationName: "V Lakshmibai Jhansi Jn", stationCode: "VGLJ", scheduledArrival: "23:25", status: 'Upcoming' },
                 { stationName: "Agra Cantt.", stationCode: "AGC", scheduledArrival: "02:00", status: 'Upcoming' },
                 { stationName: "Hazrat Nizamuddin", stationCode: "NZM", scheduledArrival: "05:30", status: 'Upcoming' },
            ].map(stop => ({...stop, actualArrival: stop.actualArrival || stop.etaNextStation})),
            mapUrlPlaceholder: `https://picsum.photos/seed/${trainIdentifier}/600/300`,
            lastUpdated: new Date(),
        };
    }


    return null; // Not found
}
