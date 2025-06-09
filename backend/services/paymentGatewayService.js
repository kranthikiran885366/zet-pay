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