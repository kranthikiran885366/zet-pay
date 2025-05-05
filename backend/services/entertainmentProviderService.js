// backend/services/entertainmentProviderService.js
// Placeholder for interacting with actual Movie, Event, Gaming Voucher APIs

// --- Mock Data (reuse/refine from frontend/controllers) ---
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
    'm2': {
         'c1': [{ time: "11:00 AM", format: "2D", price: 300 }],
         'c2': [{ time: "02:45 PM", format: "Dolby Atmos 2D", price: 350, isFillingFast: true }],
    }
};
const mockEvents = [
    { id: 'ev1', name: 'Standup Comedy Night', category: 'Comedy', date: '2024-08-20', city: 'Bangalore', venue: 'Comedy Club', price: 499, imageUrl: '/mock/comedy_event.jpg' },
    { id: 'ev2', name: 'Live Music Concert', category: 'Music', date: '2024-08-25', city: 'Mumbai', venue: 'Arena Stadium', price: 1200, imageUrl: '/mock/music_event.jpg' },
];
const mockGamingBrands = [
    { id: 'google-play', name: 'Google Play Recharge Code', logoUrl: '/logos/googleplay.png' },
    { id: 'freefire', name: 'Garena Free Fire Diamonds', logoUrl: '/logos/freefire.png' },
];
const mockGamingDenominations = {
    'google-play': [ { id: 'gp-100', value: 100 }, { id: 'gp-500', value: 500 }],
    'freefire': [ { id: 'ff-100d', value: 80, description: '100 Diamonds' }, { id: 'ff-310d', value: 240, description: '310 Diamonds' }],
};

// --- Movies ---
async function searchMovies({ city, date }) {
    console.log(`[Entertainment Provider Sim] Searching movies for City: ${city}, Date: ${date}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    // Simulate filtering based on city/date
    return mockMovies;
}

async function getMovieDetails({ movieId, city, date }) {
    console.log(`[Entertainment Provider Sim] Getting details for Movie: ${movieId}, City: ${city}, Date: ${date}`);
    await new Promise(resolve => setTimeout(resolve, 600));
    const movieDetails = mockMovies.find(m => m.id === movieId);
    if (!movieDetails) return null;

    // Simulate fetching showtimes for this movie in the city/date
    const cinemasShowing = Object.keys(mockShowtimesData[movieId] || {})
        .map(cinemaId => mockCinemas.find(c => c.id === cinemaId))
        .filter(c => c); // Filter out undefined

    const cinemaShowtimes = cinemasShowing.map(cinema => ({
        ...cinema,
        showtimes: mockShowtimesData[movieId]?.[cinema.id] || [],
    }));

    return { movieDetails, cinemas: cinemaShowtimes };
}

async function confirmMovieBooking(bookingData) {
    console.log(`[Entertainment Provider Sim] Confirming Movie Booking:`, bookingData);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const success = Math.random() > 0.1; // 90% success simulation
    if (success) {
        return {
            status: 'Confirmed',
            bookingId: `BMS_${Date.now()}`,
            seatNumbers: bookingData.seats.join(', '),
            message: 'Movie tickets booked successfully!',
        };
    } else {
        return { status: 'Failed', message: 'Booking failed due to unavailable seats.' };
    }
}

// --- Events ---
async function searchEvents({ city, category, date }) {
    console.log(`[Entertainment Provider Sim] Searching events for City: ${city}, Category: ${category}, Date: ${date}`);
    await new Promise(resolve => setTimeout(resolve, 700));
    // Simulate filtering
    let results = mockEvents.filter(ev => ev.city === city);
    if (category) results = results.filter(ev => ev.category === category);
    // Add date filtering if needed
    return results;
}

async function getEventDetails({ eventId }) {
     console.log(`[Entertainment Provider Sim] Getting details for Event: ${eventId}`);
     await new Promise(resolve => setTimeout(resolve, 400));
     return mockEvents.find(ev => ev.id === eventId) || null;
}

async function confirmEventBooking(bookingData) {
     console.log(`[Entertainment Provider Sim] Confirming Event Booking:`, bookingData);
     await new Promise(resolve => setTimeout(resolve, 1000));
     const success = Math.random() > 0.15; // 85% success simulation
     if (success) {
         return {
             status: 'Confirmed',
             bookingId: `EVT_${Date.now()}`,
             message: 'Event tickets booked successfully!',
         };
     } else {
         return { status: 'Failed', message: 'Event booking failed (e.g., sold out).' };
     }
}

// --- Gaming Vouchers ---
async function getGamingBrands() {
     console.log(`[Entertainment Provider Sim] Fetching Gaming Brands`);
     await new Promise(resolve => setTimeout(resolve, 300));
     return mockGamingBrands;
}

async function getGamingDenominations(brandId) {
    console.log(`[Entertainment Provider Sim] Fetching Denominations for Brand: ${brandId}`);
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockGamingDenominations[brandId] || [];
}

async function purchaseGamingVoucher(purchaseData) {
     console.log(`[Entertainment Provider Sim] Purchasing Gaming Voucher:`, purchaseData);
     await new Promise(resolve => setTimeout(resolve, 1200));
     const success = Math.random() > 0.05; // 95% success simulation
     if (success) {
         return {
             success: true,
             voucherCode: `VOUCHER_${Date.now()}`, // Simulate voucher code generation
             message: 'Voucher purchased successfully. Code sent via SMS/Email.',
         };
     } else {
         return { success: false, message: 'Voucher purchase failed (e.g., provider error).' };
     }
}


module.exports = {
    // Movies
    searchMovies,
    getMovieDetails,
    confirmMovieBooking,
    // Events
    searchEvents,
    getEventDetails,
    confirmEventBooking,
    // Gaming Vouchers
    getGamingBrands,
    getGamingDenominations,
    purchaseGamingVoucher,
};
