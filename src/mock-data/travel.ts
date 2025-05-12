
import type { BusRoute, TrainAvailability, FlightListing, CarListing, BikeListing } from '@/services/booking'; // Assuming these types are defined

export const mockCities: string[] = ['Bangalore', 'Chennai', 'Hyderabad', 'Mumbai', 'Delhi', 'Pune', 'Kolkata', 'Goa (GOI)'];

export const mockBusOperators: string[] = ['KSRTC', 'RedBus Express', 'VRL Travels', 'Orange Tours', 'SRS Travels'];

export const mockBusRoutes: BusRoute[] = [
    { id: 'bus1', operator: 'KSRTC', type: 'AC Sleeper', departureTime: '21:00', arrivalTime: '05:00', duration: '8h 0m', price: 850, seatsAvailable: 15, rating: 4.2, boardingPoints: ['Majestic', 'Silk Board'], droppingPoints: ['Koyambedu', 'Guindy'] },
    { id: 'bus2', operator: 'RedBus Express', type: 'Non-AC Seater', departureTime: '22:30', arrivalTime: '06:30', duration: '8h 0m', price: 500, seatsAvailable: 30, rating: 3.8, boardingPoints: ['Madiwala', 'Electronic City'], droppingPoints: ['Perungalathur', 'Tambaram'] },
    { id: 'bus3', operator: 'VRL Travels', type: 'Volvo Multi-Axle', departureTime: '20:00', arrivalTime: '04:30', duration: '8h 30m', price: 1100, seatsAvailable: 5, rating: 4.5, boardingPoints: ['Anand Rao Circle', 'Hebbal'], droppingPoints: ['Koyambedu', 'Ashok Pillar'] },
    { id: 'bus4', operator: 'Orange Tours', type: 'AC Seater/Sleeper', departureTime: '21:45', arrivalTime: '05:30', duration: '7h 45m', price: 950, seatsAvailable: 22, rating: 4.0, boardingPoints: ['Majestic', 'Madiwala'], droppingPoints: ['Koyambedu', 'Vadapalani'] },
];

export const mockStations = [
    { code: 'SBC', name: 'KSR Bengaluru City Jn' },
    { code: 'MAS', name: 'MGR Chennai Central' },
    { code: 'HYB', name: 'Hyderabad Deccan Nampally' },
    { code: 'CSMT', name: 'Mumbai CSMT' },
    { code: 'NDLS', name: 'New Delhi' },
    { code: 'HWH', name: 'Howrah Jn' },
];
export const mockQuotas = ['GENERAL', 'TATKAL', 'LADIES', 'PREMIUM TATKAL', 'PHYSICALLY HANDICAPPED'];
export const mockClasses = ['SL', '3A', '2A', '1A', 'CC', 'EC', '2S'];

export const mockTrainAvailability: TrainAvailability[] = [
    {
        trainNumber: '12658', trainName: 'Bengaluru Mail', departureStation: 'SBC', arrivalStation: 'MAS', departureTime: '22:40', arrivalTime: '04:30', duration: '5h 50m', runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], classesAvailable: ['SL', '3A', '2A', '1A'],
        availability: {
            'SL': { status: 'WL', number: 15, date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z', confirmProbability: 80 },
            '3A': { status: 'AVAILABLE', number: 50, date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z' },
            '2A': { status: 'AVAILABLE', number: 10, date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z' },
            '1A': { status: 'RAC', number: 2, date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z', confirmProbability: 95 },
        }
    },
     {
        trainNumber: '22691', trainName: 'Rajdhani Express', departureStation: 'SBC', arrivalStation: 'NDLS', departureTime: '20:00', arrivalTime: '05:30 +2d', duration: '33h 30m', runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], classesAvailable: ['3A', '2A', '1A'],
        availability: {
            '3A': { status: 'AVAILABLE', number: 25, date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z' },
            '2A': { status: 'WL', number: 5, date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z', confirmProbability: 60 },
            '1A': { status: 'NOT AVAILABLE', date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z' },
        }
    },
];

export const mockPassengerCounts = [1, 2, 3, 4, 5, 6];

export interface EVStation {
    id: string;
    name: string;
    address: string;
    distance: string;
    connectors: { type: string; power: string; status: 'Available' | 'In Use' | 'Offline' }[];
    price?: string;
    amenities?: string[];
    imageUrl?: string;
}

export const mockEVStations: EVStation[] = [
    { id: 'stn1', name: 'ChargeGrid Hub - Koramangala', address: '123, 1st Main, Koramangala', distance: '1.2 km', connectors: [{type: 'CCS2', power: '50kW', status: 'Available'}, {type: 'CHAdeMO', power: '40kW', status: 'In Use'}], price: '₹18/kWh', amenities: ['Cafe', 'Wi-Fi'], imageUrl: 'https://picsum.photos/seed/ev_station1/400/200' },
    { id: 'stn2', name: 'Tata Power EV - Indiranagar', address: '45, 100ft Road, Indiranagar', distance: '2.5 km', connectors: [{type: 'Type2 AC', power: '22kW', status: 'Available'}, {type: 'CCS2', power: '60kW', status: 'Available'}], price: '₹20/kWh', amenities: ['Restroom'], imageUrl: 'https://picsum.photos/seed/ev_station2/400/200' },
];

export interface RestStop {
    id: string;
    name: string;
    highway: string;
    locationDesc: string;
    amenities: string[];
    rating?: number;
    imageUrl?: string;
    services?: { name: string, available: boolean }[];
}
export const mockRestStopsData: RestStop[] = [
    { id: 'rs1', name: 'Highway King - Behror', highway: 'NH48 (Delhi-Jaipur)', locationDesc: 'Approx. 130km from Delhi', amenities: ['Food Court', 'Clean Restrooms', 'Parking', 'Fuel Station', 'Dhaba'], rating: 4.2, imageUrl: 'https://picsum.photos/seed/reststop1/400/200', services: [{name: 'EV Charging', available: true}, {name: 'Air Filling', available: true}] },
    { id: 'rs2', name: 'A1 Plaza - Karnal', highway: 'NH44 (Delhi-Chandigarh)', locationDesc: 'Karnal Bypass', amenities: ['Food Court', 'Restrooms', 'Parking', 'ATM', 'Rooms'], rating: 4.0, imageUrl: 'https://picsum.photos/seed/reststop2/400/200' },
];

export const mockCarsData: CarListing[] = [
    { id: 'c1', name: 'Maruti Swift', type: 'Hatchback', transmission: 'Manual', fuelType: 'Petrol', seats: 5, imageUrl: 'https://picsum.photos/seed/swift/300/200', pricePerDay: 1200, rating: 4.2, location: 'Airport Road', kmsLimit: '150 Kms/day', isAvailable: true },
    { id: 'c2', name: 'Honda City', type: 'Sedan', transmission: 'Automatic', fuelType: 'Petrol', seats: 5, imageUrl: 'https://picsum.photos/seed/city/300/200', pricePerDay: 1800, rating: 4.5, location: 'Koramangala', kmsLimit: '200 Kms/day', isAvailable: true },
    { id: 'c3', name: 'Toyota Innova Crysta', type: 'SUV', transmission: 'Manual', fuelType: 'Diesel', seats: 7, imageUrl: 'https://picsum.photos/seed/innova/300/200', pricePerDay: 2500, rating: 4.6, location: 'Majestic', kmsLimit: '250 Kms/day', isAvailable: true },
];

export const mockBikesData: BikeListing[] = [
    { id: 'b1', name: 'Honda Activa 6G', type: 'Scooter', imageUrl: 'https://picsum.photos/seed/activa/300/200', pricePerHour: 30, pricePerDay: 300, location: 'Koramangala Hub', availability: 'Available', requiresHelmet: true },
    { id: 'b2', name: 'Bounce Infinity E1', type: 'Electric', imageUrl: 'https://picsum.photos/seed/bounce/300/200', pricePerHour: 25, pricePerDay: 250, location: 'Indiranagar Metro', availability: 'Available', batteryPercent: 85, requiresHelmet: true },
];
