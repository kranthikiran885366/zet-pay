// backend/services/temple.js
const admin = require('../config/firebaseAdmin');
const db = admin.firestore();
const { collection, addDoc, serverTimestamp, Timestamp } = db; // Use admin SDK Firestore
const { addTransaction } = require('./transactionLogger'); // Use backend logger

// --- Mock Data (Keep for Simulation) ---
const mockTemples = [
    { id: 'tirupati', name: 'Tirumala Tirupati Devasthanams (TTD)' },
    { id: 'shirdi', name: 'Shirdi Saibaba Sansthan Trust' },
    { id: 'vaishno-devi', name: 'Vaishno Devi Shrine Board' },
];

const mockDarshanSlotsData = {
    'tirupati-2024-08-15': [
        { time: '09:00 - 10:00', availability: 'Available', quota: 'Special Entry (₹300)', ticketsLeft: 150 },
        { time: '10:00 - 11:00', availability: 'Filling Fast', quota: 'Special Entry (₹300)', ticketsLeft: 30 },
    ],
    // Add more mock slots
};

const mockVirtualPoojasData = {
    'shirdi': [ { id: 'shirdi-abhishek', name: 'Abhishek Pooja (Virtual)', description: '...', price: 750, duration: '30 mins' } ],
    'tirupati': [ { id: 'ttd-kalyanam', name: 'Kalyanotsavam (Virtual)', description: '...', price: 1000, duration: '45 mins' } ],
};

const mockPrasadamData = {
    'tirupati': [ { id: 'ttd-laddu', name: 'Tirupati Laddu (Large)', price: 50, imageUrl: '...' } ],
    'shirdi': [ { id: 'shirdi-packet', name: 'Shirdi Prasadam Packet', price: 100, imageUrl: '...' } ],
};

// --- Service Functions ---

/**
 * Searches for available Darshan slots (Simulated).
 * @param templeId ID of the temple.
 * @param date Date string (YYYY-MM-DD).
 * @returns Promise resolving to an array of slot objects.
 */
async function searchDarshanSlots(templeId, date) {
    console.log(`[Temple Service - Backend] Searching Darshan slots for: ${templeId}, Date: ${date}`);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
    const key = `${templeId}-${date}`;
    return mockDarshanSlotsData[key] || [];
}

/**
 * Books a Darshan slot (Simulated).
 * @param details Booking details.
 * @returns Promise resolving to booking confirmation.
 */
async function bookDarshanSlot(details) {
    console.log(`[Temple Service - Backend] Booking Darshan slot:`, details);
    // 1. TODO: Verify slot availability again (critical section).
    // 2. TODO: Process payment if totalAmount > 0 (integrate with payment service).
    // 3. Create booking record in Firestore.
    // 4. Generate Access Pass data.

    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate booking

    // Add booking record to user's bookings (example subcollection)
    try {
        const bookingsColRef = collection(db, 'users', details.userId, 'templeBookings');
        const bookingData = {
            userId: details.userId,
            templeId: details.templeId,
            templeName: details.templeName,
            bookingType: 'Darshan',
            bookingDate: serverTimestamp(),
            visitDate: Timestamp.fromDate(new Date(details.date)), // Store as Timestamp
            slotTime: details.slotTime,
            quota: details.quota,
            numberOfPersons: details.persons,
            totalAmount: details.totalAmount || 0,
            status: 'Confirmed',
            accessPassData: `${details.templeId}_DARSHAN_${Date.now()}_${details.userId.substring(0, 5)}` // Generate QR data
        };
        const docRef = await addDoc(bookingsColRef, bookingData);
        console.log(`[Temple Service - Backend] Darshan booking ${docRef.id} created.`);

        // Log transaction if payment was involved
        if (details.totalAmount && details.totalAmount > 0) {
            await addTransaction({
                type: 'Bill Payment', // Treat as payment
                name: `Darshan Booking: ${details.templeName}`,
                description: `Slot: ${details.slotTime}, Date: ${details.date}, Persons: ${details.persons}`,
                amount: -details.totalAmount,
                status: 'Completed',
                userId: details.userId,
                billerId: details.templeId, // Use templeId as billerId
                ticketId: docRef.id // Link transaction to booking
            });
        }

        return { success: true, bookingId: docRef.id, accessPassData: bookingData.accessPassData };
    } catch (error) {
        console.error("[Temple Service - Backend] Error creating Darshan booking:", error);
        throw new Error("Failed to create Darshan booking record.");
    }
}

// --- Functions for other Temple Services (Pooja, Prasadam, Donation, Info etc.) ---

async function getAvailablePoojas(templeId) {
    console.log(`[Temple Service - Backend] Fetching Poojas for: ${templeId}`);
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockVirtualPoojasData[templeId] || [];
}

async function bookVirtualPooja(details) {
    console.log(`[Temple Service - Backend] Booking Pooja:`, details);
     // 1. TODO: Process payment (integrate with payment service).
     // 2. Create booking record.
    await new Promise(resolve => setTimeout(resolve, 1000));

     try {
        const bookingsColRef = collection(db, 'users', details.userId, 'templeBookings');
        const bookingData = {
            userId: details.userId,
            templeId: details.templeId,
            templeName: details.templeName,
            bookingType: 'Virtual Pooja',
            bookingDate: serverTimestamp(),
            poojaDate: Timestamp.fromDate(new Date(details.date)),
            poojaId: details.poojaId,
            poojaName: details.poojaName,
            devoteeName: details.devoteeName,
            gotra: details.gotra || null,
            totalAmount: details.amount,
            status: 'Confirmed',
        };
        const docRef = await addDoc(bookingsColRef, bookingData);
         console.log(`[Temple Service - Backend] Pooja booking ${docRef.id} created.`);

        // Log transaction
        await addTransaction({
            type: 'Bill Payment',
            name: `Virtual Pooja: ${details.poojaName}`,
            description: `Temple: ${details.templeName}, For: ${details.devoteeName}`,
            amount: -details.amount,
            status: 'Completed',
            userId: details.userId,
            billerId: details.templeId,
            ticketId: docRef.id // Link transaction to booking
        });

        return { success: true, bookingId: docRef.id };
    } catch (error) {
        console.error("[Temple Service - Backend] Error creating Pooja booking:", error);
        throw new Error("Failed to create Pooja booking record.");
    }
}

async function getAvailablePrasadam(templeId) {
     console.log(`[Temple Service - Backend] Fetching Prasadam for: ${templeId}`);
     await new Promise(resolve => setTimeout(resolve, 150));
     return mockPrasadamData[templeId] || [];
}

async function orderPrasadam(details) {
    console.log(`[Temple Service - Backend] Ordering Prasadam:`, details);
     // 1. TODO: Validate items/quantities.
     // 2. TODO: Calculate final price with delivery.
     // 3. TODO: Process payment.
     // 4. Create order record.
     // 5. Trigger delivery process.
    await new Promise(resolve => setTimeout(resolve, 1200));

     try {
        const ordersColRef = collection(db, 'users', details.userId, 'prasadamOrders');
        const orderData = {
            userId: details.userId,
            templeId: details.templeId,
            templeName: details.templeName,
            orderDate: serverTimestamp(),
            items: details.cartItems, // Array of { id, quantity }
            totalAmount: details.totalAmount, // Includes delivery?
            deliveryAddress: details.deliveryAddress, // Store structured address
            status: 'Processing',
        };
        const docRef = await addDoc(ordersColRef, orderData);
        console.log(`[Temple Service - Backend] Prasadam order ${docRef.id} created.`);

        // Log transaction
         await addTransaction({
            type: 'Prasadam Order',
            name: `Prasadam from ${details.templeName}`,
            description: `Order ID: ${docRef.id}`,
            amount: -details.totalAmount,
            status: 'Completed',
            userId: details.userId,
            billerId: details.templeId,
            ticketId: docRef.id // Link transaction to order
        });

        return { success: true, orderId: docRef.id };
    } catch (error) {
        console.error("[Temple Service - Backend] Error creating Prasadam order:", error);
        throw new Error("Failed to create Prasadam order record.");
    }
}

async function donateToTemple(details) {
     console.log(`[Temple Service - Backend] Processing Donation:`, details);
      // 1. TODO: Process payment.
      // 2. Log transaction.
      // 3. Optionally create separate donation record.
      await new Promise(resolve => setTimeout(resolve, 800));

      try {
         const finalDonorName = details.isAnonymous ? 'Anonymous' : details.donorName;
         // Log donation transaction
         const loggedTx = await addTransaction({
             type: 'Donation',
             name: `Donation to ${details.templeName}`,
             description: `Scheme: ${details.scheme || 'General'}. Donor: ${finalDonorName}${details.panNumber ? ` (PAN: ${details.panNumber})` : ''}`,
             amount: -details.amount,
             status: 'Completed',
             userId: details.userId,
             billerId: details.templeId,
         });
         console.log(`[Temple Service - Backend] Donation transaction ${loggedTx.id} logged.`);
         return { success: true, transactionId: loggedTx.id };
      } catch (error) {
         console.error("[Temple Service - Backend] Error processing donation:", error);
         throw new Error("Failed to process donation.");
      }
}

async function getMyTempleBookings(userId) {
     console.log(`[Temple Service - Backend] Fetching bookings for user: ${userId}`);
     const bookingsColRef = collection(db, 'users', userId, 'templeBookings');
     const q = query(bookingsColRef, orderBy('bookingDate', 'desc'));
     try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ bookingId: doc.id, ...doc.data() }));
     } catch (error) {
         console.error(`[Temple Service - Backend] Error fetching bookings for ${userId}:`, error);
         throw new Error("Could not retrieve temple bookings.");
     }
}

// Add functions for other temple service endpoints (Live URL, Audio, Events, Accommodation, Group Visit, Access Pass Info) as needed


module.exports = {
    searchDarshanSlots,
    bookDarshanSlot,
    getAvailablePoojas,
    bookVirtualPooja,
    getAvailablePrasadam,
    orderPrasadam,
    donateToTemple,
    getMyTempleBookings,
    // Export other functions
};
