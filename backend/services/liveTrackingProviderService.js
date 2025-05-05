// backend/services/liveTrackingProviderService.js
// Placeholder for interacting with actual live tracking data sources (e.g., NTES, transport dept APIs, GPS aggregators)

/**
 * Fetches live status for a bus.
 * @param {string} identifier Bus number or service ID.
 * @returns {Promise<object|null>} Live status object or null.
 */
async function fetchBusLiveStatus(identifier) {
    console.log(`[Tracking Provider Sim] Fetching BUS status for: ${identifier}`);
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay

     // Mock Data (from controller example)
    if (identifier.toUpperCase() === 'KA01F1234' || identifier === '500D') {
        return {
            busNumber: identifier.toUpperCase(),
            routeName: 'Route 500D - Majestic to Silk Board',
            operatorName: 'BMTC',
            vehicleType: 'Volvo AC',
            currentLocationDescription: `Near Forum Mall, Koramangala (${new Date().toLocaleTimeString()})`, // Add time
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
            mapUrlPlaceholder: `https://picsum.photos/seed/${identifier}/600/300`,
            lastUpdated: new Date(),
        };
    }
    return null; // Not found
}

/**
 * Fetches live status for a train.
 * @param {string} identifier Train number or name.
 * @returns {Promise<object|null>} Live status object or null.
 */
async function fetchTrainLiveStatus(identifier) {
    console.log(`[Tracking Provider Sim] Fetching TRAIN status for: ${identifier}`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

    // Mock Data (from controller example)
     if (identifier === '12658' || identifier.toLowerCase().includes('bengaluru mail')) {
        // Return mock data for Bengaluru Mail
         return {
            trainNumber: "12658",
            trainName: "Bengaluru Mail",
            currentStatus: `Delayed by ${Math.floor(Math.random()*5 + 10)} mins`, // Randomize delay slightly
            currentLocationDescription: "Departed Katpadi Jn (KPD), Next Arakkonam Jn (AJJ)",
            lastStationCode: "KPD",
            lastStationName: "Katpadi Jn",
            nextStationCode: "AJJ",
            nextStationName: "Arakkonam Jn",
            etaNextStation: "10:57 AM",
            delayMinutes: 12,
            averageSpeed: 75,
            distanceToDestination: 105,
            route: [ /* ... route data ... */ ],
            mapUrlPlaceholder: `https://picsum.photos/seed/${identifier}/600/300`,
            lastUpdated: new Date(),
         };
    }
     if (identifier === '22691' || identifier.toLowerCase().includes('rajdhani')) {
         // Return mock data for Rajdhani
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
            route: [ /* ... route data ... */ ],
            mapUrlPlaceholder: `https://picsum.photos/seed/${identifier}/600/300`,
            lastUpdated: new Date(),
          };
     }

    return null; // Not found
}


module.exports = {
    fetchBusLiveStatus,
    fetchTrainLiveStatus,
};
