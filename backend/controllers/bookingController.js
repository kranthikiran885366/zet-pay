
// backend/controllers/bookingController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger');
const bookingProviderService = require('../services/bookingProviderService'); // Unified booking service
const { payViaWalletInternal } = require('../services/wallet'); 
const { sendToUser } = require('../server'); 
const { getDoc, doc, collection, addDoc, serverTimestamp, updateDoc, Timestamp } = require('firebase/firestore');
import type { Transaction, MarriageBookingDetails, BookingConfirmation } from '../services/types'; 

// Search for available bookings (e.g., buses, flights, movies, marriage halls, cars, bikes)
exports.searchBookings = async (req, res, next) => {
    const { type } = req.params; 
    const queryParams = req.query; 

    console.log(`[Booking Ctrl] Searching bookings for type: ${type}, Params:`, queryParams);
    try {
        let results;
        if (type === 'marriage') {
            results = await bookingProviderService.searchMarriageVenues(queryParams);
        } else if (type === 'car' || type === 'bike') {
            results = await bookingProviderService.searchVehicles(type, queryParams);
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
        } else if (type === 'car' || type === 'bike') {
            details = await bookingProviderService.getVehicleDetails(type, id);
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


// Initiate and confirm a generic booking (movies, bus, train, event, car, bike etc.)
exports.confirmBooking = async (req, res, next) => {
    const userId = req.user.uid;
    const { type } = req.params;
    const bookingData = req.body; 
    const paymentMethod = bookingData.paymentMethod || 'wallet';

    console.log(`[Booking Ctrl] Initiating ${type} booking for User: ${userId}`);

    let paymentSuccess = false;
    let paymentResult = {};
    let bookingResult = {};
    let finalStatus = 'Failed';
    let failureReason = 'Booking or payment failed.';
    const bookingName = `${capitalize(type)} Booking: ${bookingData.selection?.movieName || bookingData.selection?.routeName || bookingData.selection?.flightNumber || bookingData.selection?.vehicleName || bookingData.providerId || 'Details'}`;

    let logData = {
        userId,
        type: `${capitalize(type)} Booking`,
        name: bookingName,
        description: `Details: ${JSON.stringify(bookingData.selection || bookingData.vehicleDetails || {})}`,
        amount: -(bookingData.totalAmount || 0),
        status: 'Failed',
        billerId: bookingData.providerId || bookingData.selection?.cinemaId || bookingData.selection?.flightId || bookingData.vehicleId || undefined,
        paymentMethodUsed: paymentMethod,
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
                throw new Error(`Payment method ${paymentMethod} not fully implemented for ${type} bookings.`);
            }
        } else {
            paymentSuccess = true; 
            paymentResult.message = "No payment required for this booking.";
        }

        if (paymentSuccess) {
            bookingResult = await bookingProviderService.confirmBooking(type, {
                ...bookingData,
                userId,
                paymentTransactionId: paymentTransactionId,
            });

            if (!bookingResult || !bookingResult.status) {
                 throw new Error("Booking provider returned an invalid response.");
            }

            if (bookingResult.status === 'Confirmed' || bookingResult.status === 'Pending Confirmation') {
                finalStatus = bookingResult.status === 'Confirmed' ? 'Completed' : 'Pending';
                logData.status = finalStatus;
                logData.description = bookingResult.providerMessage || `Booking Ref: ${bookingResult.bookingId || bookingResult.pnr || 'N/A'}`;
                logData.ticketId = bookingResult.bookingId || bookingResult.pnr || undefined; 
                paymentResult.message = bookingResult.message || 'Booking successful/pending.';

                if (paymentTransactionId) {
                    await updateDoc(doc(db, 'transactions', paymentTransactionId), {
                        status: finalStatus,
                        description: logData.description,
                        ticketId: logData.ticketId,
                        updatedAt: serverTimestamp()
                    });
                } else { 
                    const bookingLog = await addTransaction({ ...logData, amount: 0, status: 'Completed', date: serverTimestamp() });
                    paymentTransactionId = bookingLog.id;
                }

                const userBookingsRef = collection(db, 'users', userId, 'bookings');
                await addDoc(userBookingsRef, {
                    type,
                    bookingId: bookingResult.bookingId || bookingResult.pnr || `local-${Date.now()}`,
                    providerReference: bookingResult.providerConfirmationId || null,
                    details: bookingData.selection || bookingData.vehicleDetails,
                    passengerDetails: bookingData.passengerDetails || null,
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
                if (paymentTransactionId && bookingData.totalAmount > 0) { 
                    await updateDoc(doc(db, 'transactions', paymentTransactionId), { status: 'Failed', description: logData.description, updatedAt: serverTimestamp() });
                     if (paymentMethod === 'wallet') {
                        await payViaWalletInternal(userId, `REFUND_BOOKING_${paymentTransactionId}`, -bookingData.totalAmount, `Refund for failed ${type} booking`);
                        paymentResult.message = failureReason + " Refund to wallet initiated.";
                     } else {
                         paymentResult.message = failureReason + " Refund process required.";
                     }
                } else {
                    paymentResult.message = failureReason; 
                }
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

        res.status(finalStatus === 'Completed' || finalStatus === 'Pending' ? 201 : 400).json({
            status: finalStatus,
            message: paymentResult.message,
            transactionId: paymentTransactionId,
            bookingId: bookingResult.bookingId,
            bookingDetails: (finalStatus === 'Completed' || finalStatus === 'Pending') ? bookingResult : null,
        }); 

    } catch (error) {
        console.error(`[Booking Ctrl] Generic ${type} booking failed for user ${userId}:`, error.message);
        logData.status = 'Failed';
        logData.description = `${logData.name || 'Booking'} Failed - ${error.message}`; 
        let failedTxId = paymentTransactionId;
        if (!failedTxId && bookingData.totalAmount > 0) {
            try {
                const failedTx = await addTransaction(logData);
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
        res.status(400).json({ status: 'Failed', message: error.message || failureReason, transactionId: failedTxId });
    }
};

// Confirm a marriage venue booking
exports.confirmMarriageVenueBooking = async (req, res, next) => {
    const userId = req.user.uid;
    const { venueId } = req.params; 
    const bookingData = req.body;
    const paymentMethod = bookingData.paymentMethod || 'wallet'; 

    console.log(`[Booking Ctrl] Confirming Marriage Venue Booking for User: ${userId}, Venue ID: ${venueId}, Data:`, bookingData);

    let paymentSuccess = false;
    let paymentResult = {};
    let bookingSystemResult = {}; 
    let finalStatus = 'Failed'; 
    const bookingFee = bookingData.totalAmount || 0; 

    let logData = {
        userId,
        type: 'Marriage Booking',
        name: `Booking: ${bookingData.venueName || venueId}`,
        description: `Venue: ${venueId}, Date: ${bookingData.date}, Guests: ${bookingData.guestCount || 'N/A'} ${bookingData.specialRequests ? 'Req: ' + bookingData.specialRequests : ''}`,
        amount: -bookingFee, 
        status: 'Failed', 
        billerId: venueId,
        paymentMethodUsed: paymentMethod,
        // Added for addons and promo
        selectedAddons: bookingData.selectedAddons || null,
        appliedPromoCode: bookingData.appliedPromoCode || null,
    };
    let paymentTransactionId;

    try {
        if (bookingFee > 0) {
            if (paymentMethod === 'wallet') {
                const walletResult = await payViaWalletInternal(userId, `marriage_booking_fee_${venueId}_${Date.now()}`, bookingFee, `Booking fee for ${bookingData.venueName}`);
                if (!walletResult.success) throw new Error(walletResult.message || 'Wallet payment for booking fee failed.');
                paymentSuccess = true;
                paymentResult = walletResult;
                paymentTransactionId = walletResult.transactionId;
                logData.description += ' (Paid via Wallet)';
            } else {
                throw new Error(`Payment method ${paymentMethod} for marriage booking fee not implemented.`);
            }
        } else {
            paymentSuccess = true; 
            paymentResult.message = "No booking fee required for this enquiry/hold.";
        }

        if (paymentSuccess) {
            bookingSystemResult = await bookingProviderService.confirmMarriageVenueBooking({
                ...bookingData, 
                userId,
                paymentTransactionId: paymentTransactionId,
            });

            if (bookingSystemResult.status === 'Confirmed' || bookingSystemResult.status === 'Pending Approval') {
                finalStatus = bookingSystemResult.status; 
                logData.status = finalStatus === 'Confirmed' ? 'Completed' : 'Pending'; 
                logData.ticketId = bookingSystemResult.bookingId || undefined; 
                logData.description += ` - Status: ${finalStatus}. Booking ID: ${bookingSystemResult.bookingId || 'N/A'}`;
                paymentResult.message = bookingSystemResult.message || `Venue booking request submitted. Status: ${finalStatus}.`;

                if (paymentTransactionId) { 
                     await updateDoc(doc(db, 'transactions', paymentTransactionId), { status: logData.status, description: logData.description, ticketId: logData.ticketId, updatedAt: serverTimestamp() });
                } else if (bookingFee <= 0) { 
                    const enquiryLog = await addTransaction({ ...logData, amount: 0, status: logData.status, date: serverTimestamp() });
                    paymentTransactionId = enquiryLog.id;
                }
                const userBookingsRef = collection(db, 'users', userId, 'bookings');
                await addDoc(userBookingsRef, {
                    type: 'marriage',
                    bookingId: bookingSystemResult.bookingId || `local-${Date.now()}`,
                    details: bookingData,
                    totalAmount: bookingFee,
                    bookingDate: serverTimestamp(),
                    status: finalStatus, 
                    userId,
                    paymentTransactionId,
                    selectedAddons: bookingData.selectedAddons || null, // Save addons
                    appliedPromoCode: bookingData.appliedPromoCode || null, // Save promo
                });
            } else {
                finalStatus = 'Failed';
                logData.status = 'Failed';
                logData.description += ` - Booking Failed: ${bookingSystemResult.message}`;
                if (paymentTransactionId && bookingFee > 0) { 
                    await updateDoc(doc(db, 'transactions', paymentTransactionId), { status: 'Failed', description: logData.description, updatedAt: serverTimestamp() });
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

        if (paymentTransactionId) {
             logTransactionToBlockchain(paymentTransactionId, { ...logData, id: paymentTransactionId, date: new Date() })
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
            bookingDetails: bookingSystemResult, 
        }); 

    } catch (error) {
        console.error(`[Booking Ctrl] Marriage Venue booking failed for ${userId}, Venue ${venueId}:`, error.message);
        logData.status = 'Failed';
        logData.description = `${logData.name || 'Booking'} Failed - ${error.message}`;
        let failedTxId = paymentTransactionId;

        if (!failedTxId && bookingFee > 0) {
            try {
                const failedFeeTx = await addTransaction(logData);
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
            const refundAmount = cancellationResult.refundAmount || 0;
            if (refundAmount > 0) {
                 const refundTx = await addTransaction({
                      userId,
                      type: `Refund (${capitalize(type)} Booking)`, 
                      name: `Refund for: ${bookingId}`,
                      description: cancellationResult.message || `Booking ${bookingId} cancelled. Refund: ₹${refundAmount}`,
                      amount: refundAmount, 
                      status: 'Completed',
                      originalTransactionId: cancellationResult.originalPaymentTxId || bookingId, 
                 });
                 sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(await getDoc(doc(db, 'transactions', refundTx.id))) });
            }
             sendToUser(userId, { type: 'booking_update', payload: { id: bookingId, status: 'Cancelled', type } });
             res.status(200).json({ success: true, message: cancellationResult.message || "Booking cancelled successfully. Refund processed as per policy." });
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
        date: (data.date instanceof Timestamp) ? data.date.toDate() : (data.date ? new Date(data.date) : new Date()), 
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
        avatarSeed: data.avatarSeed || data.name?.toLowerCase().replace(/\s+/g, '') || docSnap.id, 
    };
}

    