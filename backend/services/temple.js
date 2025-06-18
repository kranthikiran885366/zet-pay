
// backend/services/temple.js
const admin = require('../config/firebaseAdmin');
const db = admin.firestore();
const { collection, addDoc, serverTimestamp, Timestamp, getDocs, query, where, orderBy, limit, doc, updateDoc, getDoc } = db;
const { addTransaction } = require('./transactionLogger');
const { payViaWalletInternal } = require('./wallet');
const { sendToUser } = require('../server');
const { mockTemplesData: mockTemplesSeed, mockDarshanSlotsPageData: mockDarshanSlotsSeed, mockPoojasData: mockPoojasSeed, mockPrasadamDataPage: mockPrasadamSeed, mockTempleInfoData: mockTempleInfoSeed, mockTempleEventsData: mockTempleEventsSeed, mockAccommodationsData: mockAccommodationsSeed, mockAudioTracksData: mockAudioTracksSeed } = require('../../src/mock-data/temple');


const TEMPLE_API_URL = process.env.TEMPLE_API_URL || 'https://api.exampletempletrust.org/v1';
const TEMPLE_API_KEY = process.env.TEMPLE_API_KEY || 'YOUR_TEMPLE_API_KEY_PLACEHOLDER';

async function makeApiCall(endpoint, params = {}, method = 'GET', data = null) {
    const headers = { 'Authorization': `Bearer ${TEMPLE_API_KEY}`, 'Content-Type': 'application/json' };
    const config = { headers, params, method, data };
    if (process.env.USE_REAL_TEMPLE_API !== 'true' || TEMPLE_API_KEY === 'YOUR_TEMPLE_API_KEY_PLACEHOLDER') {
        console.warn(`[Temple Provider Sim] MOCK API call for ${endpoint}. Real API not configured or not enabled.`);
        throw new Error("Mock logic needs to be handled by caller or this function should return mock.");
    }
    // TODO: Implement REAL API call
    // const response = await axios({ url: `${TEMPLE_API_URL}${endpoint}`, ...config });
    // if (response.status < 200 || response.status >= 300) throw new Error(response.data?.message || `API Error: ${response.status}`);
    // return response.data;
    console.error(`[Temple Provider Sim] REAL API call for ${TEMPLE_API_URL}${endpoint} NOT IMPLEMENTED.`);
    throw new Error("Real Temple API integration not implemented.");
}

async function searchDarshanSlots(templeId, date) {
    console.log(`[Temple Service] Searching Darshan slots (API) for: ${templeId}, Date: ${date}`);
    try {
        // return await makeApiCall(`/darshan/${templeId}/slots`, { date }); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 300));
        return mockDarshanSlotsSeed[`${templeId}-${date}`] || [];
    } catch (error) {
        console.warn(`[Temple Service] Falling back to mock for searchDarshanSlots: ${error.message}`);
        return mockDarshanSlotsSeed[`${templeId}-${date}`] || [];
    }
}

async function bookDarshanSlot(details) {
    const { userId, templeId, templeName, date, slotTime, quota, persons, totalAmount } = details;
    console.log(`[Temple Service] Booking Darshan slot (API):`, details);
    let paymentTransactionId = null;
    if (totalAmount && totalAmount > 0) {
        const paymentResult = await payViaWalletInternal(userId, `DARSHAN_${templeId}_${date.replace(/-/g,'')}`, totalAmount, `Darshan Booking: ${templeName}`, 'Booking Fee');
        if (!paymentResult.success) throw new Error(paymentResult.message || 'Payment failed for Darshan booking.');
        paymentTransactionId = paymentResult.transactionId;
    }

    const payload = { temple_id: templeId, date, slot_time: slotTime, quota, num_persons: persons, payment_ref: paymentTransactionId, user_id: userId };
    try {
        // const providerResponse = await makeApiCall(`/darshan/book`, {}, 'POST', payload); // For REAL API
        // if (!providerResponse.success) throw new Error(providerResponse.message);
        // const { bookingId, accessPassData } = providerResponse;
        await new Promise(resolve => setTimeout(resolve, 1000));
        const success = Math.random() > 0.05;
        if (!success) throw new Error("Slot no longer available (Simulated provider error).");
        const bookingId = `DARSHAN_REAL_${Date.now()}`;
        const accessPassData = `${templeId}_DARSHAN_${Date.now()}_${userId.substring(0,5)}`;

        const bookingsColRef = collection(db, 'users', userId, 'templeBookings');
        const bookingData = { /* ... as before ... */ };
        const docRef = await addDoc(bookingsColRef, {
            userId, templeId, templeName, bookingType: 'Darshan', bookingDate: serverTimestamp(),
            visitDate: Timestamp.fromDate(new Date(date)), slotTime, quota, numberOfPersons: persons,
            totalAmount: totalAmount || 0, status: 'Confirmed',
            accessPassData, paymentTransactionId,
        });
        return { success: true, bookingId: docRef.id, accessPassData, message: "Darshan slot confirmed with provider." };
    } catch (error) {
        if (paymentTransactionId && totalAmount > 0) await payViaWalletInternal(userId, `REFUND_DARSHAN_${paymentTransactionId}`, -totalAmount, `Refund: Failed Darshan Booking ${templeName}`, 'Refund');
        console.error(`[Temple Service] Error booking Darshan with provider: ${error.message}`);
        throw error;
    }
}

async function getAvailablePoojas(templeId) {
    console.log(`[Temple Service] Fetching Virtual Poojas (API) for: ${templeId}`);
    try {
        // return await makeApiCall(`/poojas/${templeId}/list`); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 200));
        return mockPoojasSeed[templeId] || [];
    } catch (error) {
        console.warn(`[Temple Service] Falling back to mock for getAvailablePoojas: ${error.message}`);
        return mockPoojasSeed[templeId] || [];
    }
}

async function bookVirtualPooja(details) {
    const { userId, templeId, templeName, poojaId, poojaName, date, devoteeName, gotra, amount } = details;
    console.log(`[Temple Service] Booking Virtual Pooja (API):`, details);
    let paymentTransactionId = null;
    if (amount && amount > 0) {
        const paymentResult = await payViaWalletInternal(userId, `POOJA_${templeId}_${poojaId}`, amount, `Virtual Pooja: ${poojaName}`, 'Booking Fee');
        if (!paymentResult.success) throw new Error(paymentResult.message || 'Payment failed for Pooja booking.');
        paymentTransactionId = paymentResult.transactionId;
    }

    const payload = { temple_id: templeId, pooja_id: poojaId, date, devotee_name: devoteeName, gotra, payment_ref: paymentTransactionId, user_id: userId };
    try {
        // const providerResponse = await makeApiCall(`/poojas/book`, {}, 'POST', payload); // For REAL API
        // if (!providerResponse.success) throw new Error(providerResponse.message);
        // const { bookingId } = providerResponse;
        await new Promise(resolve => setTimeout(resolve, 800));
        const bookingId = `POOJA_REAL_${Date.now()}`;

        const bookingsColRef = collection(db, 'users', userId, 'templeBookings');
        const bookingData = { /* ... as before ... */ };
        const docRef = await addDoc(bookingsColRef, {
            userId, templeId, templeName, bookingType: 'Virtual Pooja', bookingDate: serverTimestamp(),
            poojaDate: Timestamp.fromDate(new Date(date)), poojaId, poojaName, devoteeName, gotra: gotra || null,
            totalAmount: amount, status: 'Confirmed', paymentTransactionId,
        });
        return { success: true, bookingId: docRef.id, message: "Virtual Pooja booked with provider." };
    } catch (error) {
        if (paymentTransactionId && amount > 0) await payViaWalletInternal(userId, `REFUND_POOJA_${paymentTransactionId}`, -amount, `Refund: Failed Pooja ${poojaName}`, 'Refund');
        console.error(`[Temple Service] Error booking Pooja with provider: ${error.message}`);
        throw error;
    }
}

async function getAvailablePrasadam(templeId) {
    console.log(`[Temple Service] Fetching Prasadam items (API) for: ${templeId}`);
    try {
        // return await makeApiCall(`/prasadam/${templeId}/items`); // For REAL API
        await new Promise(resolve => setTimeout(resolve, 150));
        return mockPrasadamSeed[templeId] || [];
    } catch (error) {
        console.warn(`[Temple Service] Falling back to mock for getAvailablePrasadam: ${error.message}`);
        return mockPrasadamSeed[templeId] || [];
    }
}

async function orderPrasadam(details) {
    const { userId, templeId, templeName, cartItems, totalAmount, deliveryAddress } = details;
    console.log(`[Temple Service] Ordering Prasadam (API):`, details);
    let paymentTransactionId = null;
    if (totalAmount && totalAmount > 0) {
        const paymentResult = await payViaWalletInternal(userId, `PRASADAM_${templeId}`, totalAmount, `Prasadam Order: ${templeName}`, 'Shopping');
        if (!paymentResult.success) throw new Error(paymentResult.message || 'Payment failed for Prasadam order.');
        paymentTransactionId = paymentResult.transactionId;
    }

    const payload = { temple_id: templeId, items: cartItems, total_amount: totalAmount, delivery_address: deliveryAddress, payment_ref: paymentTransactionId, user_id: userId };
    try {
        // const providerResponse = await makeApiCall(`/prasadam/order`, {}, 'POST', payload); // For REAL API
        // if (!providerResponse.success) throw new Error(providerResponse.message);
        // const { orderId } = providerResponse;
        await new Promise(resolve => setTimeout(resolve, 1200));
        const orderId = `PRASADAM_ORD_REAL_${Date.now()}`;

        const ordersColRef = collection(db, 'users', userId, 'prasadamOrders');
        const orderData = { /* ... as before ... */ };
        const docRef = await addDoc(ordersColRef, {
            userId, templeId, templeName, orderDate: serverTimestamp(), items: cartItems, totalAmount,
            deliveryAddress, status: 'Processing', paymentTransactionId, providerOrderId: orderId
        });
        return { success: true, orderId: docRef.id, message: "Prasadam order placed with provider." };
    } catch (error) {
        if (paymentTransactionId && totalAmount > 0) await payViaWalletInternal(userId, `REFUND_PRASADAM_${paymentTransactionId}`, -totalAmount, `Refund: Failed Prasadam Order ${templeName}`, 'Refund');
        console.error(`[Temple Service] Error ordering Prasadam with provider: ${error.message}`);
        throw error;
    }
}

async function donateToTemple(details) {
    const { userId, templeId, templeName, scheme, amount, donorName, panNumber, isAnonymous } = details;
    console.log(`[Temple Service] Processing donation (API):`, details);
    const finalDonorName = isAnonymous ? 'Anonymous' : donorName;
    const paymentResult = await payViaWalletInternal(userId, `DONATION_${templeId}`, amount, `Donation: ${templeName} (${scheme || 'General'}) by ${finalDonorName}`, 'Donation');
    if (!paymentResult.success) throw new Error(paymentResult.message || 'Donation payment failed.');

    // No separate provider call usually for generic donations, payment is the confirmation.
    // If specific schemes require provider interaction, add here.
    // const payload = { ... }
    // try {
    //    await makeApiCall(`/donate`, {}, 'POST', payload);
    // } catch (error) { /* Handle donation logging error, payment already done */ }

    return { success: true, transactionId: paymentResult.transactionId, message: "Donation successful." };
}

async function getMyTempleBookings(userId) {
     console.log(`[Temple Service] Fetching temple bookings for user: ${userId}`);
     const bookingsColRef = collection(db, 'users', userId, 'templeBookings');
     const q = query(bookingsColRef, orderBy('bookingDate', 'desc'), limit(20));
     try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                bookingId: docSnap.id, ...data,
                bookingDate: (data.bookingDate as Timestamp)?.toDate(),
                visitDate: data.visitDate instanceof Timestamp ? data.visitDate.toDate() : undefined,
                poojaDate: data.poojaDate instanceof Timestamp ? data.poojaDate.toDate() : undefined,
            }
        });
     } catch (error) {
         console.error(`[Temple Service] Error fetching temple bookings for ${userId}:`, error);
         throw new Error("Could not retrieve temple bookings.");
     }
}

// Stubs for other info functions to be implemented if needed
async function getTempleInfo(templeId) { return mockTempleInfoSeed[templeId] || null; }
async function getLiveDarshanUrl(templeId) { return mockTemplesSeed.find(t => t.id === templeId && (t as any).liveStreamUrl)?.liveStreamUrl || null; }
async function getTempleAudio(templeId, category) {
    let tracks = mockAudioTracksSeed;
    if (templeId) tracks = tracks.filter(t => (t as any).templeAffiliation === templeId); // Assuming affiliation field
    if (category) tracks = tracks.filter(t => t.category === category);
    return tracks;
}
async function getTempleEvents(templeId) {
    let events = mockTempleEventsSeed;
    if (templeId) events = events.filter(e => (e as any).templeId === templeId); // Assuming events are linked to templeId
    return events.map(e => ({...e, startDate: new Date(e.startDate), endDate: new Date(e.endDate)}));
}
async function getNearbyAccommodation(templeId) { return mockAccommodationsSeed[templeId] || []; }
async function requestGroupVisit(userId, requestData) {
    console.log("[Temple Service] Group Visit Request (API - Mock):", { userId, ...requestData });
    await new Promise(resolve => setTimeout(resolve, 900));
    return { success: true, requestId: `GRP_REQ_${Date.now()}`, message: 'Group visit request submitted for approval.'};
}


module.exports = {
    searchDarshanSlots, bookDarshanSlot,
    getAvailablePoojas, bookVirtualPooja,
    getAvailablePrasadam, orderPrasadam,
    donateToTemple, getMyTempleBookings,
    getTempleInfo, getLiveDarshanUrl, getTempleAudio, getTempleEvents, getNearbyAccommodation, requestGroupVisit,
};
