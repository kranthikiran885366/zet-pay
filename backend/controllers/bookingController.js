// backend/controllers/bookingController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger');
const bookingProviderService = require('../services/bookingProviderService'); // Unified booking service
const { payViaWalletInternal } = require('../services/wallet'); // Use internal wallet service function
const { sendToUser } = require('../server'); // For WebSocket updates
const { getDoc, doc, collection, addDoc, serverTimestamp, updateDoc } = require('firebase/firestore'); // Ensure updateDoc is imported
import type { Transaction, MarriageBookingDetails, BookingConfirmation } from '../services/types'; // Import shared Transaction type & MarriageBookingDetails & BookingConfirmation

// Search for available bookings (e.g., buses, flights, movies, marriage halls)
exports.searchBookings = async (req, res, next) => {
    const { type } = req.params; // 'bus', 'flight', 'train', 'movie', 'event', 'marriage'
    const queryParams = req.query; // Contains search criteria

    console.log(`[Booking Ctrl] Searching bookings for type: ${type}, Params:`, queryParams);
    try {
        let results;
        if (type === 'marriage') {
            results = await bookingProviderService.searchMarriageVenues(queryParams);
        } else {
            results = await bookingProviderService.search(type, queryParams);
        }
        res.status(200).json(results);
    } catch (error) {
        next(error);
    }
};

// Get details for a specific booking option
exports.getBookingDetails = async (req, res, next) => {
    const { type, id } = req.params;
    const queryParams = req.query;

    console.log(`[Booking Ctrl] Fetching details for booking type: ${type}, ID: ${id}, Params:`, queryParams);
    try {
        let details;
        if (type === 'marriage') {
            details = await bookingProviderService.getMarriageVenueDetails(id);
        } else {
            details = await bookingProviderService.getDetails(type, id, queryParams);
        }

        if (!details) {
            return res.status(404).json({ message: 'Details not found.' });
        }
        res.status(200).json(details);
    } catch (error) {
        next(error);
    }
};


// Initiate and confirm a generic booking (movies, bus, train, event etc.)
exports.confirmBooking = async (req, res, next) => {
    const userId = req.user.uid;
    const { type } = req.params;
    const bookingData = req.body; // e.g., { providerId, selection: { movieId/busId/flightId, seats/berths, departureDate, arrivalDate... }, passengerDetails, totalAmount, paymentMethod }
    const paymentMethod = bookingData.paymentMethod || 'wallet';

    console.log(`[Booking Ctrl] Initiating ${type} booking for User: ${userId}`);

    let paymentSuccess = false;
    let paymentResult: any = {};
    let bookingResult: any = {};
    let finalStatus: Transaction['status'] = 'Failed';
    let failureReason = 'Booking or payment failed.';
    const bookingName = `${capitalize(type)} Booking: ${bookingData.selection?.movieName || bookingData.selection?.routeName || bookingData.selection?.flightNumber || bookingData.providerId || 'Details'}`;

    let logData: Partial<Omit<Transaction, 'id' | 'date'>> & {userId: string} = {
        userId,
        type: `${capitalize(type)} Booking`,
        name: bookingName,
        description: `Details: ${JSON.stringify(bookingData.selection || {})}`,
        amount: -(bookingData.totalAmount || 0),
        status: 'Failed',
        billerId: bookingData.providerId || bookingData.selection?.cinemaId || bookingData.selection?.flightId || undefined,
        paymentMethodUsed: paymentMethod,
    };
    let paymentTransactionId: string | undefined;

    try {
        if (bookingData.totalAmount > 0) {
            if (paymentMethod === 'wallet') {
                const walletResult = await payViaWalletInternal(userId, `booking_${type}_${Date.now()}`, bookingData.totalAmount, bookingName);
                if (!walletResult.success) throw new Error(walletResult.message || 'Wallet payment failed.');
                paymentSuccess = true;
                paymentResult = walletResult;
                paymentTransactionId = walletResult.transactionId;
                logData.description += ' (Paid via Wallet)';
            } else {
                // TODO: Implement UPI/Card payment based on bookingData.paymentMethod
                throw new Error(`Payment method ${paymentMethod} not fully implemented for ${type} bookings.`);
            }
        } else {
            paymentSuccess = true; // No payment needed
            paymentResult.message = "No payment required for this booking.";
        }

        if (paymentSuccess) {
            // Pass full bookingData including passengerDetails if available
            bookingResult = await bookingProviderService.confirmBooking(type, {
                ...bookingData,
                userId,
                paymentTransactionId: paymentTransactionId,
            });

            // Ensure bookingResult has status
            if (!bookingResult || !bookingResult.status) {
                 throw new Error("Booking provider returned an invalid response.");
            }


            if (bookingResult.status === 'Confirmed' || bookingResult.status === 'Pending Confirmation') {
                finalStatus = bookingResult.status === 'Confirmed' ? 'Completed' : 'Pending';
                logData.status = finalStatus;
                logData.description = bookingResult.providerMessage || `Booking Ref: ${bookingResult.bookingId || bookingResult.pnr || 'N/A'}`;
                logData.ticketId = bookingResult.bookingId || bookingResult.pnr || undefined; // Store booking reference
                paymentResult.message = bookingResult.message || 'Booking successful/pending.';

                // Update transaction log or create new one
                if (paymentTransactionId) {
                    await updateDoc(doc(db, 'transactions', paymentTransactionId), {
                        status: finalStatus,
                        description: logData.description,
                        ticketId: logData.ticketId,
                        updatedAt: serverTimestamp()
                    });
                } else { // If no payment (e.g., free event), log a new 'Completed' transaction for the booking itself
                    const bookingLog = await addTransaction({ ...logData, amount: 0, status: 'Completed', date: serverTimestamp() } as any);
                    paymentTransactionId = bookingLog.id;
                }

                // Add to user's generic bookings subcollection
                const userBookingsRef = collection(db, 'users', userId, 'bookings');
                await addDoc(userBookingsRef, {
                    type,
                    bookingId: bookingResult.bookingId || bookingResult.pnr || `local-${Date.now()}`,
                    providerReference: bookingResult.providerConfirmationId || null, // Store provider's own ref
                    details: bookingData.selection,
                    passengerDetails: bookingData.passengerDetails || null,
                    totalAmount: bookingData.totalAmount,
                    bookingDate: serverTimestamp(),
                    status: bookingResult.status, // Use provider's status for the booking record itself
                    userId,
                    paymentTransactionId,
                });
            } else {
                finalStatus = 'Failed';
                failureReason = bookingResult.message || `Booking failed at ${type} provider.`;
                logData.status = 'Failed';
                logData.description += ` - Booking Failed: ${failureReason}`;
                if (paymentTransactionId && bookingData.totalAmount > 0) { // Check if amount was paid
                    await updateDoc(doc(db, 'transactions', paymentTransactionId), { status: 'Failed', description: logData.description, updatedAt: serverTimestamp() });
                     // Refund if payment was made and booking failed
                     if (paymentMethod === 'wallet') {
                        await payViaWalletInternal(userId, `REFUND_BOOKING_${paymentTransactionId}`, -bookingData.totalAmount, `Refund for failed ${type} booking`);
                        paymentResult.message = failureReason + " Refund to wallet initiated.";
                     } else {
                        // TODO: Implement refund for other payment methods
                         paymentResult.message = failureReason + " Refund process required.";
                     }
                } else {
                    paymentResult.message = failureReason; // No refund if no payment was made
                }
                throw new Error(failureReason);
            }
        } else {
            throw new Error(paymentResult.message || "Payment failed before booking attempt.");
        }

        if (paymentTransactionId) {
            logTransactionToBlockchain(paymentTransactionId, { ...logData, id: paymentTransactionId, date: new Date() } as Transaction)
                 .catch(err => console.error("[Booking Ctrl] Blockchain log failed:", err));
            const finalTxDoc = await getDoc(doc(db, 'transactions', paymentTransactionId));
            if (finalTxDoc.exists()) sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(finalTxDoc) });
        }
        sendToUser(userId, { type: 'booking_update', payload: { id: bookingResult.bookingId, status: finalStatus, type, details: bookingResult } });

        res.status(finalStatus === 'Completed' || finalStatus === 'Pending' ? 201 : 400).json({
            status: finalStatus,
            message: paymentResult.message,
            transactionId: paymentTransactionId,
            bookingId: bookingResult.bookingId,
            // Return detailed booking info (like PNR, seat numbers, etc.) from provider
            bookingDetails: (finalStatus === 'Completed' || finalStatus === 'Pending') ? bookingResult : null,
        } as BookingConfirmation); // Assert the response type

    } catch (error: any) {
        console.error(`[Booking Ctrl] Generic ${type} booking failed for user ${userId}:`, error.message);
        logData.status = 'Failed';
        logData.description = `${logData.name || 'Booking'} Failed - ${error.message}`; // Updated description
        let failedTxId = paymentTransactionId;
        if (!failedTxId && bookingData.totalAmount > 0) {
            try {
                const failedTx = await addTransaction(logData as any);
                failedTxId = failedTx.id;
                const txSnap = await getDoc(doc(db, 'transactions', failedTxId));
                if(txSnap.exists()) sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(txSnap) });
            } catch (logError) { console.error("Failed to log failed booking tx:", logError); }
        } else if (failedTxId) {
             try {
                await updateDoc(doc(db, 'transactions', failedTxId), { status: 'Failed', description: logData.description, updatedAt: serverTimestamp() });
                 const txSnap = await getDoc(doc(db, 'transactions', failedTxId));
                 if(txSnap.exists()) sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(txSnap) });
             } catch (updateError) { console.error("Failed to update tx to Failed status:", updateError); }
        }
        res.status(400).json({ status: 'Failed', message: error.message || failureReason, transactionId: failedTxId } as BookingConfirmation);
    }
};

// Confirm a marriage venue booking
exports.confirmMarriageVenueBooking = async (req, res, next) => {
    const userId = req.user.uid;
    const { venueId } = req.params; // venueId is part of the path
    // Booking data from body: venueName, city, date, guestCount, userName, userContact, totalAmount (booking fee), specialRequests
    const bookingData = req.body;
    const paymentMethod = bookingData.paymentMethod || 'wallet'; // Default to wallet if not specified

    console.log(`[Booking Ctrl] Confirming Marriage Venue Booking for User: ${userId}, Venue ID: ${venueId}, Data:`, bookingData);

    let paymentSuccess = false;
    let paymentResult = {};
    let bookingSystemResult: any = {}; // Define type if possible
    let finalStatus: Transaction['status'] | 'Pending Approval' = 'Failed'; // Allow 'Pending Approval'
    const bookingFee = bookingData.totalAmount || 0; // Booking fee if any, usually for advance

    let logData: Partial<Omit<Transaction, 'id' | 'date'>> & {userId: string} = {
        userId,
        type: 'Marriage Booking',
        name: `Booking: ${bookingData.venueName || venueId}`,
        description: `Venue: ${venueId}, Date: ${bookingData.date}, Guests: ${bookingData.guestCount || 'N/A'} ${bookingData.specialRequests ? 'Req: ' + bookingData.specialRequests : ''}`,
        amount: -bookingFee, // Booking fee is a debit for the user
        status: 'Failed', // Default to failed
        billerId: venueId,
        paymentMethodUsed: paymentMethod,
    };
    let paymentTransactionId;

    try {
        // --- Step 1: Payment Processing for Booking Fee (if applicable) ---
        if (bookingFee > 0) {
            if (paymentMethod === 'wallet') {
                const walletResult = await payViaWalletInternal(userId, `marriage_booking_fee_${venueId}_${Date.now()}`, bookingFee, `Booking fee for ${bookingData.venueName}`);
                if (!walletResult.success) throw new Error(walletResult.message || 'Wallet payment for booking fee failed.');
                paymentSuccess = true;
                paymentResult = walletResult;
                paymentTransactionId = walletResult.transactionId;
                logData.description += ' (Paid via Wallet)';
            } else {
                // TODO: Implement UPI/Card payment for booking fee
                throw new Error(`Payment method ${paymentMethod} for marriage booking fee not implemented.`);
            }
        } else {
            paymentSuccess = true; // No booking fee directly, might be an enquiry
            paymentResult.message = "No booking fee required for this enquiry/hold.";
        }

        // --- Step 2: Confirm Booking with Provider/Venue System ---
        if (paymentSuccess) {
            bookingSystemResult = await bookingProviderService.confirmMarriageVenueBooking({
                ...bookingData, // Includes venueId from path (or body), date, guestCount, userName, userContact, userEmail etc.
                userId,
                paymentTransactionId: paymentTransactionId, // Pass payment ref for booking fee
            });

            if (bookingSystemResult.status === 'Confirmed' || bookingSystemResult.status === 'Pending Approval') {
                finalStatus = bookingSystemResult.status; // Can be 'Pending Approval' or 'Confirmed'
                logData.status = finalStatus === 'Confirmed' ? 'Completed' : 'Pending'; // Map to Transaction status
                logData.ticketId = bookingSystemResult.bookingId || undefined; // Store booking ID from provider
                logData.description += ` - Status: ${finalStatus}. Booking ID: ${bookingSystemResult.bookingId || 'N/A'}`;
                paymentResult.message = bookingSystemResult.message || `Venue booking request submitted. Status: ${finalStatus}.`;

                // Update or Create Transaction Log
                if (paymentTransactionId) { // If a fee was paid and logged
                     await updateDoc(doc(db, 'transactions', paymentTransactionId), { status: logData.status, description: logData.description, ticketId: logData.ticketId, updatedAt: serverTimestamp() });
                } else if (bookingFee <= 0) { // If no fee, log a 'Pending' or 'Completed' zero-amount transaction for the enquiry
                    const enquiryLog = await addTransaction({ ...logData, amount: 0, status: logData.status, date: serverTimestamp() } as any);
                    paymentTransactionId = enquiryLog.id;
                }
                 // Add to user's generic bookings subcollection
                const userBookingsRef = collection(db, 'users', userId, 'bookings');
                await addDoc(userBookingsRef, {
                    type: 'marriage',
                    bookingId: bookingSystemResult.bookingId || `local-${Date.now()}`,
                    details: bookingData,
                    totalAmount: bookingFee,
                    bookingDate: serverTimestamp(),
                    status: finalStatus, // Store actual venue status ('Confirmed' or 'Pending Approval')
                    userId,
                    paymentTransactionId,
                });
            } else {
                finalStatus = 'Failed';
                logData.status = 'Failed';
                logData.description += ` - Booking Failed: ${bookingSystemResult.message}`;
                if (paymentTransactionId && bookingFee > 0) { // If fee was paid, mark as failed & refund
                    await updateDoc(doc(db, 'transactions', paymentTransactionId), { status: 'Failed', description: logData.description, updatedAt: serverTimestamp() });
                    // Initiate refund for booking fee
                    console.error(`[Booking Ctrl] CRITICAL: Booking fee paid but venue confirmation failed for ${venueId}. Refunding ${bookingFee}.`);
                    if (paymentMethod === 'wallet') {
                         await payViaWalletInternal(userId, `REFUND_MARRIAGE_${paymentTransactionId}`, -bookingFee, `Refund for failed marriage booking: ${bookingData.venueName}`);
                         paymentResult.message = `Booking failed: ${bookingSystemResult.message || "Venue confirmation failed."} Refund initiated.`;
                    }
                } else {
                     paymentResult.message = bookingSystemResult.message || "Failed to confirm booking with venue.";
                }
                throw new Error(paymentResult.message);
            }
        } else {
             throw new Error(paymentResult.message || "Payment failed before booking attempt.");
        }

        // --- Step 3: Blockchain Logging & WebSocket Update ---
        if (paymentTransactionId) {
             logTransactionToBlockchain(paymentTransactionId, { ...logData, id: paymentTransactionId, date: new Date() } as Transaction)
                .catch(err => console.error("[Booking Ctrl] Blockchain log for marriage booking failed:", err));
            const finalTxDoc = await getDoc(doc(db, 'transactions', paymentTransactionId));
            if (finalTxDoc.exists()) sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(finalTxDoc) });
        }
        sendToUser(userId, { type: 'booking_update', payload: { id: bookingSystemResult.bookingId, status: finalStatus, type: 'marriage', details: bookingSystemResult } });

        res.status(finalStatus === 'Confirmed' || finalStatus === 'Pending Approval' ? 201 : 400).json({
            status: finalStatus,
            message: paymentResult.message,
            transactionId: paymentTransactionId,
            bookingId: bookingSystemResult.bookingId,
            bookingDetails: bookingSystemResult, // Send full result from provider
        } as BookingConfirmation); // Assert response type

    } catch (error: any) {
        console.error(`[Booking Ctrl] Marriage Venue booking failed for ${userId}, Venue ${venueId}:`, error.message);
        logData.status = 'Failed';
        logData.description = `${logData.name || 'Booking'} Failed - ${error.message}`;
        let failedTxId = paymentTransactionId;

        if (!failedTxId && bookingFee > 0) {
            try {
                const failedFeeTx = await addTransaction(logData as any);
                failedTxId = failedFeeTx.id;
                const txSnap = await getDoc(doc(db, 'transactions', failedFeeTx.id));
                if(txSnap.exists()) sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(txSnap) });
            } catch (logError) { console.error("Failed to log failed marriage booking fee tx:", logError); }
        } else if (failedTxId && logData.status === 'Failed') {
             try {
                 await updateDoc(doc(db, 'transactions', failedTxId), { status: 'Failed', description: logData.description, updatedAt: serverTimestamp() });
                 const txSnap = await getDoc(doc(db, 'transactions', failedTxId));
                if(txSnap.exists()) sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(txSnap) });
             } catch (updateError) { console.error("Failed to update failed marriage booking fee tx:", updateError); }
        }
        res.status(400).json({ status: 'Failed', message: error.message, transactionId: failedTxId } as BookingConfirmation);
    }
};


// Cancel a booking (if provider supports it)
exports.cancelBooking = async (req, res, next) => {
    const userId = req.user.uid;
    const { type, bookingId } = req.params;

    console.log(`[Booking Ctrl] Attempting to cancel ${type} booking ID: ${bookingId}, User: ${userId}`);
    try {
        // TODO: Fetch original booking from Firestore to get details like paymentTransactionId and amount
        // Example: const originalBooking = await db.collection('users').doc(userId).collection('bookings').doc(bookingId).get();
        // if (!originalBooking.exists) throw new Error("Booking not found.");
        // const originalBookingData = originalBooking.data();

        const cancellationResult = await bookingProviderService.cancelBooking(type, bookingId, userId);

        if (cancellationResult.success) {
            const refundAmount = cancellationResult.refundAmount || 0;
            // Log cancellation transaction (if refund occurs)
            if (refundAmount > 0) {
                 const refundTx = await addTransaction({
                      userId,
                      type: `Refund (${capitalize(type)} Booking)`, // More specific type
                      name: `Refund for: ${bookingId}`,
                      description: cancellationResult.message || `Booking ${bookingId} cancelled. Refund: ₹${refundAmount}`,
                      amount: refundAmount, // Positive for refund credit
                      status: 'Completed',
                      originalTransactionId: cancellationResult.originalPaymentTxId || bookingId, // Link to original payment
                 } as any);
                 // TODO: Trigger actual refund to original payment source (Wallet/UPI/Card)
                 // e.g., if (originalBookingData.paymentMethod === 'wallet') { await payViaWalletInternal(userId, `REFUND_BOOKING_${bookingId}`, refundAmount, ...); }
                 sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(await getDoc(doc(db, 'transactions', refundTx.id))) });
            }
             // Update original booking status in Firestore to 'Cancelled'
             // const userBookingsRef = collection(db, 'users', userId, 'bookings');
             // const bookingDocRef = doc(userBookingsRef, bookingId); // Need to find the correct booking document if ID is not Firestore ID
             // await updateDoc(bookingDocRef, bookingDocRef), { status: 'Cancelled', updatedAt: serverTimestamp() });

             sendToUser(userId, { type: 'booking_update', payload: { id: bookingId, status: 'Cancelled', type } });
             res.status(200).json({ success: true, message: cancellationResult.message || "Booking cancelled successfully. Refund processed as per policy." });
        } else {
             throw new Error(cancellationResult.message || "Cancellation failed by provider.");
        }
    } catch (error: any) {
        console.error(`[Booking Ctrl] Cancellation failed for ${type} booking ${bookingId}:`, error.message);
        next(error);
    }
};

function capitalize(s) {
  return typeof s === 'string' && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// Helper to convert Firestore doc to Transaction type (if not already available)
function convertFirestoreDocToTransaction(docSnap) {
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        date: (data.date instanceof admin.firestore.Timestamp) ? data.date.toDate() : (data.date ? new Date(data.date) : new Date()), // Ensure date is Date object
        createdAt: data.createdAt instanceof admin.firestore.Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
        updatedAt: data.updatedAt instanceof admin.firestore.Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
        avatarSeed: data.avatarSeed || data.name?.toLowerCase().replace(/\s+/g, '') || docSnap.id, // Fallback for avatarSeed
    };
}
