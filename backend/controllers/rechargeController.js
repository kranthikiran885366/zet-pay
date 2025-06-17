
// backend/controllers/rechargeController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger');
// Simulate payment gateway / wallet / UPI service interactions
const { payViaWalletInternal } = require('../services/wallet'); // Assuming wallet payments
const { processUpiPaymentInternal } = require('../services/upi'); // Assuming UPI payments
const { processCardPaymentInternal } = require('../services/paymentGatewayService'); // Assuming card payments
const { scheduleRecovery } = require('../services/recoveryService'); // For UPI fallback
const rechargeProviderService = require('../services/rechargeProviderService');
const { sendToUser } = require('../server'); 
const { collection, query, where, orderBy, limit, getDocs, addDoc, updateDoc, doc, Timestamp, serverTimestamp, getDoc } = require('firebase/firestore');
import type { Transaction } from '../services/types'; 

const SUPPORTED_RECHARGE_TYPES = ['mobile', 'dth', 'fastag', 'datacard', 'metro', 'isd', 'buspass', 'subscription', 'google-play', 'electricity'];

exports.getBillers = async (req, res, next) => {
    const { type } = req.query;
    if (!type || typeof type !== 'string') {
        res.status(400);
        return next(new Error('Biller type query parameter is required.'));
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
         res.status(400);
         return next(new Error('Biller ID and type are required.'));
     }
     try {
         const plans = await rechargeProviderService.fetchPlans(billerId, type, identifier);
         res.status(200).json(plans);
     } catch(error) {
         next(error);
     }
 };

exports.detectOperator = async (req, res, next) => {
    const { mobileNumber } = req.body;
    if (!mobileNumber) {
        res.status(400);
        return next(new Error('Mobile number is required.'));
    }
    try {
        const result = await rechargeProviderService.detectOperator(mobileNumber);
        if (result.error) {
            return res.status(404).json({ message: result.error });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

exports.processRecharge = async (req, res, next) => {
    const userId = req.user.uid;
    const { type, identifier, amount, billerId, planId, paymentMethod = 'wallet', sourceAccountUpiId, pin, cardToken, cvv, couponCode } = req.body;

    const formattedType = type?.toLowerCase().replace(/\s+/g, '-');
     if (!type || !SUPPORTED_RECHARGE_TYPES.includes(formattedType)) {
         res.status(400);
         return next(new Error('Invalid recharge type specified.'));
     }

    let paymentSuccess = false;
    let paymentResult = { success: false, transactionId: null, message: 'Payment processing failed initially.', usedWalletFallback: false, pspTransactionId: null, errorCode: null, mightBeDebited: false };
    let rechargeExecutionResult = {}; 
    let finalStatus = 'Failed';
    let failureReason = 'Recharge processing failed.';
    const rechargeName = `${capitalize(type)} Recharge: ${billerId || identifier}`;
    let paymentMethodUsed = paymentMethod; 

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
        couponCodeApplied: couponCode || undefined, // Log coupon if applied
        paymentMethodUsed: paymentMethod, // Initial assumption
    };

    try {
        console.log(`[Recharge Ctrl] Processing ${type} recharge for User: ${userId}, ID: ${identifier}, Amt: ${amount}, Method: ${paymentMethod}`);
        
        // Simulate Payment Gateway / UPI / Wallet interaction
        // In a real app, you'd call paymentGatewayService.chargeCard, or upiProviderService.initiatePayment etc.
        if (paymentMethod === 'wallet') {
            paymentResult = await payViaWalletInternal(userId, `recharge_${type}_${identifier}`, amount, rechargeName, 'Recharge');
            if (!paymentResult.success) throw new Error(paymentResult.message || 'Wallet payment failed.');
            paymentSuccess = true;
        } else if (paymentMethod === 'upi') {
             if (!sourceAccountUpiId || !pin) throw new Error('Source UPI ID and PIN required for UPI payment.');
             paymentResult = await processUpiPaymentInternal(userId, billerId || identifier, amount, pin, sourceAccountUpiId, rechargeName, 'Recharge');
             if (!paymentResult.success && !paymentResult.usedWalletFallback) throw new Error(paymentResult.message || 'UPI payment failed.');
             paymentSuccess = paymentResult.success || paymentResult.usedWalletFallback;
             paymentMethodUsed = paymentResult.usedWalletFallback ? 'Wallet' : 'UPI'; // Update if fallback used
             logData.paymentMethodUsed = paymentMethodUsed;
             logData.description += paymentResult.usedWalletFallback ? ' (Paid via Wallet Fallback)' : ' (Paid via UPI)';
             if (paymentResult.usedWalletFallback) {
                 await scheduleRecovery(userId, amount, billerId || identifier, sourceAccountUpiId); // Schedule recovery if fallback used
             }
        } else if (paymentMethod === 'card') {
             // This part is conceptual and would use a real payment gateway
             if (!cardToken || !cvv) throw new Error('Card token and CVV required for Card payment.');
             paymentResult = await processCardPaymentInternal(userId, cardToken, amount, cvv, rechargeName); // Use internal function for simulation
             if (!paymentResult.success) throw new Error(paymentResult.message || 'Card payment failed.');
             paymentSuccess = paymentResult.success;
             logData.paymentMethodUsed = 'Card';
             logData.description += ' (Paid via Card)';
        } else {
            throw new Error('Invalid payment method specified.');
        }

         const paymentTransactionId = paymentResult.transactionId;
         if (!paymentTransactionId) {
             console.error("[Recharge Ctrl] CRITICAL: Payment reported success but no transactionId returned from payment method.", paymentResult);
             throw new Error("Payment processing error: Missing transaction ID.");
         }
         console.log(`[Recharge Ctrl] Payment successful/fallback. Payment Tx ID: ${paymentTransactionId}. Proceeding to recharge provider.`);

        // Call Recharge Provider API
        rechargeExecutionResult = await rechargeProviderService.executeRecharge({
             type, identifier, amount, billerId, planId, transactionId: paymentTransactionId // Pass our system's Tx ID as reference
         });

         // Update transaction status based on provider's response
         const originalTxRef = doc(db, 'transactions', paymentTransactionId);
         const currentTxDataSnap = await getDoc(originalTxRef);
         const currentTxData = currentTxDataSnap.data(); // Should exist as payment logging is done by internal payment methods

         if (rechargeExecutionResult.status === 'Completed' || rechargeExecutionResult.status === 'Pending' || rechargeExecutionResult.status === 'Processing Activation') {
             finalStatus = rechargeExecutionResult.status;
             failureReason = ''; 
             paymentResult.message = rechargeExecutionResult.message || 'Recharge successful/pending.';
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
         } else { // Recharge execution failed after payment
             finalStatus = 'Failed';
             failureReason = rechargeExecutionResult.message || 'Recharge failed after payment deduction.';
             console.error(`[Recharge Ctrl] CRITICAL: Payment successful (Tx: ${paymentTransactionId}) but recharge execution failed for user ${userId}. Reason: ${failureReason}. Initiating refund simulation.`);
             paymentResult.message = failureReason + " Refund initiated."; 
             await updateDoc(originalTxRef, {
                 status: 'Failed',
                 description: `${currentTxData?.description || logData.description} - Execution Failed: ${failureReason}`,
                 failureReason: failureReason,
                 updatedAt: serverTimestamp()
             });
             logData.status = 'Failed';
             logData.description = `${currentTxData?.description || logData.description} - Execution Failed: ${failureReason}`; 
             
             // Simulate refund to the original payment method
             if (paymentMethodUsed === 'Wallet' || paymentResult.usedWalletFallback) {
                  console.log(`[Recharge Ctrl] Attempting wallet refund for failed execution of ${type} recharge...`);
                  // Use negative amount for credit, and a distinct reference for refund
                  await payViaWalletInternal(userId, `REFUND_${paymentTransactionId}`, -amount, `Refund: Failed ${type} Recharge for ${rechargeName}`, 'Refund');
             } else if (paymentMethodUsed === 'UPI') {
                  // TODO: Implement actual UPI refund initiation with PSP if payment was by UPI and not wallet fallback
                  console.warn(`[Recharge Ctrl] UPI Refund required for Tx ${paymentTransactionId} but not implemented directly. Refund simulation with wallet may be needed for testing, or manual PSP refund.`);
             } else if (paymentMethodUsed === 'Card') {
                  // TODO: Implement actual Card refund initiation with Payment Gateway
                  console.warn(`[Recharge Ctrl] Card Refund required for Tx ${paymentTransactionId} but not implemented directly.`);
             }
             throw new Error(failureReason); 
         }

         // Log to simulated blockchain (non-blocking)
         logTransactionToBlockchain(paymentTransactionId, { ...logData, id: paymentTransactionId, date: new Date() } ) 
              .catch(err => console.error("[Recharge Ctrl] Blockchain log failed:", err));

         // Send final transaction status via WebSocket
         const finalTxDoc = await getDoc(doc(db, 'transactions', paymentTransactionId));
         if (finalTxDoc.exists()) {
            const finalTxData = convertFirestoreDocToTransaction(finalTxDoc);
             sendToUser(userId, { type: 'transaction_update', payload: finalTxData });
         }
        
        // Return the full transaction object in the response
        res.status(200).json({ 
            ...convertFirestoreDocToTransaction(finalTxDoc), // Spread the transaction data
            message: paymentResult.message // Include message for clarity
        });

    } catch (error) {
        console.error(`[Recharge Ctrl] ${type} processing failed for user ${userId}:`, error.message);
        const paymentTxId = paymentResult.transactionId; // ID of the payment transaction attempt
        
        // Ensure transaction log reflects failure if not already updated
        if (paymentTxId) {
             try {
                 const existingTxRef = doc(db, 'transactions', paymentTxId);
                 const txSnap = await getDoc(existingTxRef);
                 if(txSnap.exists() && txSnap.data().status !== 'Failed') { 
                     await updateDoc(existingTxRef, { 
                        status: 'Failed', 
                        description: `${txSnap.data()?.description || logData.description} - Final Error: ${error.message}`, 
                        failureReason: error.message || failureReason, 
                        updatedAt: serverTimestamp() 
                    });
                    const updatedTxDoc = await getDoc(existingTxRef);
                    if(updatedTxDoc.exists()) sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(updatedTxDoc) });
                 }
             } catch(updateError) {
                  console.error(`[Recharge Ctrl] Failed to update existing transaction ${paymentTxId} to Failed:`, updateError);
             }
        }
        // Construct a response even if transaction logging failed at payment step (paymentResult.transactionId might be null)
        const failedTxDoc = paymentTxId ? await getDoc(doc(db, 'transactions', paymentTxId)) : null;
        if (failedTxDoc && failedTxDoc.exists()) {
            res.status(400).json({
                 ...convertFirestoreDocToTransaction(failedTxDoc),
                message: error.message || failureReason,
            });
        } else {
            // Fallback response if no transaction was logged or retrievable
            res.status(400).json({ 
                status: 'Failed', 
                message: error.message || failureReason, 
                id: paymentTxId || `local-err-${Date.now()}`, // Use paymentTxId if available
                userId, type: 'Recharge', name: rechargeName, amount: -amount, date: new Date().toISOString(), description: logData.description,
            });
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

         // TODO: In real app, securely store payment method details or a reference for scheduled payment
         const scheduleData = {
             userId,
             type, 
             identifier,
             amount: Number(amount),
             frequency,
             nextRunDate: Timestamp.fromDate(startDateTime), // Firestore Timestamp
             billerId: billerId || null,
             planId: planId || null,
             isActive: true,
             createdAt: serverTimestamp(),
             updatedAt: serverTimestamp(),
             // paymentMethodToken: "TOKENIZED_PAYMENT_METHOD_REF" // Example for real app
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
        const txDocRef = doc(db, 'transactions', transactionId);
        const txDoc = await txDocRef.get();
        if (!txDoc.exists()) {
            return res.status(404).json({ message: 'Transaction not found.' });
        }
        // In a real app, use operatorReferenceId from txDoc.data() to query provider
        const status = await rechargeProviderService.getActivationStatus(transactionId, txDoc.data().operatorReferenceId);
        res.status(200).json({ status });
    } catch (providerError) {
         console.warn(`Provider status check failed for ${transactionId}:`, providerError.message);
        try { // Fallback to Firestore status if provider check fails
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
        if (['Failed', 'Cancelled', 'Completed'].includes(txData.status)) { // Completed usually can't be cancelled by operator
            return res.status(400).json({ message: `Cannot cancel a transaction with status: ${txData.status}.` });
        }
        // Check if within cancellation window (e.g., 30 mins for pending/processing)
        const transactionDate = new Date(txData.date);
        const now = new Date();
        const minutesPassed = (now.getTime() - transactionDate.getTime()) / 60000;
        const CANCELLATION_WINDOW_MINUTES = 30; 
        if (minutesPassed > CANCELLATION_WINDOW_MINUTES && (txData.status === 'Pending' || txData.status === 'Processing Activation')) {
             return res.status(400).json({ message: `Cancellation window (${CANCELLATION_WINDOW_MINUTES} minutes) has passed.` });
        }

        // Call provider service to attempt cancellation
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
        // Ensure 'date' is converted to a JS Date object or ISO string for client
        date: (data.date instanceof Timestamp) ? data.date.toDate().toISOString() : (data.date ? new Date(data.date).toISOString() : new Date().toISOString()),
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (data.createdAt ? new Date(data.createdAt).toISOString() : undefined),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : (data.updatedAt ? new Date(data.updatedAt).toISOString() : undefined),
        avatarSeed: data.avatarSeed || data.name?.toLowerCase().replace(/\s+/g, '') || docSnap.id,
    };
}

</description>
    <content><![CDATA[

