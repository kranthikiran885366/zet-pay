
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
    { id: 'google-play', name: 'Google Play Recharge Code', logoUrl: '/logos/googleplay.png', requiresPlayerId: false, allowCustomAmount: true, customMinAmount: 10, customMaxAmount: 5000 },
    { id: 'freefire', name: 'Garena Free Fire Diamonds', logoUrl: '/logos/freefire.png', requiresPlayerId: true, allowCustomAmount: false },
];
const mockGamingDenominations = {
    'google-play': [ { id: 'gp-100', value: 100 }, { id: 'gp-500', value: 500 }],
    'freefire': [ { id: 'ff-100d', value: 80, description: '100 Diamonds' }, { id: 'ff-310d', value: 240, description: '310 Diamonds' }],
};

const mockDigitalVoucherBrands = [
    { id: 'amazon-gv', name: 'Amazon Pay Gift Card', logoUrl: '/logos/amazon.png', denominations: [100, 250, 500, 1000], allowCustomAmount: true, minCustomAmount: 50, maxCustomAmount: 10000 },
    { id: 'flipkart-gv', name: 'Flipkart Gift Card', logoUrl: '/logos/flipkart.png', denominations: [250, 500, 1000], allowCustomAmount: false },
];


// --- Movies ---
async function searchMovies({ city, date }) {
    console.log(`[Entertainment Provider Sim] Searching movies for City: ${city}, Date: ${date}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return mockMovies.filter(m => !m.isUpcoming || (m.releaseDate && m.releaseDate >= today));
}

async function getMovieDetails({ movieId, city, date }) {
    console.log(`[Entertainment Provider Sim] Getting details for Movie: ${movieId}, City: ${city}, Date: ${date}`);
    await new Promise(resolve => setTimeout(resolve, 600));
    const movieDetails = mockMovies.find(m => m.id === movieId);
    if (!movieDetails || movieDetails.isUpcoming) return null; 

    const cinemasShowing = Object.keys(mockShowtimesData[movieId] || {})
        .map(cinemaId => mockCinemas.find(c => c.id === cinemaId))
        .filter(c => c); 

    const cinemaShowtimes = cinemasShowing.map(cinema => ({
        ...cinema,
        showtimes: mockShowtimesData[movieId]?.[cinema.id]?.map(st => ({
            ...st,
            isFillingFast: Math.random() < 0.2,
            isAlmostFull: Math.random() < 0.1,
        })) || [],
    }));

    return { movieDetails, cinemas: cinemaShowtimes };
}

async function confirmMovieBooking(bookingData) {
    const { userId, movieId, cinemaId, showtime, seats, totalAmount, paymentTransactionId } = bookingData;
    console.log(`[Entertainment Provider Sim] Confirming Movie Booking: User ${userId}, Movie ${movieId}, Cinema ${cinemaId}, Time ${showtime}, Seats ${seats.join(',')}, Amount ${totalAmount}, PayRef ${paymentTransactionId}`);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const success = Math.random() > 0.1; 

    if (success) {
        const bookingId = `BMS_${Date.now()}_${userId.substring(0, 3)}`;
        console.log(`[Entertainment Provider Sim] Movie booking SUCCESS. Booking ID: ${bookingId}`);
        return {
            status: 'Confirmed',
            bookingId: bookingId,
            seatNumbers: seats.join(', '), 
            message: 'Movie tickets booked successfully!',
            providerConfirmationId: `CONF_${Math.random().toString(36).substring(2, 10).toUpperCase()}` 
        };
    } else {
        console.warn(`[Entertainment Provider Sim] Movie booking FAILED (Simulated).`);
        return { status: 'Failed', message: 'Booking failed due to unavailable seats during final confirmation.' };
    }
}

// --- Events ---
async function searchEvents({ city, category, date }) {
    console.log(`[Entertainment Provider Sim] Searching events for City: ${city}, Category: ${category}, Date: ${date}`);
    await new Promise(resolve => setTimeout(resolve, 700));
    let results = mockEvents.filter(ev => ev.city.toLowerCase() === city.toLowerCase());
    if (category) results = results.filter(ev => ev.category.toLowerCase() === category.toLowerCase());
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
     const success = Math.random() > 0.15; 
     if (success) {
         const bookingId = `EVT_${Date.now()}`;
         console.log(`[Entertainment Provider Sim] Event booking SUCCESS. Booking ID: ${bookingId}`);
         return {
             status: 'Confirmed',
             bookingId: bookingId,
             message: 'Event tickets booked successfully!',
             ticketUrl: `/placeholder/event-ticket-${bookingId}.pdf` 
         };
     } else {
         console.warn(`[Entertainment Provider Sim] Event booking FAILED (Simulated).`);
         return { status: 'Failed', message: 'Event booking failed (e.g., sold out).' };
     }
}

// --- Gaming & Digital Vouchers ---
async function getGamingBrands() {
     console.log(`[Entertainment Provider Sim] Fetching Gaming Brands`);
     await new Promise(resolve => setTimeout(resolve, 300));
     return mockGamingBrands;
}
async function getDigitalVoucherBrands() { // New function for digital vouchers
    console.log(`[Entertainment Provider Sim] Fetching Digital Voucher Brands`);
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockDigitalVoucherBrands;
}


async function getGamingDenominations(brandId) {
    console.log(`[Entertainment Provider Sim] Fetching Denominations for Brand: ${brandId}`);
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockGamingDenominations[brandId] || [];
}
async function getDigitalVoucherDenominations(brandId) { // New for digital
    console.log(`[Entertainment Provider Sim] Fetching Denominations for Digital Brand: ${brandId}`);
    await new Promise(resolve => setTimeout(resolve, 400));
    const brand = mockDigitalVoucherBrands.find(b => b.id === brandId);
    return brand ? brand.denominations.map(d => ({ id: `${brandId}-${d}`, value: d, description: `₹${d} Voucher`})) : [];
}


async function purchaseVoucher(purchaseData) {
     const { userId, brandId, amount, playerId, recipientMobile, voucherType } = purchaseData;
     console.log(`[Entertainment Provider Sim] Purchasing ${voucherType} Voucher: User ${userId}, Brand ${brandId}, Amt ${amount}, Player ${playerId || 'N/A'}, Mobile ${recipientMobile || 'N/A'}`);
     await new Promise(resolve => setTimeout(resolve, 1200));
     const success = Math.random() > 0.05; 
     if (success) {
          const voucherCode = `${voucherType.toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
         console.log(`[Entertainment Provider Sim] ${voucherType} Voucher purchase SUCCESS. Code: ${voucherCode}`);
         return {
             success: true,
             voucherCode: voucherCode, 
             message: `${voucherType === 'gaming' ? 'Gaming' : 'Digital'} voucher purchased successfully. Code sent.`,
             receiptId: `REC_${Date.now()}`
         };
     } else {
         console.warn(`[Entertainment Provider Sim] ${voucherType} Voucher purchase FAILED (Simulated).`);
         return { success: false, message: `${voucherType === 'gaming' ? 'Gaming' : 'Digital'} voucher purchase failed (e.g., provider error).` };
     }
}


module.exports = {
    searchMovies,
    getMovieDetails,
    confirmMovieBooking,
    searchEvents,
    getEventDetails,
    confirmEventBooking,
    getGamingBrands,
    getGamingDenominations,
    getDigitalVoucherBrands, // Added
    getDigitalVoucherDenominations, // Added
    purchaseVoucher, // Generic voucher purchase
};
