// backend/controllers/billsController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger');
const billProviderService = require('../services/billProviderService'); // Assume a dedicated service
const { payViaWallet } = require('./walletController'); // For payment
const { scheduleRecovery } = require('../services/recoveryService');

// Types of bills this controller handles (can be extended)
const SUPPORTED_BILL_TYPES = ['Electricity', 'Water', 'Insurance', 'Credit Card', 'Loan', 'Gas', 'Broadband'];

// Fetch Bill Amount (if supported by provider)
exports.fetchBillDetails = async (req, res, next) => {
    const { billerId, identifier } = req.query;
    const { type } = req.params; // e.g., 'electricity', 'water'

    if (!billerId || typeof billerId !== 'string' || !identifier || typeof identifier !== 'string') {
        return res.status(400).json({ message: 'Biller ID and identifier (e.g., consumer number, policy number) are required.' });
    }
     if (!type || !SUPPORTED_BILL_TYPES.map(t => t.toLowerCase().replace(/\s+/g, '-')).includes(type)) {
         return res.status(400).json({ message: 'Invalid bill type specified.' });
     }

    try {
        const billDetails = await billProviderService.fetchBill(billerId, identifier, type);
        if (!billDetails) {
            return res.status(404).json({ message: 'Bill details not found for the given identifier.' });
        }
        res.status(200).json(billDetails); // Includes amount, dueDate, consumerName etc.
    } catch (error) {
        next(error);
    }
};

// Process Bill Payment
exports.processBillPayment = async (req, res, next) => {
    const userId = req.user.uid;
    const { type } = req.params; // e.g., 'electricity', 'water'
    const { billerId, billerName, identifier, amount, paymentMethod = 'wallet' } = req.body;

    // Basic Validation
     if (!billerId || !identifier || !amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: 'Biller ID, identifier, and valid amount are required.' });
    }
      if (!type || !SUPPORTED_BILL_TYPES.map(t => t.toLowerCase().replace(/\s+/g, '-')).includes(type)) {
         return res.status(400).json({ message: 'Invalid bill type specified.' });
     }

    let paymentSuccess = false;
    let paymentResult: any = {}; // Store result from payment method
    let finalStatus: Transaction['status'] = 'Failed';
    let failureReason = 'Payment or bill processing failed.';
    const transactionName = `${billerName || capitalize(type)} Bill`;
    let logData: Partial<Transaction> & { userId: string } = {
        userId,
        type: 'Bill Payment',
        name: transactionName,
        description: `Payment for ${identifier}`,
        amount: -amount,
        status: 'Failed',
        billerId,
        upiId: identifier, // Using upiId field for the bill identifier
    };

    try {
        // --- Step 1: Payment Processing ---
        if (paymentMethod === 'wallet') {
            const walletResult = await payViaWallet(userId, billerId, amount, `Bill Pay: ${transactionName}`);
            if (!walletResult.success) throw new Error(walletResult.message || 'Wallet payment failed.');
            paymentSuccess = true;
            paymentResult = walletResult;
            logData.description += ' (via Wallet)';
        } else if (paymentMethod === 'upi') {
            // TODO: Integrate UPI payment logic (similar to upiController or refactor to service)
            // const upiResult = await processUpiPaymentInternal(userId, billerId, amount, pin, sourceAccountUpiId, `Bill Pay: ${transactionName}`);
            // ... handle upiResult ...
             throw new Error("UPI payment for bills not fully implemented in this controller yet."); // Placeholder
        } else {
             throw new Error('Invalid payment method specified.');
        }

        // --- Step 2: Bill Payment Execution (if payment was successful) ---
        if (paymentSuccess) {
            console.log("Payment successful, proceeding with bill payment API call...");
            const billPayResult = await billProviderService.payBill({
                 billerId, identifier, amount, type, transactionId: paymentResult.transactionId
            });

            if (billPayResult.status === 'Completed' || billPayResult.status === 'Pending') {
                finalStatus = billPayResult.status;
                failureReason = '';
                logData.status = finalStatus;
                logData.description = billPayResult.operatorMessage || logData.description?.replace(' (via Wallet)', '');
                paymentResult.message = billPayResult.message || 'Bill payment successful/pending.';
            } else {
                // Payment failed after deduction -> Requires Refund/Reversal
                finalStatus = 'Failed';
                failureReason = billPayResult.message || 'Bill payment failed after payment deduction.';
                logData.status = 'Failed';
                logData.description += ` - Bill Payment Failed: ${failureReason}`;
                 console.error(`CRITICAL: Payment successful but bill payment failed for user ${userId}, amount ${amount}, biller ${billerId}, identifier ${identifier}. Reason: ${failureReason}. Initiating refund simulation.`);
                // TODO: Trigger refund process back to the original payment source.
                paymentResult.message = failureReason + " Refund initiated.";
            }
        } else {
            // Payment itself failed, handled in the catch block below
            throw new Error(paymentResult.message || "Payment failed before bill payment attempt.");
        }

        // --- Step 3: Logging ---
        const loggedTx = await addTransaction(logData);
        paymentResult.transactionId = loggedTx.id; // Use Firestore ID

        // Blockchain log (optional)
        logTransactionToBlockchain(loggedTx.id, { userId, type: logData.type, amount, date: new Date(), recipient: logData.name })
             .catch(err => console.error("Blockchain log failed:", err));

        res.status(200).json({ status: finalStatus, message: paymentResult.message, transactionId: loggedTx.id });

    } catch (error: any) {
        console.error(`Bill payment processing failed for user ${userId}:`, error.message);
        logData.description = `Bill Payment Failed - ${error.message}`;
        logData.status = 'Failed';
        // Attempt to log the failed transaction
        try {
            const failedTx = await addTransaction(logData);
            paymentResult.transactionId = failedTx.id;
        } catch (logError) {
            console.error("Failed to log failed bill payment transaction:", logError);
        }
        // Return failure response
        res.status(400).json({ status: 'Failed', message: error.message || failureReason, transactionId: paymentResult.transactionId });
    }
};

// Add functions for getting saved billers, bill reminders etc. later

function capitalize(s: string): string {
  return typeof s === 'string' && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// Import Transaction type definition
import type { Transaction } from '../services/types';
