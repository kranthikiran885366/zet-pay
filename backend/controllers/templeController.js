const admin = require('../config/firebaseAdmin'); // Use admin SDK from config
const db = admin.firestore(); // Only needed if directly interacting, prefer service
const templeService = require('../services/temple'); // Import backend temple service
const asyncHandler = require('../middleware/asyncHandler');
const { Timestamp } = require('firebase-admin/firestore'); // Import Timestamp

// Helper to convert Firestore Timestamps within nested objects
function convertTimestampsToISO(data) {
    if (!data) return data;
    if (data instanceof Timestamp) { // Check specific type
        return data.toDate().toISOString();
    }
    if (Array.isArray(data)) {
        return data.map(convertTimestampsToISO);
    }
    if (typeof data === 'object' && data !== null && !(data instanceof Date)) { // Avoid converting existing JS Dates
        const converted = {};
        for (const key in data) {
            // Ensure we don't accidentally convert non-timestamp objects that might have toDate()
             if (data.hasOwnProperty(key)) {
                 converted[key] = convertTimestampsToISO(data[key]);
             }
        }
        return converted;
    }
    return data;
}

// --- Darshan Booking ---

exports.searchDarshanSlots = asyncHandler(async (req, res, next) => {
    const { templeId, date } = req.query; // Expecting YYYY-MM-DD format for date
    // Validation done by router/middleware if needed
    const slots = await templeService.searchDarshanSlots(templeId, date);
    res.status(200).json(slots);
});

exports.bookDarshanSlot = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid; // From auth middleware
    // Destructure and validate body (validation ideally in middleware)
    const { templeId, templeName, date, slotTime, quota, persons, totalAmount } = req.body;
    if (!templeId || !date || !slotTime || !quota || !persons || persons <= 0) {
        res.status(400);
        throw new Error('Missing required booking details.');
    }
    const bookingDetails = { userId, templeId, templeName, date, slotTime, quota, persons, totalAmount };
    const result = await templeService.bookDarshanSlot(bookingDetails); // Call service
    res.status(201).json(result); // Return result from service
});

// --- Virtual Pooja Booking ---

exports.getAvailablePoojas = asyncHandler(async (req, res, next) => {
    const { templeId } = req.query;
    if (!templeId) {
         res.status(400);
         throw new Error('Temple ID is required.');
    }
    const poojas = await templeService.getAvailablePoojas(templeId);
    res.status(200).json(poojas);
});

exports.bookVirtualPooja = asyncHandler(async (req, res, next) => {
     const userId = req.user.uid;
     // Destructure and validate body
     const { templeId, templeName, poojaId, poojaName, date, devoteeName, gotra, amount } = req.body;
      if (!templeId || !poojaId || !date || !devoteeName || amount === undefined || amount < 0) {
         res.status(400);
         throw new Error('Missing required Pooja booking details.');
     }
     const bookingDetails = { userId, templeId, templeName, poojaId, poojaName, date, devoteeName, gotra, amount };
     const result = await templeService.bookVirtualPooja(bookingDetails);
     res.status(201).json(result);
});

// --- Prasadam Order ---

exports.getAvailablePrasadam = asyncHandler(async (req, res, next) => {
    const { templeId } = req.query;
    if (!templeId) {
         res.status(400);
         throw new Error('Temple ID is required.');
    }
    const items = await templeService.getAvailablePrasadam(templeId);
    res.status(200).json(items);
});

exports.orderPrasadam = asyncHandler(async (req, res, next) => {
     const userId = req.user.uid;
     // Destructure and validate body
     const { templeId, templeName, cartItems, totalAmount, deliveryAddress } = req.body;
     if (!templeId || !cartItems || !Array.isArray(cartItems) || cartItems.length === 0 || !totalAmount || totalAmount <= 0 || !deliveryAddress) {
        res.status(400);
        throw new Error('Missing required prasadam order details.');
     }
     const orderDetails = { userId, templeId, templeName, cartItems, totalAmount, deliveryAddress };
     const result = await templeService.orderPrasadam(orderDetails);
     res.status(201).json(result);
});

// --- Temple Donation ---

exports.donateToTemple = asyncHandler(async (req, res, next) => {
     const userId = req.user.uid;
     // Destructure and validate body
     const { templeId, templeName, scheme, amount, donorName, panNumber, isAnonymous } = req.body;
     if (!templeId || !amount || amount <= 0) {
         res.status(400);
         throw new Error('Temple ID and amount are required.');
     }
      if (!isAnonymous && !donorName) {
         res.status(400);
         throw new Error('Donor name required unless donating anonymously.');
     }
      const donationDetails = { userId, templeId, templeName, scheme, amount, donorName, panNumber, isAnonymous };
      const result = await templeService.donateToTemple(donationDetails);
      res.status(201).json(result);
});


// --- Get User's Temple Bookings (Darshan, Pooja) ---
exports.getMyTempleBookings = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const bookings = await templeService.getMyTempleBookings(userId);
    // Convert timestamps before sending response
    res.status(200).json(convertTimestampsToISO(bookings));
});

// Add controllers for Temple Info, Live Darshan URL fetching etc. if needed
// Stubs for other endpoints - implementation needed in templeService.js first
exports.getTempleInfo = asyncHandler(async (req, res, next) => {
    // const { templeId } = req.query;
    // const info = await templeService.getTempleInfo(templeId); // TODO: Implement service logic
    res.status(501).json({ message: 'Get Temple Info not implemented yet.' });
});
exports.getLiveDarshanUrl = asyncHandler(async (req, res, next) => {
     // const { templeId } = req.query;
     // const url = await templeService.getLiveDarshanUrl(templeId); // TODO: Implement service logic
     res.status(501).json({ message: 'Get Live Darshan URL not implemented yet.' });
});
exports.getTempleAudio = asyncHandler(async (req, res, next) => {
    // const { templeId, category } = req.query;
    // const audioTracks = await templeService.getTempleAudio(templeId, category); // TODO: Implement service logic
    res.status(501).json({ message: 'Get Temple Audio not implemented yet.' });
});
exports.getTempleEvents = asyncHandler(async (req, res, next) => {
    // const { templeId } = req.query;
    // const events = await templeService.getTempleEvents(templeId); // TODO: Implement service logic
    res.status(501).json({ message: 'Get Temple Events not implemented yet.' });
});
exports.getNearbyAccommodation = asyncHandler(async (req, res, next) => {
    // const { templeId } = req.query;
    // const accommodation = await templeService.getNearbyAccommodation(templeId); // TODO: Implement service logic
    res.status(501).json({ message: 'Get Nearby Accommodation not implemented yet.' });
});
exports.requestGroupVisit = asyncHandler(async (req, res, next) => {
    // const userId = req.user.uid;
    // const requestData = req.body;
    // const result = await templeService.requestGroupVisit(userId, requestData); // TODO: Implement service logic
    res.status(501).json({ message: 'Request Group Visit not implemented yet.' });
});
