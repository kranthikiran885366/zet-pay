
// backend/controllers/paymentController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger');
const paymentGatewayService = require('../services/paymentGatewayService'); 
const { payViaWalletInternal, getWalletBalance } = require('../services/wallet'); // For fallback/direct wallet pay and balance check


// Process payment using Saved Card
exports.processCardPayment = async (req, res, next) => {
    const userId = req.user.uid;
    const { cardId, amount, cvv, purpose, recipientIdentifier } = req.body;

    if (!cardId || !amount || amount <= 0 || !cvv || !purpose) {
        return res.status(400).json({ message: 'Missing required fields: cardId, amount, cvv, purpose.' });
    }

    console.log(`Processing card payment for user ${userId}, card ${cardId}, amount ${amount}`);

    let paymentResult = {};
    let finalStatus = 'Failed';
    let descriptionSuffix = '';
    const transactionName = `Card Payment: ${purpose}`;
    let logData = {
        userId,
        type: 'Sent', 
        name: recipientIdentifier || purpose,
        description: `${purpose} using card (ref: ${cardId.slice(-4)})`, // Mask cardId/last4
        amount: -amount,
        status: 'Failed',
        paymentMethodUsed: 'Card',
    };

    try {
        paymentResult = await paymentGatewayService.chargeSavedCard({
            userId,
            cardId, 
            amount,
            cvv, 
            purpose,
        });

        if (paymentResult.success) {
            finalStatus = 'Completed';
            logData.status = finalStatus;
            logData.ticketId = paymentResult.gatewayTransactionId; 
        } else {
            finalStatus = 'Failed';
            logData.status = 'Failed';
            logData.description += ` - Payment Failed: ${paymentResult.message}`;
            if (paymentResult.suggestRetryWithWallet) {
                 console.log("Card payment failed, attempting Wallet Fallback...");
                 const currentWalletBalance = await getWalletBalance(userId); 
                 if (currentWalletBalance >= amount) {
                     const walletPaymentResult = await payViaWalletInternal(userId, recipientIdentifier || `CARD_FAIL_${cardId}`, amount, `${purpose} (Wallet Fallback)`);
                     if (walletPaymentResult.success) {
                         return res.status(200).json({
                             success: true, 
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
              throw new Error(paymentResult.message || "Card payment failed.");
        }

         const loggedTx = await addTransaction(logData);

         logTransactionToBlockchain(loggedTx.id, { ...logData, id: loggedTx.id, date: new Date(), amount: amount })
              .catch(err => console.error("[Payment Ctrl - Card] Blockchain log failed:", err));

        res.status(200).json({
            success: true,
            message: "Payment successful",
            transactionId: loggedTx.id, 
            gatewayDetails: paymentResult, 
        });

    } catch (error) {
        console.error(`Card payment failed for user ${userId}:`, error.message);
        logData.status = 'Failed';
        logData.failureReason = error.message || "Card payment processing error.";
        if (!logData.description.includes("Payment Failed")) { // Avoid duplicate failure messages
            logData.description = `${logData.description} - Error: ${error.message}`;
        }
         try {
            // Ensure a failed transaction is logged if not already
            // (e.g., if it failed before the explicit logging step)
            const existingFailedTx = await db.collection('transactions').where('userId', '==', userId).where('name', '==', logData.name).where('amount', '==', logData.amount).where('status', '==', 'Failed').orderBy('date', 'desc').limit(1).get();
            if (existingFailedTx.empty) {
                await addTransaction(logData);
            }
         } catch (logError) {
            console.error("Failed to log failed card payment transaction:", logError);
         }
        res.status(400).json({
            success: false,
            message: error.message || "Card payment failed.",
            retryWithDifferentMethod: paymentResult.suggestRetryWithWallet || true, 
            errorCode: paymentResult.errorCode || undefined,
        });
    }
};


/**
 * Processes a fuel payment.
 * Assumes payment via default method (e.g., wallet or primary UPI).
 */
exports.processFuelPayment = async (req, res, next) => {
    const userId = req.user.uid;
    const { amount } = req.body; // Amount from request

    console.log(`Processing fuel payment for user ${userId}, amount ${amount}`);

    let paymentResult = {};
    let transactionDetails = {};

    try {
        // Simulate payment processing (e.g., via wallet for now)
        // In a real app, determine default payment method or allow selection
        const walletResult = await payViaWalletInternal(userId, 'FUEL_PAYMENT_STATION', Number(amount), 'Fuel Payment');
        
        if (!walletResult.success) {
            throw new Error(walletResult.message || "Fuel payment using wallet failed.");
        }

        paymentResult = {
            success: true,
            transactionId: walletResult.transactionId,
            message: "Fuel payment successful.",
        };
        
        // Fetch the logged transaction to return its details
        const txDoc = await db.collection('transactions').doc(walletResult.transactionId).get();
        if (!txDoc.exists) {
            throw new Error("Failed to retrieve transaction details after payment.");
        }
        transactionDetails = {
            ...txDoc.data(),
            id: txDoc.id,
            date: txDoc.data().date.toDate(), // Convert timestamp
        };
        
        res.status(200).json(transactionDetails);

    } catch (error) {
        console.error(`Fuel payment failed for user ${userId}:`, error.message);
        // Attempt to log a failed transaction if primary payment failed
        try {
            const loggedFailedTx = await addTransaction({
                userId,
                type: 'Fuel',
                name: 'Fuel Station Payment',
                description: `Failed fuel payment attempt - ${error.message}`,
                amount: -Number(amount), // Debit attempt
                status: 'Failed',
                paymentMethodUsed: 'Wallet', // Or whatever was attempted
                failureReason: error.message
            });
            return res.status(400).json({ ...loggedFailedTx, message: error.message || "Fuel payment failed." });
        } catch (logError) {
             console.error("Failed to log failed fuel payment transaction:", logError);
             return res.status(400).json({
                success: false,
                message: error.message || "Fuel payment failed and logging error.",
             });
        }
    }
};


// Import Transaction type definition
import type { Transaction } from '../services/types';

```
  </change>
  <change>
    <file>backend/services/paymentGatewayService.js</file>
    <content><![CDATA[
// backend/services/paymentGatewayService.js
// Placeholder for actual Payment Gateway integration (e.g., Razorpay, Stripe, Cashfree)

/**
 * Tokenizes a card with the payment gateway.
 * @param {object} cardDetails - Card number, expiry, CVV, card holder name.
 * @returns {Promise<object>} Result with token, card issuer, etc.
 */
async function tokenizeCard(cardDetails) {
    console.log("[Payment Gateway Sim] Tokenizing card ending in:", cardDetails.cardNumber.slice(-4));
    await new Promise(resolve => setTimeout(resolve, 800));
    // Simulate different issuers
    const issuer = cardDetails.cardNumber.startsWith('4') ? 'Visa' :
                   cardDetails.cardNumber.startsWith('5') ? 'Mastercard' :
                   cardDetails.cardNumber.startsWith('3') ? 'Amex' : 'Rupay';
    return {
        success: true,
        token: `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        cardIssuer: issuer,
        bankName: issuer === 'Visa' ? 'HDFC Bank' : 'ICICI Bank', // Example bank
        message: 'Card tokenized successfully.'
    };
}


/**
 * Charges a saved card using the payment gateway.
 * This requires sending the saved card token/reference and CVV to the gateway.
 * Handles 3D Secure redirection/callbacks if necessary.
 *
 * @param {object} details - Payment details { userId, cardId (token), amount, cvv, purpose, orderId, etc. }
 * @returns {Promise<object>} Gateway response { success, gatewayTransactionId, message, suggestRetryWithWallet, errorCode }
 */
async function chargeSavedCard(details) {
    const { userId, cardId, amount, cvv, purpose } = details;
    console.log(`[Payment Gateway Sim] Charging card token ${cardId} for user ${userId}, amount ${amount}, CVV ***, Purpose: ${purpose}`);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate gateway interaction

    // Simulate various responses
    const random = Math.random();
    if (cvv !== '123' && cvv !== '000') { // Allow '000' as a test CVV
        console.warn("[Payment Gateway Sim] Incorrect CVV simulation.");
        return { success: false, message: 'Incorrect CVV provided.', errorCode: 'INVALID_CVV' };
    }
    if (amount > 10000 && amount <= 20000) { // Simulate insufficient funds/limit
        console.warn("[Payment Gateway Sim] Insufficient funds simulation.");
        return { success: false, message: 'Payment declined by bank (Insufficient Funds/Limit).', errorCode: 'BANK_DECLINED', suggestRetryWithWallet: true };
    }
     if (amount > 20000 || random < 0.1) { // 10% chance of generic failure or high amount fail
         console.warn("[Payment Gateway Sim] Generic gateway error simulation.");
         return { success: false, message: 'Payment gateway error. Please try again.', errorCode: 'GATEWAY_ERROR', suggestRetryWithWallet: true };
     }
    // Simulate 3D Secure requirement (though harder to simulate flow fully)
    if (amount > 5000) {
        console.log("[Payment Gateway Sim] 3D Secure authentication would be required here.");
        // In a real app, you'd redirect the user or handle a callback.
        // Assuming 3D secure passes for simulation:
    }

    console.log("[Payment Gateway Sim] Card payment successful.");
    return {
        success: true,
        gatewayTransactionId: `PAY_CARD_${Date.now()}`,
        message: 'Payment successful via Card.',
    };
}

/**
 * Initiates a UPI payment request via the payment gateway (if supported).
 * Generates a payment link or triggers collect request.
 *
 * @param {object} details - Payment details { userId, amount, upiId (optional), purpose, orderId, etc. }
 * @returns {Promise<object>} Gateway response { success, paymentLink?, gatewayTransactionId?, message }
 */
async function initiateUpiPayment(details) {
     const { userId, amount, upiId, purpose } = details;
    console.log(`[Payment Gateway Sim] Initiating UPI payment for user ${userId}, amount ${amount}, Purpose: ${purpose}`);
    await new Promise(resolve => setTimeout(resolve, 800));

     // Simulate success
     return {
         success: true,
         gatewayTransactionId: `UPIPAY_PG_${Date.now()}`,
         message: 'UPI payment initiated successfully via Gateway.',
         // paymentLink: 'upi://pay?pa=...' // Or return link/QR data
     };
}

/**
 * Processes a generic payment via the Payment Gateway, used for Fuel Payments etc.
 * This would abstract the specific method (e.g., default card, UPI through PG).
 * @param {string} userId - The ID of the user making the payment.
 * @param {number} amount - The amount to be paid.
 * @param {string} purpose - The purpose of the payment (e.g., "Fuel Payment").
 * @param {string} recipientIdentifier - Identifier for the recipient (e.g., "FUEL_STATION_XYZ").
 * @returns {Promise<object>} Gateway response { success, gatewayTransactionId, message, paymentMethodUsed }
 */
async function processGenericPayment(userId, amount, purpose, recipientIdentifier) {
    console.log(`[Payment Gateway Sim] Processing generic payment for user ${userId}, amount ${amount}, purpose: ${purpose} to ${recipientIdentifier}`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const random = Math.random();
    if (random < 0.05) { // 5% failure rate
        return { success: false, message: 'Payment gateway declined transaction.', paymentMethodUsed: 'GatewayDefault' };
    }

    return {
        success: true,
        gatewayTransactionId: `GENPAY_${Date.now()}`,
        message: 'Payment processed successfully via gateway.',
        paymentMethodUsed: 'GatewayDefault' // Simulate gateway choosing method or using a default
    };
}


// Simulates processing a Card payment INTERNALLY for services (e.g., if direct PG integration)
// This would be used by backend services that need to charge a card.
// This is slightly different from chargeSavedCard which might be called by a controller for user-facing flow.
async function processCardPaymentInternal(userId, cardToken, amount, cvv, description) {
    console.log(`[PG Sim - Internal] Processing card payment: User ${userId}, Token ${cardToken.slice(-4)}, Amt ${amount}, Desc: ${description}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (cvv !== '123' && cvv !== '000') {
        return { success: false, transactionId: null, message: "Invalid CVV (Simulated for internal processing)." };
    }
    if (amount > 50000) {
        return { success: false, transactionId: null, message: "Amount exceeds limit (Simulated for internal processing)." };
    }
    return { success: true, transactionId: `CARD_INT_TXN_${Date.now()}`, message: `Card payment of ₹${amount} successful.` };
}


module.exports = {
    tokenizeCard,
    chargeSavedCard,
    initiateUpiPayment,
    processGenericPayment, // Added for fuel payments
    processCardPaymentInternal, // Added for internal card processing
};
