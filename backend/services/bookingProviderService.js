// backend/services/bookingProviderService.js
// Placeholder for interacting with actual Bus, Train, Flight, Movie, Event, Marriage Hall booking APIs/aggregators
const admin = require('firebase-admin');
const db = admin.firestore(); // Firestore instance
const { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp } = db; // Firestore functions

// Mock data (can be moved to separate files or a database)
const mockMovies = [
    { id: 'm1', title: "Action Movie Alpha", genre: "Action/Thriller", language: "English", rating: "UA", duration: "2h 15m", imageUrl: "/mock/alpha.jpg" },
    { id: 'm2', title: "Comedy Fest", genre: "Comedy/Romance", language: "Hindi", rating: "U", duration: "2h 05m", imageUrl: "/mock/comedy.jpg" },
];
const mockCinemas = [
    { id: 'c1', name: "PVR Orion Mall", location: "Rajajinagar", amenities: ['IMAX', 'Recliner Seats'] },
    { id: 'c2', name: "INOX Garuda Mall", location: "MG Road", amenities: ['Dolby Atmos'] },
];
const mockShowtimesData = {
    'm1': {
        'c1': [{ time: "10:00 AM", format: "IMAX 2D", price: 450 }, { time: "01:15 PM", format: "IMAX 2D", price: 450, isFillingFast: true }, { time: "07:45 PM", format: "IMAX 2D", price: 500, isAlmostFull: true }],
        'c2': [{ time: "11:30 AM", format: "Dolby Atmos 2D", price: 350 }, { time: "06:00 PM", format: "2D", price: 280 }],
    },
};
const mockEvents = [
    { id: 'ev1', name: 'Standup Comedy Night', category: 'Comedy', date: '2024-08-20', city: 'Bangalore', venue: 'Comedy Club', price: 499, imageUrl: '/mock/comedy_event.jpg' },
];

const mockMarriageVenues = [
    { id: 'v1', name: 'Grand Celebration Hall', location: 'Koramangala, Bangalore', city: 'Bangalore', capacity: 500, price: 100000, priceRange: '₹1 Lakh - ₹2 Lakh', rating: 4.8, imageUrl: '/images/venues/venue1.jpg', description: 'Spacious hall with modern amenities.', amenities: ['AC Hall', 'Catering Available', 'Parking', 'Valet Service'] },
    { id: 'v2', name: 'Star Convention Center', location: 'Hitech City, Hyderabad', city: 'Hyderabad', capacity: 1000, price: 250000, priceRange: '₹2 Lakh+', rating: 4.5, imageUrl: '/images/venues/venue2.jpg', description: 'Large convention center suitable for grand weddings.', amenities: ['Multiple Halls', 'Large Parking', 'In-house Decor'] },
    { id: 'v3', name: 'Palace Grounds Banquet', location: 'Palace Grounds, Bangalore', city: 'Bangalore', capacity: 800, price: 150000, priceRange: '₹1.5 Lakh+', rating: 4.6, imageUrl: '/images/venues/venue3.jpg', description: 'Elegant banquet hall with outdoor space.', amenities: ['Lawn Area', 'Bridal Suites', 'Sound System'] },
];

// --- Search ---
async function search(type, queryParams) {
    console.log(`[Booking Provider Sim] Searching ${type} with params:`, queryParams);
    await new Promise(resolve => setTimeout(resolve, 800));

    switch (type) {
        case 'movie':
             return mockMovies.filter(movie => mockShowtimesData[movie.id]);
        // Add other cases for bus, train, flight, event
        default:
            console.warn(`[Booking Provider Sim] Unsupported search type: ${type}`);
            return [];
    }
}

// --- Get Details ---
async function getDetails(type, id, queryParams) {
     console.log(`[Booking Provider Sim] Getting details for ${type} ID: ${id}, Params:`, queryParams);
    await new Promise(resolve => setTimeout(resolve, 500));

     switch (type) {
        case 'movie':
             const movieId = id;
             const movieDetails = mockMovies.find(m => m.id === movieId);
             if (!movieDetails) return null;
             const cinemasShowing = Object.keys(mockShowtimesData[movieId] || {})
                .map(cinemaId => mockCinemas.find(c => c.id === cinemaId))
                .filter(c => c);
             const cinemaShowtimes = cinemasShowing.map(cinema => ({
                ...cinema,
                showtimes: mockShowtimesData[movieId]?.[cinema.id] || [],
             }));
             return { movieDetails, cinemas: cinemaShowtimes };
        // Add other cases
        default:
            console.warn(`[Booking Provider Sim] Unsupported details type: ${type}`);
            return null;
    }
}

// --- Confirm Generic Booking ---
async function confirmBooking(type, bookingData) {
    console.log(`[Booking Provider Sim] Confirming ${type} booking:`, bookingData);
    await new Promise(resolve => setTimeout(resolve, 1800));

    const random = Math.random();
    if (random < 0.08) {
        return { status: 'Failed', message: `Booking failed. Seats might be unavailable or payment declined by provider.`, providerCode: 'PROVIDER_BOOKING_FAILED' };
    }
    if (random < 0.20) {
        return { status: 'Pending Confirmation', message: 'Booking submitted, awaiting confirmation from provider.' };
    }

    const bookingId = `${type.toUpperCase()}_${Date.now()}`;
    return {
        status: 'Confirmed',
        message: `${capitalize(type)} booking confirmed successfully.`,
        bookingId: bookingId,
        providerMessage: 'Success',
    };
}

// --- Marriage Venue Specific Functions ---
async function searchMarriageVenues(queryParams) {
    console.log(`[Booking Provider Sim] Searching Marriage Venues:`, queryParams);
    await new Promise(resolve => setTimeout(resolve, 600));
    let results = mockMarriageVenues;
    if (queryParams.city) {
        results = results.filter(v => v.city.toLowerCase() === queryParams.city.toLowerCase());
    }
    if (queryParams.guests) {
        const [min, max] = queryParams.guests.split('-').map(Number);
        if (max === undefined && min) { // Single number like "1000+"
            results = results.filter(v => v.capacity >= min);
        } else if (min && max) {
            results = results.filter(v => v.capacity >= min && v.capacity <= max);
        } else if (min) { // Only min specified
             results = results.filter(v => v.capacity >= min);
        }
    }
    // TODO: Add date availability check (complex, requires calendar logic or DB query)
    return results;
}

async function getMarriageVenueDetails(venueId) {
    console.log(`[Booking Provider Sim] Getting Marriage Venue Details for ID: ${venueId}`);
    await new Promise(resolve => setTimeout(resolve, 400));
    const venue = mockMarriageVenues.find(v => v.id === venueId);
    return venue ? { venueDetails: venue } : null; // Wrap in venueDetails for consistency if getBookingDetails expects it
}

async function confirmMarriageVenueBooking(bookingDetails) {
    const { venueId, userId, date, guestCount, userName, paymentTransactionId } = bookingDetails;
    console.log(`[Booking Provider Sim] Confirming Marriage Venue Booking: Venue ${venueId}, User ${userId}`);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate availability check & confirmation
    const venue = mockMarriageVenues.find(v => v.id === venueId);
    if (!venue) {
        return { status: 'Failed', message: 'Venue not found.' };
    }
    // Simple random success/failure
    const random = Math.random();
    if (random < 0.1) {
        return { status: 'Failed', message: 'Selected date/slot is no longer available for this venue.' };
    }

    // Save booking to Firestore (conceptual)
    const marriageBookingsRef = collection(db, 'marriageBookings');
    const bookingDocRef = await addDoc(marriageBookingsRef, {
        ...bookingDetails,
        status: venue.requiresApproval ? 'Pending Approval' : 'Confirmed', // Use requiresApproval from mock
        bookingFeePaid: !!paymentTransactionId, // True if booking fee transaction ID exists
        createdAt: serverTimestamp(),
    });

    console.log(`[Booking Provider Sim] Marriage venue booking record ${bookingDocRef.id} created. Status: ${venue.requiresApproval ? 'Pending Approval' : 'Confirmed'}.`);
    return {
        status: venue.requiresApproval ? 'Pending Approval' : 'Confirmed',
        bookingId: bookingDocRef.id,
        message: `Booking request for ${venue.name} submitted. ${venue.requiresApproval ? 'Awaiting venue approval.' : 'Confirmed.'}`,
        providerMessage: 'Success',
    };
}


// --- Cancel Booking ---
async function cancelBooking(type, bookingId, userId) {
     console.log(`[Booking Provider Sim] Cancelling ${type} booking ID: ${bookingId} for user ${userId}`);
     await new Promise(resolve => setTimeout(resolve, 1000));
     const isCancellable = Math.random() > 0.15;
     const refundPercentage = isCancellable ? (Math.random() * 0.5 + 0.5) : 0;
     const originalAmount = 1000;
     const refundAmount = Math.floor(originalAmount * refundPercentage);

     if (isCancellable) {
         return { success: true, message: `Cancellation successful. Refund of ₹${refundAmount} processed.`, refundAmount };
     } else {
         return { success: false, message: 'Cancellation failed (e.g., non-refundable or too close to event).' };
     }
}


module.exports = {
    search,
    getDetails,
    confirmBooking,
    cancelBooking,
    searchMarriageVenues,
    getMarriageVenueDetails,
    confirmMarriageVenueBooking,
};

function capitalize(s) {
  return typeof s === 'string' && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// Mock seat generation (simplified, reuse from movie controller logic if possible)
const generateMockSeats = (busType, basePrice) => { /* ... (same as before) ... */ };
