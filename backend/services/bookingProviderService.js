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

const mockFlightsData = [
    { id: 'f1', airline: 'IndiGo', flightNumber: '6E 202', departureAirport: 'BLR', arrivalAirport: 'DEL', departureTime: '06:00', arrivalTime: '08:45', duration: '2h 45m', stops: 0, price: 4500, refundable: true, baggage: { cabin: '7kg', checkin: '15kg' }, imageUrl: '/logos/indigo.png' },
    { id: 'f2', airline: 'Vistara', flightNumber: 'UK 810', departureAirport: 'BLR', arrivalAirport: 'DEL', departureTime: '07:30', arrivalTime: '10:10', duration: '2h 40m', stops: 0, price: 5200, refundable: true, baggage: { cabin: '7kg', checkin: '20kg' }, imageUrl: '/logos/vistara.png' },
    { id: 'f3', airline: 'Air India', flightNumber: 'AI 505', departureAirport: 'BLR', arrivalAirport: 'DEL', departureTime: '09:00', arrivalTime: '11:50', duration: '2h 50m', stops: 0, price: 4800, refundable: false, baggage: { cabin: '8kg', checkin: '20kg' }, imageUrl: '/logos/airindia.png' },
    { id: 'f4', airline: 'SpiceJet', flightNumber: 'SG 804', departureAirport: 'BLR', arrivalAirport: 'DEL', departureTime: '11:15', arrivalTime: '14:00', duration: '2h 45m', stops: 0, price: 4350, refundable: false, baggage: { cabin: '7kg', checkin: '15kg' }, imageUrl: '/logos/spicejet.png' },
    { id: 'f5', airline: 'IndiGo', flightNumber: '6E 5301', departureAirport: 'BLR', arrivalAirport: 'BOM', departureTime: '14:00', arrivalTime: '15:45', duration: '1h 45m', stops: 0, price: 3200, refundable: true, baggage: { cabin: '7kg', checkin: '15kg' }, imageUrl: '/logos/indigo.png' },
    { id: 'f6', airline: 'Akasa Air', flightNumber: 'QP 1102', departureAirport: 'DEL', arrivalAirport: 'BLR', departureTime: '17:00', arrivalTime: '19:45', duration: '2h 45m', stops: 0, price: 4700, refundable: true, baggage: { cabin: '7kg', checkin: '15kg' }, imageUrl: '/logos/akasa.png' },
];


// Enhanced Mock Marriage Venues with more details
const mockMarriageVenues = [
    { id: 'v1', name: 'Grand Celebration Hall', location: 'Koramangala, Bangalore', city: 'Bangalore', capacity: 500, price: 100000, priceRange: '₹1 Lakh - ₹2 Lakh', rating: 4.8, imageUrl: '/images/venues/venue1.jpg', description: 'Spacious hall with modern amenities, perfect for mid-sized weddings and receptions. Offers customizable decor packages.', amenities: ['AC Hall', 'Catering Available', 'Parking (100 cars)', 'Valet Service', 'Bridal Suite', 'Sound System'], contact: '9876500001', requiresApproval: true, bookingFee: 25000 },
    { id: 'v2', name: 'Star Convention Center', location: 'Hitech City, Hyderabad', city: 'Hyderabad', capacity: 1000, price: 250000, priceRange: '₹2 Lakh - ₹5 Lakh', rating: 4.5, imageUrl: '/images/venues/venue2.jpg', description: 'Large convention center suitable for grand weddings. Multiple halls available for different functions. State-of-the-art lighting.', amenities: ['Multiple Halls', 'Large Parking (300 cars)', 'In-house Decor', 'Wheelchair Accessible', 'Generator Backup'], contact: '9876500002', requiresApproval: true, bookingFee: 50000 },
    { id: 'v3', name: 'Palace Grounds Banquet', location: 'Palace Grounds, Bangalore', city: 'Bangalore', capacity: 800, price: 150000, priceRange: '₹1.5 Lakh - ₹3 Lakh', rating: 4.6, imageUrl: '/images/venues/venue3.jpg', description: 'Elegant banquet hall with a sprawling outdoor lawn area. Ideal for both indoor and outdoor ceremonies.', amenities: ['Lawn Area', 'Bridal Suites', 'Sound System', 'Projector', 'In-house Catering Optional'], contact: '9876500003', requiresApproval: false, bookingFee: 0 },
    { id: 'v4', name: 'The Royal Gardens', location: 'ECR, Chennai', city: 'Chennai', capacity: 300, price: 80000, priceRange: '₹80k - ₹1.5 Lakh', rating: 4.3, imageUrl: '/images/venues/venue4.jpg', description: 'Beautiful garden venue perfect for intimate weddings and pre-wedding functions. Beach access available.', amenities: ['Outdoor Garden', 'Beach Access', 'Small Banquet Hall', 'Parking (50 cars)'], contact: '9876500004', requiresApproval: false, bookingFee: 10000 },
];


// --- Search ---
async function search(type, queryParams) {
    console.log(`[Booking Provider Sim] Searching ${type} with params:`, queryParams);
    await new Promise(resolve => setTimeout(resolve, 800));

    switch (type) {
        case 'movie':
             return mockMovies.filter(movie => mockShowtimesData[movie.id]);
        case 'flight':
            // Simulate filtering flights based on from, to, and date
            const { from, to, departureDate } = queryParams;
            // In a real scenario, date matching would be more complex (checking if flights operate on that day)
            return mockFlightsData.filter(flight =>
                flight.departureAirport === from && flight.arrivalAirport === to
            ).map(f => ({ ...f, type: 'flight' })); // Ensure 'type' field is present
        // Add other cases for bus, train, event
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
             return { movieDetails, cinemas: cinemaShowtimes, type: 'movie' };
        case 'flight':
            const flight = mockFlightsData.find(f => f.id === id);
            return flight ? { ...flight, type: 'flight' } : null; // Ensure 'type' field
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

    // Simulate success/failure based on type or bookingData
    const random = Math.random();
    if (type === 'flight' && random < 0.10) { // Reduced failure chance for flights
        return { status: 'Failed', message: `Flight booking failed. Seats might be unavailable or payment declined by airline.`, providerCode: 'AIRLINE_BOOKING_FAILED' };
    }
    if (random < 0.05) { // Reduced generic failure
        return { status: 'Failed', message: `Booking failed. Seats might be unavailable or payment declined by provider.`, providerCode: 'PROVIDER_BOOKING_FAILED' };
    }
    if (random < 0.15) { // Reduced pending chance
        return { status: 'Pending Confirmation', message: 'Booking submitted, awaiting confirmation from provider.' };
    }

    const bookingId = `${type.toUpperCase()}_${Date.now()}`;
    let providerConfirmationDetails = {};

    if (type === 'flight' && bookingData.selection) {
        const selectedFlight = mockFlightsData.find(f => f.id === bookingData.selection.flightId);
        providerConfirmationDetails = {
            pnr: `FLPNR${Date.now().toString().slice(-6)}`,
            flightDetails: selectedFlight ? {
                airline: selectedFlight.airline,
                flightNumber: selectedFlight.flightNumber,
                departureTime: selectedFlight.departureTime,
                arrivalTime: selectedFlight.arrivalTime,
                departureAirport: selectedFlight.departureAirport,
                arrivalAirport: selectedFlight.arrivalAirport,
            } : undefined,
        };
    } else if (type === 'movie' && bookingData.seats) {
        providerConfirmationDetails = { seatNumbers: bookingData.seats.join(', ') };
    } else if (type === 'bus' && bookingData.selection?.seats) {
        providerConfirmationDetails = { seatNumbers: bookingData.selection.seats.join(', ') };
    }
    // Add for train

    return {
        status: 'Completed', // Use 'Completed' for transaction log consistency
        message: `${capitalize(type)} booking confirmed successfully.`,
        bookingId: bookingId,
        providerMessage: 'Success',
        ...providerConfirmationDetails,
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
        const guestRange = queryParams.guests.split('-');
        const minGuests = parseInt(guestRange[0].replace('+', ''), 10);
        const maxGuests = guestRange[1] ? parseInt(guestRange[1], 10) : (guestRange[0].includes('+') ? Infinity : minGuests);

        results = results.filter(v => v.capacity >= minGuests && v.capacity <= maxGuests);
    }
    // TODO: Add date availability check (complex, requires calendar logic or DB query with venue schedules)
    console.log(`[Booking Provider Sim] Found ${results.length} marriage venues.`);
    return results.map(v => ({...v, type: 'marriage'})); // Ensure type is present
}

async function getMarriageVenueDetails(venueId) {
    console.log(`[Booking Provider Sim] Getting Marriage Venue Details for ID: ${venueId}`);
    await new Promise(resolve => setTimeout(resolve, 400));
    const venue = mockMarriageVenues.find(v => v.id === venueId);
    return venue ? { ...venue, type: 'marriage' } : null; // Ensure type is present
}

async function confirmMarriageVenueBooking(bookingDetails) {
    const { venueId, userId, date, guestCount, userName, userContact, userEmail, specialRequests, paymentTransactionId } = bookingDetails;
    console.log(`[Booking Provider Sim] Storing Marriage Venue Booking: Venue ${venueId}, User ${userId}`);

    const venue = mockMarriageVenues.find(v => v.id === venueId);
    if (!venue) {
        return { status: 'Failed', message: 'Selected venue not found.' };
    }
     // Simulate availability check & confirmation (can be more complex)
    const isAvailable = Math.random() > 0.1; // 90% chance available

    if (!isAvailable) {
         return { status: 'Failed', message: 'Sorry, the selected date/slot is no longer available for this venue.' };
    }


    // Save booking to Firestore 'marriageBookings' collection
    const marriageBookingsRef = collection(db, 'marriageBookings');
    const bookingStatus = venue.requiresApproval ? 'Pending Approval' : 'Confirmed';
    try {
        const newBookingDocRef = await addDoc(marriageBookingsRef, {
            userId,
            venueId,
            venueName: venue.name,
            eventDate: date, // Store as string YYYY-MM-DD
            guestCount: guestCount || 'Not Specified',
            groupLeaderName: userName, // Using userName as leader
            groupLeaderMobile: userContact,
            groupLeaderEmail: userEmail,
            specialRequests: specialRequests || '',
            status: bookingStatus,
            bookingFeePaid: !!paymentTransactionId,
            paymentTransactionId: paymentTransactionId || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        console.log(`[Booking Provider Sim] Marriage venue booking record ${newBookingDocRef.id} created in Firestore. Status: ${bookingStatus}.`);
        return {
            status: bookingStatus,
            bookingId: newBookingDocRef.id, // Return Firestore document ID as bookingId
            message: `Booking request for ${venue.name} submitted. ${bookingStatus === 'Pending Approval' ? 'Awaiting venue approval.' : 'Your booking is confirmed!'}`,
            providerMessage: 'Success', // Generic success from provider
        };
    } catch (error) {
        console.error("[Booking Provider Sim] Error saving marriage booking to Firestore:", error);
        return { status: 'Failed', message: 'Failed to save booking. Please try again.' };
    }
}


// --- Cancel Booking ---
async function cancelBooking(type, bookingId, userId) {
     console.log(`[Booking Provider Sim] Cancelling ${type} booking ID: ${bookingId} for user ${userId}`);
     await new Promise(resolve => setTimeout(resolve, 1000));

     // In a real scenario, check if bookingId exists in Firestore and belongs to userId
     // For marriage bookings, update status to 'Cancelled'
     if (type === 'marriage') {
         try {
             const bookingDocRef = doc(db, 'marriageBookings', bookingId);
             const bookingSnap = await getDoc(bookingDocRef);
             if (bookingSnap.exists() && bookingSnap.data().userId === userId) {
                 await bookingDocRef.update({ status: 'Cancelled', updatedAt: serverTimestamp() });
                 // TODO: Handle refund if applicable based on original payment and cancellation policy
                  const originalBookingData = bookingSnap.data();
                  const refundAmount = originalBookingData.bookingFeePaid ? (originalBookingData.totalAmount * 0.8) : 0; // Example 80% refund
                 return { success: true, message: `Marriage venue booking ${bookingId} cancelled. Refund of ₹${refundAmount.toFixed(2)} initiated if applicable.`, refundAmount: refundAmount, originalPaymentTxId: originalBookingData.paymentTransactionId };
             } else {
                return { success: false, message: 'Booking not found or permission denied for cancellation.' };
             }
         } catch (error) {
             console.error(`[Booking Provider Sim] Error cancelling marriage booking ${bookingId} in Firestore:`, error);
             return { success: false, message: 'Failed to cancel marriage booking due to system error.' };
         }
     }

     // Generic cancellation simulation for other types
     const isCancellable = Math.random() > 0.15;
     const refundPercentage = isCancellable ? (Math.random() * 0.5 + 0.5) : 0;
     const originalAmount = 1000; // Mock original amount for generic
     const genericRefundAmount = Math.floor(originalAmount * refundPercentage);

     if (isCancellable) {
         return { success: true, message: `Cancellation successful. Refund of ₹${genericRefundAmount} processed.`, refundAmount: genericRefundAmount };
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
