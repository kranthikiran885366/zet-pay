// backend/controllers/rechargeController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger');
const { payViaWalletInternal } = require('../services/wallet');
const { processUpiPaymentInternal } = require('../services/upi'); 
const { processCardPaymentInternal } = require('../services/paymentGatewayService'); 
const { scheduleRecovery } = require('../services/recoveryService'); 
const rechargeProviderService = require('../services/rechargeProviderService');
const { sendToUser } = require('../server'); 
const { collection, query, where, orderBy, limit, getDocs, addDoc, updateDoc, doc, Timestamp, serverTimestamp, getDoc } = require('firebase/firestore');
import type { Transaction } from '../services/types'; 

const SUPPORTED_RECHARGE_TYPES = ['mobile', 'dth', 'fastag', 'datacard', 'metro', 'isd', 'buspass', 'subscription', 'google-play', 'electricity'];

exports.getBillers = async (req, res, next) => {
    const { type } = req.query;
    if (!type || typeof type !== 'string') {
        return res.status(400).json({ message: 'Biller type is required.' });
    }
    try {
        const billers = await rechargeProviderService.fetchBillers(type);
        res.status(200).json(billers);
    } catch (error) {
        next(error);
    }
};

exports.getRechargePlans = async (req, res, next) => {
     const { billerId, type, identifier } = req.query; 
     if (!billerId || typeof billerId !== 'string' || !type || typeof type !== 'string') {
         return res.status(400).json({ message: 'Biller ID and type are required.' });
     }
     try {
         const plans = await rechargeProviderService.fetchPlans(billerId, type, identifier);
         res.status(200).json(plans);
     } catch(error) {
         next(error);
     }
 };

exports.processRecharge = async (req, res, next) => {
    const userId = req.user.uid;
    const { type, identifier, amount, billerId, planId, paymentMethod = 'wallet', sourceAccountUpiId, pin, cardToken, cvv, couponCode } = req.body;

    const formattedType = type?.toLowerCase().replace(/\s+/g, '-');
     if (!type || !SUPPORTED_RECHARGE_TYPES.includes(formattedType)) {
         return res.status(400).json({ message: 'Invalid recharge type specified.' });
     }

    let paymentSuccess = false;
    let paymentResult = {}; 
    let rechargeExecutionResult = {}; 
    let finalStatus = 'Failed';
    let failureReason = 'Recharge processing failed.';
    const rechargeName = `${capitalize(type)} Recharge: ${billerId || identifier}`;
    let logData = { 
        userId,
        type: 'Recharge',
        name: rechargeName,
        description: `For ${identifier}${planId ? ` (Plan: ${planId})` : ''}${couponCode ? ` (Coupon: ${couponCode})`: ''}`,
        amount: -amount,
        status: 'Failed',
        billerId: billerId || undefined,
        identifier: identifier, 
        planId: planId || undefined,
    };

    try {
        console.log(`[Recharge Ctrl] Processing ${type} recharge for User: ${userId}, ID: ${identifier}, Amt: ${amount}, Method: ${paymentMethod}`);
        
        if (paymentMethod === 'wallet') {
            paymentResult = await payViaWalletInternal(userId, `recharge_${type}_${identifier}`, amount, rechargeName, 'Recharge');
            if (!paymentResult.success) throw new Error(paymentResult.message || 'Wallet payment failed.');
            paymentSuccess = true;
            logData.paymentMethodUsed = 'Wallet';
        } else if (paymentMethod === 'upi') {
             if (!sourceAccountUpiId || !pin) throw new Error('Source UPI ID and PIN required for UPI payment.');
             paymentResult = await processUpiPaymentInternal(userId, billerId || identifier, amount, pin, sourceAccountUpiId, rechargeName, 'Recharge');
             if (!paymentResult.success && !paymentResult.usedWalletFallback) throw new Error(paymentResult.message || 'UPI payment failed.');
             paymentSuccess = paymentResult.success || paymentResult.usedWalletFallback;
             logData.paymentMethodUsed = paymentResult.usedWalletFallback ? 'Wallet' : 'UPI';
             logData.description += paymentResult.usedWalletFallback ? ' (Paid via Wallet Fallback)' : ' (Paid via UPI)';
             if (paymentResult.usedWalletFallback) {
                 await scheduleRecovery(userId, amount, billerId || identifier, sourceAccountUpiId);
             }
        } else if (paymentMethod === 'card') {
             if (!cardToken || !cvv) throw new Error('Card token and CVV required for Card payment.');
             paymentResult = await processCardPaymentInternal(userId, cardToken, amount, cvv, rechargeName);
             if (!paymentResult.success) throw new Error(paymentResult.message || 'Card payment failed.');
             paymentSuccess = true;
             logData.paymentMethodUsed = 'Card';
             logData.description += ' (Paid via Card)';
        } else {
            throw new Error('Invalid payment method specified.');
        }

         const paymentTransactionId = paymentResult.transactionId || paymentResult.walletTransactionId;
         if (!paymentTransactionId) {
             console.error("[Recharge Ctrl] CRITICAL: Payment reported success but no transactionId returned.", paymentResult);
             throw new Error("Payment processing error: Missing transaction ID.");
         }
         console.log(`[Recharge Ctrl] Payment successful/fallback. Payment Tx ID: ${paymentTransactionId}. Proceeding to recharge provider.`);

        rechargeExecutionResult = await rechargeProviderService.executeRecharge({
             type, identifier, amount, billerId, planId, transactionId: paymentTransactionId
         });

         if (rechargeExecutionResult.status === 'Completed' || rechargeExecutionResult.status === 'Pending' || rechargeExecutionResult.status === 'Processing Activation') {
             finalStatus = rechargeExecutionResult.status;
             failureReason = ''; 
             paymentResult.message = rechargeExecutionResult.message || 'Recharge successful/pending.';

             const originalTxRef = doc(db, 'transactions', paymentTransactionId);
             const currentTxDataSnap = await getDoc(originalTxRef);
             const currentTxData = currentTxDataSnap.data();
             const updatePayload = {
                 status: finalStatus,
                 description: `${currentTxData?.description || logData.description} - Operator Status: ${finalStatus}${rechargeExecutionResult.operatorMessage ? ` (${rechargeExecutionResult.operatorMessage})` : ''}`,
                 operatorReferenceId: rechargeExecutionResult.operatorReferenceId || null,
                 updatedAt: serverTimestamp()
             };
             await updateDoc(originalTxRef, updatePayload);
             console.log(`[Recharge Ctrl] Updated payment transaction ${paymentTransactionId} status to ${finalStatus}.`);

             logData.status = finalStatus; 
             logData.operatorReferenceId = rechargeExecutionResult.operatorReferenceId || undefined;
             logData.description = updatePayload.description; 
         } else {
             finalStatus = 'Failed';
             failureReason = rechargeExecutionResult.message || 'Recharge failed after payment deduction.';
             console.error(`[Recharge Ctrl] CRITICAL: Payment successful (Tx: ${paymentTransactionId}) but recharge execution failed for user ${userId}. Reason: ${failureReason}. Initiating refund simulation.`);
             paymentResult.message = failureReason + " Refund initiated."; 

             const originalTxRefFailed = doc(db, 'transactions', paymentTransactionId);
             const currentTxDataFailedSnap = await getDoc(originalTxRefFailed);
             const currentTxDataFailed = currentTxDataFailedSnap.data();
             await updateDoc(originalTxRefFailed, {
                 status: 'Failed',
                 description: `${currentTxDataFailed?.description || logData.description} - Execution Failed: ${failureReason}`,
                 updatedAt: serverTimestamp()
             });
             
             if (logData.paymentMethodUsed === 'Wallet' || paymentResult.usedWalletFallback) {
                  console.log(`[Recharge Ctrl] Attempting wallet refund for failed execution...`);
                  await payViaWalletInternal(userId, `REFUND_${paymentTransactionId}`, -amount, `Refund: Failed ${type} Recharge`, 'Refund');
             } else if (logData.paymentMethodUsed === 'UPI') {
                  console.warn(`[Recharge Ctrl] UPI Refund required for Tx ${paymentTransactionId} but not implemented.`);
             } else if (logData.paymentMethodUsed === 'Card') {
                  console.warn(`[Recharge Ctrl] Card Refund required for Tx ${paymentTransactionId} but not implemented.`);
             }
             throw new Error(failureReason); 
         }

         logTransactionToBlockchain(paymentTransactionId, { ...logData, id: paymentTransactionId, date: new Date() } ) 
              .catch(err => console.error("[Recharge Ctrl] Blockchain log failed:", err));

         const finalTxDoc = await getDoc(doc(db, 'transactions', paymentTransactionId));
         if (finalTxDoc.exists()) {
            const finalTxData = convertFirestoreDocToTransaction(finalTxDoc);
             sendToUser(userId, { type: 'transaction_update', payload: finalTxData });
         }
        // Return the full transaction object in the response, not just status and ID
        res.status(200).json({ 
            ...convertFirestoreDocToTransaction(finalTxDoc), // Spread the transaction data
            message: paymentResult.message // Include message for clarity
        });

    } catch (error) {
        console.error(`[Recharge Ctrl] ${type} processing failed for user ${userId}:`, error.message);
        const paymentTxId = paymentResult.transactionId || paymentResult.walletTransactionId;
        if (!paymentTxId) {
            logData.status = 'Failed';
            logData.description = `${logData.description} - Payment Error: ${error.message}`;
            try {
                const failedTx = await addTransaction(logData);
                paymentResult.transactionId = failedTx.id;
                sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(await getDoc(doc(db, 'transactions', failedTx.id))) });
            } catch (logError) {
                console.error("[Recharge Ctrl] Failed to log failed recharge transaction:", logError);
            }
        } else { 
             try {
                 const existingTxRef = doc(db, 'transactions', paymentTxId);
                 const txSnap = await getDoc(existingTxRef);
                 if(txSnap.exists() && txSnap.data().status !== 'Failed') { 
                     await updateDoc(existingTxRef, { status: 'Failed', description: `${txSnap.data()?.description || logData.description} - Final Error: ${error.message}`, failureReason: error.message, updatedAt: serverTimestamp() });
                     const updatedTxDoc = await getDoc(existingTxRef);
                     if(updatedTxDoc.exists()) sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(updatedTxDoc) });
                 }
             } catch(updateError) {
                  console.error(`[Recharge Ctrl] Failed to update existing transaction ${paymentTxId} to Failed:`, updateError);
             }
        }
        // Return full transaction object even on failure if it was logged
        const failedTxDoc = paymentTxId ? await getDoc(doc(db, 'transactions', paymentTxId)) : null;
        if (failedTxDoc && failedTxDoc.exists()) {
            res.status(400).json({
                 ...convertFirestoreDocToTransaction(failedTxDoc),
                message: error.message || failureReason,
            });
        } else {
            res.status(400).json({ status: 'Failed', message: error.message || failureReason, id: paymentTxId || `local-err-${Date.now()}`, userId, type: 'Recharge', name: rechargeName, amount: -amount, date: new Date(), description: logData.description });
        }
    }
};

exports.scheduleRecharge = async (req, res, next) => {
     const userId = req.user.uid;
     const { type, identifier, amount, frequency, startDate, billerId, planId } = req.body;

     try {
         const startDateTime = new Date(startDate);
         if (isNaN(startDateTime.getTime()) || startDateTime < new Date()) {
             return res.status(400).json({ message: 'Invalid start date. Must be in the future.' });
         }

         const scheduleData = {
             userId,
             type, 
             identifier,
             amount: Number(amount),
             frequency,
             nextRunDate: Timestamp.fromDate(startDateTime), 
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
         await scheduleDocRef.update({ isActive: false, updatedAt: serverTimestamp() });
         res.status(200).json({ success: true, message: 'Scheduled recharge cancelled.' });
     } catch (error) {
         next(error);
     }
 };

exports.checkActivationStatus = async (req, res, next) => {
    const { transactionId } = req.params;
    try {
        const status = await rechargeProviderService.getActivationStatus(transactionId);
        res.status(200).json({ status });
    } catch (providerError) {
         console.warn(`Provider status check failed for ${transactionId}:`, providerError.message);
        try {
            const txDocRef = doc(db, 'transactions', transactionId);
            const txDoc = await txDocRef.get();
            if(txDoc.exists()) {
                res.status(200).json({ status: txDoc.data().status || 'Unknown' });
            } else {
                 res.status(404).json({ message: 'Transaction not found.' });
            }
        } catch (dbError) {
             console.error(`Firestore status check failed for ${transactionId}:`, dbError);
            next(dbError); 
        }
    }
};

exports.cancelRecharge = async (req, res, next) => {
    const userId = req.user.uid;
    const { transactionId } = req.params;
    try {
        const txDocRef = doc(db, 'transactions', transactionId);
        const txDoc = await txDocRef.get();
        if (!txDoc.exists() || txDoc.data().userId !== userId) {
            return res.status(404).json({ message: 'Transaction not found or permission denied.' });
        }
        const txData = convertFirestoreDocToTransaction(txDoc);
        if (!txData || txData.type !== 'Recharge') {
             return res.status(400).json({ message: 'Only recharge transactions can be cancelled.' });
        }
        if (['Failed', 'Cancelled'].includes(txData.status)) {
            return res.status(400).json({ message: `Cannot cancel a transaction with status: ${txData.status}.` });
        }
        const transactionDate = txData.date;
        const now = new Date();
        const minutesPassed = (now.getTime() - transactionDate.getTime()) / 60000;
        const CANCELLATION_WINDOW_MINUTES = 30;
        if (minutesPassed > CANCELLATION_WINDOW_MINUTES) {
             return res.status(400).json({ message: `Cancellation window (${CANCELLATION_WINDOW_MINUTES} minutes) has passed.` });
        }
        const result = await rechargeProviderService.cancelRecharge(transactionId, txData.operatorReferenceId);
        if (result.success) {
            await updateDoc(txDocRef, { status: 'Cancelled', description: `${txData.description} (Cancelled by User)`, updatedAt: serverTimestamp() });
            const updatedTxDoc = await getDoc(txDocRef);
             if(updatedTxDoc.exists()) sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(updatedTxDoc) });
            res.status(200).json({ success: true, message: result.message || "Recharge cancelled. Refund will be processed if applicable." });
        } else {
            res.status(400).json({ success: false, message: result.message || "Cancellation failed at operator level." });
        }
    } catch (error) {
        next(error);
    }
};

function capitalize(s) {
  return typeof s === 'string' && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function convertFirestoreDocToTransaction(docSnap) {
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        date: (data.date)?.toDate ? (data.date).toDate() : new Date(), 
        createdAt: data.createdAt ? (data.createdAt).toDate() : undefined,
        updatedAt: data.updatedAt ? (data.updatedAt).toDate() : undefined,
        avatarSeed: data.avatarSeed || data.name?.toLowerCase().replace(/\s+/g, '') || docSnap.id, // Ensure avatarSeed
    };
}
