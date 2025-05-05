// backend/services/bookingProviderService.js
// Placeholder for interacting with actual Bus, Train, Flight, Movie booking APIs/aggregators

// Mock data (can be moved to separate files or a database)
const mockMovies = [
    { id: 'm1', title: "Action Movie Alpha", genre: "Action/Thriller", language: "English", rating: "UA", duration: "2h 15m", imageUrl: "/mock/alpha.jpg" },
    { id: 'm2', title: "Comedy Fest", genre: "Comedy/Romance", language: "Hindi", rating: "U", duration: "2h 05m", imageUrl: "/mock/comedy.jpg" },
    { id: 'm3', title: "Sci-Fi Voyager", genre: "Sci-Fi/Adventure", language: "English", rating: "UA", duration: "2h 45m", imageUrl: "/mock/scifi.jpg" },
];
const mockCinemas = [
    { id: 'c1', name: "PVR Orion Mall", location: "Rajajinagar", amenities: ['IMAX', 'Recliner Seats'] },
    { id: 'c2', name: "INOX Garuda Mall", location: "MG Road", amenities: ['Dolby Atmos'] },
    { id: 'c3', name: "Cinepolis Forum Shantiniketan", location: "Whitefield", amenities: ['4DX'] },
];
const mockShowtimesData = { // Nested structure: movieId -> cinemaId -> showtimes
    'm1': { // Action Movie Alpha
        'c1': [{ time: "10:00 AM", format: "IMAX 2D", price: 450 }, { time: "01:15 PM", format: "IMAX 2D", price: 450, isFillingFast: true }, { time: "07:45 PM", format: "IMAX 2D", price: 500, isAlmostFull: true }],
        'c2': [{ time: "11:30 AM", format: "Dolby Atmos 2D", price: 350 }, { time: "06:00 PM", format: "2D", price: 280 }],
    },
    'm3': { // Sci-Fi Voyager
        'c1': [{ time: "04:30 PM", format: "2D", price: 300 }, { time: "11:00 PM", format: "2D", price: 250 }],
        'c3': [{ time: "10:45 AM", format: "4DX 3D", price: 600 }, { time: "05:00 PM", format: "4DX 3D", price: 650, isFillingFast: true }, { time: "08:10 PM", format: "2D", price: 300 }],
    }
};

// --- Search ---
async function search(type, queryParams) {
    console.log(`[Booking Provider Sim] Searching ${type} with params:`, queryParams);
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay

    // Return mock data based on type
    switch (type) {
        case 'bus':
            // Simulate filtering mockBusRoutes based on queryParams.from, queryParams.to, queryParams.date
            return [ /* Filtered mockBusRoutes */ ];
        case 'train':
            // Simulate filtering mockTrainAvailability based on queryParams
             return [ /* Filtered mockTrainAvailability */ ];
        case 'movie':
             // Simulate finding movies playing based on city/date
             console.log(`Searching movies for City: ${queryParams.city}, Date: ${queryParams.date}`);
             // Return only movies that have showtimes in our mock data for simplicity
             return mockMovies.filter(movie => mockShowtimesData[movie.id]);
        case 'flight':
             // Simulate flight search results
             return [ /* Mock flight results */ ];
        case 'event':
            // Simulate event search results
             return [ /* Mock event results */ ];
        default:
            console.warn(`[Booking Provider Sim] Unsupported search type: ${type}`);
            return [];
    }
}

// --- Get Details ---
async function getDetails(type, id, queryParams) {
     console.log(`[Booking Provider Sim] Getting details for ${type} ID: ${id}, Params:`, queryParams);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

     switch (type) {
        case 'bus':
            // Simulate fetching seat layout for a specific bus service ID
            const mockBus = { id: 'bus1', operator: 'KSRTC', type: 'AC Sleeper', price: 850 }; // Example
            return { seatLayout: generateMockSeats(mockBus.type, mockBus.price), busDetails: mockBus };
        case 'movie':
             // Simulate fetching showtimes for a specific movie at cinemas on a given date
             const movieId = id;
             const movieDetails = mockMovies.find(m => m.id === movieId);
             if (!movieDetails) return null; // Movie not found

             // Find cinemas showing this movie (from mockShowtimesData keys for this movie)
             const cinemasShowing = Object.keys(mockShowtimesData[movieId] || {})
                .map(cinemaId => mockCinemas.find(c => c.id === cinemaId))
                .filter(c => c); // Filter out undefined if cinema not found in mockCinemas

             // Structure the response similar to frontend expectation
             const cinemaShowtimes = cinemasShowing.map(cinema => ({
                ...cinema,
                showtimes: mockShowtimesData[movieId]?.[cinema.id] || [],
             }));

             return { movieDetails, cinemas: cinemaShowtimes };

        // Add cases for train (coach layout?), flight (seat map?), event (venue map?)
        default:
            console.warn(`[Booking Provider Sim] Unsupported details type: ${type}`);
            return null;
    }
}

// --- Confirm Booking ---
async function confirmBooking(type, bookingData) {
    console.log(`[Booking Provider Sim] Confirming ${type} booking:`, bookingData);
    await new Promise(resolve => setTimeout(resolve, 1800)); // Simulate booking confirmation delay

    const random = Math.random();
    if (random < 0.08) { // 8% Failure
        console.warn(`[Booking Provider Sim] ${type} booking failed.`);
        // Include specific error codes/messages if possible
        return { status: 'Failed', message: `Booking failed. Seats might be unavailable or payment declined by provider.`, providerCode: 'PROVIDER_BOOKING_FAILED' };
    }
    if (random < 0.20) { // 12% Pending (less common for movies, more for bus/train)
         console.log(`[Booking Provider Sim] ${type} booking pending confirmation.`);
        return { status: 'Pending Confirmation', message: 'Booking submitted, awaiting confirmation from provider.' };
    }

    console.log(`[Booking Provider Sim] ${type} booking successful.`);
    // Return mock confirmation details
    const bookingId = `${type.toUpperCase()}_${Date.now()}`;
    const pnr = (type === 'train' || type === 'flight') ? `PNR_${Date.now()}` : undefined; // Mock PNR for train/flight
    const seatNumbers = bookingData.selection?.seats?.join(', '); // Get seat numbers if available

    return {
        status: 'Confirmed',
        message: `${capitalize(type)} booking confirmed successfully.`,
        bookingId: bookingId,
        pnr: pnr,
        seatNumbers: seatNumbers, // Return seat numbers for confirmation display
        providerMessage: 'Success',
        // Add other relevant confirmation details like download link URL etc.
    };
}

// --- Cancel Booking ---
async function cancelBooking(type, bookingId, userId) {
     console.log(`[Booking Provider Sim] Cancelling ${type} booking ID: ${bookingId} for user ${userId}`);
     await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate cancellation delay

     // Simulate success/failure based on provider rules (e.g., time before departure, refund policy)
     const isCancellable = Math.random() > 0.15; // 85% success simulation for cancellation allowance
     const refundPercentage = isCancellable ? (Math.random() * 0.5 + 0.5) : 0; // 50-100% refund if cancellable

     // Fetch original booking amount (mocked for now)
     const originalAmount = 1000; // Assume original price was 1000 for refund calculation
     const refundAmount = Math.floor(originalAmount * refundPercentage);

     if (isCancellable) {
         console.log(`[Booking Provider Sim] Cancellation successful for ${bookingId}. Refund Amount: ₹${refundAmount}`);
         return {
             success: true,
             message: `Cancellation successful. Refund of ₹${refundAmount} processed as per policy.`,
             refundAmount: refundAmount,
             // originalPaymentTxId: 'fetch_original_tx_id_if_possible' // Include if needed for refund processing
         };
     } else {
         console.warn(`[Booking Provider Sim] Cancellation failed for ${bookingId}.`);
         return { success: false, message: 'Cancellation failed (e.g., non-refundable or too close to departure/showtime).' };
     }
}


module.exports = {
    search,
    getDetails,
    confirmBooking,
    cancelBooking,
};

// Helper Functions (can be moved to utils)
function capitalize(s) {
  return typeof s === 'string' && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// Mock seat generation (simplified, reuse from movie controller logic if possible)
// Generate a mock seat layout (simplified) - Same as in movie controller
const generateMockSeats = (busType, basePrice) => {
    const seats = [];
    const isSleeperLayout = busType.includes('Sleeper');
    const rows = isSleeperLayout ? 10 : 12;
    const cols = isSleeperLayout ? 3 : 4; // 1+2 for sleeper, 2+2 for seater

    for (let r = 1; r <= rows; r++) {
        // Lower Deck
        for (let c = 1; c <= cols; c++) {
            const seatId = `L${r}${String.fromCharCode(64 + c)}`; // L1A, L1B, ...
             const isSleeper = isSleeperLayout;
             const isAvailable = Math.random() > 0.3; // 70% available
             const isWomenOnly = isAvailable && Math.random() > 0.9; // 10% of available are women only
            seats.push({ id: seatId, number: `${r}${String.fromCharCode(64 + c)}`, isLower: true, isSleeper, isAvailable, price: basePrice, isWomenOnly });
        }
        // Upper Deck (only if sleeper)
        if (isSleeperLayout) {
            for (let c = 1; c <= cols; c++) {
                const seatId = `U${r}${String.fromCharCode(64 + c)}`; // U1A, U1B, ...
                 const isAvailable = Math.random() > 0.4; // 60% available upper
                 const isWomenOnly = isAvailable && Math.random() > 0.95; // 5% of available upper are women only
                seats.push({ id: seatId, number: `${r}${String.fromCharCode(64 + c)}`, isLower: false, isSleeper: true, isAvailable, price: basePrice + 100, isWomenOnly }); // Upper deck slightly more expensive
            }
        }
    }
    return seats;
};

