// backend/controllers/bookingController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger');
const bookingProviderService = require('../services/bookingProviderService'); // Unified booking service
const { payViaWalletInternal } = require('../services/wallet'); // Use internal wallet service function
const { sendToUser } = require('../server'); // For WebSocket updates
const { getDoc, doc, collection, addDoc, serverTimestamp } = require('firebase/firestore'); // Import firestore functions
import type { Transaction, MarriageBookingDetails } from '../services/types'; // Import shared Transaction type & MarriageBookingDetails

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
    const bookingData = req.body;
    const paymentMethod = bookingData.paymentMethod || 'wallet';

    console.log(`[Booking Ctrl] Initiating generic booking for type: ${type}, User: ${userId}`);

    let paymentSuccess = false;
    let paymentResult = {};
    let bookingResult = {};
    let finalStatus = 'Failed';
    let failureReason = 'Booking or payment failed.';
    const bookingName = `${capitalize(type)} Booking: ${bookingData.selection?.movieName || bookingData.selection?.routeName || bookingData.providerId || 'Details'}`;

    let logData = {
        userId,
        type: `${capitalize(type)} Booking`,
        name: bookingName,
        description: `Details: ${JSON.stringify(bookingData.selection || {})}`,
        amount: -(bookingData.totalAmount || 0),
        status: 'Failed',
        billerId: bookingData.providerId || bookingData.selection?.cinemaId || undefined,
        paymentMethodUsed: paymentMethod === 'wallet' ? 'Wallet' : paymentMethod === 'upi' ? 'UPI' : 'Card',
    };
    let paymentTransactionId;

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
                throw new Error(`Payment method ${paymentMethod} not fully implemented for generic bookings.`);
            }
        } else {
            paymentSuccess = true; // No payment needed
            paymentResult.message = "No payment required.";
        }

        if (paymentSuccess) {
            bookingResult = await bookingProviderService.confirmBooking(type, {
                ...bookingData,
                userId,
                paymentTransactionId: paymentTransactionId,
            });

            if (bookingResult.status === 'Confirmed' || bookingResult.status === 'Pending Confirmation') {
                finalStatus = 'Completed';
                logData.status = finalStatus;
                logData.description = bookingResult.providerMessage || `Booking Ref: ${bookingResult.bookingId || bookingResult.pnr || 'N/A'}`;
                logData.ticketId = bookingResult.bookingId || bookingResult.pnr || undefined;
                paymentResult.message = bookingResult.message || 'Booking successful/pending.';

                // Update transaction log or create new one
                if (paymentTransactionId) {
                    await updateDoc(doc(db, 'transactions', paymentTransactionId), {
                        status: finalStatus,
                        description: logData.description,
                        ticketId: logData.ticketId,
                        updatedAt: serverTimestamp()
                    });
                } else { // If no payment, log a new 'Completed' transaction for the booking itself
                    const bookingLog = await addTransaction({ ...logData, amount: 0, status: 'Completed', date: serverTimestamp()});
                    paymentTransactionId = bookingLog.id;
                }

                // Add to user's generic bookings subcollection
                const userBookingsRef = collection(db, 'users', userId, 'bookings');
                await addDoc(userBookingsRef, {
                    type,
                    bookingId: bookingResult.bookingId || bookingResult.pnr || `local-${Date.now()}`,
                    details: bookingData.selection,
                    totalAmount: bookingData.totalAmount,
                    bookingDate: serverTimestamp(),
                    status: bookingResult.status,
                    userId,
                    paymentTransactionId,
                });
            } else {
                finalStatus = 'Failed';
                failureReason = bookingResult.message || `Booking failed at ${type} provider.`;
                logData.status = 'Failed';
                logData.description += ` - Booking Failed: ${failureReason}`;
                if (paymentTransactionId) {
                    await updateDoc(doc(db, 'transactions', paymentTransactionId), { status: 'Failed', description: logData.description });
                     // TODO: Refund if payment was made.
                }
                paymentResult.message = failureReason + " Refund initiated if applicable.";
                throw new Error(failureReason);
            }
        } else {
            throw new Error(paymentResult.message || "Payment failed before booking attempt.");
        }

        if (paymentTransactionId) {
            logTransactionToBlockchain(paymentTransactionId, { ...logData, id: paymentTransactionId, date: new Date() })
                 .catch(err => console.error("[Booking Ctrl] Blockchain log failed:", err));
            const finalTxDoc = await getDoc(doc(db, 'transactions', paymentTransactionId));
            if (finalTxDoc.exists()) sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(finalTxDoc) });
        }
        sendToUser(userId, { type: 'booking_update', payload: { id: bookingResult.bookingId, status: finalStatus, type, details: bookingResult } });

        res.status(finalStatus === 'Completed' ? 201 : 400).json({
            status: finalStatus,
            message: paymentResult.message,
            transactionId: paymentTransactionId,
            bookingId: bookingResult.bookingId,
            bookingDetails: finalStatus === 'Completed' ? bookingResult : null,
        });

    } catch (error) {
        console.error(`[Booking Ctrl] Generic ${type} booking failed for user ${userId}:`, error.message);
        logData.status = 'Failed';
        logData.description = `Booking Failed - ${error.message}`;
        let failedTxId = paymentTransactionId;
        if (!failedTxId) {
            try {
                const failedTx = await addTransaction(logData);
                failedTxId = failedTx.id;
                sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(await getDoc(doc(db, 'transactions', failedTx.id))) });
            } catch (logError) { console.error("Failed to log failed booking tx:", logError); }
        }
        res.status(400).json({ status: 'Failed', message: error.message || failureReason, transactionId: failedTxId });
    }
};

// Confirm a marriage venue booking
exports.confirmMarriageVenueBooking = async (req, res, next) => {
    const userId = req.user.uid;
    const { venueId } = req.params;
    const bookingData = req.body; // Includes venueName, city, date, guestCount, userName, userContact, totalAmount (booking fee)
    const paymentMethod = bookingData.paymentMethod || 'wallet';

    console.log(`[Booking Ctrl] Confirming Marriage Venue Booking for User: ${userId}, Venue: ${venueId}`);

    let paymentSuccess = false;
    let paymentResult = {};
    let bookingSystemResult = {};
    let finalStatus = 'Failed';
    const bookingFee = bookingData.totalAmount || 0; // Booking fee if any

    let logData = {
        userId,
        type: 'Marriage Booking', // Specific type
        name: `Booking: ${bookingData.venueName}`,
        description: `Venue: ${venueId}, Date: ${bookingData.date}, Guests: ${bookingData.guestCount || 'N/A'}`,
        amount: -bookingFee, // Booking fee is a debit
        status: 'Failed',
        billerId: venueId, // Use venueId as billerId
        paymentMethodUsed: paymentMethod,
    };
    let paymentTransactionId;

    try {
        // --- Step 1: Payment Processing for Booking Fee (if applicable) ---
        if (bookingFee > 0) {
            if (paymentMethod === 'wallet') {
                const walletResult = await payViaWalletInternal(userId, `marriage_booking_fee_${venueId}`, bookingFee, `Booking fee for ${bookingData.venueName}`);
                if (!walletResult.success) throw new Error(walletResult.message || 'Wallet payment for booking fee failed.');
                paymentSuccess = true;
                paymentTransactionId = walletResult.transactionId;
                logData.paymentMethodUsed = 'Wallet';
            } else {
                // TODO: Implement UPI/Card payment for booking fee
                throw new Error(`Payment method ${paymentMethod} for booking fee not implemented.`);
            }
        } else {
            paymentSuccess = true; // No booking fee
            paymentResult.message = "No booking fee required, proceeding with enquiry/hold.";
        }

        // --- Step 2: Confirm Booking with Provider/Venue System ---
        if (paymentSuccess) {
            bookingSystemResult = await bookingProviderService.confirmMarriageVenueBooking({
                ...bookingData, // Includes venueId, date, guestCount, userName, userContact
                userId,
                paymentTransactionId: paymentTransactionId, // Pass payment ref for booking fee
            });

            if (bookingSystemResult.status === 'Confirmed' || bookingSystemResult.status === 'Pending Approval') {
                finalStatus = bookingSystemResult.status === 'Confirmed' ? 'Completed' : 'Pending';
                logData.status = finalStatus;
                logData.ticketId = bookingSystemResult.bookingId || undefined;
                logData.description += ` - Status: ${finalStatus}`;
                paymentResult.message = bookingSystemResult.message || `Venue booking request submitted. Status: ${finalStatus}.`;

                // Update or Create Transaction Log
                if (paymentTransactionId) {
                     await updateDoc(doc(db, 'transactions', paymentTransactionId), { status: finalStatus, description: logData.description, ticketId: logData.ticketId });
                } else {
                    const bookingLog = await addTransaction({ ...logData, amount: 0, status: finalStatus, date: serverTimestamp()}); // Log non-payment booking
                    paymentTransactionId = bookingLog.id;
                }
            } else {
                finalStatus = 'Failed';
                logData.status = 'Failed';
                logData.description += ` - Booking Failed: ${bookingSystemResult.message}`;
                if (paymentTransactionId) { // If fee was paid, mark as failed & refund
                    await updateDoc(doc(db, 'transactions', paymentTransactionId), { status: 'Failed', description: logData.description });
                    // TODO: Initiate refund for booking fee
                    console.error(`[Booking Ctrl] CRITICAL: Booking fee paid but venue confirmation failed for ${venueId}. Refunding ${bookingFee}.`);
                }
                throw new Error(bookingSystemResult.message || "Failed to confirm booking with venue.");
            }
        }

        // --- Step 3: Blockchain Logging & WebSocket Update ---
        if (paymentTransactionId) {
             logTransactionToBlockchain(paymentTransactionId, { ...logData, id: paymentTransactionId, date: new Date() })
                .catch(err => console.error("[Booking Ctrl] Blockchain log for marriage booking failed:", err));
            const finalTxDoc = await getDoc(doc(db, 'transactions', paymentTransactionId));
            if (finalTxDoc.exists()) sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(finalTxDoc) });
        }
        sendToUser(userId, { type: 'booking_update', payload: { id: bookingSystemResult.bookingId, status: finalStatus, type: 'marriage', details: bookingSystemResult } });

        res.status(finalStatus === 'Completed' || finalStatus === 'Pending' ? 201 : 400).json({
            status: finalStatus,
            message: paymentResult.message,
            transactionId: paymentTransactionId,
            bookingId: bookingSystemResult.bookingId,
            bookingDetails: bookingSystemResult,
        });

    } catch (error) {
        console.error(`[Booking Ctrl] Marriage Venue booking failed for ${userId}, Venue ${venueId}:`, error.message);
        logData.status = 'Failed';
        logData.description = `Booking Failed - ${error.message}`;
        let failedTxId = paymentTransactionId;
        if (!failedTxId && bookingFee > 0) { // Only log if fee payment was attempted but failed before tx log
            try {
                const failedFeeTx = await addTransaction(logData);
                failedTxId = failedFeeTx.id;
                sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(await getDoc(doc(db, 'transactions', failedFeeTx.id))) });
            } catch (logError) { console.error("Failed to log failed marriage booking fee tx:", logError); }
        }
        res.status(400).json({ status: 'Failed', message: error.message, transactionId: failedTxId });
    }
};


// Cancel a booking (if provider supports it)
exports.cancelBooking = async (req, res, next) => {
    const userId = req.user.uid;
    const { type, bookingId } = req.params;

    console.log(`[Booking Ctrl] Attempting to cancel ${type} booking ID: ${bookingId}, User: ${userId}`);
    try {
        const cancellationResult = await bookingProviderService.cancelBooking(type, bookingId, userId);

        if (cancellationResult.success) {
             await addTransaction({
                  userId,
                  type: `Cancelled ${capitalize(type)} Booking`,
                  name: `Cancellation: ${bookingId}`,
                  description: `Refund: ₹${cancellationResult.refundAmount || 0}. ${cancellationResult.message || ''}`,
                  amount: cancellationResult.refundAmount || 0, // Positive for refund
                  status: 'Completed',
                  originalTransactionId: cancellationResult.originalPaymentTxId || bookingId,
             });
             // TODO: Trigger actual refund to original payment source
             sendToUser(userId, { type: 'booking_update', payload: { id: bookingId, status: 'Cancelled', type } });
             res.status(200).json({ success: true, message: cancellationResult.message || "Booking cancelled successfully. Refund will be processed as per policy." });
        } else {
             throw new Error(cancellationResult.message || "Cancellation failed by provider.");
        }
    } catch (error) {
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
        date: (data.date instanceof admin.firestore.Timestamp) ? data.date.toDate() : new Date(),
        createdAt: data.createdAt instanceof admin.firestore.Timestamp ? data.createdAt.toDate() : undefined,
        updatedAt: data.updatedAt instanceof admin.firestore.Timestamp ? data.updatedAt.toDate() : undefined,
    };
}
