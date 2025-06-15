
// backend/controllers/billsController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { Timestamp, doc, updateDoc, getDoc, serverTimestamp, collection, query, where, orderBy, limit, getDocs } = require('firebase/firestore');
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger'); 
const billProviderService = require('../services/billProviderService'); 
const { payViaWalletInternal } = require('../services/wallet'); 
const { processUpiPaymentInternal } = require('../services/upi'); // Using the internal UPI payment from upi.js
const { processCardPaymentInternal } = require('../services/paymentGatewayService'); 
const { scheduleRecovery } = require('../services/recoveryService'); 
const { sendToUser } = require('../server'); 
import type { Transaction } from '../services/types'; 

const SUPPORTED_BILL_TYPES = ['Electricity', 'Water', 'Insurance', 'Credit Card', 'Loan', 'Gas', 'Broadband', 'Education', 'Mobile Postpaid', 'Cable TV', 'Housing Society', 'Club Fee', 'Donation', 'Property Tax', 'FASTag', 'LPG'];

exports.fetchBillDetails = async (req, res, next) => {
    const { billerId } = req.query; 
    let { type, identifier } = req.params; 
    
    if (!type || !identifier) {
        res.status(400);
        return next(new Error('Bill type and identifier parameters are required.'));
    }
    type = type.toLowerCase().replace(/\s+/g, '-'); // Normalize type from path param

    const validBillTypes = SUPPORTED_BILL_TYPES.map(t => t.toLowerCase().replace(/\s+/g, '-'));
    if (!validBillTypes.includes(type)) {
        res.status(400);
        return next(new Error('Invalid bill type specified.'));
    }

    if (!billerId || typeof billerId !== 'string') {
        res.status(400);
        return next(new Error('Biller ID query parameter is required.'));
    }

    try {
        console.log(`[Bill Ctrl] Fetching details for type: ${type}, billerId: ${billerId}, identifier: ${identifier}`);
        const billDetails = await billProviderService.fetchBill(billerId, identifier, capitalize(type.replace(/-/g, ' ')));

        if (billDetails && billDetails.success === false && billDetails.message?.toLowerCase().includes("manual entry")) {
            return res.status(200).json({ success: false, message: billDetails.message, amount: null });
        }
        if (!billDetails || billDetails.success === false) {
            // If provider explicitly states not found or error, reflect that.
            res.status(404); 
            return next(new Error(billDetails?.message || 'Bill details not found or error fetching details from provider.'));
        }
        
        const responseData = {
            success: true,
            amount: billDetails.amount === undefined || billDetails.amount === null ? null : billDetails.amount,
            dueDate: billDetails.dueDate ? (billDetails.dueDate instanceof Date ? billDetails.dueDate.toISOString().split('T')[0] : billDetails.dueDate) : null,
            consumerName: billDetails.consumerName,
            status: billDetails.status,
            minAmountDue: billDetails.minAmountDue,
        };
        res.status(200).json(responseData);
        
    } catch (error) {
        console.error(`[Bill Ctrl] Error in fetchBillDetails for type ${type}:`, error);
        next(error);
    }
};

exports.processBillPayment = async (req, res, next) => {
    const userId = req.user.uid;
    const { type } = req.params; 
    const { billerId, billerName, identifier, amount, paymentMethod = 'wallet', sourceAccountUpiId, pin, cardToken, cvv } = req.body; 

    const formattedType = type?.toLowerCase().replace(/\s+/g, '-');
    const validBillTypes = SUPPORTED_BILL_TYPES.map(t => t.toLowerCase().replace(/\s+/g, '-'));
     if (!type || !validBillTypes.includes(formattedType)) {
         res.status(400);
         return next(new Error('Invalid bill type specified.'));
     }

    let paymentSuccess = false;
    let paymentResult = { success: false, transactionId: null, message: 'Payment processing failed initially.', usedWalletFallback: false, pspTransactionId: null, errorCode: null, mightBeDebited: false };
    let finalStatus = 'Failed';
    let failureReason = 'Payment or bill processing failed.';
    const transactionType = capitalize(type.replace(/-/g, ' ')); 
    const transactionName = `${billerName || transactionType} Bill`; // More specific name
    let paymentMethodUsed = paymentMethod; 

    let logData = {
        userId,
        type: transactionType,
        name: transactionName,
        description: `Payment for ${identifier} (${billerName || 'Biller'}) via ${paymentMethod}`,
        amount: -amount, 
        status: 'Failed', 
        billerId,
        identifier: identifier, 
        paymentMethodUsed: paymentMethod,
    };

    try {
        console.log(`[Bill Ctrl] Processing ${transactionType} for User: ${userId}, Biller: ${billerId}, ID: ${identifier}, Amt: ${amount}, Method: ${paymentMethod}`);
        
        if (paymentMethod === 'wallet') {
            paymentResult = await payViaWalletInternal(userId, `BILL_${billerId}_${identifier}`, amount, `Bill Pay: ${transactionName}`, transactionType);
            if (!paymentResult.success) throw new Error(paymentResult.message || 'Wallet payment failed.');
            paymentSuccess = true;
            logData.paymentMethodUsed = 'Wallet';
        } else if (paymentMethod === 'upi') {
            if (!sourceAccountUpiId || !pin) throw new Error('Source UPI ID and PIN required for UPI payment.');
             paymentResult = await processUpiPaymentInternal(userId, billerId || identifier, amount, pin, sourceAccountUpiId, `Bill Pay: ${transactionName}`, transactionType);
             if (!paymentResult.success && !paymentResult.usedWalletFallback) throw new Error(paymentResult.message || 'UPI payment failed.');
             paymentSuccess = paymentResult.success || paymentResult.usedWalletFallback;
             paymentMethodUsed = paymentResult.usedWalletFallback ? 'Wallet' : 'UPI';
             logData.paymentMethodUsed = paymentMethodUsed;
             logData.description = `Payment for ${identifier} (${billerName || 'Biller'}) via ${paymentMethodUsed}${paymentResult.usedWalletFallback ? ' (Fallback)' : ''}`; 
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

        const paymentTransactionId = paymentResult.transactionId; 
         if (!paymentTransactionId) {
            console.error("[Bill Ctrl] CRITICAL: Payment reported success but no transactionId returned.", paymentResult);
            throw new Error("Payment processing error: Missing transaction ID.");
         }
         console.log(`[Bill Ctrl] Payment successful/fallback. Payment Tx ID: ${paymentTransactionId}. Proceeding to biller API.`);

        const providerBillType = capitalize(type.replace(/-/g, ' '));
        // Ensure finalProviderType aligns with what billProviderService expects
        const finalProviderType = type === 'mobile-postpaid' ? 'Mobile Postpaid' : 
                                  type === 'fastag' ? 'FASTag' : 
                                  type === 'electricity' && billerId?.toLowerCase().includes('prepaid') ? 'Electricity Prepaid' : // Example for prepaid
                                  providerBillType;


         let executionResult;
         if (finalProviderType === 'Donation') { // Donations don't call payBill
             executionResult = { status: 'Completed', message: 'Donation successful.' };
         } else {
             executionResult = await billProviderService.payBill({
                 billerId, identifier, amount, type: finalProviderType, transactionId: paymentTransactionId 
             });
         }

         if (executionResult.status === 'Completed' || executionResult.status === 'Pending' || executionResult.status === 'Processing Activation') {
             finalStatus = executionResult.status;
             failureReason = '';
             paymentResult.message = executionResult.message || `${finalProviderType} processed successfully/pending.`;
             const originalTxRef = doc(db, 'transactions', paymentTransactionId);
             const currentTxDataSnap = await getDoc(originalTxRef);
             const currentTxData = currentTxDataSnap.data();
             const updatePayload = {
                 status: finalStatus,
                 description: `${currentTxData?.description || logData.description} - Biller Status: ${finalStatus}${executionResult.operatorMessage ? ` (${executionResult.operatorMessage})` : ''}`,
                 billerReferenceId: executionResult.billerReferenceId || null,
                 updatedAt: serverTimestamp()
             };
             await updateDoc(originalTxRef, updatePayload);

             logData.status = finalStatus;
             logData.billerReferenceId = executionResult.billerReferenceId || undefined;
             logData.description = updatePayload.description; 

         } else { // Bill execution failed after payment
             finalStatus = 'Failed';
             failureReason = executionResult.message || `${finalProviderType} processing failed after payment deduction.`;
             console.error(`[Bill Ctrl] CRITICAL: Payment successful (Tx: ${paymentTransactionId}) but ${finalProviderType} execution failed for user ${userId}. Reason: ${failureReason}. Initiating refund simulation.`);
              const originalTxRefFailed = doc(db, 'transactions', paymentTransactionId);
              const currentTxDataFailedSnap = await getDoc(originalTxRefFailed);
              const currentTxDataFailed = currentTxDataFailedSnap.data();
             await updateDoc(originalTxRefFailed, {
                 status: 'Failed',
                 description: `${currentTxDataFailed?.description || logData.description} - Execution Failed: ${failureReason}`,
                 failureReason: failureReason,
                 updatedAt: serverTimestamp()
             });
             logData.status = 'Failed';
             logData.description = `${currentTxDataFailed?.description || logData.description} - Execution Failed: ${failureReason}`; 
             
             if (paymentMethodUsed === 'Wallet' || paymentResult.usedWalletFallback) { 
                 console.log(`[Bill Ctrl] Attempting wallet refund for failed execution of ${transactionType}...`);
                  await payViaWalletInternal(userId, `REFUND_${paymentTransactionId}`, -amount, `Refund: Failed ${transactionType} for ${transactionName}`, 'Refund');
             } else if (paymentMethodUsed === 'UPI') {
                  // TODO: Handle actual UPI refund initiation with PSP if payment was by UPI and not wallet fallback
                  console.warn(`[Bill Ctrl] UPI Refund required for Tx ${paymentTransactionId} but not implemented directly. Refund simulation with wallet may be needed for testing.`);
             } else if (paymentMethodUsed === 'Card') {
                  // TODO: Handle actual Card refund initiation with PG
                  console.warn(`[Bill Ctrl] Card Refund required for Tx ${paymentTransactionId} but not implemented directly.`);
             }
             paymentResult.message = failureReason + " Refund initiated.";
             throw new Error(failureReason); // This error will be caught and sent to client
         }
    } catch (error) {
        console.error(`[Bill Ctrl] ${transactionType} processing error for user ${userId}:`, error.message);
        const paymentTxId = paymentResult.transactionId; // ID of the payment transaction attempt
        if (!paymentTxId) { // If payment itself failed before any transaction was logged
            logData.status = 'Failed';
            logData.failureReason = error.message;
            logData.description = `${logData.description} - Error: ${error.message}`;
            try {
                const failedTx = await addTransaction(logData); 
                paymentResult.transactionId = failedTx.id; 
                // Send this new failed transaction to client
                sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(await getDoc(doc(db, 'transactions', failedTx.id))) });
            } catch (logError) {
                console.error(`[Bill Ctrl] Failed to log initial failed ${transactionType} transaction:`, logError);
            }
        } else { // Payment was logged (at least as pending/failed), but a subsequent step failed
             try {
                const txRef = doc(db, 'transactions', paymentTxId);
                const txSnap = await getDoc(txRef);
                if(txSnap.exists() && txSnap.data().status !== 'Failed') { // Only update if not already marked failed
                    await updateDoc(txRef, { status: 'Failed', failureReason: error.message, updatedAt: serverTimestamp() });
                    // Send updated failed transaction to client
                    sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(await getDoc(txRef)) });
                }
             } catch(updateError) {
                  console.error(`[Bill Ctrl] Error updating transaction ${paymentTxId} to 'Failed' status after error:`, updateError);
             }
        }
        // Ensure response has a transactionId if one was created/updated
        res.status(400).json({ status: 'Failed', message: error.message || failureReason, transactionId: paymentResult.transactionId });
        return; 
    }

    // If execution reaches here, it means success (or pending which is a form of success for provider)
    const finalTransactionId = paymentResult.transactionId;
    if (finalTransactionId) {
        logTransactionToBlockchain(finalTransactionId, { ...logData, id: finalTransactionId, date: new Date() } ) 
             .catch(err => console.error("[Bill Ctrl] Blockchain log failed:", err));
    }

     if (finalTransactionId) {
         const finalTxDoc = await getDoc(doc(db, 'transactions', finalTransactionId));
         if (finalTxDoc.exists()) {
             const finalTxData = convertFirestoreDocToTransaction(finalTxDoc);
             sendToUser(userId, { type: 'transaction_update', payload: finalTxData });
             res.status(200).json({ ...finalTxData, message: paymentResult.message });
             return;
         }
     }
    // Fallback if finalTxDoc somehow doesn't exist, though should not happen
    res.status(200).json({ status: finalStatus, message: paymentResult.message, transactionId: finalTransactionId });
};


function capitalize(s) {
if (typeof s !== 'string' || s.length === 0) return '';
return s.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

exports.getBillers = async (req, res, next) => {
    const { type } = req.query;
    if (!type || typeof type !== 'string') {
        res.status(400);
        return next(new Error('Biller type query parameter is required.'));
    }
    try {
        const billers = await billProviderService.fetchBillers(type);
        res.status(200).json(billers);
    } catch (error) {
        next(error);
    }
};


function convertFirestoreDocToTransaction(docSnap) { 
    if (!docSnap.exists()) return null; 
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        date: (data.date)?.toDate ? (data.date).toDate().toISOString() : new Date().toISOString(), 
        createdAt: data.createdAt?.toDate ? (data.createdAt).toDate().toISOString() : undefined,
        updatedAt: data.updatedAt?.toDate ? (data.updatedAt).toDate().toISOString() : undefined,
        avatarSeed: data.avatarSeed || data.name?.toLowerCase().replace(/\s+/g, '') || docSnap.id,
    };
}

