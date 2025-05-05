// backend/controllers/hyperlocalController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger');
const hyperlocalProviderService = require('../services/hyperlocalProviderService'); // Assume a dedicated service
const { payViaWallet } = require('./walletController');

// Get available hyperlocal services in an area (based on lat/lon or pincode)
exports.getAvailableServices = async (req, res, next) => {
    const { lat, lon, pincode } = req.query; // Get location parameters

    if (!(lat && lon) && !pincode) {
        return res.status(400).json({ message: 'Location (lat/lon or pincode) is required.' });
    }

    console.log("Fetching available hyperlocal services for location:", { lat, lon, pincode });
    try {
        // TODO: Call backend service that queries providers based on location
        const services = await hyperlocalProviderService.findServicesNearby({ latitude: lat, longitude: lon, pincode });
        res.status(200).json(services); // Returns list of service types, potentially with providers
    } catch (error) {
        next(error);
    }
};

// Get details or available slots for a specific service type/provider
exports.getServiceDetails = async (req, res, next) => {
    const { serviceType } = req.params; // e.g., 'electrician', 'plumber', 'carwash'
    const { providerId, date } = req.query; // Optional provider and date for slot checking

    console.log("Fetching details/slots for service:", serviceType, { providerId, date });
    try {
        // TODO: Call backend service to get pricing, slots, provider details
        const details = await hyperlocalProviderService.getServiceInfo(serviceType, providerId, date);
        if (!details) {
            return res.status(404).json({ message: 'Service details not found.' });
        }
        res.status(200).json(details);
    } catch (error) {
        next(error);
    }
};

// Book a hyperlocal service
exports.bookService = async (req, res, next) => {
    const userId = req.user.uid;
    const { serviceType } = req.params;
    // bookingData includes providerId, slotTime, address, description, estimatedCost etc.
    const { providerId, slotTime, address, description, estimatedCost, paymentMethod = 'wallet' } = req.body;

    if (!providerId || !slotTime || !address || estimatedCost === undefined) {
        return res.status(400).json({ message: 'Missing required booking details (provider, slot, address, cost).' });
    }

    console.log(`Booking hyperlocal service ${serviceType} for user ${userId}:`, req.body);

    let paymentSuccess = false;
    let paymentResult: any = {};
    let bookingResult: any = {};
    let finalStatus: Transaction['status'] = 'Failed';
    let failureReason = 'Booking or payment failed.';
    const bookingName = `${capitalize(serviceType)} Service Booking`;

     let logData: Partial<Transaction> & { userId: string } = {
        userId,
        type: 'Service Booking',
        name: bookingName,
        description: `Provider: ${providerId}, Slot: ${slotTime}`,
        amount: -(estimatedCost || 0), // Negative amount for payment
        status: 'Failed',
        billerId: providerId, // Use billerId for provider ID
    };

    try {
        // --- Step 1: Payment Processing (if cost > 0) ---
         if (estimatedCost > 0) {
            if (paymentMethod === 'wallet') {
                 const walletResult = await payViaWallet(userId, providerId, estimatedCost, bookingName);
                 if (!walletResult.success) throw new Error(walletResult.message || 'Wallet payment failed.');
                 paymentSuccess = true;
                 paymentResult = walletResult;
                 logData.description += ' (via Wallet)';
            } else if (paymentMethod === 'upi') {
                 // TODO: Integrate UPI payment logic
                  throw new Error("UPI payment for hyperlocal services not implemented yet.");
            } else {
                  throw new Error('Invalid payment method specified.');
            }
        } else {
            paymentSuccess = true; // No payment needed if cost is 0
            paymentResult.message = "No payment required for booking.";
        }


        // --- Step 2: Confirm Booking with Provider/Platform ---
        if (paymentSuccess) {
             console.log("Payment processed (if needed), confirming service booking...");
             bookingResult = await hyperlocalProviderService.confirmBooking(serviceType, {
                 ...req.body,
                 userId,
                 paymentTransactionId: paymentResult.transactionId || null, // Pass payment ID if applicable
             });

              if (bookingResult.status === 'Confirmed' || bookingResult.status === 'Pending Confirmation') {
                 finalStatus = 'Completed';
                 failureReason = '';
                 logData.status = finalStatus;
                 logData.description = bookingResult.message || `Booking ID: ${bookingResult.bookingId || 'N/A'}`;
                 logData.ticketId = bookingResult.bookingId || undefined; // Use ticketId field
                 paymentResult.message = bookingResult.message || 'Service booked successfully.';
             } else {
                 // Booking failed after payment -> Refund required
                 finalStatus = 'Failed';
                 failureReason = bookingResult.message || 'Booking failed after payment.';
                 logData.status = 'Failed';
                 logData.description += ` - Booking Failed: ${failureReason}`;
                 console.error(`CRITICAL: Payment successful but hyperlocal booking failed for user ${userId}, type ${serviceType}, amount ${estimatedCost}. Reason: ${failureReason}. Initiating refund.`);
                 // TODO: Trigger refund process.
                 paymentResult.message = failureReason + " Refund initiated.";
             }
        } else {
             throw new Error(paymentResult.message || "Payment failed before booking attempt.");
        }

         // --- Step 3: Logging ---
         const loggedTx = await addTransaction(logData);
         paymentResult.transactionId = loggedTx.id;

         // Blockchain log (optional)
         logTransactionToBlockchain(loggedTx.id, { userId, type: logData.type, amount: estimatedCost, details: bookingName })
              .catch(err => console.error("Blockchain log failed:", err));

         res.status(finalStatus === 'Completed' ? 201 : 400).json({
            status: finalStatus,
            message: paymentResult.message,
            transactionId: loggedTx.id,
            bookingDetails: finalStatus === 'Completed' ? bookingResult : null,
        });


    } catch (error: any) {
        console.error(`Hyperlocal booking failed for user ${userId}, type ${serviceType}:`, error.message);
        logData.description = `Booking Failed - ${error.message}`;
        logData.status = 'Failed';
        // Log failed attempt
        try {
            const failedTx = await addTransaction(logData);
            paymentResult.transactionId = failedTx.id;
        } catch (logError) {
             console.error("Failed to log failed hyperlocal booking transaction:", logError);
        }
         res.status(400).json({
             status: 'Failed',
             message: error.message || failureReason,
             transactionId: paymentResult.transactionId
         });
    }
};

// Cancel a booked service (if supported)
exports.cancelServiceBooking = async (req, res, next) => {
    const userId = req.user.uid;
    const { serviceType, bookingId } = req.params;

    console.log(`Cancelling hyperlocal service booking: ${serviceType}, ID: ${bookingId}, User: ${userId}`);
    try {
        // TODO: Fetch original booking, check status and ownership

        const cancellationResult = await hyperlocalProviderService.cancelBooking(serviceType, bookingId, userId);

        if (cancellationResult.success) {
            // TODO: Update booking status in local DB
            // TODO: Log cancellation/refund transaction
            res.status(200).json({ success: true, message: cancellationResult.message || "Service booking cancelled." });
        } else {
             throw new Error(cancellationResult.message || "Cancellation failed by provider.");
        }
    } catch (error: any) {
        next(error);
    }
};

function capitalize(s: string): string {
  return typeof s === 'string' && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// Import Transaction type definition
import type { Transaction } from '../services/types';
