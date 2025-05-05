// backend/controllers/paymentController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger');
const paymentGatewayService = require('../services/paymentGatewayService'); // Assumed service
const { payViaWallet } = require('./walletController'); // For fallback/direct wallet pay

// Process payment using Saved Card
exports.processCardPayment = async (req, res, next) => {
    const userId = req.user.uid;
    const { cardId, amount, cvv, purpose, recipientIdentifier } = req.body;

    if (!cardId || !amount || amount <= 0 || !cvv || !purpose) {
        return res.status(400).json({ message: 'Missing required fields: cardId, amount, cvv, purpose.' });
    }

    console.log(`Processing card payment for user ${userId}, card ${cardId}, amount ${amount}`);

    let paymentResult: any = {};
    let finalStatus: Transaction['status'] = 'Failed';
    let descriptionSuffix = '';
    const transactionName = `Card Payment: ${purpose}`;
    let logData: Partial<Transaction> & { userId: string } = {
        userId,
        type: 'Sent', // Assuming card payment is sending money
        name: recipientIdentifier || purpose,
        description: `${purpose} using card ${cardId}`, // Mask cardId/last4 in logs if sensitive
        amount: -amount,
        status: 'Failed',
        // Include card details if needed, e.g., last4, but NOT full card info
    };

    try {
        // 1. Call Payment Gateway Service
        paymentResult = await paymentGatewayService.chargeSavedCard({
            userId,
            cardId, // This would be the token/reference stored
            amount,
            cvv, // Gateway needs this for the transaction
            purpose,
            // Pass other necessary details like order ID, recipient info if applicable
        });

        if (paymentResult.success) {
            finalStatus = 'Completed';
            logData.status = finalStatus;
            logData.ticketId = paymentResult.gatewayTransactionId; // Store gateway ID
        } else {
             // Payment failed at gateway/bank level
            finalStatus = 'Failed';
            logData.status = 'Failed';
            logData.description += ` - Payment Failed: ${paymentResult.message}`;
            // Check if fallback is suggested
             if (paymentResult.suggestRetryWithWallet) {
                 // Attempt Wallet Fallback (similar to UPI fallback)
                 console.log("Card payment failed, attempting Wallet Fallback...");
                 const walletBalance = await getWalletBalance(userId); // Assuming internal helper exists
                 if (walletBalance >= amount) {
                     const walletPaymentResult = await payViaWallet(userId, recipientIdentifier || cardId, amount, `${purpose} (Wallet Fallback)`);
                     if (walletPaymentResult.success) {
                         // Log successful fallback transaction (payViaWallet handles its own logging)
                         return res.status(200).json({
                             success: true, // Overall transaction is successful via fallback
                             message: `Card failed (${paymentResult.message}). Paid via Wallet.`,
                             transactionId: walletPaymentResult.transactionId,
                             usedWalletFallback: true,
                         });
                     } else {
                         paymentResult.message += `. Wallet fallback also failed: ${walletPaymentResult.message}`;
                     }
                 } else {
                      paymentResult.message += `. Insufficient wallet balance for fallback.`;
                 }
             }
             // If no fallback or fallback failed, throw the original card failure error
              throw new Error(paymentResult.message || "Card payment failed.");
        }

         // 2. Log successful transaction
         const loggedTx = await addTransaction(logData);

         // 3. Blockchain log (optional)
          logTransactionToBlockchain(loggedTx.id, { userId, type: logData.type, amount, method: 'card' })
              .catch(err => console.error("Blockchain log failed:", err));

        res.status(200).json({
            success: true,
            message: "Payment successful",
            transactionId: loggedTx.id, // Return Firestore transaction ID
            gatewayDetails: paymentResult, // Return gateway response if needed
        });

    } catch (error: any) {
        console.error(`Card payment failed for user ${userId}:`, error.message);
        logData.status = 'Failed';
        logData.description = `Card Payment Failed - ${error.message}`;
         // Log failed transaction attempt
         try {
            await addTransaction(logData);
         } catch (logError) {
            console.error("Failed to log failed card payment transaction:", logError);
         }
        // Return standardized failure response for client handling
        res.status(400).json({
            success: false,
            message: error.message || "Card payment failed.",
            retryWithDifferentMethod: paymentResult.suggestRetryWithWallet || true, // Suggest retry if payment failed
            errorCode: paymentResult.errorCode || undefined,
        });
    }
};

// Add other payment types later if needed (e.g., generic checkout flow)

// Import Transaction type definition
import type { Transaction } from '../services/types';
import { getWalletBalance } from '../services/wallet'; // Assuming direct service call for internal use
