
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction } = require('../services/transactionLogger');

// --- Darshan Booking ---

exports.searchDarshanSlots = async (req, res, next) => {
    const { templeId, date } = req.query; // Expecting YYYY-MM-DD format for date
    if (!templeId || !date) {
        return res.status(400).json({ message: 'Temple ID and Date are required.' });
    }
    try {
        // TODO: Implement actual slot fetching logic from DB or external API
        console.log(`Searching darshan slots for temple ${templeId} on date ${date}`);
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay
        // Return mock slots based on input
        const mockSlots = require('../services/templeService').getMockDarshanSlots(templeId, date as string);
        res.status(200).json(mockSlots);
    } catch (error) {
        next(error);
    }
};

exports.bookDarshanSlot = async (req, res, next) => {
    const userId = req.user.uid;
    const { templeId, templeName, date, slotTime, quota, persons, totalAmount } = req.body;
    if (!templeId || !date || !slotTime || !quota || !persons || persons <= 0) {
        return res.status(400).json({ message: 'Missing required booking details.' });
    }
    try {
        // TODO: Implement actual booking logic:
        // 1. Check slot availability again within a transaction.
        // 2. Process payment if totalAmount > 0.
        // 3. Create booking record in Firestore.
        // 4. Generate Access Pass data (QR code content).
        // 5. Update slot availability count.
        console.log("Booking darshan slot (Simulated):", { userId, templeId, date, slotTime, persons, totalAmount });
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate booking process

        // Add booking record to user's bookings
        const bookingsColRef = collection(db, 'users', userId, 'templeBookings');
        const bookingData = {
            userId,
            templeId,
            templeName: templeName || templeId, // Use name if available
            bookingType: 'Darshan',
            bookingDate: Timestamp.now(),
            visitDate: Timestamp.fromDate(new Date(date)),
            slotTime,
            quota,
            numberOfPersons: persons,
            totalAmount: totalAmount || 0,
            status: 'Confirmed',
            // Generate access pass QR data or ID here
            accessPassData: `${templeId}_DARSHAN_${Date.now()}_${userId.substring(0, 5)}`
        };
        const docRef = await addDoc(bookingsColRef, bookingData);

        // Log transaction if payment was involved
        if (totalAmount && totalAmount > 0) {
            await addTransaction({
                type: 'Bill Payment', // Treat as payment
                name: `Darshan Booking: ${templeName || templeId}`,
                description: `Slot: ${slotTime}, Date: ${date}, Persons: ${persons}`,
                amount: -totalAmount,
                status: 'Completed',
                userId,
                billerId: templeId, // Use templeId as billerId
            });
        }

        res.status(201).json({
            success: true,
            bookingId: docRef.id,
            message: 'Darshan slot booked successfully.',
            accessPassData: bookingData.accessPassData // Return QR data
        });

    } catch (error) {
        next(error);
    }
};

// --- Virtual Pooja Booking ---

exports.getAvailablePoojas = async (req, res, next) => {
    const { templeId } = req.query;
    if (!templeId) return res.status(400).json({ message: 'Temple ID is required.' });
    try {
        // TODO: Fetch available poojas from DB or external API
        console.log(`Fetching poojas for temple ${templeId}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        const mockPoojas = require('../services/templeService').getMockVirtualPoojas(templeId as string);
        res.status(200).json(mockPoojas);
    } catch (error) {
        next(error);
    }
};

exports.bookVirtualPooja = async (req, res, next) => {
     const userId = req.user.uid;
     const { templeId, templeName, poojaId, poojaName, date, devoteeName, gotra, amount } = req.body;
     if (!templeId || !poojaId || !date || !devoteeName || amount === undefined || amount < 0) {
         return res.status(400).json({ message: 'Missing required Pooja booking details.' });
     }
     try {
         // TODO: Implement actual booking logic:
         // 1. Process payment for the pooja amount.
         // 2. Create booking record.
         console.log("Booking virtual pooja (Simulated):", req.body);
         await new Promise(resolve => setTimeout(resolve, 1500));

         // Add booking record
         const bookingsColRef = collection(db, 'users', userId, 'templeBookings');
         const bookingData = {
             userId,
             templeId,
             templeName: templeName || templeId,
             bookingType: 'Virtual Pooja',
             bookingDate: Timestamp.now(),
             poojaDate: Timestamp.fromDate(new Date(date)),
             poojaId,
             poojaName: poojaName || poojaId,
             devoteeName,
             gotra: gotra || null,
             totalAmount: amount,
             status: 'Confirmed',
             // Add link/details for joining virtual pooja if applicable
         };
         const docRef = await addDoc(bookingsColRef, bookingData);

         // Log transaction
         await addTransaction({
             type: 'Bill Payment',
             name: `Virtual Pooja: ${poojaName || poojaId}`,
             description: `Temple: ${templeName || templeId}, For: ${devoteeName}`,
             amount: -amount,
             status: 'Completed',
             userId,
             billerId: templeId,
         });

         res.status(201).json({
            success: true,
            bookingId: docRef.id,
            message: 'Virtual Pooja booked successfully.'
         });

     } catch (error) {
         next(error);
     }
};

// --- Prasadam Order ---

exports.getAvailablePrasadam = async (req, res, next) => {
    const { templeId } = req.query;
    if (!templeId) return res.status(400).json({ message: 'Temple ID is required.' });
    try {
        // TODO: Fetch available prasadam from DB or external API
        console.log(`Fetching prasadam for temple ${templeId}`);
        await new Promise(resolve => setTimeout(resolve, 400));
        const mockPrasadam = require('../services/templeService').getMockPrasadam(templeId as string);
        res.status(200).json(mockPrasadam);
    } catch (error) {
        next(error);
    }
};

exports.orderPrasadam = async (req, res, next) => {
     const userId = req.user.uid;
     const { templeId, templeName, cartItems, totalAmount, deliveryAddress } = req.body;
     // cartItems should be an array like [{ id: 'ttd-laddu', quantity: 2 }, ...]
     if (!templeId || !cartItems || !Array.isArray(cartItems) || cartItems.length === 0 || !totalAmount || totalAmount <= 0 || !deliveryAddress) {
         return res.status(400).json({ message: 'Missing required prasadam order details.' });
     }
     try {
         // TODO: Implement actual order logic:
         // 1. Validate items and quantities against availability.
         // 2. Calculate final price including delivery charges.
         // 3. Process payment.
         // 4. Create order record.
         // 5. Trigger delivery process.
         console.log("Ordering prasadam (Simulated):", req.body);
         await new Promise(resolve => setTimeout(resolve, 1800));

         // Add order record
         const ordersColRef = collection(db, 'users', userId, 'prasadamOrders');
         const orderData = {
             userId,
             templeId,
             templeName: templeName || templeId,
             orderDate: Timestamp.now(),
             items: cartItems, // Store cart items directly
             totalAmount, // Store calculated total (should include delivery)
             deliveryAddress,
             status: 'Processing', // Initial status
         };
         const docRef = await addDoc(ordersColRef, orderData);

         // Log transaction
         await addTransaction({
             type: 'Prasadam Order', // Specific type
             name: `Prasadam from ${templeName || templeId}`,
             description: `Order ID: ${docRef.id}`,
             amount: -totalAmount,
             status: 'Completed', // Payment status
             userId,
             billerId: templeId,
         });

         res.status(201).json({
            success: true,
            orderId: docRef.id,
            message: 'Prasadam order placed successfully.'
         });
     } catch (error) {
         next(error);
     }
};

// --- Temple Donation ---

exports.donateToTemple = async (req, res, next) => {
     const userId = req.user.uid;
     const { templeId, templeName, scheme, amount, donorName, panNumber, isAnonymous } = req.body;

     if (!templeId || !amount || amount <= 0) {
         return res.status(400).json({ message: 'Temple ID and amount are required.' });
     }
     if (!isAnonymous && !donorName) {
         return res.status(400).json({ message: 'Donor name required unless donating anonymously.' });
     }

     try {
         // TODO: Implement actual donation payment processing.
         console.log("Processing donation (Simulated):", req.body);
         await new Promise(resolve => setTimeout(resolve, 1200));

         const finalDonorName = isAnonymous ? 'Anonymous' : donorName;

         // Log donation transaction
         const loggedTx = await addTransaction({
             type: 'Donation',
             name: `Donation to ${templeName || templeId}`,
             description: `Scheme: ${scheme || 'General'}. Donor: ${finalDonorName}${panNumber ? ` (PAN: ${panNumber})` : ''}`,
             amount: -amount,
             status: 'Completed',
             userId,
             billerId: templeId,
         });

         // Optionally create a separate 'donations' record if more detail needed
         // const donationsColRef = collection(db, 'donations');
         // await addDoc(donationsColRef, { ...req.body, userId, transactionId: loggedTx.id, date: Timestamp.now() });

         res.status(201).json({
             success: true,
             transactionId: loggedTx.id,
             message: 'Donation successful. Thank you for your contribution.'
         });

     } catch (error) {
         next(error);
     }
};


// --- Get User's Temple Bookings (Darshan, Pooja) ---
exports.getMyTempleBookings = async (req, res, next) => {
    const userId = req.user.uid;
    try {
        const bookingsColRef = collection(db, 'users', userId, 'templeBookings');
        const q = query(bookingsColRef, orderBy('bookingDate', 'desc')); // Order by booking date
        const querySnapshot = await getDocs(q);

        const bookings = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                bookingId: doc.id,
                ...data,
                bookingDate: (data.bookingDate as Timestamp)?.toDate(),
                 // Also convert visitDate/poojaDate
                 visitDate: (data.visitDate as Timestamp)?.toDate(),
                 poojaDate: (data.poojaDate as Timestamp)?.toDate(),
            };
        });
        res.status(200).json(bookings);
    } catch (error) {
        next(error);
    }
};

// Add controllers for Temple Info, Live Darshan URL fetching etc. if needed
exports.getTempleInfo = async (req, res, next) => { /* ... */ };
exports.getLiveDarshanUrl = async (req, res, next) => { /* ... */ };
exports.getTempleAudio = async (req, res, next) => { /* ... */ };
exports.getTempleEvents = async (req, res, next) => { /* ... */ };
exports.getNearbyAccommodation = async (req, res, next) => { /* ... */ };
exports.requestGroupVisit = async (req, res, next) => { /* ... */ };

    