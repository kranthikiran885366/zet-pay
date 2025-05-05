
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger');
// Import necessary payment services (or internal functions)
const { payViaWalletInternal } = require('../services/wallet'); // Direct wallet payment
const { processUpiPaymentInternal } = require('../services/upi'); // Simulated UPI payment
const { processCardPaymentInternal } = require('../services/paymentGatewayService'); // Simulated Card payment
const { scheduleRecovery } = require('../services/recoveryService'); // For fallback recovery
const rechargeProviderService = require('../services/rechargeProviderService');
const { sendToUser } = require('../server'); // For WebSocket updates
const { collection, query, where, orderBy, limit, getDocs, addDoc, updateDoc, doc, Timestamp } = require('firebase/firestore'); // Firestore functions

// Get Billers (cached or fetched from provider)
exports.getBillers = async (req, res, next) => {
    const { type } = req.query; // e.g., Mobile, DTH, Electricity
    if (!type || typeof type !== 'string') {
        return res.status(400).json({ message: 'Biller type is required.' });
    }
    // Fetch from a dedicated service that might cache results
    const billers = await rechargeProviderService.fetchBillers(type);
    res.status(200).json(billers);
};

// Get Recharge Plans (fetched from provider)
exports.getRechargePlans = async (req, res, next) => {
     const { billerId, type, identifier } = req.query; // identifier might be needed for circle-specific plans
     if (!billerId || typeof billerId !== 'string' || !type || typeof type !== 'string') {
         return res.status(400).json({ message: 'Biller ID and type are required.' });
     }
     const plans = await rechargeProviderService.fetchPlans(billerId, type, identifier);
     res.status(200).json(plans);
 };

// Process Recharge
exports.processRecharge = async (req, res, next) => {
    const userId = req.user.uid;
    const { type, identifier, amount, billerId, planId, paymentMethod = 'wallet', sourceAccountUpiId, pin, cardToken, cvv } = req.body; // Extract all potential payment details

    // Basic validation already handled by router
    let paymentSuccess = false;
    let paymentResult: any = {}; // Store result from payment method { success, transactionId?, message?, usedWalletFallback?, ... }
    let rechargeExecutionResult: any = {}; // Store result from recharge provider
    let finalStatus: Transaction['status'] = 'Failed';
    let failureReason = 'Recharge processing failed.';
    const rechargeName = `${capitalize(type)} Recharge: ${billerId || identifier}`;
    let logData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = { // Prepare data for Firestore logging
        userId,
        type: 'Recharge',
        name: rechargeName,
        description: `For ${identifier}${planId ? ` (Plan: ${planId})` : ''}`,
        amount: -amount,
        status: 'Failed',
        billerId: billerId || undefined,
        identifier: identifier, // Store identifier
        planId: planId || undefined,
    };

    try {
        console.log(`[Recharge Ctrl] Processing ${type} recharge for User: ${userId}, ID: ${identifier}, Amt: ${amount}, Method: ${paymentMethod}`);
        // --- Step 1: Payment Processing ---
        if (paymentMethod === 'wallet') {
            // Use internal wallet function which logs its own transaction
            paymentResult = await payViaWalletInternal(userId, `recharge_${type}_${identifier}`, amount, rechargeName);
            if (!paymentResult.success) throw new Error(paymentResult.message || 'Wallet payment failed.');
            paymentSuccess = true;
            logData.paymentMethodUsed = 'Wallet';
        } else if (paymentMethod === 'upi') {
            // This needs the full processUpiPayment logic, including potential fallback
             paymentResult = await processUpiPaymentInternal(userId, billerId || identifier, amount, pin, sourceAccountUpiId, rechargeName);
             if (!paymentResult.success && !paymentResult.usedWalletFallback) throw new Error(paymentResult.message || 'UPI payment failed.');
             paymentSuccess = paymentResult.success || paymentResult.usedWalletFallback;
             logData.paymentMethodUsed = paymentResult.usedWalletFallback ? 'Wallet' : 'UPI';
             logData.description += paymentResult.usedWalletFallback ? ' (Paid via Wallet Fallback)' : ' (Paid via UPI)';
             // Schedule recovery if fallback was used
             if (paymentResult.usedWalletFallback) {
                 await scheduleRecovery(userId, amount, billerId || identifier, sourceAccountUpiId);
             }
        } else if (paymentMethod === 'card') {
            paymentResult = await processCardPaymentInternal(userId, cardToken, amount, cvv, rechargeName);
             if (!paymentResult.success) throw new Error(paymentResult.message || 'Card payment failed.');
             paymentSuccess = true;
             logData.paymentMethodUsed = 'Card';
              logData.description += ' (Paid via Card)';
        } else {
            throw new Error('Invalid payment method specified.');
        }

         // Ensure a transaction ID exists from the payment step before proceeding
         const paymentTransactionId = paymentResult.transactionId || paymentResult.walletTransactionId;
         if (!paymentTransactionId) {
             console.error("[Recharge Ctrl] CRITICAL: Payment reported success but no transactionId returned.", paymentResult);
             throw new Error("Payment processing error: Missing transaction ID.");
         }
         console.log(`[Recharge Ctrl] Payment successful/fallback. Payment Tx ID: ${paymentTransactionId}. Proceeding to recharge provider.`);

        // --- Step 2: Recharge Execution (if payment was successful) ---
        rechargeExecutionResult = await rechargeProviderService.executeRecharge({
             type, identifier, amount, billerId, planId, transactionId: paymentTransactionId
         });

         if (rechargeExecutionResult.status === 'Completed' || rechargeExecutionResult.status === 'Pending' || rechargeExecutionResult.status === 'Processing Activation') {
             finalStatus = rechargeExecutionResult.status;
             failureReason = ''; // Clear failure reason
             paymentResult.message = rechargeExecutionResult.message || 'Recharge successful/pending.'; // Update payment result message

              // Update the original transaction log created by the payment method
             const originalTxRef = doc(db, 'transactions', paymentTransactionId);
             const updatePayload = {
                 status: finalStatus,
                 description: `${(await getDoc(originalTxRef)).data()?.description} - Operator Status: ${finalStatus}${rechargeExecutionResult.operatorMessage ? ` (${rechargeExecutionResult.operatorMessage})` : ''}`,
                 operatorReferenceId: rechargeExecutionResult.operatorReferenceId || null, // Store operator ref if available
                 updatedAt: serverTimestamp()
             };
             await updateDoc(originalTxRef, updatePayload);
             console.log(`[Recharge Ctrl] Updated payment transaction ${paymentTransactionId} status to ${finalStatus}.`);

             logData.status = finalStatus; // Reflect final status in logData for potential blockchain log
             logData.operatorReferenceId = rechargeExecutionResult.operatorReferenceId || undefined;
             logData.description = updatePayload.description; // Use updated description for blockchain log


         } else {
             // Recharge failed after successful payment -> Requires Refund/Reversal
             finalStatus = 'Failed';
             failureReason = rechargeExecutionResult.message || 'Recharge failed after payment deduction.';
             console.error(`[Recharge Ctrl] CRITICAL: Payment successful (Tx: ${paymentTransactionId}) but recharge execution failed for user ${userId}. Reason: ${failureReason}. Initiating refund simulation.`);
             paymentResult.message = failureReason + " Refund initiated."; // Update message

             // Update the original transaction log to 'Failed'
             const originalTxRefFailed = doc(db, 'transactions', paymentTransactionId);
             await updateDoc(originalTxRefFailed, {
                 status: 'Failed',
                 description: `${(await getDoc(originalTxRefFailed)).data()?.description} - Execution Failed: ${failureReason}`,
                 updatedAt: serverTimestamp()
             });

             // TODO: Trigger actual refund process back to the original payment source (wallet, UPI, card).
             // Example for Wallet refund:
             if (logData.paymentMethodUsed === 'Wallet' || paymentResult.usedWalletFallback) {
                  console.log(`[Recharge Ctrl] Attempting wallet refund for failed execution...`);
                  await payViaWalletInternal(userId, `REFUND_${paymentTransactionId}`, -amount, `Refund: Failed ${type} Recharge`);
             }
             // Add similar logic for UPI/Card refund if needed

             throw new Error(failureReason); // Throw error to trigger the catch block response
         }

        // --- Step 3: Blockchain Logging (Optional) ---
         logTransactionToBlockchain(paymentTransactionId, { ...logData, id: paymentTransactionId, date: new Date() } as Transaction) // Use existing transaction ID
              .catch(err => console.error("[Recharge Ctrl] Blockchain log failed:", err));

        // --- Step 4: Send final WebSocket Update ---
         const finalTxDoc = await getDoc(doc(db, 'transactions', paymentTransactionId));
         if (finalTxDoc.exists()) {
            const finalTxData = convertFirestoreDocToTransaction(finalTxDoc);
             sendToUser(userId, { type: 'transaction_update', payload: finalTxData });
         }

        res.status(200).json({ status: finalStatus, message: paymentResult.message, transactionId: paymentTransactionId });

    } catch (error: any) {
        console.error(`[Recharge Ctrl] ${type} processing failed for user ${userId}:`, error.message);
        // Ensure a failed transaction is logged if payment succeeded but execution failed later,
        // or if payment itself failed initially without logging its own failure.
        const paymentTxId = paymentResult.transactionId || paymentResult.walletTransactionId;
        if (!paymentTxId) {
            // Payment failed before creating a transaction log, log failure now.
            logData.status = 'Failed';
            logData.description = `${logData.description} - Payment Failed: ${error.message}`;
            try {
                const failedTx = await addTransaction(logData as any);
                paymentResult.transactionId = failedTx.id; // Store ID for response
                sendToUser(userId, { type: 'transaction_update', payload: failedTx }); // Send WS update for failure
            } catch (logError) {
                console.error("[Recharge Ctrl] Failed to log failed recharge transaction:", logError);
            }
        } else if (finalStatus !== 'Failed') { // Ensure existing log reflects final failure
             try {
                 const existingTxRef = doc(db, 'transactions', paymentTxId);
                 await updateDoc(existingTxRef, { status: 'Failed', description: `${(await getDoc(existingTxRef)).data()?.description} - Error: ${error.message}`, updatedAt: serverTimestamp() });
                 const updatedTxDoc = await getDoc(existingTxRef);
                 if(updatedTxDoc.exists()) {
                    sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(updatedTxDoc) });
                 }
             } catch(updateError) {
                  console.error(`[Recharge Ctrl] Failed to update existing transaction ${paymentTxId} to Failed:`, updateError);
             }
        }

        // Return failure response
        res.status(400).json({ status: 'Failed', message: error.message || failureReason, transactionId: paymentTxId });
    }
};

exports.scheduleRecharge = async (req, res, next) => {
     const userId = req.user.uid;
     const { identifier, amount, frequency, startDate, billerId, planId, type } = req.body;

     // Validation already done by router

     try {
         const startDateTime = new Date(startDate);
         // Ensure start date is not in the past
         if (isNaN(startDateTime.getTime()) || startDateTime < new Date()) {
             return res.status(400).json({ message: 'Invalid start date.' });
         }

         const scheduleData = {
             userId,
             type, // Store the type (mobile, dth etc.)
             identifier,
             amount: Number(amount),
             frequency,
             nextRunDate: Timestamp.fromDate(startDateTime), // Use Firestore Timestamp
             billerId: billerId || null,
             planId: planId || null,
             isActive: true,
             createdAt: serverTimestamp(),
             updatedAt: serverTimestamp(),
         };

         const scheduleColRef = db.collection('scheduledRecharges');
         const docRef = await addDoc(scheduleColRef, scheduleData);
         res.status(201).json({ success: true, scheduleId: docRef.id, message: 'Recharge scheduled successfully.' });
     } catch (error) {
         next(error);
     }
 };

exports.cancelScheduledRecharge = async (req, res, next) => {
     const userId = req.user.uid;
     const { scheduleId } = req.params;

     if (!scheduleId) return res.status(400).json({ message: 'Schedule ID is required.' });

     try {
         const scheduleDocRef = db.collection('scheduledRecharges').doc(scheduleId);
         const scheduleDoc = await scheduleDocRef.get();

         if (!scheduleDoc.exists() || scheduleDoc.data().userId !== userId) {
             return res.status(404).json({ message: 'Schedule not found or permission denied.' });
         }
         if (scheduleDoc.data().isActive === false) {
             return res.status(400).json({ message: 'Schedule is already cancelled.' });
         }

         await scheduleDocRef.update({
             isActive: false,
             updatedAt: serverTimestamp()
         });
         res.status(200).json({ success: true, message: 'Scheduled recharge cancelled.' });
     } catch (error) {
         next(error);
     }
 };

exports.checkActivationStatus = async (req, res, next) => {
    const { transactionId } = req.params;
    // Validation done by router

    try {
        const status = await rechargeProviderService.getActivationStatus(transactionId);
        res.status(200).json({ status });
    } catch (error) {
         // Fallback: Check Firestore transaction status
        try {
            const txDoc = await doc(db, 'transactions', transactionId).get();
            if(txDoc.exists()) {
                res.status(200).json({ status: txDoc.data().status || 'Unknown' });
            } else {
                 res.status(404).json({ message: 'Transaction not found.' });
            }
        } catch (dbError) {
            next(dbError); // Pass DB error if it occurs
        }
    }
};

exports.cancelRecharge = async (req, res, next) => {
    const userId = req.user.uid;
    const { transactionId } = req.params;
    // Validation done by router

    try {
        // Fetch transaction to check ownership and status
        const txDocRef = doc(db, 'transactions', transactionId);
        const txDoc = await txDocRef.get();

        if (!txDoc.exists() || txDoc.data().userId !== userId) {
            return res.status(404).json({ message: 'Transaction not found or permission denied.' });
        }

        const txData = txDoc.data();
        if (txData.type !== 'Recharge') {
             return res.status(400).json({ message: 'Only recharge transactions can be cancelled.' });
        }
        // Add stricter status check if needed (e.g., cannot cancel 'Failed' or 'Cancelled')
        if (['Failed', 'Cancelled'].includes(txData.status)) {
            return res.status(400).json({ message: `Cannot cancel a transaction with status: ${txData.status}.` });
        }

        // Check cancellation window (e.g., 30 mins)
        const transactionDate = (txData.date as Timestamp).toDate(); // Convert Firestore Timestamp
        const now = new Date();
        const minutesPassed = (now.getTime() - transactionDate.getTime()) / 60000;
        const CANCELLATION_WINDOW_MINUTES = 30; // Example window
        if (minutesPassed > CANCELLATION_WINDOW_MINUTES) {
             return res.status(400).json({ message: `Cancellation window (${CANCELLATION_WINDOW_MINUTES} minutes) has passed.` });
        }


        // Call provider service to attempt cancellation
        const result = await rechargeProviderService.cancelRecharge(transactionId);

        if (result.success) {
            // Update Firestore status to 'Cancelled'
            await updateDoc(txDocRef, {
                status: 'Cancelled',
                description: `${txData.description} (Cancelled by User)`,
                updatedAt: serverTimestamp(),
            });
            // Send WebSocket update
            const updatedTxDoc = await getDoc(txDocRef);
             if(updatedTxDoc.exists()) {
                sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(updatedTxDoc) });
             }
            res.status(200).json({ success: true, message: result.message || "Recharge cancelled. Refund will be processed if applicable." });
            // TODO: Trigger refund process if cancellation implies refund
        } else {
            // Return failure message from provider
            res.status(400).json({ success: false, message: result.message || "Cancellation failed at operator level." });
        }
    } catch (error) {
        next(error);
    }
};


function capitalize(s) {
  return typeof s === 'string' && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// Helper function to convert Firestore doc to Transaction type
import type { Transaction } from '../services/types'; // Import shared Transaction type

function convertFirestoreDocToTransaction(docSnap: admin.firestore.DocumentSnapshot): Transaction {
    const data = docSnap.data()!;
    return {
        id: docSnap.id,
        ...data,
        date: (data.date as Timestamp)?.toDate ? (data.date as Timestamp).toDate() : new Date(), // Convert Timestamp
        // Convert other Timestamps if they exist (e.g., createdAt, updatedAt)
        createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
        updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : undefined,
    } as Transaction;
}
