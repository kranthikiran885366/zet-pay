
// backend/controllers/billsController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { Timestamp, doc, updateDoc, getDoc, serverTimestamp, collection, query, where, orderBy, limit, getDocs } = require('firebase/firestore');
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger'); 
const billProviderService = require('../services/billProviderService'); 
const { payViaWalletInternal } = require('../services/wallet'); 
const { processUpiPaymentInternal } = require('../services/upi'); 
const { processCardPaymentInternal } = require('../services/paymentGatewayService'); 
const { scheduleRecovery } = require('../services/recoveryService'); 
const { sendToUser } = require('../server'); 
import type { Transaction } from '../services/types'; 

const SUPPORTED_BILL_TYPES = ['Electricity', 'Water', 'Insurance', 'Credit Card', 'Loan', 'Gas', 'Broadband', 'Education', 'Mobile Postpaid', 'Cable TV', 'Housing Society', 'Club Fee', 'Donation', 'Property Tax', 'FASTag'];

exports.fetchBillDetails = async (req, res, next) => {
    const { billerId } = req.query; 
    let { type, identifier } = req.params; 
    type = type.toLowerCase();

    const validBillTypes = SUPPORTED_BILL_TYPES.map(t => t.toLowerCase().replace(/\s+/g, '-'));
    if (!validBillTypes.includes(type)) {
        return res.status(400).json({ message: 'Invalid bill type specified.' });
    }

    if (!billerId || typeof billerId !== 'string' || !identifier || typeof identifier !== 'string') {
        return res.status(400).json({ message: 'Biller ID and identifier are required.' });
    }

    try {
        const billDetails = await billProviderService.fetchBill(billerId, identifier, capitalize(type.replace(/-/g, ' ')));

        if (!billDetails || billDetails.success === false) {
            return res.status(200).json({ success: false, message: billDetails?.message || 'Bill details not found. Manual entry required.', amount: null });
        }
        if (billDetails.amount !== undefined && billDetails.amount !== null) {
            const responseData = {
                success: true,
                amount: billDetails.amount,
                dueDate: billDetails.dueDate ? (billDetails.dueDate instanceof Date ? billDetails.dueDate.toISOString().split('T')[0] : billDetails.dueDate) : null, // Send as YYYY-MM-DD
                consumerName: billDetails.consumerName,
                status: billDetails.status,
                minAmountDue: billDetails.minAmountDue,
            };
            res.status(200).json(responseData);
        } else {
             return res.status(200).json({ success: false, message: billDetails?.message || 'Bill details not available or already paid. Manual entry required.', amount: null });
        }
    } catch (error) {
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
         return res.status(400).json({ message: 'Invalid bill type specified.' });
     }

    let paymentSuccess = false;
    let paymentResult = { success: false, transactionId: null, message: 'Payment processing failed initially.', usedWalletFallback: false };
    let finalStatus = 'Failed';
    let failureReason = 'Payment or bill processing failed.';
    const transactionType = capitalize(type.replace(/-/g, ' ')); 
    const transactionName = `${billerName || transactionType}`; 
    let paymentMethodUsed = paymentMethod; 

    let logData = {
        userId,
        type: transactionType,
        name: transactionName,
        description: `Payment for ${identifier} via ${paymentMethod}`,
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
             logData.description = `Payment for ${identifier} via ${paymentMethodUsed}`; 
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
        const finalProviderType = type === 'mobile-postpaid' ? 'Mobile Postpaid' : type === 'fastag' ? 'FASTag' : providerBillType;

         let executionResult;
         if (finalProviderType === 'Donation') {
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

         } else {
             finalStatus = 'Failed';
             failureReason = executionResult.message || `${finalProviderType} processing failed after payment deduction.`;
             console.error(`[Bill Ctrl] CRITICAL: Payment successful (Tx: ${paymentTransactionId}) but ${finalProviderType} execution failed for user ${userId}. Reason: ${failureReason}. Initiating refund simulation.`);
              const originalTxRefFailed = doc(db, 'transactions', paymentTransactionId);
              const currentTxDataFailedSnap = await getDoc(originalTxRefFailed);
              const currentTxDataFailed = currentTxDataFailedSnap.data();
             await updateDoc(originalTxRefFailed, {
                 status: 'Failed',
                 description: `${currentTxDataFailed?.description || logData.description} - Execution Failed: ${failureReason}`,
                 updatedAt: serverTimestamp()
             });
             logData.status = 'Failed';
             logData.description = `${currentTxDataFailed?.description || logData.description} - Execution Failed: ${failureReason}`; 
             
             if (paymentMethodUsed === 'Wallet') { 
                 console.log(`[Bill Ctrl] Attempting wallet refund for failed execution...`);
                  await payViaWalletInternal(userId, `REFUND_${paymentTransactionId}`, -amount, `Refund: Failed ${type} ${transactionType}`, 'Refund');
             } else if (paymentMethodUsed === 'UPI') {
                  console.warn(`[Bill Ctrl] UPI Refund required for Tx ${paymentTransactionId} but not implemented.`);
             } else if (paymentMethodUsed === 'Card') {
                  console.warn(`[Bill Ctrl] Card Refund required for Tx ${paymentTransactionId} but not implemented.`);
             }
             paymentResult.message = failureReason + " Refund initiated.";
             throw new Error(failureReason); 
         }
    } catch (error) {
        console.error(`[Bill Ctrl] ${transactionType} processing failed for user ${userId}:`, error.message);
        const paymentTxId = paymentResult.transactionId;
        if (!paymentTxId) {
            logData.description = `${logData.description} - Error: ${error.message}`;
            logData.status = 'Failed';
            try {
                const failedTx = await addTransaction(logData); 
                paymentResult.transactionId = failedTx.id; 
                 sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(await getDoc(doc(db, 'transactions', failedTx.id))) });
            } catch (logError) {
                console.error(`[Bill Ctrl] Failed to log failed ${transactionType} transaction:`, logError);
            }
        }
        res.status(400).json({ status: 'Failed', message: error.message || failureReason, transactionId: paymentTxId || paymentResult.transactionId });
        return; 
    }

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
         }
     }
    res.status(200).json({ status: finalStatus, message: paymentResult.message, transactionId: finalTransactionId });
};


function capitalize(s) {
if (typeof s !== 'string' || s.length === 0) return '';
return s.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

exports.getBillers = async (req, res, next) => {
    const { type } = req.query;
    if (!type || typeof type !== 'string') {
        return res.status(400).json({ message: 'Biller type query parameter is required.' });
    }
    const billers = await billProviderService.fetchBillers(type);
    res.status(200).json(billers);
};


function convertFirestoreDocToTransaction(docSnap) { 
    if (!docSnap.exists()) return null; 
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        date: (data.date)?.toDate ? (data.date).toDate() : new Date(), 
        createdAt: data.createdAt ? (data.createdAt).toDate() : undefined,
        updatedAt: data.updatedAt ? (data.updatedAt).toDate() : undefined,
        avatarSeed: data.avatarSeed || data.name?.toLowerCase().replace(/\s+/g, '') || docSnap.id,
    };
}
