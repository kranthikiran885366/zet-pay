
// backend/controllers/entertainmentController.js
const entertainmentProviderService = require('../services/entertainmentProviderService'); 
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger'); 
const { payViaWalletInternal } = require('../services/wallet'); 
const db = require('firebase-admin').firestore();
const { serverTimestamp, collection, addDoc, doc, updateDoc, getDoc } = require('firebase/firestore'); 
const { sendToUser } = require('../server'); 
import type { Transaction, VoucherPurchasePayload } from '../services/types'; 

// --- Movies ---

exports.searchMovies = async (req, res, next) => {
    const { city, date } = req.query;
    console.log(`Searching movies for City: ${city}, Date: ${date}`);
    const movies = await entertainmentProviderService.searchMovies({ city, date });
    res.status(200).json(movies);
};

exports.getMovieDetails = async (req, res, next) => {
    const { movieId } = req.params;
    const { city, date } = req.query; 
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
    
    console.log(`Booking movie ticket for user ${userId}:`, { movieId, cinemaId, showtime, seats, totalAmount, paymentMethod });

    let paymentSuccess = false;
    let paymentResult = {}; 
    let bookingResult = {}; 
    let finalStatus = 'Failed';
    let failureReason = 'Booking or payment failed.';
    const bookingDescription = `Movie: ${movieName || 'Movie'} at ${cinemaName || 'Cinema'} (${movieFormat || '2D'})`;

    let logData = {
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
    let paymentTransactionId;

    try {
        if (paymentMethod === 'wallet') {
            paymentResult = await payViaWalletInternal(userId, `movie_${movieId}_${cinemaId}`, totalAmount, bookingDescription, 'Movie Booking');
            if (!paymentResult.success) throw new Error(paymentResult.message || 'Wallet payment failed.');
            paymentSuccess = true;
            paymentTransactionId = paymentResult.transactionId;
            logData.description += ' (via Wallet)';
        } else {
            throw new Error('Only wallet payment is currently supported for movie bookings.');
        }

        if (!paymentTransactionId) {
            console.error("[Entertainment Ctrl] CRITICAL: Payment reported success but no transactionId returned from payment method.", paymentResult);
            throw new Error("Payment processing error: Missing transaction ID.");
        }
        console.log(`[Entertainment Ctrl] Payment successful. Payment Tx ID: ${paymentTransactionId}. Proceeding to movie provider confirmation.`);


        bookingResult = await entertainmentProviderService.confirmMovieBooking({
            userId,
            movieId,
            cinemaId,
            showtime,
            seats, 
            totalAmount,
            paymentTransactionId: paymentTransactionId,
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
                  bookingId: bookingResult.bookingId,
                  type: 'movie',
                  details: { movieName, cinemaName, showtime, seats: Array.isArray(seats) ? seats.join(', ') : seats, format: movieFormat },
                  totalAmount: totalAmount,
                  bookingDate: serverTimestamp(),
                  status: 'Confirmed', 
                  userId: userId,
                  paymentTransactionId: paymentTransactionId, 
             });
             console.log(`[Entertainment Ctrl] Movie booking ${bookingResult.bookingId} saved to Firestore.`);

        } else {
             finalStatus = 'Failed';
             failureReason = bookingResult.message || 'Booking failed at provider.';
             logData.status = 'Failed'; 
             logData.description = `${logData.name} - Booking Failed: ${failureReason}`; 
             paymentResult.message = failureReason; 

             console.error(`[Entertainment Ctrl] CRITICAL: Payment successful (Tx: ${paymentTransactionId}) but movie booking failed for user ${userId}. Refunding.`);
             const originalTxRefFailed = doc(db, 'transactions', paymentTransactionId);
             await updateDoc(originalTxRefFailed, {
                 status: 'Failed',
                 description: `Booking Failed at provider for ${logData.name} - ${failureReason}`,
                 updatedAt: serverTimestamp()
             });

             if (paymentMethod === 'wallet' && paymentTransactionId) {
                  const refundAmount = totalAmount; 
                  const refundResult = await payViaWalletInternal(userId, `REFUND_${paymentTransactionId}`, -refundAmount, `Refund: Failed Movie Booking for ${movieName}`, 'Refund');
                  if (refundResult.success) {
                       paymentResult.message = `${failureReason} Refund of ₹${refundAmount} processed to wallet.`;
                  } else {
                       paymentResult.message = `${failureReason} CRITICAL: Wallet refund failed after payment success. Manual intervention required.`;
                       console.error(paymentResult.message);
                  }
             }
             throw new Error(paymentResult.message); 
        }

         logTransactionToBlockchain(paymentTransactionId, { ...logData, id: paymentTransactionId, date: new Date() } )
              .catch(err => console.error("[Entertainment Ctrl] Blockchain log failed:", err));
        
         const finalTxDoc = await getDoc(doc(db, 'transactions', paymentTransactionId));
         if (finalTxDoc.exists()) {
             const finalTxData = { id: finalTxDoc.id, ...finalTxDoc.data(), date: finalTxDoc.data().date.toDate() };
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

        if (!finalFailedTxId) { 
            logData.status = 'Failed';
            logData.description = `${logData.name} - Booking Error: ${error.message}`;
            try {
                const failedTx = await addTransaction(logData);
                finalFailedTxId = failedTx.id;
                 sendToUser(userId, { type: 'transaction_update', payload: { ...failedTx, date: failedTx.date } });
            } catch (logError) {
                console.error("[Entertainment Ctrl] Failed to log initial failed movie booking transaction:", logError);
            }
        } else {
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
    const userId = req.user.uid;
    const { eventId, quantity, totalAmount, paymentMethod = 'wallet', eventName } = req.body;
    
    console.log(`Booking event ticket for user ${userId}:`, req.body);

    let paymentSuccess = false;
    let paymentResult = {};
    let bookingResult = {};
    let finalStatus = 'Failed';
    let failureReason = 'Event booking failed.';
    const bookingDescription = `Event: ${eventName || 'Event'} (${eventId})`;
    let paymentTransactionId;

    let logData = {
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
        if (totalAmount <= 0) throw new Error("Invalid booking amount.");
        if (paymentMethod === 'wallet') {
            paymentResult = await payViaWalletInternal(userId, `event_${eventId}`, totalAmount, bookingDescription, 'Event Booking');
            if (!paymentResult.success) throw new Error(paymentResult.message || 'Wallet payment failed.');
            paymentSuccess = true;
            paymentTransactionId = paymentResult.transactionId;
             logData.description += ' (via Wallet)';
        } else {
            throw new Error(`Payment method '${paymentMethod}' not supported for events yet.`);
        }
        
        if (!paymentTransactionId) {
            console.error("[Entertainment Ctrl] CRITICAL: Payment reported success but no transactionId for event booking.");
            throw new Error("Payment processing error: Missing transaction ID for event.");
        }

        console.log("Payment successful, confirming event ticket booking...");
        bookingResult = await entertainmentProviderService.confirmEventBooking({ userId, eventId, quantity, totalAmount, paymentTransactionId });
        if (bookingResult.status === 'Confirmed') {
            finalStatus = 'Completed';
            logData.status = finalStatus;
            logData.ticketId = bookingResult.bookingId || undefined;
            logData.description = bookingResult.message || `Booking ID: ${bookingResult.bookingId}`;
            paymentResult.message = bookingResult.message || 'Event booked successfully.';

             const originalTxRef = doc(db, 'transactions', paymentTransactionId);
             await updateDoc(originalTxRef, {
                 status: finalStatus,
                 description: `${logData.name} - Provider Booking ID: ${logData.ticketId}`,
                 ticketId: logData.ticketId,
                 updatedAt: serverTimestamp()
             });

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
             const originalTxRefFailed = doc(db, 'transactions', paymentTransactionId);
             await updateDoc(originalTxRefFailed, { status: 'Failed', description: `Event Booking Failed at provider for ${logData.name}`, updatedAt: serverTimestamp() });

             if (paymentMethod === 'wallet' && paymentTransactionId) {
                  const refundResult = await payViaWalletInternal(userId, `REFUND_EVENT_${paymentTransactionId}`, -totalAmount, `Refund: Failed Event Booking for ${eventName}`, 'Refund');
                  if (refundResult.success) {
                       paymentResult.message = `${failureReason} Refund of ₹${totalAmount} processed to wallet.`;
                  } else {
                       paymentResult.message = `${failureReason} CRITICAL: Wallet refund failed. Manual intervention required.`;
                       console.error(paymentResult.message);
                  }
             }
             throw new Error(paymentResult.message);
        }

        logTransactionToBlockchain(paymentTransactionId, { ...logData, id: paymentTransactionId, date: new Date() } ).catch(console.error);
        
        const finalTxDoc = await getDoc(doc(db, 'transactions', paymentTransactionId));
        if (finalTxDoc.exists()) {
            const finalTxData = { id: finalTxDoc.id, ...finalTxDoc.data(), date: finalTxDoc.data().date.toDate() };
            sendToUser(userId, { type: 'transaction_update', payload: finalTxData });
            if (finalStatus === 'Completed') {
                sendToUser(userId, { type: 'booking_update', payload: { id: bookingResult.bookingId, status: finalStatus, type: 'event', details: bookingResult } });
            }
        }
        
        res.status(201).json({
             status: 'Completed',
             message: paymentResult.message,
              transactionId: paymentTransactionId,
             bookingDetails: bookingResult,
        });

    } catch (error) {
        console.error(`[Entertainment Ctrl] Event booking failed for user ${userId}:`, error.message);
        let finalFailedTxId = paymentTransactionId;

        if (!finalFailedTxId) {
            logData.status = 'Failed';
            logData.description = `${logData.name} - Booking Error: ${error.message}`;
            try {
                const failedTx = await addTransaction(logData);
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


// --- Gaming & Digital Vouchers ---

exports.getGamingVoucherBrands = async (req, res, next) => {
    const brands = await entertainmentProviderService.getGamingBrands();
    res.status(200).json(brands);
};

exports.getGamingVoucherDenominations = async (req, res, next) => {
    const { brandId } = req.query;
    const denominations = await entertainmentProviderService.getGamingDenominations(brandId);
    res.status(200).json(denominations);
};

exports.purchaseVoucher = async (req, res, next) => {
    const userId = req.user.uid;
    const { brandId, amount, playerId, recipientMobile, billerName, voucherType = 'gaming' }: VoucherPurchasePayload = req.body;

    console.log(`Purchasing ${voucherType} voucher for user ${userId}:`, req.body);

    let paymentSuccess = false;
    let paymentResult = {};
    let purchaseResult = {};
    let finalStatus = 'Failed';
    let failureReason = 'Voucher purchase failed.';
    const purchaseDescription = `Voucher: ${billerName || brandId}`;
    let paymentTransactionId;

    let logData = {
        userId,
        type: 'Voucher Purchase',
        name: billerName || brandId,
        description: `Amount: ₹${amount}${playerId ? `, PlayerID: ${playerId}` : ''}${recipientMobile ? `, For: ${recipientMobile}` : ''}`,
        amount: -amount,
        status: 'Failed',
        billerId: brandId,
        paymentMethodUsed: 'Wallet', // Assuming wallet for now
    };

    try {
        if (amount <= 0) throw new Error("Invalid voucher amount.");
        
        paymentResult = await payViaWalletInternal(userId, `voucher_${voucherType}_${brandId}`, amount, purchaseDescription, 'Voucher Purchase');
        if (!paymentResult.success) throw new Error(paymentResult.message || 'Wallet payment failed.');
        paymentSuccess = true;
        paymentTransactionId = paymentResult.transactionId;
        logData.description += ' (via Wallet)';
        
        if (!paymentTransactionId) {
            console.error("[Entertainment Ctrl] CRITICAL: Payment reported success but no transactionId for voucher.");
            throw new Error("Payment processing error: Missing transaction ID for voucher.");
        }

        console.log(`Payment successful, purchasing ${voucherType} voucher...`);
        purchaseResult = await entertainmentProviderService.purchaseVoucher({ userId, brandId, amount, playerId, recipientMobile, paymentTransactionId, voucherType });
        if (purchaseResult.success) {
            finalStatus = 'Completed';
            logData.status = finalStatus;
            logData.ticketId = purchaseResult.voucherCode || purchaseResult.receiptId || undefined; 
            logData.description = purchaseResult.message || `Voucher Details: ${logData.ticketId || 'Sent'}`;
            paymentResult.message = purchaseResult.message || 'Voucher purchased successfully.';

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

            console.error(`[Entertainment Ctrl] CRITICAL: Payment successful (Tx: ${paymentTransactionId}) but ${voucherType} voucher purchase failed. Refunding.`);
            const originalTxRefFailed = doc(db, 'transactions', paymentTransactionId);
            await updateDoc(originalTxRefFailed, { status: 'Failed', description: `${voucherType} Voucher Purchase Failed at provider for ${logData.name}`, updatedAt: serverTimestamp() });

            const refundResult = await payViaWalletInternal(userId, `REFUND_${voucherType.toUpperCase()}_VOUCHER_${paymentTransactionId}`, -amount, `Refund: Failed ${billerName} Voucher`, 'Refund');
            if (refundResult.success) {
                  paymentResult.message = `${failureReason} Refund of ₹${amount} processed to wallet.`;
            } else {
                  paymentResult.message = `${failureReason} CRITICAL: Wallet refund failed. Manual intervention required.`;
                  console.error(paymentResult.message);
            }
            throw new Error(paymentResult.message);
        }

        logTransactionToBlockchain(paymentTransactionId, { ...logData, id: paymentTransactionId, date: new Date() } ).catch(console.error);
        
        const finalTxDoc = await getDoc(doc(db, 'transactions', paymentTransactionId));
        if (finalTxDoc.exists()) {
            const finalTxData = { id: finalTxDoc.id, ...finalTxDoc.data(), date: finalTxDoc.data().date.toDate() };
            sendToUser(userId, { type: 'transaction_update', payload: finalTxData });
        }
        
         res.status(201).json({
             status: 'Completed',
             message: paymentResult.message,
              transactionId: paymentTransactionId,
             voucherDetails: purchaseResult,
         });

    } catch (error) {
         console.error(`[Entertainment Ctrl] ${voucherType} Voucher purchase failed for user ${userId}:`, error.message);
         let finalFailedTxId = paymentTransactionId;

        if (!finalFailedTxId) {
            logData.status = 'Failed';
            logData.description = `${logData.name} - Purchase Error: ${error.message}`;
            try {
                const failedTx = await addTransaction(logData);
                finalFailedTxId = failedTx.id;
                sendToUser(userId, { type: 'transaction_update', payload: { ...failedTx, date: failedTx.date } });
            } catch (logError) {
                console.error(`[Entertainment Ctrl] Failed to log initial failed ${voucherType} voucher purchase transaction:`, logError);
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
                console.error(`[Entertainment Ctrl] Error updating ${voucherType} voucher transaction ${finalFailedTxId} to Failed state:`, updateError);
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


```
  </change>
  <change>
    <file>backend/routes/entertainmentRoutes.js</file>
    <content><![CDATA[
// backend/routes/entertainmentRoutes.js
const express = require('express');
const { query, body, param, validationResult } = require('express-validator');
const entertainmentController = require('../controllers/entertainmentController');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();

// Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        res.status(400);
        throw new Error(`Validation Failed: ${errorMessages}`);
    }
    next();
};

// All routes require authentication (applied in server.js)

// --- Movies ---
router.get('/movies/search',
    query('city').isString().trim().notEmpty().withMessage('City is required.'),
    query('date').optional().isISO8601().toDate().withMessage('Invalid date format.'),
    handleValidationErrors,
    asyncHandler(entertainmentController.searchMovies)
);

router.get('/movies/:movieId/details',
    param('movieId').isString().trim().notEmpty().withMessage('Movie ID is required.'),
    query('city').isString().trim().notEmpty().withMessage('City is required.'),
    query('date').optional().isISO8601().toDate().withMessage('Invalid date format.'),
    handleValidationErrors,
    asyncHandler(entertainmentController.getMovieDetails)
);

router.post('/movies/book',
    body('movieId').isString().trim().notEmpty().withMessage('Movie ID required.'),
    body('cinemaId').isString().trim().notEmpty().withMessage('Cinema ID required.'),
    body('showtime').isString().trim().notEmpty().withMessage('Showtime required.'),
    body('seats').isArray({ min: 1 }).withMessage('At least one seat must be selected.'),
    body('seats.*').isString().trim().notEmpty().withMessage('Invalid seat ID.'), 
    body('totalAmount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid total amount required.'), 
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'),
    body('movieName').optional().isString().trim(), 
    body('cinemaName').optional().isString().trim(), 
    handleValidationErrors,
    asyncHandler(entertainmentController.bookMovieTickets) 
);

// --- Events (Generic/Comedy/Sports) ---
router.get('/events/search',
    query('city').isString().trim().notEmpty().withMessage('City is required.'),
    query('category').optional().isIn(['Comedy', 'Sports', 'Music', 'Workshop']).withMessage('Invalid category.'),
    query('date').optional().isISO8601().toDate(),
    handleValidationErrors,
    asyncHandler(entertainmentController.searchEvents)
);

router.get('/events/:eventId/details',
    param('eventId').isString().trim().notEmpty().withMessage('Event ID is required.'),
    handleValidationErrors,
    asyncHandler(entertainmentController.getEventDetails)
);

router.post('/events/book',
    body('eventId').isString().trim().notEmpty().withMessage('Event ID required.'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
    body('totalAmount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid total amount required.'),
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'),
    body('eventName').optional().isString().trim(), 
    handleValidationErrors,
    asyncHandler(entertainmentController.bookEventTickets)
);

// --- Gaming Vouchers ---
router.get('/vouchers/gaming/brands', asyncHandler(entertainmentController.getGamingVoucherBrands));

router.get('/vouchers/gaming/denominations',
    query('brandId').isString().trim().notEmpty().withMessage('Brand ID is required.'),
    handleValidationErrors,
    asyncHandler(entertainmentController.getGamingVoucherDenominations)
);

// Common endpoint for voucher purchase, differentiate by voucherType in payload
router.post('/vouchers/gaming/purchase',
    body('brandId').isString().trim().notEmpty().withMessage('Brand ID required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid amount required.'),
    body('playerId').optional({ checkFalsy: true }).isString().trim(), 
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'), // For consistency, though backend might default to wallet
    body('billerName').optional().isString().trim(),
    body('voucherType').default('gaming').isIn(['gaming']).withMessage('Invalid voucher type for this endpoint.'), // Specific to gaming
    handleValidationErrors,
    asyncHandler(entertainmentController.purchaseVoucher) // Use generic purchaseVoucher
);

// --- Digital Vouchers (e.g., Google Play, App Store) ---
// Note: This might be a separate route file in a larger app, or use query params to /vouchers.
// Using a distinct path for clarity for now.
router.post('/vouchers/digital/purchase',
    body('brandId').isString().trim().notEmpty().withMessage('Brand ID required.'),
    body('amount').isNumeric().toFloat().isFloat({ gt: 0 }).withMessage('Valid amount required.'),
    body('recipientMobile').optional({ checkFalsy: true }).isMobilePhone('any').withMessage('Invalid recipient mobile number.'), // Make sure to validate mobile number
    body('paymentMethod').optional().isIn(['wallet', 'upi', 'card']).withMessage('Invalid payment method.'),
    body('billerName').optional().isString().trim(),
    body('voucherType').default('digital').isIn(['digital']).withMessage('Invalid voucher type for this endpoint.'), // Specific to digital
    handleValidationErrors,
    asyncHandler(entertainmentController.purchaseVoucher) // Use generic purchaseVoucher
);


module.exports = router;
