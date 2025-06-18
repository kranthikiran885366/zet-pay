
// backend/controllers/entertainmentController.js
const entertainmentProviderService = require('../services/entertainmentProviderService'); 
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger'); 
const { payViaWalletInternal } = require('../services/wallet'); 
const db = require('firebase-admin').firestore();
const { serverTimestamp, collection, addDoc, doc, updateDoc, getDoc } = require('firebase/firestore'); 
const { sendToUser } = require('../server'); 
const asyncHandler = require('../middleware/asyncHandler');
import type { Transaction, VoucherPurchasePayload } from '../services/types'; 

// --- Movies ---

exports.searchMovies = asyncHandler(async (req, res, next) => {
    const { city, date } = req.query;
    console.log(`[Entertainment Ctrl] Searching movies for City: ${city}, Date: ${date}`);
    // TODO: Replace with actual API call to movie provider
    const movies = await entertainmentProviderService.searchMovies({ city, date });
    res.status(200).json(movies);
});

exports.getMovieDetails = asyncHandler(async (req, res, next) => {
    const { movieId } = req.params;
    const { city, date } = req.query; 
    console.log(`[Entertainment Ctrl] Fetching details for Movie ID: ${movieId}, City: ${city}, Date: ${date}`);
    // TODO: Replace with actual API call
    const details = await entertainmentProviderService.getMovieDetails({ movieId, city, date });
    if (!details) {
        res.status(404);
        throw new Error("Movie details or showtimes not found.");
    }
    res.status(200).json(details);
});

exports.bookMovieTickets = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const { movieId, cinemaId, showtime, seats, totalAmount, paymentMethod = 'wallet', movieName, cinemaName, format: movieFormat } = req.body;
    
    console.log(`[Entertainment Ctrl] Booking movie ticket for user ${userId}:`, { movieId, cinemaId, showtime, seats, totalAmount, paymentMethod });

    let paymentSuccessful = false;
    let paymentResult = { success: false, transactionId: null, message: 'Payment processing failed initially.' }; 
    let bookingResult = {}; 
    let finalStatus = 'Failed';
    let failureReason = 'Booking or payment failed.';
    const bookingDescription = `Movie: ${movieName || 'Movie'} at ${cinemaName || 'Cinema'} (${movieFormat || '2D'})`;

    let logData: Partial<Transaction> & { userId: string } = { // Ensure userId is part of logData
        userId,
        type: 'Movie Booking',
        name: bookingDescription,
        description: `Seats: ${Array.isArray(seats) ? seats.join(', ') : seats}, Time: ${showtime}`,
        amount: -totalAmount, 
        status: 'Failed', 
        billerId: cinemaId, 
        ticketId: movieId, 
        paymentMethodUsed: paymentMethod === 'wallet' ? 'Wallet' : paymentMethod === 'upi' ? 'UPI' : 'Card',
    };
    let paymentTransactionId = null;

    try {
        // --- Payment Processing ---
        // TODO: Replace with actual Payment Gateway integration
        if (paymentMethod === 'wallet') {
            paymentResult = await payViaWalletInternal(userId, `movie_${movieId}_${cinemaId}`, totalAmount, bookingDescription, 'Movie Booking');
            if (!paymentResult.success) throw new Error(paymentResult.message || 'Wallet payment failed.');
            paymentSuccessful = true;
            paymentTransactionId = paymentResult.transactionId;
        } else {
            // Implement UPI/Card payment via paymentGatewayService
            throw new Error(`Payment method ${paymentMethod} not yet implemented for movie bookings.`);
        }

        if (!paymentTransactionId) {
            console.error("[Entertainment Ctrl] CRITICAL: Payment reported success but no transactionId returned.", paymentResult);
            throw new Error("Payment processing error: Missing transaction ID.");
        }
        console.log(`[Entertainment Ctrl] Payment successful (Tx ID: ${paymentTransactionId}). Confirming with movie provider...`);

        // --- Confirm with Movie Booking Provider ---
        // TODO: Replace with actual API call
        bookingResult = await entertainmentProviderService.confirmMovieBooking({
            userId, movieId, cinemaId, showtime, seats, totalAmount, paymentTransactionId,
        });

         if (bookingResult.status === 'Confirmed') {
            finalStatus = 'Completed';
            failureReason = '';
            logData.status = finalStatus;
            logData.ticketId = bookingResult.bookingId || paymentTransactionId; 
            logData.description = bookingResult.message || `Booking ID: ${bookingResult.bookingId || 'N/A'}`;
            paymentResult.message = bookingResult.message || 'Booking successful.'; 

             const originalTxRef = doc(db, 'transactions', paymentTransactionId);
             await updateDoc(originalTxRef, {
                 status: finalStatus,
                 description: `${logData.name} - Provider Booking ID: ${logData.ticketId}`, 
                 ticketId: logData.ticketId, 
                 updatedAt: serverTimestamp()
             });

             const userBookingsRef = collection(db, 'users', userId, 'bookings');
             await addDoc(userBookingsRef, {
                  bookingId: bookingResult.bookingId, type: 'movie',
                  details: { movieName, cinemaName, showtime, seats: Array.isArray(seats) ? seats.join(', ') : seats, format: movieFormat },
                  totalAmount, bookingDate: serverTimestamp(), status: 'Confirmed', userId, paymentTransactionId, 
             });
             console.log(`[Entertainment Ctrl] Movie booking ${bookingResult.bookingId} saved to Firestore.`);

        } else { // Booking failed after payment
             finalStatus = 'Failed';
             failureReason = bookingResult.message || 'Booking failed at provider.';
             logData.status = 'Failed'; 
             logData.description = `${logData.name} - Booking Failed: ${failureReason}`; 
             paymentResult.message = failureReason; 

             console.error(`[Entertainment Ctrl] CRITICAL: Payment successful (Tx: ${paymentTransactionId}) but movie booking failed. Refunding.`);
             const originalTxRefFailed = doc(db, 'transactions', paymentTransactionId);
             await updateDoc(originalTxRefFailed, {
                 status: 'Failed',
                 description: `Booking Failed at provider for ${logData.name} - ${failureReason}`,
                 failureReason: failureReason, // Log the failure reason
                 updatedAt: serverTimestamp()
             });

             if (paymentMethod === 'wallet' && paymentTransactionId) {
                  const refundResult = await payViaWalletInternal(userId, `REFUND_MOVIE_${paymentTransactionId}`, -totalAmount, `Refund: Failed Movie Booking for ${movieName}`, 'Refund');
                  if (refundResult.success) {
                       paymentResult.message = `${failureReason} Refund of ₹${totalAmount} processed to wallet.`;
                  } else {
                       paymentResult.message = `${failureReason} CRITICAL: Wallet refund failed. Manual intervention required.`;
                       console.error(paymentResult.message);
                  }
             } else {
                  // TODO: Handle refunds for UPI/Card payments via Payment Gateway
             }
             throw new Error(paymentResult.message); 
        }

         logTransactionToBlockchain(paymentTransactionId, { ...logData, id: paymentTransactionId, date: new Date() } )
              .catch(err => console.error("[Entertainment Ctrl] Blockchain log failed:", err));
        
         const finalTxDoc = await getDoc(doc(db, 'transactions', paymentTransactionId));
         if (finalTxDoc.exists()) {
             const finalTxData = { id: finalTxDoc.id, ...finalTxDoc.data(), date: finalTxDoc.data().date.toDate().toISOString() }; // Ensure date is ISO string
             sendToUser(userId, { type: 'transaction_update', payload: finalTxData });
             if(finalStatus === 'Completed') {
                 sendToUser(userId, { type: 'booking_update', payload: { id: bookingResult.bookingId, status: finalStatus, type: 'movie', details: bookingResult } });
             }
         }
        
        res.status(201).json({ 
            status: finalStatus, 
            message: paymentResult.message,
            transactionId: paymentTransactionId,
            bookingDetails: bookingResult,
        });

    } catch (error) {
        console.error(`[Entertainment Ctrl] Movie booking failed for user ${userId}:`, error.message);
        let finalFailedTxId = paymentTransactionId; 
        const currentDescription = (logData.description || `${logData.name || 'Movie Booking'} - `) + `Error: ${error.message}`;

        if (!finalFailedTxId && totalAmount > 0) { // If payment transaction wasn't even created for a paid booking
            logData.status = 'Failed';
            logData.description = currentDescription;
            logData.failureReason = error.message;
            try {
                const failedTx = await addTransaction(logData);
                finalFailedTxId = failedTx.id;
                 sendToUser(userId, { type: 'transaction_update', payload: { ...failedTx, date: (failedTx.date as unknown as Timestamp).toDate().toISOString() } });
            } catch (logError) {
                console.error("[Entertainment Ctrl] Failed to log initial failed movie booking transaction:", logError);
            }
        } else if (finalFailedTxId) { // If payment was attempted/logged
            try {
                const txDocRef = doc(db, 'transactions', finalFailedTxId);
                const txSnap = await getDoc(txDocRef);
                if (txSnap.exists() && txSnap.data().status !== 'Failed') {
                    await updateDoc(txDocRef, {
                        status: 'Failed',
                        description: currentDescription, // Use updated description
                        failureReason: error.message,
                        updatedAt: serverTimestamp()
                    });
                    const updatedTxDoc = await getDoc(txDocRef);
                    if(updatedTxDoc.exists()) {
                        sendToUser(userId, { type: 'transaction_update', payload: { id: updatedTxDoc.id, ...updatedTxDoc.data(), date: updatedTxDoc.data().date.toDate().toISOString() } });
                    }
                }
            } catch (updateError) {
                console.error(`[Entertainment Ctrl] Error updating transaction ${finalFailedTxId} to Failed state:`, updateError);
            }
        }

        res.status(400).json({
            status: 'Failed',
            message: error.message || failureReason,
            transactionId: finalFailedTxId,
            bookingDetails: null,
        });
    }
});

// --- Events (Generic/Comedy/Sports) ---
exports.searchEvents = asyncHandler(async (req, res, next) => {
    const { city, category, date } = req.query;
    console.log("[Entertainment Ctrl] Searching Events:", { city, category, date });
    // TODO: Replace with actual API call
    const events = await entertainmentProviderService.searchEvents({ city, category, date });
    res.status(200).json(events);
});

exports.getEventDetails = asyncHandler(async (req, res, next) => {
    const { eventId } = req.params;
    console.log("[Entertainment Ctrl] Fetching details for Event ID:", eventId);
    // TODO: Replace with actual API call
    const details = await entertainmentProviderService.getEventDetails({ eventId });
    if (!details) {
        res.status(404);
        throw new Error("Event details not found.");
    }
    res.status(200).json(details);
});

exports.bookEventTickets = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const { eventId, quantity, totalAmount, paymentMethod = 'wallet', eventName } = req.body;
    
    console.log(`[Entertainment Ctrl] Booking event ticket for user ${userId}:`, req.body);

    let paymentSuccessful = false;
    let paymentResult = { success: false, transactionId: null, message: 'Payment processing failed initially.' };
    let bookingResult = {};
    let finalStatus = 'Failed';
    let failureReason = 'Event booking failed.';
    const bookingDescription = `Event: ${eventName || 'Event'} (${eventId})`;
    let paymentTransactionId = null;

    let logData: Partial<Transaction> & { userId: string } = { // Ensure userId is part of logData
        userId, type: 'Event Booking', name: eventName || eventId,
        description: `Tickets: ${quantity}`, amount: -totalAmount, status: 'Failed',
        billerId: eventId,
        paymentMethodUsed: paymentMethod === 'wallet' ? 'Wallet' : paymentMethod === 'upi' ? 'UPI' : 'Card',
    };

    try {
        if (totalAmount <= 0) throw new Error("Invalid booking amount.");
        // TODO: Payment Gateway integration
        if (paymentMethod === 'wallet') {
            paymentResult = await payViaWalletInternal(userId, `event_${eventId}`, totalAmount, bookingDescription, 'Event Booking');
            if (!paymentResult.success) throw new Error(paymentResult.message || 'Wallet payment failed.');
            paymentSuccessful = true;
            paymentTransactionId = paymentResult.transactionId;
        } else {
            throw new Error(`Payment method '${paymentMethod}' not supported for events yet.`);
        }
        
        if (!paymentTransactionId) throw new Error("Payment processing error: Missing transaction ID for event.");
        console.log(`[Entertainment Ctrl] Payment successful (Tx ID: ${paymentTransactionId}). Confirming event booking...`);

        // TODO: Replace with actual API call
        bookingResult = await entertainmentProviderService.confirmEventBooking({ userId, eventId, quantity, totalAmount, paymentTransactionId });
        if (bookingResult.status === 'Confirmed') {
            finalStatus = 'Completed';
            logData.status = finalStatus;
            logData.ticketId = bookingResult.bookingId || undefined;
            logData.description = bookingResult.message || `Booking ID: ${bookingResult.bookingId}`;
            paymentResult.message = bookingResult.message || 'Event booked successfully.';

             const originalTxRef = doc(db, 'transactions', paymentTransactionId);
             await updateDoc(originalTxRef, {
                 status: finalStatus, description: `${logData.name} - Provider Booking ID: ${logData.ticketId}`,
                 ticketId: logData.ticketId, updatedAt: serverTimestamp()
             });

             const userBookingsRef = collection(db, 'users', userId, 'bookings');
             await addDoc(userBookingsRef, {
                 bookingId: bookingResult.bookingId, type: 'event', details: { eventName, quantity, eventId },
                 totalAmount, bookingDate: serverTimestamp(), status: 'Confirmed', userId, paymentTransactionId,
             });
        } else {
             finalStatus = 'Failed'; failureReason = bookingResult.message || 'Event booking failed at provider.';
             logData.status = 'Failed'; logData.description += ` - Booking Failed: ${failureReason}`;
             paymentResult.message = failureReason;

             console.error(`[Entertainment Ctrl] CRITICAL: Payment successful (Tx: ${paymentTransactionId}) but event booking failed. Refunding.`);
             const originalTxRefFailed = doc(db, 'transactions', paymentTransactionId);
             await updateDoc(originalTxRefFailed, { status: 'Failed', description: `Event Booking Failed at provider for ${logData.name}`, failureReason, updatedAt: serverTimestamp() });

             if (paymentMethod === 'wallet' && paymentTransactionId) {
                  const refundResult = await payViaWalletInternal(userId, `REFUND_EVENT_${paymentTransactionId}`, -totalAmount, `Refund: Failed Event Booking for ${eventName}`, 'Refund');
                  paymentResult.message = refundResult.success ? `${failureReason} Refund processed.` : `${failureReason} CRITICAL: Wallet refund failed.`;
             }
             throw new Error(paymentResult.message);
        }

        logTransactionToBlockchain(paymentTransactionId, { ...logData, id: paymentTransactionId, date: new Date() } ).catch(console.error);
        const finalTxDoc = await getDoc(doc(db, 'transactions', paymentTransactionId));
        if (finalTxDoc.exists()) {
            const finalTxData = { id: finalTxDoc.id, ...finalTxDoc.data(), date: finalTxDoc.data().date.toDate().toISOString() };
            sendToUser(userId, { type: 'transaction_update', payload: finalTxData });
            if (finalStatus === 'Completed') sendToUser(userId, { type: 'booking_update', payload: { id: bookingResult.bookingId, status: finalStatus, type: 'event', details: bookingResult } });
        }
        
        res.status(201).json({ status: finalStatus, message: paymentResult.message, transactionId: paymentTransactionId, bookingDetails: bookingResult });
    } catch (error) {
        console.error(`[Entertainment Ctrl] Event booking failed for user ${userId}:`, error.message);
        let finalFailedTxId = paymentTransactionId;
        const currentDescription = (logData.description || `${logData.name || 'Event Booking'} - `) + `Error: ${error.message}`;
        if (!finalFailedTxId && totalAmount > 0) {
            logData.status = 'Failed'; logData.description = currentDescription; logData.failureReason = error.message;
            try {
                const failedTx = await addTransaction(logData); finalFailedTxId = failedTx.id;
                sendToUser(userId, { type: 'transaction_update', payload: { ...failedTx, date: (failedTx.date as unknown as Timestamp).toDate().toISOString() } });
            } catch (logError) { console.error("[Entertainment Ctrl] Failed to log initial failed event booking transaction:", logError); }
        } else if (finalFailedTxId) {
            try {
                const txDocRef = doc(db, 'transactions', finalFailedTxId);
                const txSnap = await getDoc(txDocRef);
                if (txSnap.exists() && txSnap.data().status !== 'Failed') {
                    await updateDoc(txDocRef, { status: 'Failed', description: currentDescription, failureReason: error.message, updatedAt: serverTimestamp() });
                    const updatedTxDoc = await getDoc(txDocRef);
                    if(updatedTxDoc.exists()) sendToUser(userId, { type: 'transaction_update', payload: { id: updatedTxDoc.id, ...updatedTxDoc.data(), date: updatedTxDoc.data().date.toDate().toISOString() } });
                }
            } catch (updateError) { console.error(`[Entertainment Ctrl] Error updating event transaction ${finalFailedTxId} to Failed state:`, updateError); }
        }
        res.status(400).json({ status: 'Failed', message: error.message || failureReason, transactionId: finalFailedTxId, bookingDetails: null });
    }
});


// --- Gaming & Digital Vouchers ---
exports.getGamingVoucherBrands = asyncHandler(async (req, res, next) => {
    // TODO: Replace with actual API call
    const brands = await entertainmentProviderService.getGamingBrands();
    res.status(200).json(brands);
});

exports.getGamingVoucherDenominations = asyncHandler(async (req, res, next) => {
    const { brandId } = req.query;
    // TODO: Replace with actual API call
    const denominations = await entertainmentProviderService.getGamingDenominations(brandId);
    res.status(200).json(denominations);
});

exports.purchaseVoucher = asyncHandler(async (req, res, next) => {
    const userId = req.user.uid;
    const { brandId, amount, playerId, recipientMobile, billerName, voucherType = 'gaming' }: VoucherPurchasePayload = req.body;

    console.log(`[Entertainment Ctrl] Purchasing ${voucherType} voucher for user ${userId}:`, req.body);

    let paymentSuccessful = false;
    let paymentResult = { success: false, transactionId: null, message: 'Payment processing failed initially.' };
    let purchaseResult = {};
    let finalStatus = 'Failed';
    let failureReason = 'Voucher purchase failed.';
    const purchaseDescription = `Voucher: ${billerName || brandId}`;
    let paymentTransactionId = null;

    let logData: Partial<Transaction> & { userId: string } = {
        userId, type: 'Voucher Purchase', name: billerName || brandId,
        description: `Amount: ₹${amount}${playerId ? `, PlayerID: ${playerId}` : ''}${recipientMobile ? `, For: ${recipientMobile}` : ''}`,
        amount: -amount, status: 'Failed', billerId: brandId, paymentMethodUsed: 'Wallet', // Assuming wallet for now
    };

    try {
        if (amount <= 0) throw new Error("Invalid voucher amount.");
        // TODO: Payment Gateway integration
        paymentResult = await payViaWalletInternal(userId, `voucher_${voucherType}_${brandId}`, amount, purchaseDescription, 'Voucher Purchase');
        if (!paymentResult.success) throw new Error(paymentResult.message || 'Wallet payment failed.');
        paymentSuccessful = true;
        paymentTransactionId = paymentResult.transactionId;
        
        if (!paymentTransactionId) throw new Error("Payment processing error: Missing transaction ID for voucher.");
        console.log(`[Entertainment Ctrl] Payment successful (Tx ID: ${paymentTransactionId}). Purchasing ${voucherType} voucher...`);

        // TODO: Replace with actual API call
        purchaseResult = await entertainmentProviderService.purchaseVoucher({ userId, brandId, amount, playerId, recipientMobile, paymentTransactionId, voucherType });
        if (purchaseResult.success) {
            finalStatus = 'Completed';
            logData.status = finalStatus;
            logData.ticketId = purchaseResult.voucherCode || purchaseResult.receiptId || undefined; 
            logData.description = purchaseResult.message || `Voucher Details: ${logData.ticketId || 'Sent'}`;
            paymentResult.message = purchaseResult.message || 'Voucher purchased successfully.';

            const originalTxRef = doc(db, 'transactions', paymentTransactionId);
            await updateDoc(originalTxRef, {
                status: finalStatus, description: `${logData.name} - Voucher: ${logData.ticketId || 'Delivered'}`,
                ticketId: logData.ticketId, updatedAt: serverTimestamp()
            });
        } else {
            finalStatus = 'Failed'; failureReason = purchaseResult.message || 'Voucher purchase failed at provider.';
            logData.status = 'Failed'; logData.description += ` - Purchase Failed: ${failureReason}`;
            paymentResult.message = failureReason;

            console.error(`[Entertainment Ctrl] CRITICAL: Payment successful (Tx: ${paymentTransactionId}) but ${voucherType} voucher purchase failed. Refunding.`);
            const originalTxRefFailed = doc(db, 'transactions', paymentTransactionId);
            await updateDoc(originalTxRefFailed, { status: 'Failed', description: `${voucherType} Voucher Purchase Failed for ${logData.name}`, failureReason, updatedAt: serverTimestamp() });

            const refundResult = await payViaWalletInternal(userId, `REFUND_${voucherType.toUpperCase()}_${paymentTransactionId}`, -amount, `Refund: Failed ${billerName} Voucher`, 'Refund');
            paymentResult.message = refundResult.success ? `${failureReason} Refund processed.` : `${failureReason} CRITICAL: Wallet refund failed.`;
            throw new Error(paymentResult.message);
        }

        logTransactionToBlockchain(paymentTransactionId, { ...logData, id: paymentTransactionId, date: new Date() } ).catch(console.error);
        const finalTxDoc = await getDoc(doc(db, 'transactions', paymentTransactionId));
        if (finalTxDoc.exists()) {
            sendToUser(userId, { type: 'transaction_update', payload: { id: finalTxDoc.id, ...finalTxDoc.data(), date: finalTxDoc.data().date.toDate().toISOString() } });
        }
        
         res.status(201).json({ status: finalStatus, message: paymentResult.message, transactionId: paymentTransactionId, voucherDetails: purchaseResult });
    } catch (error) {
         console.error(`[Entertainment Ctrl] ${voucherType} Voucher purchase failed for user ${userId}:`, error.message);
         let finalFailedTxId = paymentTransactionId;
         const currentDescription = (logData.description || `${logData.name || 'Voucher Purchase'} - `) + `Error: ${error.message}`;
        if (!finalFailedTxId && amount > 0) {
            logData.status = 'Failed'; logData.description = currentDescription; logData.failureReason = error.message;
            try {
                const failedTx = await addTransaction(logData); finalFailedTxId = failedTx.id;
                sendToUser(userId, { type: 'transaction_update', payload: { ...failedTx, date: (failedTx.date as unknown as Timestamp).toDate().toISOString() } });
            } catch (logError) { console.error(`[Entertainment Ctrl] Failed to log initial failed ${voucherType} voucher purchase transaction:`, logError); }
        } else if (finalFailedTxId) {
            try {
                const txDocRef = doc(db, 'transactions', finalFailedTxId);
                const txSnap = await getDoc(txDocRef);
                if (txSnap.exists() && txSnap.data().status !== 'Failed') {
                    await updateDoc(txDocRef, { status: 'Failed', description: currentDescription, failureReason: error.message, updatedAt: serverTimestamp() });
                    const updatedTxDoc = await getDoc(txDocRef);
                    if(updatedTxDoc.exists()) sendToUser(userId, { type: 'transaction_update', payload: { id: updatedTxDoc.id, ...updatedTxDoc.data(), date: updatedTxDoc.data().date.toDate().toISOString() } });
                }
            } catch (updateError) { console.error(`[Entertainment Ctrl] Error updating ${voucherType} voucher transaction ${finalFailedTxId} to Failed state:`, updateError); }
        }
        res.status(400).json({ status: 'Failed', message: error.message || failureReason, transactionId: finalFailedTxId, voucherDetails: null });
    }
});

