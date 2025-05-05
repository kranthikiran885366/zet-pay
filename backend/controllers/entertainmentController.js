// backend/controllers/entertainmentController.js
const entertainmentProviderService = require('../services/entertainmentProviderService'); // New dedicated service
const { addTransaction } = require('../services/transactionLogger'); // Use centralized logger
const { payViaWalletInternal } = require('../services/wallet'); // For wallet payments
const db = require('firebase-admin').firestore();
const { serverTimestamp, collection, addDoc } = require('firebase/firestore'); // Import Firestore functions if needed directly

// --- Movies ---

exports.searchMovies = async (req, res, next) => {
    const { city, date } = req.query;
    console.log(`Searching movies for City: ${city}, Date: ${date}`);
    const movies = await entertainmentProviderService.searchMovies({ city, date });
    res.status(200).json(movies);
};

exports.getMovieDetails = async (req, res, next) => {
    const { movieId } = req.params;
    const { city, date } = req.query; // Need city/date for showtimes
    console.log(`Fetching details for Movie ID: ${movieId}, City: ${city}, Date: ${date}`);
    const details = await entertainmentProviderService.getMovieDetails({ movieId, city, date });
    if (!details) {
        res.status(404);
        throw new Error("Movie details or showtimes not found.");
    }
    res.status(200).json(details);
};

exports.bookMovieTickets = async (req, res, next) => {
    const userId = req.user.uid;
    const { movieId, cinemaId, showtime, seats, totalAmount, paymentMethod = 'wallet' } = req.body;
    const movieName = req.body.movieName || 'Movie'; // Get movie name if passed, fallback
    const cinemaName = req.body.cinemaName || 'Cinema'; // Get cinema name

    console.log(`Booking movie ticket for user ${userId}:`, req.body);

    let paymentSuccess = false;
    let paymentResult = {};
    let bookingResult = {};
    let finalStatus = 'Failed';
    let failureReason = 'Booking or payment failed.';
    const bookingName = `Movie: ${movieName} at ${cinemaName}`;

    let logData = {
        userId,
        type: 'Movie Booking',
        name: bookingName,
        description: `Seats: ${seats.join(', ')}, Time: ${showtime}`,
        amount: -totalAmount,
        status: 'Failed',
        billerId: cinemaId, // Use cinemaId as a reference
        paymentMethodUsed: paymentMethod,
    };

    try {
        // --- Step 1: Payment Processing ---
        if (paymentMethod === 'wallet') {
            const walletResult = await payViaWalletInternal(userId, `movie_${movieId}_${cinemaId}`, totalAmount, bookingName);
            if (!walletResult.success) throw new Error(walletResult.message || 'Wallet payment failed.');
            paymentSuccess = true;
            paymentResult = walletResult;
        } else if (paymentMethod === 'upi') {
            // TODO: Implement UPI payment logic
             throw new Error("UPI payment for movies not implemented yet.");
        } else if (paymentMethod === 'card') {
             // TODO: Implement Card payment logic
             throw new Error("Card payment for movies not implemented yet.");
        } else {
             throw new Error('Invalid payment method specified.');
        }

        // --- Step 2: Booking Confirmation with Provider ---
        if (paymentSuccess) {
            console.log("Payment successful, confirming movie ticket booking...");
            bookingResult = await entertainmentProviderService.confirmMovieBooking({
                userId,
                movieId,
                cinemaId,
                showtime,
                seats,
                totalAmount,
                paymentTransactionId: paymentResult.transactionId || null,
            });

             if (bookingResult.status === 'Confirmed') {
                finalStatus = 'Completed';
                failureReason = '';
                logData.status = finalStatus;
                logData.description = bookingResult.message || `Booking ID: ${bookingResult.bookingId}`;
                logData.ticketId = bookingResult.bookingId || undefined;
            } else {
                 finalStatus = 'Failed';
                 failureReason = bookingResult.message || 'Booking failed at provider.';
                 logData.status = 'Failed';
                 logData.description += ` - Booking Failed: ${failureReason}`;
                 console.error(`CRITICAL: Payment successful but movie booking failed for user ${userId}. Refunding.`);
                 // TODO: Trigger refund process.
                 paymentResult.message = failureReason + " Refund initiated.";
            }
        } else {
             throw new Error(paymentResult.message || "Payment failed before booking attempt.");
        }

        // --- Step 3: Logging Final Transaction ---
        const loggedTx = await addTransaction(logData);
        paymentResult.finalTransactionId = loggedTx.id;

        res.status(finalStatus === 'Completed' ? 201 : 400).json({
            status: finalStatus,
            message: paymentResult.message,
            transactionId: loggedTx.id,
            bookingDetails: finalStatus === 'Completed' ? bookingResult : null,
        });

    } catch (error) {
        console.error(`Movie booking failed for user ${userId}:`, error.message);
        logData.status = 'Failed';
        logData.description = `Movie Booking Failed - ${error.message}`;
         // Attempt to log failed attempt
         let failedTxId = paymentResult.finalTransactionId;
         if (!failedTxId) {
             try {
                 const failedTx = await addTransaction(logData);
                 failedTxId = failedTx.id;
             } catch (logError) {
                 console.error("Failed to log failed movie booking transaction:", logError);
             }
         }
        next(error); // Pass to error handler
    }
};

// --- Events (Generic/Comedy/Sports) ---

exports.searchEvents = async (req, res, next) => {
    const { city, category, date } = req.query;
    console.log("Searching Events:", { city, category, date });
    const events = await entertainmentProviderService.searchEvents({ city, category, date });
    res.status(200).json(events);
};

exports.getEventDetails = async (req, res, next) => {
    const { eventId } = req.params;
    console.log("Fetching details for Event ID:", eventId);
    const details = await entertainmentProviderService.getEventDetails({ eventId });
    if (!details) {
        res.status(404);
        throw new Error("Event details not found.");
    }
    res.status(200).json(details);
};

exports.bookEventTickets = async (req, res, next) => {
    // Similar logic to bookMovieTickets: Payment -> Provider Confirmation -> Log
    const userId = req.user.uid;
    const { eventId, quantity, totalAmount, paymentMethod = 'wallet' } = req.body;
    const eventName = req.body.eventName || 'Event'; // Get event name if passed

    console.log(`Booking event ticket for user ${userId}:`, req.body);

    // --- Payment & Booking Logic (Simplified) ---
    // --- Needs full implementation similar to movie booking ---
    try {
        // 1. Payment
        if (totalAmount <= 0) throw new Error("Invalid booking amount.");
        if (paymentMethod === 'wallet') {
            const walletResult = await payViaWalletInternal(userId, `event_${eventId}`, totalAmount, `Event: ${eventName}`);
            if (!walletResult.success) throw new Error(walletResult.message || 'Wallet payment failed.');
        } else {
            throw new Error("Only wallet payment supported for events currently.");
        }

        // 2. Provider Confirmation
        console.log("Payment successful, confirming event ticket booking...");
        const bookingResult = await entertainmentProviderService.confirmEventBooking({ userId, eventId, quantity, totalAmount });
        if (bookingResult.status !== 'Confirmed') {
             throw new Error(bookingResult.message || 'Event booking failed at provider.');
             // TODO: Refund logic if payment succeeded but booking failed
        }

        // 3. Log Transaction
        await addTransaction({
            userId,
            type: 'Event Booking',
            name: `Event: ${eventName}`,
            description: `Tickets: ${quantity}, ID: ${eventId}`,
            amount: -totalAmount,
            status: 'Completed',
            billerId: eventId,
            paymentMethodUsed: paymentMethod,
            ticketId: bookingResult.bookingId,
        });

        res.status(201).json({
             status: 'Completed',
             message: bookingResult.message || 'Event booked successfully.',
             bookingDetails: bookingResult,
        });

    } catch (error) {
        console.error(`Event booking failed for user ${userId}:`, error.message);
        next(error);
    }
};


// --- Gaming Vouchers ---

exports.getGamingVoucherBrands = async (req, res, next) => {
    const brands = await entertainmentProviderService.getGamingBrands();
    res.status(200).json(brands);
};

exports.getGamingVoucherDenominations = async (req, res, next) => {
    const { brandId } = req.query;
    const denominations = await entertainmentProviderService.getGamingDenominations(brandId);
    res.status(200).json(denominations);
};

exports.purchaseGamingVoucher = async (req, res, next) => {
    // Similar logic: Payment -> Provider Purchase -> Log
    const userId = req.user.uid;
    const { brandId, amount, playerId, paymentMethod = 'wallet' } = req.body;
    const brandName = req.body.brandName || 'Gaming Voucher';

    console.log(`Purchasing voucher for user ${userId}:`, req.body);

    try {
        // 1. Payment
        if (amount <= 0) throw new Error("Invalid voucher amount.");
        if (paymentMethod === 'wallet') {
             const walletResult = await payViaWalletInternal(userId, `voucher_${brandId}`, amount, `Voucher: ${brandName}`);
             if (!walletResult.success) throw new Error(walletResult.message || 'Wallet payment failed.');
        } else {
            throw new Error("Only wallet payment supported for vouchers currently.");
        }

        // 2. Purchase from Provider
        console.log("Payment successful, purchasing gaming voucher...");
        const purchaseResult = await entertainmentProviderService.purchaseGamingVoucher({ userId, brandId, amount, playerId });
        if (!purchaseResult.success) {
             throw new Error(purchaseResult.message || 'Voucher purchase failed at provider.');
             // TODO: Refund logic
        }

        // 3. Log Transaction
        await addTransaction({
            userId,
            type: 'Voucher Purchase',
            name: brandName,
            description: `Amount: ₹${amount}${playerId ? `, PlayerID: ${playerId}` : ''}. Code sent via SMS/Email.`,
            amount: -amount,
            status: 'Completed',
            billerId: brandId,
            paymentMethodUsed: paymentMethod,
            ticketId: purchaseResult.voucherCode, // Store voucher code if available, or reference ID
        });

         res.status(201).json({
             status: 'Completed',
             message: purchaseResult.message || 'Voucher purchased successfully.',
             voucherDetails: purchaseResult,
         });

    } catch (error) {
         console.error(`Voucher purchase failed for user ${userId}:`, error.message);
         next(error);
    }
};

