// backend/controllers/billsController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { Timestamp, doc, updateDoc, getDoc, serverTimestamp, collection, query, where, orderBy, limit, getDocs } = require('firebase/firestore'); // Ensure all needed functions are imported
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger'); // Use centralized logger
const billProviderService = require('../services/billProviderService'); // Assume a dedicated service
const { payViaWalletInternal } = require('../services/wallet'); // Use internal wallet service function
const { processUpiPaymentInternal } = require('../services/upi'); // Simulated UPI payment
const { processCardPaymentInternal } = require('../services/paymentGatewayService'); // Simulated Card payment
const { scheduleRecovery } = require('../services/recoveryService'); // For fallback recovery
const { sendToUser } = require('../server'); // Import WebSocket sender
import type { Transaction } from '../services/types'; // Adjust path as needed

// Types of bills this controller handles (can be extended)
const SUPPORTED_BILL_TYPES = ['Electricity', 'Water', 'Insurance', 'Credit Card', 'Loan', 'Gas', 'Broadband', 'Education', 'Mobile Postpaid', 'Cable TV', 'Housing Society', 'Club Fee', 'Donation', 'Property Tax', 'FASTag']; // Added Education

// Fetch Bill Amount (if supported by provider)
exports.fetchBillDetails = async (req, res, next) => {
    const { billerId } = req.query; // Get billerId from query for consistency with GET billers
    const { type, identifier } = req.params; // Get type and identifier from path params

    // Validate type param
    const formattedType = type?.toLowerCase().replace(/\s+/g, '-');
    const validBillTypes = SUPPORTED_BILL_TYPES.map(t => t.toLowerCase().replace(/\s+/g, '-'));
    if (!type || !validBillTypes.includes(formattedType)) {
        return res.status(400).json({ message: 'Invalid bill type specified.' });
    }

    if (!billerId || typeof billerId !== 'string' || !identifier || typeof identifier !== 'string') {
        return res.status(400).json({ message: 'Biller ID and identifier (e.g., consumer number, policy number) are required.' });
    }

    try {
        // Pass the original type string (e.g., "Education") to the service
        const billDetails = await billProviderService.fetchBill(billerId, identifier, capitalize(type.replace(/-/g, ' ')));

        if (!billDetails || billDetails.success === false) {
            // Biller doesn't support fetch or details not found, allow manual entry
            return res.status(200).json({ success: false, message: billDetails?.message || 'Bill details not found. Manual entry required.', amount: null });
        }
        if (billDetails.amount !== undefined && billDetails.amount !== null) {
            // Include success flag and potentially convert dueDate
            const responseData = {
                success: true,
                amount: billDetails.amount,
                dueDate: billDetails.dueDate ? (billDetails.dueDate instanceof Date ? billDetails.dueDate.toISOString() : billDetails.dueDate) : null, // Send as ISO string
                consumerName: billDetails.consumerName,
                status: billDetails.status,
                minAmountDue: billDetails.minAmountDue,
            };
            res.status(200).json(responseData);
        } else {
             // Handle cases where fetch might succeed but return no amount (e.g., bill already paid)
             return res.status(200).json({ success: false, message: billDetails?.message || 'Bill details not available or already paid. Manual entry required.', amount: null });
        }
    } catch (error) {
        next(error);
    }
};

// Process Bill Payment
exports.processBillPayment = async (req, res, next) => {
    const userId = req.user.uid;
    const { type } = req.params; // Get type from path parameter (e.g., electricity, credit-card)
    const { billerId, billerName, identifier, amount, paymentMethod = 'wallet', sourceAccountUpiId, pin, cardToken, cvv } = req.body; // Extract all potential payment details

    // Validate type param
     const formattedType = type?.toLowerCase().replace(/\s+/g, '-');
     const validBillTypes = SUPPORTED_BILL_TYPES.map(t => t.toLowerCase().replace(/\s+/g, '-'));
     if (!type || !validBillTypes.includes(formattedType)) {
         return res.status(400).json({ message: 'Invalid bill type specified.' });
     }

    // Basic Validation handled by router

    let paymentSuccess = false;
    let paymentResult: any = { success: false, transactionId: null, message: 'Payment processing failed initially.', usedWalletFallback: false };
    let finalStatus: Transaction['status'] = 'Failed';
    let failureReason = 'Payment or bill processing failed.';
    const transactionType = type === 'donation' ? 'Donation' : type === 'fastag' ? 'Recharge' : type === 'education' ? 'Education Fee' : 'Bill Payment'; // Specific type
    const transactionName = `${billerName || capitalize(type.replace('-', ' '))}`; // Format name correctly
    let paymentMethodUsed = paymentMethod; // Initial payment method

    // Prepare base log data - this will be updated or replaced by specific payment method logs
    let logData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = {
        userId,
        type: transactionType,
        name: transactionName,
        description: `Payment for ${identifier} via ${paymentMethod}`, // Start description
        amount: -amount, // Payment is debit
        status: 'Failed', // Start as failed
        billerId,
        identifier: identifier, // Store identifier
        paymentMethodUsed: paymentMethod, // Log the intended method first
    };

    try {
        console.log(`[Bill Ctrl] Processing ${transactionType} for User: ${userId}, Biller: ${billerId}, ID: ${identifier}, Amt: ${amount}, Method: ${paymentMethod}`);
        // --- Step 1: Payment Processing ---
        if (paymentMethod === 'wallet') {
            // Use internal wallet function which handles logging and WS updates
            paymentResult = await payViaWalletInternal(userId, `BILL_${billerId}_${identifier}`, amount, `Bill Pay: ${transactionName}`); // Pass positive amount for debit
            if (!paymentResult.success) throw new Error(paymentResult.message || 'Wallet payment failed.');
            paymentSuccess = true;
            logData.paymentMethodUsed = 'Wallet'; // Ensure logData reflects method used
        } else if (paymentMethod === 'upi') {
            if (!sourceAccountUpiId || !pin) throw new Error('Source UPI ID and PIN required for UPI payment.');
             paymentResult = await processUpiPaymentInternal(userId, billerId || identifier, amount, pin, sourceAccountUpiId, `Bill Pay: ${transactionName}`);
             if (!paymentResult.success && !paymentResult.usedWalletFallback) throw new Error(paymentResult.message || 'UPI payment failed.');
             paymentSuccess = paymentResult.success || paymentResult.usedWalletFallback;
             paymentMethodUsed = paymentResult.usedWalletFallback ? 'Wallet' : 'UPI'; // Update actual method used
             logData.paymentMethodUsed = paymentMethodUsed;
             logData.description = `Payment for ${identifier} via ${paymentMethodUsed}`; // Update description if fallback happened
             // Schedule recovery if fallback was used
             if (paymentResult.usedWalletFallback) {
                 await scheduleRecovery(userId, amount, billerId || identifier, sourceAccountUpiId);
             }
        } else if (paymentMethod === 'card') {
             if (!cardToken || !cvv) throw new Error('Card token and CVV required for Card payment.');
              paymentResult = await processCardPaymentInternal(userId, cardToken, amount, cvv, `Bill Pay: ${transactionName}`);
             if (!paymentResult.success) throw new Error(paymentResult.message || 'Card payment failed.');
             paymentSuccess = paymentResult.success;
             logData.paymentMethodUsed = 'Card';
        } else {
             throw new Error('Invalid payment method specified.');
        }

        // Ensure transactionId exists from payment step before proceeding
        const paymentTransactionId = paymentResult.transactionId; // Use the ID from the payment step's log
         if (!paymentTransactionId) {
            console.error("[Bill Ctrl] CRITICAL: Payment reported success but no transactionId returned.", paymentResult);
            throw new Error("Payment processing error: Missing transaction ID.");
         }
         console.log(`[Bill Ctrl] Payment successful/fallback. Payment Tx ID: ${paymentTransactionId}. Proceeding to biller API.`);

        // --- Step 2: Bill Payment / Donation / Recharge Execution with Biller/Provider ---
         // Call the appropriate provider service
         const providerBillType = type === 'donation' ? 'Donation' : type === 'education' ? 'Education' : capitalize(type.replace(/-/g, ' '));
         // Map specific types if needed by provider service
         const finalProviderType = type === 'mobile-postpaid' ? 'Mobile Postpaid' : type === 'fastag' ? 'FASTag' : providerBillType;

         let executionResult;
         if (finalProviderType === 'Donation') {
             // Assume donation to a recognized charity is always 'completed' on payment
             executionResult = { status: 'Completed', message: 'Donation successful.' };
         } else {
             // For other bills/recharges, call the bill provider service
             executionResult = await billProviderService.payBill({
                 billerId, identifier, amount, type: finalProviderType, transactionId: paymentTransactionId // Pass payment transaction ID
             });
         }

         // Check provider execution status
         if (executionResult.status === 'Completed' || executionResult.status === 'Pending' || executionResult.status === 'Processing Activation') {
             finalStatus = executionResult.status;
             failureReason = '';
             paymentResult.message = executionResult.message || `${finalProviderType} processed successfully/pending.`;
             // Update the original transaction log created by the payment method
             const originalTxRef = doc(db, 'transactions', paymentTransactionId);
             const currentTxDataSnap = await getDoc(originalTxRef); // Get current data before updating
             const currentTxData = currentTxDataSnap.data();
             const updatePayload = {
                 status: finalStatus,
                 description: `${currentTxData?.description || logData.description} - Biller Status: ${finalStatus}${executionResult.operatorMessage ? ` (${executionResult.operatorMessage})` : ''}`, // Append status
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
             failureReason = executionResult.message || `${finalProviderType} processing failed after payment deduction.`;
             console.error(`[Bill Ctrl] CRITICAL: Payment successful (Tx: ${paymentTransactionId}) but ${finalProviderType} execution failed for user ${userId}. Reason: ${failureReason}. Initiating refund simulation.`);
             // Update the original transaction log to 'Failed'
              const originalTxRefFailed = doc(db, 'transactions', paymentTransactionId);
              const currentTxDataFailedSnap = await getDoc(originalTxRefFailed);
              const currentTxDataFailed = currentTxDataFailedSnap.data();
             await updateDoc(originalTxRefFailed, {
                 status: 'Failed',
                 description: `${currentTxDataFailed?.description || logData.description} - Execution Failed: ${failureReason}`,
                 updatedAt: serverTimestamp()
             });
             logData.status = 'Failed';
             logData.description = `${currentTxDataFailed?.description || logData.description} - Execution Failed: ${failureReason}`; // Update description for blockchain
             // --- Refund Logic Simulation ---
             if (paymentMethodUsed === 'Wallet') { // Check the actual method used
                 console.log(`[Bill Ctrl] Attempting wallet refund for failed execution...`);
                 // Use negative amount for credit
                  await payViaWalletInternal(userId, `REFUND_${paymentTransactionId}`, -amount, `Refund: Failed ${type} ${transactionType}`);
             } else if (paymentMethodUsed === 'UPI') {
                  console.warn(`[Bill Ctrl] UPI Refund required for Tx ${paymentTransactionId} but not implemented.`);
             } else if (paymentMethodUsed === 'Card') {
                  console.warn(`[Bill Ctrl] Card Refund required for Tx ${paymentTransactionId} but not implemented.`);
             }
             // --- End Refund Logic Simulation ---
             paymentResult.message = failureReason + " Refund initiated.";
             throw new Error(failureReason); // Throw error to trigger the catch block and send failure response
         }
    } catch (error: any) {
        console.error(`[Bill Ctrl] ${transactionType} processing failed for user ${userId}:`, error.message);
        // Log the failure IF the payment step failed and did not create its own log
        // If payment succeeded but execution failed, the original payment log should already be updated to 'Failed'
        const paymentTxId = paymentResult.transactionId;
        if (!paymentTxId) {
            // Log a new failure transaction ONLY if the payment step itself failed before logging.
            logData.description = `${logData.description} - Error: ${error.message}`; // Append error
            logData.status = 'Failed';
            try {
                const failedTx = await addTransaction(logData as any); // Log failure
                paymentResult.transactionId = failedTx.id; // Set ID for response
                 sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(await getDoc(doc(db, 'transactions', failedTx.id))) }); // Send WS update for failure
            } catch (logError) {
                console.error(`[Bill Ctrl] Failed to log failed ${transactionType} transaction:`, logError);
            }
        }

        // Return failure response using the transaction ID (either from failed payment log or original log updated to failed)
        res.status(400).json({ status: 'Failed', message: error.message || failureReason, transactionId: paymentTxId || paymentResult.transactionId });
        return; // Stop further execution in the try block
    }

    // --- If execution reached here, it means payment and execution succeeded (or pending) ---

    // --- Step 3: Blockchain Logging (Optional) ---
    const finalTransactionId = paymentResult.transactionId;
    if (finalTransactionId) { // Ensure transactionId exists
        logTransactionToBlockchain(finalTransactionId, { ...logData, id: finalTransactionId, date: new Date() } as Transaction) // Pass necessary fields
             .catch(err => console.error("[Bill Ctrl] Blockchain log failed:", err));
    }

    // --- Step 4: Send final WebSocket Update ---
     if (finalTransactionId) {
         const finalTxDoc = await getDoc(doc(db, 'transactions', finalTransactionId));
         if (finalTxDoc.exists()) {
             const finalTxData = convertFirestoreDocToTransaction(finalTxDoc);
             sendToUser(userId, { type: 'transaction_update', payload: finalTxData });
         }
     }

    res.status(200).json({ status: finalStatus, message: paymentResult.message, transactionId: finalTransactionId });
};


// --- Utilities ---

function capitalize(s: string): string {
if (typeof s !== 'string' || s.length === 0) return '';
// Handle multi-word types like 'Credit Card' -> 'Credit Card'
return s.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Get Billers (consider caching this)
exports.getBillers = async (req, res, next) => {
    const { type } = req.query;
    if (!type || typeof type !== 'string') {
        return res.status(400).json({ message: 'Biller type query parameter is required.' });
    }
    // Use the exact type string for fetching billers (e.g., 'Electricity', 'Credit Card', 'Education')
    const billers = await billProviderService.fetchBillers(type);
    res.status(200).json(billers);
};


// Helper function to convert Firestore doc to Transaction type
function convertFirestoreDocToTransaction(docSnap: admin.firestore.DocumentSnapshot): Transaction | null { // Added null return possibility
    if (!docSnap.exists) return null; // Handle case where doc might not exist
    const data = docSnap.data()!;
    return {
        id: docSnap.id,
        ...data,
        date: (data.date as Timestamp)?.toDate ? (data.date as Timestamp).toDate() : new Date(), // Convert Timestamp, handle potential existing Date object if already converted
        // Convert other Timestamps if they exist (e.g., createdAt, updatedAt)
        createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
        updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : undefined,
         // Ensure avatarSeed exists, generate if needed
        avatarSeed: data.avatarSeed || data.name?.toLowerCase().replace(/\s+/g, '') || docSnap.id,
    } as Transaction;
}
