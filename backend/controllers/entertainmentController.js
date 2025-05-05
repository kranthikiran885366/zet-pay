// backend/controllers/entertainmentController.js
const entertainmentProviderService = require('../services/entertainmentProviderService'); // New dedicated service
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger'); // Use centralized logger
const { payViaWalletInternal } = require('../services/wallet'); // For wallet payments
const db = require('firebase-admin').firestore();
const { serverTimestamp, collection, addDoc, doc, updateDoc } = require('firebase/firestore'); // Import Firestore functions if needed directly
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
    const { movieId, cinemaId, showtime, seats, totalAmount, paymentMethod = 'wallet', movieName, cinemaName } = req.body;
    // Validation already done by router

    console.log(`Booking movie ticket for user ${userId}:`, { movieId, cinemaId, showtime, seats, totalAmount, paymentMethod });

    let paymentSuccess = false;
    let paymentResult: any = {}; // Store payment result { success, transactionId, message, newBalance? }
    let bookingResult: any = {}; // Store provider booking result
    let finalStatus: Transaction['status'] = 'Failed';
    let failureReason = 'Booking or payment failed.';
    const bookingDescription = `Movie: ${movieName || 'Movie'} at ${cinemaName || 'Cinema'}`;

    // Prepare initial log data (will be updated)
    let logData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = {
        userId,
        type: 'Movie Booking',
        name: bookingDescription,
        description: `Seats: ${seats.join(', ')}, Time: ${showtime}`,
        amount: -totalAmount,
        status: 'Failed',
        billerId: cinemaId,
        ticketId: movieId, // Store movie ID in ticketId field for reference
        paymentMethodUsed: paymentMethod === 'wallet' ? 'Wallet' : paymentMethod === 'upi' ? 'UPI' : 'Card',
    };

    try {
        // --- Step 1: Payment Processing ---
        if (paymentMethod === 'wallet') {
             // Amount is positive for debit from wallet
            paymentResult = await payViaWalletInternal(userId, `movie_${movieId}_${cinemaId}`, totalAmount, bookingDescription);
            if (!paymentResult.success) throw new Error(paymentResult.message || 'Wallet payment failed.');
            paymentSuccess = true;
            logData.description += ' (via Wallet)';
        } else if (paymentMethod === 'upi') {
            // TODO: Implement UPI payment logic via upiProviderService
            // const upiResult = await upiProviderService.initiatePayment({ ... });
            // paymentResult = { success: upiResult.status === 'Completed', ...upiResult };
            // paymentSuccess = paymentResult.success;
            // logData.description += ' (via UPI)';
             console.warn("UPI payment for movies not fully implemented backend-side.");
            throw new Error("UPI payment for movies not implemented yet.");
        } else if (paymentMethod === 'card') {
            // TODO: Implement Card payment logic via paymentGatewayService
            // const cardResult = await paymentGatewayService.chargeSavedCard({ ... });
            // paymentResult = { success: cardResult.success, ...cardResult };
            // paymentSuccess = paymentResult.success;
            // logData.description += ' (via Card)';
             console.warn("Card payment for movies not fully implemented backend-side.");
            throw new Error("Card payment for movies not implemented yet.");
        } else {
             throw new Error('Invalid payment method specified.');
        }

        // --- Step 2: Booking Confirmation with Provider ---
        if (paymentSuccess) {
            console.log("Payment successful, confirming movie ticket booking with provider...");
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
                logData.ticketId = bookingResult.bookingId || undefined; // Use ticketId for booking ref
                paymentResult.message = bookingResult.message || 'Booking successful.'; // Update success message

                 // Optionally add booking details to a user subcollection
                 const userBookingsRef = collection(db, 'users', userId, 'bookings');
                 await addDoc(userBookingsRef, {
                      bookingId: bookingResult.bookingId,
                      type: 'movie',
                      details: { movieName, cinemaName, showtime, seats: seats.join(', ') },
                      totalAmount: totalAmount,
                      bookingDate: serverTimestamp(),
                      status: 'Confirmed',
                      userId: userId,
                 });

            } else {
                 // Booking failed AFTER successful payment -> Refund required
                 finalStatus = 'Failed';
                 failureReason = bookingResult.message || 'Booking failed at provider.';
                 logData.status = 'Failed';
                 logData.description += ` - Booking Failed: ${failureReason}`;
                 console.error(`CRITICAL: Payment successful (Tx: ${paymentResult.transactionId}) but movie booking failed for user ${userId}. Refunding.`);
                 // --- Refund Logic ---
                 // Need to refund the original payment method.
                 if (paymentMethod === 'wallet' && paymentResult.transactionId) {
                      // Refund to wallet (credit back the amount)
                      const refundAmount = totalAmount; // Full refund
                      const refundResult = await payViaWalletInternal(userId, `REFUND_${paymentResult.transactionId}`, -refundAmount, `Refund: Failed Movie Booking`);
                      if (refundResult.success) {
                           paymentResult.message = `${failureReason} Refund of ₹${refundAmount} processed to wallet.`;
                           // Update original payment log status to 'Refunded' maybe?
                           const paymentDocRef = doc(db, 'transactions', paymentResult.transactionId);
                           await updateDoc(paymentDocRef, { status: 'Refunded', description: `${logData.name} - Refunded due to booking failure.` });
                      } else {
                           paymentResult.message = `${failureReason} CRITICAL: Wallet refund failed after payment success. Manual intervention required.`;
                            // Add alerting here!
                      }
                 }
                 // TODO: Add refund logic for UPI/Card if implemented
                 // --- End Refund Logic ---

                 // Even after refund attempt, the booking attempt itself failed.
                 throw new Error(failureReason); // Throw error to signify booking failure
            }
        } else {
            // Payment itself failed before booking attempt
            throw new Error(paymentResult.message || "Payment failed before booking attempt.");
        }

        // --- Step 3: Logging Final Successful Transaction ---
        // This is logged only if both payment and booking succeeded.
        const loggedTx = await addTransaction(logData as Transaction); // Log successful transaction
        paymentResult.finalTransactionId = loggedTx.id; // Use Firestore transaction ID

         // --- Step 4: Blockchain Logging (Optional) ---
         logTransactionToBlockchain(loggedTx.id, { userId, type: logData.type, amount: totalAmount, details: bookingDescription, status: finalStatus })
              .catch(err => console.error("Blockchain log failed:", err));

        // --- Step 5: Send WebSocket Update (Optional) ---
        sendToUser(userId, { type: 'booking_update', payload: { id: loggedTx.id, status: finalStatus, type: 'movie', details: bookingResult } });
        sendToUser(userId, { type: 'transaction_update', payload: loggedTx }); // Send transaction update

         // --- Step 6: Respond to Client ---
        res.status(201).json({ // Use 201 Created for successful booking
            status: finalStatus, // Should be 'Completed'
            message: paymentResult.message,
            transactionId: loggedTx.id,
            bookingDetails: bookingResult,
        });

    } catch (error: any) {
        console.error(`Movie booking failed for user ${userId}:`, error.message);
        logData.status = 'Failed';
        logData.description = `Movie Booking Failed - ${error.message}`;
         // Attempt to log the final failure state IF a payment was attempted and logged
         // If payment failed before logging, payViaWalletInternal already logged failure.
         let finalTxId = paymentResult.finalTransactionId || paymentResult.transactionId;
          if (finalTxId) {
               try {
                   const existingTxRef = doc(db, 'transactions', finalTxId);
                   await updateDoc(existingTxRef, { status: 'Failed', description: logData.description });
                   sendToUser(userId, { type: 'transaction_update', payload: { id: finalTxId, status: 'Failed', description: logData.description } });
               } catch (updateError) {
                    console.error(`Failed to update existing transaction ${finalTxId} to Failed:`, updateError);
                    // If update fails, log a new failure record as fallback
                    finalTxId = (await addTransaction(logData as Transaction)).id;
                     sendToUser(userId, { type: 'transaction_update', payload: { ...(logData as Transaction), id: finalTxId, date: new Date() } });
               }
          } else {
                // If no payment transaction was logged yet (e.g., failed before payment attempt), log failure now.
                finalTxId = (await addTransaction(logData as Transaction)).id;
                 sendToUser(userId, { type: 'transaction_update', payload: { ...(logData as Transaction), id: finalTxId, date: new Date() } });
          }

        // Respond with appropriate error status
        res.status(400).json({
            status: 'Failed',
            message: error.message || failureReason,
            transactionId: finalTxId,
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
             logData.description += ' (via Wallet)';
        } else {
            // TODO: Implement UPI/Card payment
            throw new Error(`Payment method '${paymentMethod}' not supported for events yet.`);
        }

        // --- Step 2: Provider Confirmation ---
        if (paymentSuccess) {
            console.log("Payment successful, confirming event ticket booking...");
            bookingResult = await entertainmentProviderService.confirmEventBooking({ userId, eventId, quantity, totalAmount, paymentTransactionId: paymentResult.transactionId });
            if (bookingResult.status === 'Confirmed') {
                finalStatus = 'Completed';
                logData.status = finalStatus;
                logData.description = bookingResult.message || `Booking ID: ${bookingResult.bookingId}`;
                logData.ticketId = bookingResult.bookingId || undefined;
                paymentResult.message = bookingResult.message || 'Event booked successfully.';

                 // Optionally add booking details to a user subcollection
                 // ... (similar to movie booking)

            } else {
                 finalStatus = 'Failed';
                 failureReason = bookingResult.message || 'Event booking failed at provider.';
                 logData.status = 'Failed';
                 logData.description += ` - Booking Failed: ${failureReason}`;
                 console.error(`CRITICAL: Payment successful but event booking failed for user ${userId}. Refunding.`);
                 // --- Refund Logic ---
                 if (paymentMethod === 'wallet' && paymentResult.transactionId) {
                      const refundResult = await payViaWalletInternal(userId, `REFUND_${paymentResult.transactionId}`, -totalAmount, `Refund: Failed Event Booking`);
                      if (refundResult.success) {
                           paymentResult.message = `${failureReason} Refund of ₹${totalAmount} processed to wallet.`;
                            const paymentDocRef = doc(db, 'transactions', paymentResult.transactionId);
                            await updateDoc(paymentDocRef, { status: 'Refunded', description: `${logData.name} - Refunded due to booking failure.` });
                      } else {
                           paymentResult.message = `${failureReason} CRITICAL: Wallet refund failed after payment success. Manual intervention required.`;
                      }
                 }
                 // TODO: Add refund logic for UPI/Card if implemented
                 // --- End Refund Logic ---
                 throw new Error(failureReason);
            }
        } else {
             throw new Error(paymentResult.message || "Payment failed before event booking attempt.");
        }

        // --- Step 3: Log Successful Transaction ---
        const loggedTx = await addTransaction(logData as Transaction);
        paymentResult.finalTransactionId = loggedTx.id;

        // --- Step 4/5: Blockchain/WS Update ---
        logTransactionToBlockchain(loggedTx.id, { userId, type: logData.type, amount: totalAmount, details: bookingDescription, status: finalStatus }).catch(console.error);
        sendToUser(userId, { type: 'booking_update', payload: { id: loggedTx.id, status: finalStatus, type: 'event', details: bookingResult } });
        sendToUser(userId, { type: 'transaction_update', payload: loggedTx });


        // --- Step 6: Respond ---
        res.status(201).json({
             status: 'Completed',
             message: paymentResult.message,
              transactionId: loggedTx.id,
             bookingDetails: bookingResult,
        });

    } catch (error: any) {
        console.error(`Event booking failed for user ${userId}:`, error.message);
         logData.status = 'Failed';
         logData.description = `Event Booking Failed - ${error.message}`;
         let finalTxId = paymentResult.finalTransactionId || paymentResult.transactionId;
         if (finalTxId) {
             try {
                  const existingTxRef = doc(db, 'transactions', finalTxId);
                  await updateDoc(existingTxRef, { status: 'Failed', description: logData.description });
                  sendToUser(userId, { type: 'transaction_update', payload: { id: finalTxId, status: 'Failed', description: logData.description } });
             } catch (updateError) {
                  finalTxId = (await addTransaction(logData as Transaction)).id;
                  sendToUser(userId, { type: 'transaction_update', payload: { ...(logData as Transaction), id: finalTxId, date: new Date() } });
             }
         } else {
             finalTxId = (await addTransaction(logData as Transaction)).id;
              sendToUser(userId, { type: 'transaction_update', payload: { ...(logData as Transaction), id: finalTxId, date: new Date() } });
         }

        res.status(400).json({
            status: 'Failed',
            message: error.message || failureReason,
             transactionId: finalTxId,
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
    // Similar logic: Payment -> Provider Purchase -> Log -> Refund on failure
    const userId = req.user.uid;
    const { brandId, amount, playerId, paymentMethod = 'wallet', brandName } = req.body;
    // Validation in router

    console.log(`Purchasing voucher for user ${userId}:`, req.body);

     let paymentSuccess = false;
    let paymentResult: any = {};
    let purchaseResult: any = {};
    let finalStatus: Transaction['status'] = 'Failed';
    let failureReason = 'Voucher purchase failed.';
    const purchaseDescription = `Voucher: ${brandName || 'Gaming'} (${brandId})`;

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
             logData.description += ' (via Wallet)';
        } else {
            // TODO: Implement UPI/Card
            throw new Error(`Payment method '${paymentMethod}' not supported for vouchers currently.`);
        }

        // 2. Purchase from Provider
        if (paymentSuccess) {
             console.log("Payment successful, purchasing gaming voucher...");
             purchaseResult = await entertainmentProviderService.purchaseGamingVoucher({ userId, brandId, amount, playerId, paymentTransactionId: paymentResult.transactionId });
             if (purchaseResult.success) {
                 finalStatus = 'Completed';
                 logData.status = finalStatus;
                 logData.description = purchaseResult.message || `Voucher Code: ${purchaseResult.voucherCode || 'Sent'}`;
                 logData.ticketId = purchaseResult.voucherCode || purchaseResult.receiptId || undefined; // Store code/ref in ticketId
                 paymentResult.message = purchaseResult.message || 'Voucher purchased successfully.';
             } else {
                 finalStatus = 'Failed';
                 failureReason = purchaseResult.message || 'Voucher purchase failed at provider.';
                 logData.status = 'Failed';
                 logData.description += ` - Purchase Failed: ${failureReason}`;
                 console.error(`CRITICAL: Payment successful but voucher purchase failed for user ${userId}. Refunding.`);
                 // --- Refund Logic ---
                 if (paymentMethod === 'wallet' && paymentResult.transactionId) {
                     const refundResult = await payViaWalletInternal(userId, `REFUND_${paymentResult.transactionId}`, -amount, `Refund: Failed Voucher Purchase`);
                      if (refundResult.success) {
                           paymentResult.message = `${failureReason} Refund of ₹${amount} processed to wallet.`;
                            const paymentDocRef = doc(db, 'transactions', paymentResult.transactionId);
                            await updateDoc(paymentDocRef, { status: 'Refunded', description: `${logData.name} - Refunded due to purchase failure.` });
                      } else {
                           paymentResult.message = `${failureReason} CRITICAL: Wallet refund failed after payment success. Manual intervention required.`;
                      }
                 }
                 // --- End Refund Logic ---
                 throw new Error(failureReason);
             }
        } else {
             throw new Error(paymentResult.message || "Payment failed before voucher purchase attempt.");
        }

        // 3. Log Transaction
        const loggedTx = await addTransaction(logData as Transaction);
        paymentResult.finalTransactionId = loggedTx.id;

        // --- Step 4/5: Blockchain/WS Update ---
        logTransactionToBlockchain(loggedTx.id, { userId, type: logData.type, amount: amount, details: purchaseDescription, status: finalStatus }).catch(console.error);
        sendToUser(userId, { type: 'transaction_update', payload: loggedTx });


         // --- Step 6: Respond ---
         res.status(201).json({
             status: 'Completed',
             message: paymentResult.message,
              transactionId: loggedTx.id,
             voucherDetails: purchaseResult, // Include voucher code/details if available
         });

    } catch (error: any) {
         console.error(`Voucher purchase failed for user ${userId}:`, error.message);
         logData.status = 'Failed';
         logData.description = `Voucher Purchase Failed - ${error.message}`;
         let finalTxId = paymentResult.finalTransactionId || paymentResult.transactionId;
         if (finalTxId) {
             try {
                  const existingTxRef = doc(db, 'transactions', finalTxId);
                  await updateDoc(existingTxRef, { status: 'Failed', description: logData.description });
                   sendToUser(userId, { type: 'transaction_update', payload: { id: finalTxId, status: 'Failed', description: logData.description } });
             } catch (updateError) {
                  finalTxId = (await addTransaction(logData as Transaction)).id;
                   sendToUser(userId, { type: 'transaction_update', payload: { ...(logData as Transaction), id: finalTxId, date: new Date() } });
             }
         } else {
             finalTxId = (await addTransaction(logData as Transaction)).id;
              sendToUser(userId, { type: 'transaction_update', payload: { ...(logData as Transaction), id: finalTxId, date: new Date() } });
         }

        res.status(400).json({
            status: 'Failed',
            message: error.message || failureReason,
            transactionId: finalTxId,
            voucherDetails: null,
        });
    }
};
