// backend/controllers/bookingController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger');
const bookingProviderService = require('../services/bookingProviderService'); // Unified booking service
const { payViaWallet } = require('./walletController'); // For payment

// Search for available bookings (e.g., buses, flights)
exports.searchBookings = async (req, res, next) => {
    const { type } = req.params; // 'bus', 'flight', 'train', 'movie', 'event'
    const queryParams = req.query; // Contains search criteria like from, to, date, etc.

    console.log(`Searching bookings for type: ${type}, Params:`, queryParams);
    try {
        const results = await bookingProviderService.search(type, queryParams);
        res.status(200).json(results);
    } catch (error) {
        next(error);
    }
};

// Get details for a specific booking option (e.g., bus seat layout, movie showtimes)
exports.getBookingDetails = async (req, res, next) => {
    const { type, id } = req.params; // type: 'bus', 'movie', etc. id: serviceId, movieId
    const queryParams = req.query; // Contains additional criteria like date, cinemaId

    console.log(`Fetching details for booking type: ${type}, ID: ${id}, Params:`, queryParams);
    try {
        const details = await bookingProviderService.getDetails(type, id, queryParams);
        if (!details) {
            return res.status(404).json({ message: 'Details not found.' });
        }
        res.status(200).json(details);
    } catch (error) {
        next(error);
    }
};


// Initiate and confirm a booking
exports.confirmBooking = async (req, res, next) => {
    const userId = req.user.uid;
    const { type } = req.params; // 'bus', 'flight', 'movie', etc.
    const bookingData = req.body; // Contains details like seats, passenger info, price, providerId, etc.
    const paymentMethod = bookingData.paymentMethod || 'wallet'; // Default to wallet

    console.log(`Initiating booking confirmation for type: ${type}, User: ${userId}`);

    let paymentSuccess = false;
    let paymentResult: any = {};
    let bookingResult: any = {};
    let finalStatus: Transaction['status'] = 'Failed';
    let failureReason = 'Booking or payment failed.';
    const bookingName = `${capitalize(type)} Booking: ${bookingData.routeName || bookingData.movieName || bookingData.eventName || 'Details unavailable'}`; // More descriptive name

    let logData: Partial<Transaction> & { userId: string } = {
        userId,
        type: `${capitalize(type)} Booking`,
        name: bookingName,
        description: `Details: ${JSON.stringify(bookingData.selection || {})}`, // Log selection details
        amount: -(bookingData.totalAmount || 0), // Negative amount
        status: 'Failed',
        // Add relevant IDs like bookingId, PNR later if successful
    };

    try {
        // --- Step 1: Payment Processing ---
        if (paymentMethod === 'wallet') {
            const walletResult = await payViaWallet(userId, `booking_${type}`, bookingData.totalAmount, bookingName);
            if (!walletResult.success) throw new Error(walletResult.message || 'Wallet payment failed.');
            paymentSuccess = true;
            paymentResult = walletResult;
            logData.description += ' (via Wallet)';
        } else if (paymentMethod === 'upi') {
            // TODO: Integrate UPI payment logic
             throw new Error("UPI payment for bookings not implemented yet.");
        } else {
             throw new Error('Invalid payment method specified.');
        }

        // --- Step 2: Booking Confirmation with Provider ---
        if (paymentSuccess) {
             console.log("Payment successful, proceeding with booking provider confirmation...");
             // Pass necessary details and payment reference to the provider service
             bookingResult = await bookingProviderService.confirmBooking(type, {
                 ...bookingData,
                 userId,
                 paymentTransactionId: paymentResult.transactionId,
             });

             if (bookingResult.status === 'Confirmed' || bookingResult.status === 'Pending Confirmation') {
                finalStatus = 'Completed'; // Treat confirmed/pending as completed in transaction log initially
                failureReason = '';
                logData.status = finalStatus;
                 logData.description = bookingResult.providerMessage || `Booking Ref: ${bookingResult.bookingId || 'N/A'}`; // Update description
                paymentResult.message = bookingResult.message || 'Booking successful/pending.';
                // Add booking specific details to logData if needed
                logData.billerId = bookingData.providerId || undefined; // Use billerId for provider
                logData.ticketId = bookingResult.bookingId || bookingResult.pnr || undefined; // Store PNR/Booking ID
             } else {
                 // Booking failed after successful payment -> Refund required
                 finalStatus = 'Failed';
                 failureReason = bookingResult.message || 'Booking failed after payment.';
                 logData.status = 'Failed';
                 logData.description += ` - Booking Failed: ${failureReason}`;
                 console.error(`CRITICAL: Payment successful but booking failed for user ${userId}, type ${type}, amount ${bookingData.totalAmount}. Reason: ${failureReason}. Initiating refund.`);
                 // TODO: Trigger refund process.
                 paymentResult.message = failureReason + " Refund initiated.";
             }
        } else {
            throw new Error(paymentResult.message || "Payment failed before booking attempt.");
        }

         // --- Step 3: Logging ---
         const loggedTx = await addTransaction(logData);
         paymentResult.transactionId = loggedTx.id; // Use Firestore transaction ID

         // Blockchain log (optional)
         logTransactionToBlockchain(loggedTx.id, { userId, type: logData.type, amount: bookingData.totalAmount, details: bookingName })
              .catch(err => console.error("Blockchain log failed:", err));

         // Respond with booking details or failure message
          res.status(paymentSuccess && finalStatus === 'Completed' ? 201 : 400).json({
            status: finalStatus,
            message: paymentResult.message,
            transactionId: loggedTx.id,
            bookingDetails: finalStatus === 'Completed' ? bookingResult : null, // Include booking details on success
        });

    } catch (error: any) {
         console.error(`Booking confirmation failed for user ${userId}, type ${type}:`, error.message);
         logData.description = `Booking Failed - ${error.message}`;
         logData.status = 'Failed';
         // Log failed transaction attempt
         try {
             const failedTx = await addTransaction(logData);
             paymentResult.transactionId = failedTx.id;
         } catch (logError) {
             console.error("Failed to log failed booking transaction:", logError);
         }
         // Return failure response
         res.status(400).json({
             status: 'Failed',
             message: error.message || failureReason,
             transactionId: paymentResult.transactionId
         });
    }
};

// Cancel a booking (if provider supports it)
exports.cancelBooking = async (req, res, next) => {
    const userId = req.user.uid;
    const { type, bookingId } = req.params; // e.g., type='bus', bookingId='XYZ123'

    console.log(`Attempting to cancel booking type: ${type}, ID: ${bookingId}, User: ${userId}`);
    try {
        // TODO: Fetch original booking from DB to check ownership and status
        // const booking = await fetchBookingFromDB(userId, bookingId);
        // if (!booking || booking.status === 'Cancelled') throw new Error("Invalid or already cancelled booking.");

        const cancellationResult = await bookingProviderService.cancelBooking(type, bookingId, userId);

        if (cancellationResult.success) {
             // TODO: Update booking status in local DB
             // TODO: Log cancellation transaction (might have refund amount)
             // await addTransaction({ type: 'Cancelled Booking', ... });
             res.status(200).json({ success: true, message: cancellationResult.message || "Booking cancelled successfully. Refund will be processed as per policy." });
        } else {
             throw new Error(cancellationResult.message || "Cancellation failed by provider.");
        }
    } catch (error: any) {
        console.error(`Cancellation failed for booking ${bookingId}:`, error.message);
        next(error); // Pass to error handler
    }
};

function capitalize(s: string): string {
  return typeof s === 'string' && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// Import Transaction type definition
import type { Transaction } from '../services/types';
