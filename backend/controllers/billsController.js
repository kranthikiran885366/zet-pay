// backend/controllers/billsController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger');
const billProviderService = require('../services/billProviderService'); // Assume a dedicated service
const { payViaWalletInternal } = require('../services/wallet'); // Use internal wallet service function
const { scheduleRecovery } = require('../services/recoveryService');
const { sendToUser } = require('../server'); // Import WebSocket sender

// Types of bills this controller handles (can be extended)
const SUPPORTED_BILL_TYPES = ['Electricity', 'Water', 'Insurance', 'Credit Card', 'Loan', 'Gas', 'Broadband', 'Education', 'Mobile Postpaid', 'Cable TV', 'Housing Society', 'Club Fee', 'Donation'];

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
            // Return 200 OK but indicate fetch failed, allowing manual entry
             return res.status(200).json({ success: false, message: 'Bill details not found for the given identifier. Manual entry allowed.' });
        }
         // Include success flag
         res.status(200).json({ success: true, ...billDetails }); // Includes amount, dueDate, consumerName etc.
    } catch (error) {
        next(error);
    }
};

// Process Bill Payment
exports.processBillPayment = async (req, res, next) => {
    const userId = req.user.uid;
    const { type } = req.params; // e.g., 'electricity', 'water', 'donation'
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
    const transactionType = type === 'donation' ? 'Donation' : 'Bill Payment'; // Specific type for Donations
    const transactionName = `${billerName || capitalize(type)}`;
    let logData: Partial<Transaction> & { userId: string } = {
        userId,
        type: transactionType,
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
            // Use internal service function which handles logging and WS updates
            const walletResult = await payViaWalletInternal(userId, billerId, amount, `Bill Pay: ${transactionName}`);
            if (!walletResult.success) throw new Error(walletResult.message || 'Wallet payment failed.');
            paymentSuccess = true;
            paymentResult = walletResult; // Contains transactionId
            logData.paymentMethodUsed = 'Wallet';
        } else if (paymentMethod === 'upi') {
            // TODO: Implement UPI payment logic via backend service
            // This service should handle PSP interaction, PIN (if needed backend-side), fallback, and logging.
            // const upiResult = await processUpiPaymentService(userId, billerId, amount, pin, sourceAccountUpiId, `Bill Pay: ${transactionName}`);
            // paymentSuccess = upiResult.success || upiResult.usedWalletFallback;
            // paymentResult = upiResult;
            // logData.paymentMethodUsed = 'UPI';
             throw new Error("UPI payment for bills not fully implemented in backend yet."); // Placeholder
        } else if (paymentMethod === 'card') {
             // TODO: Implement Card payment logic via backend service
             // This service should handle gateway interaction, 3DS, and logging.
             // const cardResult = await processCardPaymentService(userId, cardToken, amount, cvv, `Bill Pay: ${transactionName}`);
             // paymentSuccess = cardResult.success;
             // paymentResult = cardResult;
             // logData.paymentMethodUsed = 'Card';
             throw new Error("Card payment for bills not fully implemented in backend yet.");
        } else {
             throw new Error('Invalid payment method specified.');
        }

        // --- Step 2: Bill Payment / Donation Execution (if payment was successful) ---
        if (paymentSuccess) {
            console.log("Payment successful, proceeding with bill/donation provider API call...");
            // For donations, we might just confirm payment success. For bills, call provider.
            let executionResult: { status: Transaction['status'], message?: string, operatorMessage?: string, billerReferenceId?: string };
            if (type === 'donation') {
                executionResult = { status: 'Completed', message: 'Donation successful.' };
            } else {
                executionResult = await billProviderService.payBill({
                     billerId, identifier, amount, type, transactionId: paymentResult.transactionId
                });
            }


            if (executionResult.status === 'Completed' || executionResult.status === 'Pending') {
                finalStatus = executionResult.status;
                failureReason = '';
                paymentResult.message = executionResult.message || 'Bill/Donation processed successfully/pending.';
                // Update the *original* transaction log created by the payment method
                 await updateDoc(doc(db, 'transactions', paymentResult.transactionId), {
                     status: finalStatus,
                     description: `${logData.description} - Status: ${finalStatus}${executionResult.operatorMessage ? ` (${executionResult.operatorMessage})` : ''}`,
                     ticketId: executionResult.billerReferenceId || null, // Use ticketId for biller ref
                     updatedAt: serverTimestamp()
                 });
                logData.status = finalStatus; // Reflect final status in logData for potential blockchain log
                logData.ticketId = executionResult.billerReferenceId || null;
                 logData.description = `${logData.description} - Status: ${finalStatus}`; // Update description for blockchain

            } else {
                // Payment succeeded but execution failed -> Requires Refund/Reversal
                finalStatus = 'Failed';
                failureReason = executionResult.message || 'Bill/Donation processing failed after payment deduction.';
                console.error(`CRITICAL: Payment successful (Tx: ${paymentResult.transactionId}) but bill/donation execution failed for user ${userId}. Reason: ${failureReason}. Initiating refund simulation.`);
                 // Update the original transaction log to 'Failed'
                 await updateDoc(doc(db, 'transactions', paymentResult.transactionId), {
                     status: 'Failed',
                     description: `${logData.description} - Execution Failed: ${failureReason}`,
                     updatedAt: serverTimestamp()
                 });
                logData.status = 'Failed';
                logData.description += ` - Execution Failed: ${failureReason}`;
                 // TODO: Trigger refund process back to the original payment source (wallet, UPI, card).
                 // This needs a dedicated refund service.
                 paymentResult.message = failureReason + " Refund initiated.";
            }
        } else {
            // Payment itself failed, error should be thrown by the payment method service
            throw new Error(paymentResult.message || "Payment failed before processing attempt.");
        }

        // --- Step 3: Blockchain Logging (Optional) ---
        // Log the final outcome
        logTransactionToBlockchain(paymentResult.transactionId, logData)
             .catch(err => console.error("Blockchain log failed:", err));

        // Send final status update via WebSocket
         const finalTxDoc = await getDoc(doc(db, 'transactions', paymentResult.transactionId));
         if(finalTxDoc.exists()) {
             const finalTxData = { id: finalTxDoc.id, ...finalTxDoc.data(), date: (finalTxDoc.data().date as Timestamp)?.toDate() ?? new Date() } as Transaction;
            sendToUser(userId, { type: 'transaction_update', payload: finalTxData });
         }

        res.status(200).json({ status: finalStatus, message: paymentResult.message, transactionId: paymentResult.transactionId });

    } catch (error: any) {
        console.error(`${transactionType} processing failed for user ${userId}:`, error.message);
        // The transaction might have already been logged as failed by the payment service.
        // If it failed before logging, attempt to log now.
         if (!paymentResult.transactionId) {
            logData.description = `${transactionType} Failed - ${error.message}`;
            logData.status = 'Failed';
            try {
                const failedTx = await addTransaction(logData);
                paymentResult.transactionId = failedTx.id;
                 sendToUser(userId, { type: 'transaction_update', payload: failedTx }); // Send WS update for failure
            } catch (logError) {
                console.error(`Failed to log failed ${transactionType} transaction:`, logError);
            }
        }
        // Return failure response
        res.status(400).json({ status: 'Failed', message: error.message || failureReason, transactionId: paymentResult.transactionId });
    }
};

// Add functions for getting saved billers, bill reminders etc. later

function capitalize(s: string): string {
  if (typeof s !== 'string' || s.length === 0) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Import Transaction type definition
import type { Transaction } from '../services/types';
import { Timestamp } from 'firebase-admin/firestore';
import { updateDoc, doc, getDoc } from 'firebase/firestore';

