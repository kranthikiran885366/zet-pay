
import type { BusRoute, TrainAvailability, FlightListing, CarListing, BikeListing, EVStation, RestStop, MarriageVenue } from '@/services/types'; // Updated to use types from services/types

export const mockCities: string[] = ['Bangalore', 'Hyderabad', 'Chennai', 'Mumbai', 'Delhi', 'Pune', 'Kolkata', 'Goa (GOI)'];

export const mockBusOperators: string[] = ['KSRTC', 'RedBus Express', 'VRL Travels', 'Orange Tours', 'SRS Travels'];

export const mockBusRoutes: BusRoute[] = [
    { id: 'bus1', operator: 'KSRTC', type: 'AC Sleeper', serviceType: 'Volvo AC Sleeper', from: 'Bangalore', to: 'Chennai', departureTime: '21:00', arrivalTime: '05:00', duration: '8h 0m', price: 850, seatsAvailable: 15, rating: 4.2, amenities: ['Live Tracking', 'Charging Point', 'Blanket', 'Water Bottle'], boardingPoints: ['Majestic', 'Silk Board', 'Madiwala'], droppingPoints: ['Koyambedu', 'Guindy', 'Tambaram'], hasLiveTracking: true },
    { id: 'bus2', operator: 'RedBus Express', type: 'Non-AC Seater', serviceType: 'Non-AC Seater', from: 'Hyderabad', to: 'Vijayawada', departureTime: '22:30', arrivalTime: '06:30', duration: '8h 0m', price: 500, seatsAvailable: 30, rating: 3.8, amenities: ['Fan', 'Water Bottle'], boardingPoints: ['Madiwala', 'Electronic City'], droppingPoints: ['Perungalathur', 'Tambaram'], hasLiveTracking: false },
];

export const mockStations = [
    { code: 'SBC', name: 'KSR Bengaluru City Jn' },
    { code: 'MAS', name: 'MGR Chennai Central' },
    { code: 'HYB', name: 'Hyderabad Deccan Nampally' },
];
export const mockQuotas = ['GENERAL', 'TATKAL', 'LADIES'];
export const mockClasses = ['SL', '3A', '2A', '1A'];

export const mockTrainAvailability: TrainAvailability[] = [
    {
        trainNumber: '12658', trainName: 'Bengaluru Mail', departureStation: 'SBC', arrivalStation: 'MAS', departureTime: '22:40', arrivalTime: '04:30', duration: '5h 50m', runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], classesAvailable: ['SL', '3A', '2A', '1A'],
        availability: {
            'SL': { status: 'WL', number: 15, date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z', confirmProbability: 80 },
            '3A': { status: 'AVAILABLE', number: 50, date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z' },
        }
    },
];

export const mockPassengerCounts = [1, 2, 3, 4, 5, 6];

export const mockEVStations: EVStation[] = [
    { id: 'stn1', name: 'ChargeGrid Hub - Koramangala', address: '123, 1st Main, Koramangala', distance: '1.2 km', connectors: [{type: 'CCS2', power: '50kW', status: 'Available'}, {type: 'CHAdeMO', power: '40kW', status: 'In Use'}], price: '₹18/kWh', amenities: ['Cafe', 'Wi-Fi'], imageUrl: 'https://picsum.photos/seed/ev_station1/400/200' },
];

export const mockRestStopsData: RestStop[] = [
    { id: 'rs1', name: 'Highway King - Behror', highway: 'NH48 (Delhi-Jaipur)', locationDesc: 'Approx. 130km from Delhi', amenities: ['Food Court', 'Clean Restrooms', 'Parking', 'Fuel Station', 'Dhaba'], rating: 4.2, imageUrl: 'https://picsum.photos/seed/reststop1/400/200', services: [{name: 'EV Charging', available: true}, {name: 'Air Filling', available: true}] },
];

export const mockCarsData: CarListing[] = [
    { id: 'c1', name: 'Maruti Swift', type: 'Hatchback', transmission: 'Manual', fuelType: 'Petrol', seats: 5, imageUrl: 'https://picsum.photos/seed/swift/300/200', pricePerDay: 1200, rating: 4.2, location: 'Airport Road', kmsLimit: '150 Kms/day', isAvailable: true },
];

export const mockBikesData: BikeListing[] = [
    { id: 'b1', name: 'Honda Activa 6G', type: 'Scooter', imageUrl: 'https://picsum.photos/seed/activa/300/200', pricePerHour: 30, pricePerDay: 300, location: 'Koramangala Hub', availability: 'Available', requiresHelmet: true },
];

export const mockMarriageVenuesData: MarriageVenue[] = [
    { 
        id: 'v1', name: 'Grand Celebration Hall', type: 'marriage', location: 'Koramangala, Bangalore', city: 'Bangalore', capacity: 500, price: 100000, priceRange: '₹1 Lakh - ₹2 Lakh', rating: 4.8, imageUrl: '/images/venues/venue1.jpg', 
        description: 'Spacious hall with modern amenities, perfect for mid-sized weddings and receptions. Offers customizable decor packages.', 
        amenities: ['AC Hall', 'Catering Available', 'Parking (100 cars)', 'Valet Service', 'Bridal Suite', 'Sound System'], 
        contact: '9876500001', requiresApproval: true, bookingFee: 25000, hallType: 'Banquet', hasParking: true, parkingCapacity: 100,
        cateringOptions: [
            { id: 'cat_veg_std', name: 'Standard Veg Buffet', price: 800, description: 'Per plate, min 100 guests' },
            { id: 'cat_nonveg_prem', name: 'Premium Non-Veg Buffet', price: 1500, description: 'Per plate, min 100 guests' }
        ],
        decorationPackages: [
            { id: 'dec_floral_basic', name: 'Basic Floral Decor', price: 50000 },
            { id: 'dec_theme_royal', name: 'Royal Theme Decor', price: 120000 }
        ],
        rulesAndPolicies: "No outside food/beverages allowed. Music allowed until 10 PM. Firecrackers strictly prohibited.",
        reviews: [{ reviewer: 'Priya S.', rating: 5, comment: 'Amazing venue and great service!', date: '2024-07-15' }],
        cancellationPolicy: "Full refund if cancelled 30 days prior. 50% refund if cancelled 15 days prior. No refund thereafter.",
        simulatedBookedDates: ['2024-09-15', '2024-09-22']
    },
    { 
        id: 'v2', name: 'Star Convention Center', type: 'marriage', location: 'Hitech City, Hyderabad', city: 'Hyderabad', capacity: 1000, price: 250000, priceRange: '₹2 Lakh - ₹5 Lakh', rating: 4.5, imageUrl: '/images/venues/venue2.jpg', 
        description: 'Large convention center suitable for grand weddings.', 
        amenities: ['Multiple Halls', 'Large Parking (300 cars)', 'In-house Decor'], 
        contact: '9876500002', requiresApproval: true, bookingFee: 50000, hallType: 'Convention Center', hasParking: true, parkingCapacity: 300,
        cateringOptions: [{ id: 'cat_grand', name: 'Grand Buffet (Veg/Non-Veg)', price: 2000, description: 'Per plate, min 200 guests' }],
        decorationPackages: [{ id: 'dec_modern', name: 'Modern Elegant Decor', price: 200000 }],
        rulesAndPolicies: "DJ allowed. Valet parking mandatory for over 500 guests.",
        reviews: [{ reviewer: 'Raj K.', rating: 4, comment: 'Spacious, but catering could be better.', date: '2024-06-20' }],
        cancellationPolicy: "75% refund if cancelled 45 days prior. No refund if cancelled within 30 days.",
        simulatedBookedDates: ['2024-10-05', '2024-10-10']
    },
];

    