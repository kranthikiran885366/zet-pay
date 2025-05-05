// backend/controllers/bookingController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger');
const bookingProviderService = require('../services/bookingProviderService'); // Unified booking service
const { payViaWalletInternal } = require('../services/wallet'); // Use internal wallet service function
const { sendToUser } = require('../server'); // For WebSocket updates
const { getDoc, doc } = require('firebase/firestore'); // Import firestore functions if needed directly

// Search for available bookings (e.g., buses, flights, movies)
exports.searchBookings = async (req, res, next) => {
    const { type } = req.params; // 'bus', 'flight', 'train', 'movie', 'event'
    const queryParams = req.query; // Contains search criteria like from, to, date, city etc.

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
    // bookingData includes details like providerId, selection (seats, showtime etc.), passenger info, totalAmount, paymentMethod
    const bookingData = req.body;
    const paymentMethod = bookingData.paymentMethod || 'wallet'; // Default to wallet

    console.log(`Initiating booking confirmation for type: ${type}, User: ${userId}, Data:`, bookingData);

    let paymentSuccess = false;
    let paymentResult: any = {};
    let bookingResult: any = {};
    let finalStatus: Transaction['status'] = 'Failed';
    let failureReason = 'Booking or payment failed.';
    const bookingName = `${capitalize(type)} Booking: ${bookingData.selection?.movieName || bookingData.selection?.routeName || bookingData.providerId || 'Details'}`; // More descriptive name

    let logData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = { // Use Omit for partial data
        userId,
        type: `${capitalize(type)} Booking`,
        name: bookingName,
        description: `Details: ${JSON.stringify(bookingData.selection || {})}`, // Log selection details
        amount: -(bookingData.totalAmount || 0), // Negative amount
        status: 'Failed', // Initial status
        billerId: bookingData.providerId || bookingData.selection?.cinemaId || undefined, // Use billerId for provider/cinema
        paymentMethodUsed: paymentMethod === 'wallet' ? 'Wallet' : paymentMethod === 'upi' ? 'UPI' : paymentMethod === 'card' ? 'Card' : undefined,
    };

    try {
        // --- Step 1: Payment Processing ---
        if (bookingData.totalAmount <= 0) {
            paymentSuccess = true; // No payment needed for free bookings
            paymentResult.message = "No payment required.";
        } else if (paymentMethod === 'wallet') {
             // Use internal wallet function - IMPORTANT: Ensure amount is positive for debit
            const walletResult = await payViaWalletInternal(userId, `booking_${type}_${bookingData.providerId || bookingData.selection?.movieId || Date.now()}`, bookingData.totalAmount, bookingName);
            if (!walletResult.success) throw new Error(walletResult.message || 'Wallet payment failed.');
            paymentSuccess = true;
            paymentResult = walletResult; // Contains transactionId, newBalance
            logData.description += ' (Paid via Wallet)';
        } else if (paymentMethod === 'upi') {
            // TODO: Integrate UPI payment logic (using backend service like upiProviderService)
             console.warn("UPI payment for bookings not fully implemented backend-side.");
             throw new Error("UPI payment for bookings not implemented yet.");
        } else if (paymentMethod === 'card') {
             // TODO: Integrate Card payment logic (using backend service like paymentGatewayService)
              console.warn("Card payment for bookings not fully implemented backend-side.");
             throw new Error("Card payment for bookings not implemented yet.");
        } else {
             throw new Error('Invalid payment method specified.');
        }

        // --- Step 2: Booking Confirmation with Provider ---
        if (paymentSuccess) {
             console.log("Payment successful (or not needed), proceeding with booking provider confirmation...");
             // Pass necessary details and payment reference (if any) to the provider service
             bookingResult = await bookingProviderService.confirmBooking(type, {
                 ...bookingData,
                 userId,
                 paymentTransactionId: paymentResult.transactionId || null, // Pass payment ID if applicable
             });

              // Check provider confirmation status
             if (bookingResult.status === 'Confirmed' || bookingResult.status === 'Pending Confirmation') {
                 finalStatus = 'Completed'; // Treat confirmed/pending as completed in transaction log initially
                 failureReason = '';
                 logData.status = finalStatus;
                  // Update description with booking ID or PNR
                 logData.description = bookingResult.providerMessage || `Booking Ref: ${bookingResult.bookingId || bookingResult.pnr || 'N/A'}`;
                 logData.ticketId = bookingResult.bookingId || bookingResult.pnr || undefined; // Store PNR/Booking ID in ticketId field
                 paymentResult.message = bookingResult.message || 'Booking successful/pending.';

                 // Add booking to user's bookings subcollection (optional, depends on data model)
                  const userBookingsRef = collection(db, 'users', userId, 'bookings'); // Example path
                  await addDoc(userBookingsRef, {
                       bookingId: bookingResult.bookingId || bookingResult.pnr || `local-${Date.now()}`, // Use provider ID or generate local
                       type: type,
                       details: bookingData.selection, // Store selection details
                       totalAmount: bookingData.totalAmount,
                       bookingDate: serverTimestamp(),
                       providerId: bookingData.providerId || bookingData.selection?.cinemaId,
                       status: bookingResult.status, // 'Confirmed' or 'Pending Confirmation'
                       userId: userId, // Store userId for querying
                  });

             } else {
                 // Booking failed AFTER successful payment -> Refund required
                 finalStatus = 'Failed';
                 failureReason = bookingResult.message || `Booking failed at ${type} provider.`;
                 logData.status = 'Failed';
                 logData.description += ` - Booking Failed: ${failureReason}`;
                 console.error(`CRITICAL: Payment successful but booking failed for user ${userId}, type ${type}, amount ${bookingData.totalAmount}. Reason: ${failureReason}. Initiating refund simulation.`);
                 // TODO: Trigger refund process for the original payment method (wallet, UPI, card).
                 paymentResult.message = failureReason + " Refund initiated.";
             }
        } else {
            // Payment itself failed before booking attempt
            throw new Error(paymentResult.message || "Payment failed before booking attempt.");
        }

         // --- Step 3: Logging Final Transaction ---
         // Log transaction AFTER booking attempt to capture the final status and booking details
         const loggedTx = await addTransaction(logData as any); // Add log with final status/details
         paymentResult.finalTransactionId = loggedTx.id; // Use Firestore transaction ID for reference in response

         // --- Step 4: Blockchain Logging (Optional) ---
         logTransactionToBlockchain(loggedTx.id, { userId, type: logData.type, amount: bookingData.totalAmount, details: bookingName, status: finalStatus })
              .catch(err => console.error("Blockchain log failed:", err));

        // --- Step 5: Send WebSocket Update (Optional) ---
        sendToUser(userId, { type: 'booking_update', payload: { id: loggedTx.id, status: finalStatus, details: bookingResult } });
        sendToUser(userId, { type: 'transaction_update', payload: { ...loggedTx, date: loggedTx.date } }); // Send full transaction update

         // --- Step 6: Respond to Client ---
          res.status(finalStatus === 'Completed' ? 201 : 400).json({
            status: finalStatus,
            message: paymentResult.message,
            transactionId: loggedTx.id,
            bookingDetails: finalStatus === 'Completed' ? bookingResult : null, // Include booking details on success
        });

    } catch (error: any) {
         console.error(`Booking confirmation failed for user ${userId}, type ${type}:`, error.message);
         logData.status = 'Failed';
         logData.description = `Booking Failed - ${error.message}`;
         // Attempt to log failed transaction attempt if it wasn't logged by payment method
         let failedTxId = paymentResult.finalTransactionId; // Use ID if logging already occurred
         if (!failedTxId) {
             try {
                 const failedTx = await addTransaction(logData as any);
                 failedTxId = failedTx.id;
                 sendToUser(userId, { type: 'transaction_update', payload: { ...failedTx, date: failedTx.date } }); // Send WS update for failure
             } catch (logError) {
                 console.error("Failed to log failed booking transaction:", logError);
             }
         }
         // Return failure response
         res.status(400).json({
             status: 'Failed',
             message: error.message || failureReason,
             transactionId: failedTxId
         });
    }
};

// Cancel a booking (if provider supports it)
exports.cancelBooking = async (req, res, next) => {
    const userId = req.user.uid;
    const { type, bookingId } = req.params; // e.g., type='bus', bookingId='XYZ123'

    console.log(`Attempting to cancel booking type: ${type}, ID: ${bookingId}, User: ${userId}`);
    try {
        // TODO: Fetch original booking from user's bookings subcollection to check ownership and status
        // const bookingDocRef = doc(db, 'users', userId, 'bookings', bookingId); // Example path, adjust based on actual booking ID storage
        // const bookingSnap = await getDoc(bookingDocRef);
        // if (!bookingSnap.exists() || bookingSnap.data().status === 'Cancelled') {
        //      throw new Error("Invalid or already cancelled booking.");
        // }
        // const bookingData = bookingSnap.data(); // Get data for cancellation request if needed

        const cancellationResult = await bookingProviderService.cancelBooking(type, bookingId, userId); // Pass necessary info

        if (cancellationResult.success) {
             // TODO: Update booking status in user's bookings subcollection to 'Cancelled'
             // await updateDoc(bookingDocRef, { status: 'Cancelled', cancellationDetails: cancellationResult });

             // Log cancellation transaction (might have refund amount)
              await addTransaction({
                  userId,
                  type: 'Refund', // Or 'Cancelled Booking'
                  name: `Cancelled ${capitalize(type)} Booking`,
                  description: `Booking ID: ${bookingId}. Refund: ₹${cancellationResult.refundAmount || 0}`,
                  amount: cancellationResult.refundAmount || 0, // Positive for refund
                  status: 'Completed', // Assuming cancellation itself is complete
                  originalTransactionId: cancellationResult.originalPaymentTxId || undefined, // Link to original payment if possible
             });
             // TODO: Trigger actual refund to original payment source (wallet, UPI, card)
             sendToUser(userId, { type: 'booking_update', payload: { id: bookingId, status: 'Cancelled' } });
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
const { collection, addDoc, serverTimestamp } = require('firebase/firestore'); // Ensure these are imported

