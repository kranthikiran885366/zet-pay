// backend/controllers/entertainmentController.js
const entertainmentProviderService = require('../services/entertainmentProviderService'); // New dedicated service
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger'); // Use centralized logger
const { payViaWalletInternal } = require('../services/wallet'); // For wallet payments
const db = require('firebase-admin').firestore();
const { serverTimestamp, collection, addDoc, doc, updateDoc, getDoc } = require('firebase/firestore'); // Import Firestore functions
const { sendToUser } = require('../server'); // Import WebSocket sender
import type { Transaction } from '../services/types'; // Import shared Transaction type

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
    const { movieId, cinemaId, showtime, seats, totalAmount, paymentMethod = 'wallet', movieName, cinemaName, format: movieFormat } = req.body;
    // Validation already done by router

    console.log(`Booking movie ticket for user ${userId}:`, { movieId, cinemaId, showtime, seats, totalAmount, paymentMethod });

    let paymentSuccess = false;
    let paymentResult: any = {}; // Store payment result { success, transactionId, message, newBalance? }
    let bookingResult: any = {}; // Store provider booking result
    let finalStatus: Transaction['status'] = 'Failed';
    let failureReason = 'Booking or payment failed.';
    const bookingDescription = `Movie: ${movieName || 'Movie'} at ${cinemaName || 'Cinema'} (${movieFormat || '2D'})`;

    // Prepare initial log data (will be updated based on payment/booking outcome)
    let logData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = {
        userId,
        type: 'Movie Booking',
        name: bookingDescription,
        description: `Seats: ${Array.isArray(seats) ? seats.join(', ') : seats}, Time: ${showtime}`,
        amount: -totalAmount, // Payment is a debit
        status: 'Failed', // Default to Failed
        billerId: cinemaId, // Use cinemaId as billerId for movies
        ticketId: movieId, // Use movieId as ticketId for reference
        paymentMethodUsed: paymentMethod === 'wallet' ? 'Wallet' : paymentMethod === 'upi' ? 'UPI' : 'Card',
    };
    let paymentTransactionId: string | undefined;

    try {
        // --- Step 1: Payment Processing ---
        if (paymentMethod === 'wallet') {
            // Amount is positive for debit from wallet
            paymentResult = await payViaWalletInternal(userId, `movie_${movieId}_${cinemaId}`, totalAmount, bookingDescription);
            if (!paymentResult.success) throw new Error(paymentResult.message || 'Wallet payment failed.');
            paymentSuccess = true;
            paymentTransactionId = paymentResult.transactionId;
            logData.description += ' (via Wallet)';
        } else if (paymentMethod === 'upi') {
            // TODO: Implement UPI payment logic via upiProviderService
            console.warn("UPI payment for movies not fully implemented backend-side.");
            throw new Error("UPI payment for movies not implemented yet.");
            // paymentSuccess = upiResult.success;
            // paymentTransactionId = upiResult.transactionId;
            // logData.description += ' (via UPI)';
        } else if (paymentMethod === 'card') {
            // TODO: Implement Card payment logic via paymentGatewayService
             console.warn("Card payment for movies not fully implemented backend-side.");
            throw new Error("Card payment for movies not implemented yet.");
            // paymentSuccess = cardResult.success;
            // paymentTransactionId = cardResult.transactionId;
            // logData.description += ' (via Card)';
        } else {
             throw new Error('Invalid payment method specified.');
        }

        // Ensure a transaction ID exists from the payment step before proceeding
        if (!paymentTransactionId) {
            console.error("[Entertainment Ctrl] CRITICAL: Payment reported success but no transactionId returned from payment method.", paymentResult);
            throw new Error("Payment processing error: Missing transaction ID.");
        }
        console.log(`[Entertainment Ctrl] Payment successful. Payment Tx ID: ${paymentTransactionId}. Proceeding to movie provider confirmation.`);


        // --- Step 2: Booking Confirmation with Provider ---
        // This part remains largely simulated by entertainmentProviderService
        bookingResult = await entertainmentProviderService.confirmMovieBooking({
            userId,
            movieId,
            cinemaId,
            showtime,
            seats, // Assuming seats is an array of seat IDs/numbers
            totalAmount,
            paymentTransactionId: paymentTransactionId,
        });

         if (bookingResult.status === 'Confirmed') {
            finalStatus = 'Completed';
            failureReason = '';
            logData.status = finalStatus;
            logData.ticketId = bookingResult.bookingId || paymentTransactionId; // Use provider booking ID or fallback
            logData.description = bookingResult.message || `Booking ID: ${bookingResult.bookingId || 'N/A'}`;
            paymentResult.message = bookingResult.message || 'Booking successful.'; // Update overall success message

            // Update the original transaction log created by the payment method
             const originalTxRef = doc(db, 'transactions', paymentTransactionId);
             await updateDoc(originalTxRef, {
                 status: finalStatus,
                 description: `${logData.name} - Provider Booking ID: ${logData.ticketId}`, // Update description
                 ticketId: logData.ticketId, // Ensure ticketId is on the transaction log
                 updatedAt: serverTimestamp()
             });

             // Save booking details to user's subcollection
             const userBookingsRef = collection(db, 'users', userId, 'bookings');
             await addDoc(userBookingsRef, {
                  bookingId: bookingResult.bookingId,
                  type: 'movie',
                  details: { movieName, cinemaName, showtime, seats: Array.isArray(seats) ? seats.join(', ') : seats, format: movieFormat },
                  totalAmount: totalAmount,
                  bookingDate: serverTimestamp(),
                  status: 'Confirmed', // Provider status
                  userId: userId,
                  paymentTransactionId: paymentTransactionId, // Link to the payment transaction
             });
             console.log(`[Entertainment Ctrl] Movie booking ${bookingResult.bookingId} saved to Firestore.`);

        } else {
             // Booking failed AFTER successful payment -> Refund required
             finalStatus = 'Failed';
             failureReason = bookingResult.message || 'Booking failed at provider.';
             logData.status = 'Failed'; // Log Data for blockchain should reflect this
             logData.description = `${logData.name} - Booking Failed: ${failureReason}`; // Update log description
             paymentResult.message = failureReason; // Update overall message

             console.error(`[Entertainment Ctrl] CRITICAL: Payment successful (Tx: ${paymentTransactionId}) but movie booking failed for user ${userId}. Refunding.`);
             // Update the original transaction log to 'Failed'
             const originalTxRefFailed = doc(db, 'transactions', paymentTransactionId);
             await updateDoc(originalTxRefFailed, {
                 status: 'Failed',
                 description: `Booking Failed at provider for ${logData.name} - ${failureReason}`,
                 updatedAt: serverTimestamp()
             });

             // --- Refund Logic ---
             if (paymentMethod === 'wallet' && paymentTransactionId) {
                  const refundAmount = totalAmount; // Full refund
                  // Use negative amount for credit back to wallet
                  const refundResult = await payViaWalletInternal(userId, `REFUND_${paymentTransactionId}`, -refundAmount, `Refund: Failed Movie Booking for ${movieName}`);
                  if (refundResult.success) {
                       paymentResult.message = `${failureReason} Refund of ₹${refundAmount} processed to wallet.`;
                        // Optionally update the *original* payment log status to 'Refunded'
                        // This would be a separate transaction if refund has its own ID
                        // await updateDoc(originalTxRefFailed, { status: 'Refunded', description: `${logData.name} - Refunded due to booking failure.` });
                        console.log(`[Entertainment Ctrl] Wallet refund of ₹${refundAmount} successful for Tx: ${paymentTransactionId}`);
                  } else {
                       paymentResult.message = `${failureReason} CRITICAL: Wallet refund failed after payment success. Manual intervention required.`;
                       console.error(paymentResult.message);
                        // Add alerting here!
                  }
             }
             // TODO: Add refund logic for UPI/Card if implemented
             // --- End Refund Logic ---
             throw new Error(paymentResult.message); // Throw error to signify booking failure for the catch block
        }

        // --- Step 3: Blockchain Logging (Optional for successful booking) ---
         logTransactionToBlockchain(paymentTransactionId, { ...logData, id: paymentTransactionId, date: new Date() } as Transaction)
              .catch(err => console.error("[Entertainment Ctrl] Blockchain log failed:", err));

        // --- Step 4: Send final WebSocket Update ---
         const finalTxDoc = await getDoc(doc(db, 'transactions', paymentTransactionId));
         if (finalTxDoc.exists()) {
             const finalTxData = { id: finalTxDoc.id, ...finalTxDoc.data(), date: finalTxDoc.data().date.toDate() };
             sendToUser(userId, { type: 'transaction_update', payload: finalTxData });
             if(finalStatus === 'Completed') {
                 sendToUser(userId, { type: 'booking_update', payload: { id: bookingResult.bookingId, status: finalStatus, type: 'movie', details: bookingResult } });
             }
         }

         // --- Step 5: Respond to Client ---
        res.status(201).json({ // Use 201 Created for successful booking
            status: finalStatus, // Should be 'Completed'
            message: paymentResult.message,
            transactionId: paymentTransactionId,
            bookingDetails: bookingResult,
        });

    } catch (error: any) {
        console.error(`[Entertainment Ctrl] Movie booking failed for user ${userId}:`, error.message);
        // The transaction might have been logged by payViaWalletInternal already if payment itself failed.
        // If payment succeeded but booking failed, we have updated the original log.
        // Ensure the response reflects the latest state.
        let finalFailedTxId = paymentTransactionId; // If payment was attempted, use its ID

        if (!finalFailedTxId) { // If payment failed before logging
            logData.status = 'Failed';
            logData.description = `${logData.name} - Booking Error: ${error.message}`;
            try {
                const failedTx = await addTransaction(logData as any);
                finalFailedTxId = failedTx.id;
                 sendToUser(userId, { type: 'transaction_update', payload: { ...failedTx, date: failedTx.date } });
            } catch (logError) {
                console.error("[Entertainment Ctrl] Failed to log initial failed movie booking transaction:", logError);
            }
        } else {
            // Ensure the existing transaction log reflects the failure if not already done
            try {
                const txDocRef = doc(db, 'transactions', finalFailedTxId);
                const txSnap = await txDocRef.get();
                if (txSnap.exists() && txSnap.data().status !== 'Failed') {
                    await updateDoc(txDocRef, {
                        status: 'Failed',
                        description: txSnap.data().description + ` - Final Booking Error: ${error.message}`,
                        updatedAt: serverTimestamp()
                    });
                    const updatedTxDoc = await getDoc(txDocRef);
                    if(updatedTxDoc.exists()) {
                        sendToUser(userId, { type: 'transaction_update', payload: { id: updatedTxDoc.id, ...updatedTxDoc.data(), date: updatedTxDoc.data().date.toDate() } });
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
    // Similar logic to bookMovieTickets: Payment -> Provider Confirmation -> Log -> Refund on failure
    const userId = req.user.uid;
    const { eventId, quantity, totalAmount, paymentMethod = 'wallet', eventName } = req.body;
    // Validation in router

    console.log(`Booking event ticket for user ${userId}:`, req.body);

    let paymentSuccess = false;
    let paymentResult: any = {};
    let bookingResult: any = {};
    let finalStatus: Transaction['status'] = 'Failed';
    let failureReason = 'Event booking failed.';
    const bookingDescription = `Event: ${eventName || 'Event'} (${eventId})`;
    let paymentTransactionId: string | undefined;

    let logData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = {
        userId,
        type: 'Event Booking',
        name: eventName || eventId,
        description: `Tickets: ${quantity}`,
        amount: -totalAmount,
        status: 'Failed',
        billerId: eventId,
        paymentMethodUsed: paymentMethod === 'wallet' ? 'Wallet' : paymentMethod === 'upi' ? 'UPI' : 'Card',
    };


    try {
        // --- Step 1: Payment ---
        if (totalAmount <= 0) throw new Error("Invalid booking amount.");
        if (paymentMethod === 'wallet') {
            paymentResult = await payViaWalletInternal(userId, `event_${eventId}`, totalAmount, bookingDescription);
            if (!paymentResult.success) throw new Error(paymentResult.message || 'Wallet payment failed.');
            paymentSuccess = true;
            paymentTransactionId = paymentResult.transactionId;
             logData.description += ' (via Wallet)';
        } else {
            // TODO: Implement UPI/Card payment
            throw new Error(`Payment method '${paymentMethod}' not supported for events yet.`);
        }

        // Ensure a transaction ID exists
        if (!paymentTransactionId) {
            console.error("[Entertainment Ctrl] CRITICAL: Payment reported success but no transactionId for event booking.");
            throw new Error("Payment processing error: Missing transaction ID for event.");
        }

        // --- Step 2: Provider Confirmation ---
        console.log("Payment successful, confirming event ticket booking...");
        bookingResult = await entertainmentProviderService.confirmEventBooking({ userId, eventId, quantity, totalAmount, paymentTransactionId });
        if (bookingResult.status === 'Confirmed') {
            finalStatus = 'Completed';
            logData.status = finalStatus;
            logData.ticketId = bookingResult.bookingId || undefined;
            logData.description = bookingResult.message || `Booking ID: ${bookingResult.bookingId}`;
            paymentResult.message = bookingResult.message || 'Event booked successfully.';

             // Update the original transaction log
             const originalTxRef = doc(db, 'transactions', paymentTransactionId);
             await updateDoc(originalTxRef, {
                 status: finalStatus,
                 description: `${logData.name} - Provider Booking ID: ${logData.ticketId}`,
                 ticketId: logData.ticketId,
                 updatedAt: serverTimestamp()
             });

             // Optionally add booking details to a user subcollection
             const userBookingsRef = collection(db, 'users', userId, 'bookings');
             await addDoc(userBookingsRef, {
                 bookingId: bookingResult.bookingId,
                 type: 'event',
                 details: { eventName, quantity, eventId },
                 totalAmount: totalAmount,
                 bookingDate: serverTimestamp(),
                 status: 'Confirmed',
                 userId: userId,
                 paymentTransactionId: paymentTransactionId,
             });

        } else {
             finalStatus = 'Failed';
             failureReason = bookingResult.message || 'Event booking failed at provider.';
             logData.status = 'Failed';
             logData.description += ` - Booking Failed: ${failureReason}`;
             paymentResult.message = failureReason;

             console.error(`[Entertainment Ctrl] CRITICAL: Payment successful (Tx: ${paymentTransactionId}) but event booking failed. Refunding.`);
             // Update original transaction to Failed
             const originalTxRefFailed = doc(db, 'transactions', paymentTransactionId);
             await updateDoc(originalTxRefFailed, { status: 'Failed', description: `Event Booking Failed at provider for ${logData.name}`, updatedAt: serverTimestamp() });

             // --- Refund Logic ---
             if (paymentMethod === 'wallet' && paymentTransactionId) {
                  const refundResult = await payViaWalletInternal(userId, `REFUND_EVENT_${paymentTransactionId}`, -totalAmount, `Refund: Failed Event Booking for ${eventName}`);
                  if (refundResult.success) {
                       paymentResult.message = `${failureReason} Refund of ₹${totalAmount} processed to wallet.`;
                  } else {
                       paymentResult.message = `${failureReason} CRITICAL: Wallet refund failed. Manual intervention required.`;
                       console.error(paymentResult.message);
                  }
             }
             // --- End Refund Logic ---
             throw new Error(paymentResult.message);
        }

        // --- Step 3: Blockchain/WS Update ---
        logTransactionToBlockchain(paymentTransactionId, { ...logData, id: paymentTransactionId, date: new Date() } as Transaction).catch(console.error);
        
        const finalTxDoc = await getDoc(doc(db, 'transactions', paymentTransactionId));
        if (finalTxDoc.exists()) {
            const finalTxData = { id: finalTxDoc.id, ...finalTxDoc.data(), date: finalTxDoc.data().date.toDate() };
            sendToUser(userId, { type: 'transaction_update', payload: finalTxData });
            if (finalStatus === 'Completed') {
                sendToUser(userId, { type: 'booking_update', payload: { id: bookingResult.bookingId, status: finalStatus, type: 'event', details: bookingResult } });
            }
        }

         // --- Step 4: Respond ---
        res.status(201).json({
             status: 'Completed',
             message: paymentResult.message,
              transactionId: paymentTransactionId,
             bookingDetails: bookingResult,
        });

    } catch (error: any) {
        console.error(`[Entertainment Ctrl] Event booking failed for user ${userId}:`, error.message);
        let finalFailedTxId = paymentTransactionId;

        if (!finalFailedTxId) {
            logData.status = 'Failed';
            logData.description = `${logData.name} - Booking Error: ${error.message}`;
            try {
                const failedTx = await addTransaction(logData as any);
                finalFailedTxId = failedTx.id;
                sendToUser(userId, { type: 'transaction_update', payload: { ...failedTx, date: failedTx.date } });
            } catch (logError) {
                console.error("[Entertainment Ctrl] Failed to log initial failed event booking transaction:", logError);
            }
        } else {
             try {
                const txDocRef = doc(db, 'transactions', finalFailedTxId);
                const txSnap = await txDocRef.get();
                if (txSnap.exists() && txSnap.data().status !== 'Failed') {
                    await updateDoc(txDocRef, { status: 'Failed', description: txSnap.data().description + ` - Final Booking Error: ${error.message}`, updatedAt: serverTimestamp() });
                    const updatedTxDoc = await getDoc(txDocRef);
                    if(updatedTxDoc.exists()) sendToUser(userId, { type: 'transaction_update', payload: { id: updatedTxDoc.id, ...updatedTxDoc.data(), date: updatedTxDoc.data().date.toDate() } });
                }
            } catch (updateError) {
                console.error(`[Entertainment Ctrl] Error updating event transaction ${finalFailedTxId} to Failed state:`, updateError);
            }
        }

        res.status(400).json({
            status: 'Failed',
            message: error.message || failureReason,
            transactionId: finalFailedTxId,
            bookingDetails: null,
        });
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
    const userId = req.user.uid;
    const { brandId, amount, playerId, paymentMethod = 'wallet', brandName } = req.body;

    console.log(`Purchasing voucher for user ${userId}:`, req.body);

    let paymentSuccess = false;
    let paymentResult: any = {};
    let purchaseResult: any = {};
    let finalStatus: Transaction['status'] = 'Failed';
    let failureReason = 'Voucher purchase failed.';
    const purchaseDescription = `Voucher: ${brandName || 'Gaming'} (${brandId})`;
    let paymentTransactionId: string | undefined;

    let logData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = {
        userId,
        type: 'Voucher Purchase',
        name: brandName || brandId,
        description: `Amount: ₹${amount}${playerId ? `, PlayerID: ${playerId}` : ''}`,
        amount: -amount,
        status: 'Failed',
        billerId: brandId,
        paymentMethodUsed: paymentMethod === 'wallet' ? 'Wallet' : paymentMethod === 'upi' ? 'UPI' : 'Card',
    };


    try {
        // 1. Payment
        if (amount <= 0) throw new Error("Invalid voucher amount.");
        if (paymentMethod === 'wallet') {
             paymentResult = await payViaWalletInternal(userId, `voucher_${brandId}`, amount, purchaseDescription);
             if (!paymentResult.success) throw new Error(paymentResult.message || 'Wallet payment failed.');
             paymentSuccess = true;
             paymentTransactionId = paymentResult.transactionId;
             logData.description += ' (via Wallet)';
        } else {
            throw new Error(`Payment method '${paymentMethod}' not supported for vouchers currently.`);
        }
        
        if (!paymentTransactionId) {
            console.error("[Entertainment Ctrl] CRITICAL: Payment reported success but no transactionId for voucher.");
            throw new Error("Payment processing error: Missing transaction ID for voucher.");
        }

        // 2. Purchase from Provider
        console.log("Payment successful, purchasing gaming voucher...");
        purchaseResult = await entertainmentProviderService.purchaseGamingVoucher({ userId, brandId, amount, playerId, paymentTransactionId });
        if (purchaseResult.success) {
            finalStatus = 'Completed';
            logData.status = finalStatus;
            logData.ticketId = purchaseResult.voucherCode || purchaseResult.receiptId || undefined; // Store code/ref in ticketId
            logData.description = purchaseResult.message || `Voucher Code: ${logData.ticketId || 'Sent'}`;
            paymentResult.message = purchaseResult.message || 'Voucher purchased successfully.';

            // Update the original transaction log
            const originalTxRef = doc(db, 'transactions', paymentTransactionId);
            await updateDoc(originalTxRef, {
                status: finalStatus,
                description: `${logData.name} - Voucher Details: ${logData.ticketId || 'Delivered'}`,
                ticketId: logData.ticketId,
                updatedAt: serverTimestamp()
            });

        } else {
            finalStatus = 'Failed';
            failureReason = purchaseResult.message || 'Voucher purchase failed at provider.';
            logData.status = 'Failed';
            logData.description += ` - Purchase Failed: ${failureReason}`;
            paymentResult.message = failureReason;

            console.error(`[Entertainment Ctrl] CRITICAL: Payment successful (Tx: ${paymentTransactionId}) but voucher purchase failed. Refunding.`);
            const originalTxRefFailed = doc(db, 'transactions', paymentTransactionId);
            await updateDoc(originalTxRefFailed, { status: 'Failed', description: `Voucher Purchase Failed at provider for ${logData.name}`, updatedAt: serverTimestamp() });

            // --- Refund Logic ---
            if (paymentMethod === 'wallet' && paymentTransactionId) {
                const refundResult = await payViaWalletInternal(userId, `REFUND_VOUCHER_${paymentTransactionId}`, -amount, `Refund: Failed Voucher Purchase for ${brandName}`);
                 if (refundResult.success) {
                      paymentResult.message = `${failureReason} Refund of ₹${amount} processed to wallet.`;
                 } else {
                      paymentResult.message = `${failureReason} CRITICAL: Wallet refund failed. Manual intervention required.`;
                      console.error(paymentResult.message);
                 }
            }
            // --- End Refund Logic ---
            throw new Error(paymentResult.message);
        }

        // --- Blockchain/WS Update ---
        logTransactionToBlockchain(paymentTransactionId, { ...logData, id: paymentTransactionId, date: new Date() } as Transaction).catch(console.error);
        
        const finalTxDoc = await getDoc(doc(db, 'transactions', paymentTransactionId));
        if (finalTxDoc.exists()) {
            const finalTxData = { id: finalTxDoc.id, ...finalTxDoc.data(), date: finalTxDoc.data().date.toDate() };
            sendToUser(userId, { type: 'transaction_update', payload: finalTxData });
            // Optionally send a specific voucher_purchase_update
        }

         // --- Respond ---
         res.status(201).json({
             status: 'Completed',
             message: paymentResult.message,
              transactionId: paymentTransactionId,
             voucherDetails: purchaseResult, // Include voucher code/details if available
         });

    } catch (error: any) {
         console.error(`[Entertainment Ctrl] Voucher purchase failed for user ${userId}:`, error.message);
         let finalFailedTxId = paymentTransactionId;

        if (!finalFailedTxId) {
            logData.status = 'Failed';
            logData.description = `${logData.name} - Voucher Purchase Error: ${error.message}`;
            try {
                const failedTx = await addTransaction(logData as any);
                finalFailedTxId = failedTx.id;
                sendToUser(userId, { type: 'transaction_update', payload: { ...failedTx, date: failedTx.date } });
            } catch (logError) {
                console.error("[Entertainment Ctrl] Failed to log initial failed voucher purchase transaction:", logError);
            }
        } else {
            try {
                const txDocRef = doc(db, 'transactions', finalFailedTxId);
                const txSnap = await txDocRef.get();
                if (txSnap.exists() && txSnap.data().status !== 'Failed') {
                    await updateDoc(txDocRef, { status: 'Failed', description: txSnap.data().description + ` - Final Purchase Error: ${error.message}`, updatedAt: serverTimestamp() });
                    const updatedTxDoc = await getDoc(txDocRef);
                    if(updatedTxDoc.exists()) sendToUser(userId, { type: 'transaction_update', payload: { id: updatedTxDoc.id, ...updatedTxDoc.data(), date: updatedTxDoc.data().date.toDate() } });
                }
            } catch (updateError) {
                console.error(`[Entertainment Ctrl] Error updating voucher transaction ${finalFailedTxId} to Failed state:`, updateError);
            }
        }


        res.status(400).json({
            status: 'Failed',
            message: error.message || failureReason,
            transactionId: finalFailedTxId,
            voucherDetails: null,
        });
    }
};
