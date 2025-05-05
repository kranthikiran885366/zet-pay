// backend/controllers/billsController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { Timestamp, doc, updateDoc, getDoc, serverTimestamp, collection, query, where, orderBy, limit, getDocs } = require('firebase/firestore'); // Ensure all needed functions are imported
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger'); // Use centralized logger
const billProviderService = require('../services/billProviderService'); // Assume a dedicated service
const { payViaWalletInternal } = require('../services/wallet'); // Use internal wallet service function
// Placeholder import for UPI/Card payment services (assuming they exist)
// const { processUpiPaymentInternal } = require('../services/upiProviderService');
// const { processCardPaymentInternal } = require('../services/paymentGatewayService');
const { sendToUser } = require('../server'); // Import WebSocket sender

// Types of bills this controller handles (can be extended)
const SUPPORTED_BILL_TYPES = ['Electricity', 'Water', 'Insurance', 'Credit Card', 'Loan', 'Gas', 'Broadband', 'Education', 'Mobile Postpaid', 'Cable TV', 'Housing Society', 'Club Fee', 'Donation'];

// Fetch Bill Amount (if supported by provider)
exports.fetchBillDetails = async (req, res, next) => {
    const { billerId } = req.query; // Get billerId from query for consistency with GET billers
    const { type, identifier } = req.params; // Get type and identifier from path params

    // Validate type param
    const formattedType = type?.toLowerCase().replace(/\s+/g, '-');
    if (!type || !SUPPORTED_BILL_TYPES.map(t => t.toLowerCase().replace(/\s+/g, '-')).includes(formattedType)) {
        return res.status(400).json({ message: 'Invalid bill type specified.' });
    }

    if (!billerId || typeof billerId !== 'string' || !identifier || typeof identifier !== 'string') {
        return res.status(400).json({ message: 'Biller ID and identifier (e.g., consumer number, policy number) are required.' });
    }

    try {
        const billDetails = await billProviderService.fetchBill(billerId, identifier, type);

        if (billDetails && billDetails.success === false) {
            // Biller doesn't support fetch or details not found, allow manual entry
             return res.status(200).json({ success: false, message: billDetails.message || 'Bill details not found. Manual entry required.', amount: null });
        }
        if (billDetails) {
            // Include success flag and potentially convert dueDate
            const responseData = {
                success: true,
                amount: billDetails.amount,
                dueDate: billDetails.dueDate ? billDetails.dueDate.toISOString() : null, // Send as ISO string
                consumerName: billDetails.consumerName,
                status: billDetails.status,
                minAmountDue: billDetails.minAmountDue,
            };
            res.status(200).json(responseData);
        } else {
             // Should be covered by billDetails.success === false, but handle null case too
             return res.status(200).json({ success: false, message: 'Bill details not available. Manual entry required.', amount: null });
        }
    } catch (error) {
        next(error);
    }
};

// Process Bill Payment
exports.processBillPayment = async (req, res, next) => {
    const userId = req.user.uid;
    const { type } = req.params; // Get type from path parameter
    const { billerId, billerName, identifier, amount, paymentMethod = 'wallet' } = req.body;

    // Validate type param
     const formattedType = type?.toLowerCase().replace(/\s+/g, '-');
     if (!type || !SUPPORTED_BILL_TYPES.map(t => t.toLowerCase().replace(/\s+/g, '-')).includes(formattedType)) {
         return res.status(400).json({ message: 'Invalid bill type specified.' });
     }

    // Basic Validation
     if (!billerId || !identifier || !amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: 'Biller ID, identifier, and valid amount are required.' });
    }

    let paymentSuccess = false;
    let paymentResult = { // Initialize with default failure structure
         success: false,
         transactionId: null,
         message: 'Payment processing failed initially.',
         usedWalletFallback: false, // Add fallback flag
    };
    let finalStatus = 'Failed';
    let failureReason = 'Payment or bill processing failed.';
    const transactionType = type === 'donation' ? 'Donation' : 'Bill Payment'; // Specific type for Donations
    const transactionName = `${billerName || capitalize(type)}`;

    // Prepare base log data - this will be used only if the payment step fails before creating its own log
    let logData = {
        userId,
        type: transactionType,
        name: transactionName,
        description: `Payment for ${identifier}`,
        amount: -amount, // Payment is debit
        status: 'Failed', // Start as failed
        billerId,
        identifier: identifier, // Store identifier
        paymentMethodUsed: paymentMethod,
    };

    try {
        console.log(`[Bill Ctrl] Processing ${transactionType} for User: ${userId}, Biller: ${billerId}, ID: ${identifier}, Amt: ${amount}, Method: ${paymentMethod}`);
        // --- Step 1: Payment Processing ---
        if (paymentMethod === 'wallet') {
            // Use internal service function which handles logging and WS updates
            paymentResult = await payViaWalletInternal(userId, `BILL_${billerId}_${identifier}`, amount, `Bill Pay: ${transactionName}`); // Pass positive amount for debit
            if (!paymentResult.success) throw new Error(paymentResult.message || 'Wallet payment failed.');
            paymentSuccess = true;
            logData.paymentMethodUsed = 'Wallet'; // Ensure logData reflects method used
        } else if (paymentMethod === 'upi') {
            const { sourceAccountUpiId, pin } = req.body;
            if (!sourceAccountUpiId || !pin) throw new Error('Source UPI ID and PIN required for UPI payment.');
            // Assume processUpiPaymentInternal exists and handles its own logging + fallback
            // paymentResult = await processUpiPaymentInternal(userId, billerId, amount, pin, sourceAccountUpiId, `Bill Pay: ${transactionName}`);
            // paymentSuccess = paymentResult.success || paymentResult.usedWalletFallback;
            // if (!paymentSuccess) throw new Error(paymentResult.message || 'UPI payment failed.');
            // logData.paymentMethodUsed = paymentResult.usedWalletFallback ? 'Wallet' : 'UPI';
            console.warn("UPI payment for bills not fully implemented backend-side.");
            throw new Error("UPI payment for bills not implemented yet."); // Placeholder
        } else if (paymentMethod === 'card') {
             const { cardToken, cvv } = req.body; // Assume cardToken is passed
             if (!cardToken || !cvv) throw new Error('Card token and CVV required for Card payment.');
             // Assume processCardPaymentInternal exists and handles its own logging
             // paymentResult = await processCardPaymentInternal(userId, cardToken, amount, cvv, `Bill Pay: ${transactionName}`);
             // paymentSuccess = paymentResult.success;
             // if (!paymentSuccess) throw new Error(paymentResult.message || 'Card payment failed.');
             // logData.paymentMethodUsed = 'Card';
              console.warn("Card payment for bills not fully implemented backend-side.");
             throw new Error("Card payment for bills not implemented yet."); // Placeholder
        } else {
             throw new Error('Invalid payment method specified.');
        }

        // Ensure transactionId exists from payment step before proceeding
         if (!paymentResult.transactionId) {
            console.error("CRITICAL: Payment reported success but no transactionId returned.", paymentResult);
            throw new Error("Payment processing error: Missing transaction ID.");
         }
         console.log(`[Bill Ctrl] Payment successful/fallback. Payment Tx ID: ${paymentResult.transactionId}. Proceeding to biller API.`);

        // --- Step 2: Bill Payment / Donation Execution with Biller/Provider ---
         // Call the appropriate provider service
         // Use 'Donation' type if applicable, otherwise map formattedType back to a usable type string for the provider if necessary
         const providerBillType = type === 'donation' ? 'Donation' : capitalize(type.replace(/-/g, ' ')); // Example mapping: 'credit-card' -> 'Credit Card'
         // Exception: Backend might expect 'Mobile Postpaid' specifically (adjust if needed)
         const finalProviderType = type === 'mobile-postpaid' ? 'Mobile Postpaid' : providerBillType;

         let executionResult;
         if (finalProviderType === 'Donation') {
             // Assume donation to a recognized charity is always 'completed' on payment
             executionResult = { status: 'Completed', message: 'Donation successful.' };
         } else {
             // For other bills, call the bill provider service
             executionResult = await billProviderService.payBill({
                 billerId, identifier, amount, type: finalProviderType, transactionId: paymentResult.transactionId
             });
         }

         // Check provider execution status
         if (executionResult.status === 'Completed' || executionResult.status === 'Pending') {
             finalStatus = executionResult.status;
             failureReason = '';
             paymentResult.message = executionResult.message || 'Bill/Donation processed successfully/pending.';
             // Update the original transaction log created by the payment method
             const originalTxRef = doc(db, 'transactions', paymentResult.transactionId);
             const updatePayload = { // Use specific update type
                 status: finalStatus,
                 // Append execution status to description for clarity
                 description: `${(await getDoc(originalTxRef)).data()?.description} - Biller Status: ${finalStatus}${executionResult.operatorMessage ? ` (${executionResult.operatorMessage})` : ''}`,
                 billerReferenceId: executionResult.billerReferenceId || null, // Store biller ref
                 updatedAt: serverTimestamp()
             };
             await updateDoc(originalTxRef, updatePayload);

             logData.status = finalStatus; // Reflect final status in logData for potential blockchain log
             logData.billerReferenceId = executionResult.billerReferenceId || undefined; // Use correct property name
             logData.description = updatePayload.description; // Use updated description for blockchain

         } else {
             // Payment succeeded but execution failed -> Requires Refund/Reversal
             finalStatus = 'Failed';
             failureReason = executionResult.message || 'Bill/Donation processing failed after payment deduction.';
             console.error(`CRITICAL: Payment successful (Tx: ${paymentResult.transactionId}) but bill/donation execution failed for user ${userId}. Reason: ${failureReason}. Initiating refund simulation.`);
             // Update the original transaction log to 'Failed'
              const originalTxRefFailed = doc(db, 'transactions', paymentResult.transactionId);
              const originalDesc = (await getDoc(originalTxRefFailed)).data()?.description;
             await updateDoc(originalTxRefFailed, {
                 status: 'Failed',
                 description: `${originalDesc} - Execution Failed: ${failureReason}`,
                 updatedAt: serverTimestamp()
             });
             logData.status = 'Failed';
             logData.description = `${originalDesc} - Execution Failed: ${failureReason}`; // Update description for blockchain
             // TODO: Trigger actual refund process back to the original payment source (wallet, UPI, card).
             paymentResult.message = failureReason + " Refund initiated.";
             throw new Error(failureReason); // Throw error to trigger the catch block and send failure response
         }
    } catch (error: any) {
        console.error(`[Bill Ctrl] ${transactionType} processing failed for user ${userId}:`, error.message);
        // Log the failure if it wasn't already logged by a sub-process (e.g., wallet payment failure)
        // Check if paymentResult.transactionId is already set, meaning the payment step logged something
         if (!paymentResult.transactionId) {
             // Log a new failure transaction ONLY if the payment step itself failed before logging.
            logData.description = `${transactionType} Failed - ${error.message}`;
            logData.status = 'Failed';
            try {
                const failedTx = await addTransaction(logData as any); // Log failure
                paymentResult.transactionId = failedTx.id;
                 sendToUser(userId, { type: 'transaction_update', payload: failedTx }); // Send WS update for failure
            } catch (logError) {
                console.error(`[Bill Ctrl] Failed to log failed ${transactionType} transaction:`, logError);
            }
        } else if (finalStatus !== 'Failed') { // If payment was logged but execution failed later
             // Ensure the existing log reflects the final 'Failed' status
             try {
                 const existingTxRef = doc(db, 'transactions', paymentResult.transactionId);
                 const currentData = (await getDoc(existingTxRef)).data();
                 await updateDoc(existingTxRef, {
                     status: 'Failed',
                     description: `${currentData?.description || logData.description} - Processing Failed: ${error.message}`, // Append failure reason
                     updatedAt: serverTimestamp()
                 });
                 const updatedTxDoc = await getDoc(existingTxRef);
                 if(updatedTxDoc.exists()) {
                    sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(updatedTxDoc) });
                 }
             } catch(updateError) {
                  console.error(`[Bill Ctrl] Failed to update existing transaction ${paymentResult.transactionId} to Failed:`, updateError);
             }
        }
        // Return failure response
        res.status(400).json({ status: 'Failed', message: error.message || failureReason, transactionId: paymentResult.transactionId });
        return; // Stop further execution in the try block
    }

    // --- If execution reached here, it means payment and execution succeeded (or pending) ---

    // --- Step 3: Blockchain Logging (Optional) ---
    // Log the final outcome
    if (paymentResult.transactionId) { // Ensure transactionId exists
        logTransactionToBlockchain(paymentResult.transactionId, { ...logData, id: paymentResult.transactionId, date: new Date() } as Transaction) // Pass necessary fields
             .catch(err => console.error("[Bill Ctrl] Blockchain log failed:", err));
    }


    // Send final status update via WebSocket
     if (paymentResult.transactionId) {
         const finalTxDoc = await getDoc(doc(db, 'transactions', paymentResult.transactionId));
         if (finalTxDoc.exists()) {
             const finalTxData = convertFirestoreDocToTransaction(finalTxDoc);
             sendToUser(userId, { type: 'transaction_update', payload: finalTxData });
         }
     }

    res.status(200).json({ status: finalStatus, message: paymentResult.message, transactionId: paymentResult.transactionId });
};


// --- Utilities ---

function capitalize(s: string): string {
if (typeof s !== 'string' || s.length === 0) return '';
// Handle multi-word types like 'Credit Card' -> 'Credit Card'
return s.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Add other functions for getting saved billers, bill reminders etc. later
// Example: Get Billers (consider caching this)
exports.getBillers = async (req, res, next) => {
    const { type } = req.query;
    if (!type || typeof type !== 'string') {
        return res.status(400).json({ message: 'Biller type query parameter is required.' });
    }
    try {
        // Use the exact type string for fetching billers (e.g., 'Electricity', 'Credit Card')
        const billers = await billProviderService.fetchBillers(type);
        res.status(200).json(billers);
    } catch (error) {
        next(error);
    }
};


// --- Type Imports ---
// Make sure these align with your actual type definitions
import type { Transaction } from '../services/types'; // Adjust path as needed
// Helper function to convert Firestore doc to Transaction type
function convertFirestoreDocToTransaction(docSnap: admin.firestore.DocumentSnapshot): Transaction {
    const data = docSnap.data()!;
    return {
        id: docSnap.id,
        ...data,
        date: (data.date as Timestamp)?.toDate ? (data.date as Timestamp).toDate() : new Date(), // Convert Timestamp, handle potential existing Date object if already converted
        // Convert other Timestamps if they exist (e.g., createdAt, updatedAt)
        createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
        updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : undefined,
    } as Transaction;
}


    