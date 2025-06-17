
// backend/controllers/rechargeController.js
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger');
const rechargeProviderService = require('../services/rechargeProviderService');
const { sendToUser } = require('../server'); 
const { collection, query, where, orderBy, limit, getDocs, addDoc, updateDoc, doc, Timestamp, serverTimestamp, getDoc, writeBatch } = require('firebase/firestore');
const { scheduleRecovery } = require('../services/recoveryService'); // For UPI fallback
const { payViaWalletInternal } = require('../services/wallet');
const { processUpiPaymentInternal } = require('../services/upi');
const { processCardPaymentInternal } = require('../services/paymentGatewayService');
import type { Transaction } from '../services/types';

const SUPPORTED_RECHARGE_TYPES = ['mobile', 'dth', 'fastag', 'datacard', 'metro', 'isd', 'buspass', 'subscription', 'google-play', 'electricity'];

// Function to convert Firestore DocumentSnapshot to a client-friendly Transaction object
function convertFirestoreDocToTransaction(docSnap) {
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        date: (data.date instanceof Timestamp) ? data.date.toDate().toISOString() : (data.date ? new Date(data.date).toISOString() : new Date().toISOString()),
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (data.createdAt ? new Date(data.createdAt).toISOString() : undefined),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : (data.updatedAt ? new Date(data.updatedAt).toISOString() : undefined),
        avatarSeed: data.avatarSeed || data.name?.toLowerCase().replace(/\s+/g, '') || docSnap.id,
    };
}

exports.getBillers = async (req, res, next) => {
    const { type } = req.query;
    // Validation handled by router
    try {
        const billers = await rechargeProviderService.fetchBillers(type);
        res.status(200).json(billers);
    } catch (error) {
        next(error);
    }
};

exports.getRechargePlans = async (req, res, next) => {
     const { billerId, type, identifier } = req.query;
     // Validation handled by router
     try {
         const plans = await rechargeProviderService.fetchPlans(billerId, type, identifier);
         res.status(200).json(plans);
     } catch(error) {
         next(error);
     }
 };

exports.detectOperator = async (req, res, next) => {
    const { mobileNumber } = req.body;
    // Validation handled by router
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
        res.status(400); return next(new Error('Invalid recharge type specified.'));
    }

    let paymentSuccess = false;
    let paymentResult = { success: false, transactionId: null, message: 'Payment processing failed initially.', usedWalletFallback: false, pspTransactionId: null, errorCode: null, mightBeDebited: false, paymentMethodUsed: paymentMethod };
    let rechargeExecutionResult = {};
    let finalStatus = 'Failed';
    let failureReason = 'Recharge processing failed.';
    const rechargeName = `${capitalize(type)} Recharge: ${billerId || identifier}`;
    
    // Initial transaction log data structure
    let logData = {
        userId, type: 'Recharge', name: rechargeName,
        description: `For ${identifier}${planId ? ` (Plan: ${planId})` : ''}${couponCode ? ` (Coupon: ${couponCode})`: ''}`,
        amount: -amount, status: 'Pending', billerId: billerId || undefined, identifier: identifier,
        planId: planId || undefined, couponCodeApplied: couponCode || undefined, paymentMethodUsed: paymentMethod,
    };
    let paymentTransactionId = null; // Will hold our system's transaction ID for the payment attempt

    try {
        console.log(`[Recharge Ctrl] Processing ${type} for User: ${userId}, ID: ${identifier}, Amt: ${amount}, Method: ${paymentMethod}`);

        // Step 1: Log initial 'Pending' transaction for payment attempt
        const initialTxLog = await addTransaction(logData);
        paymentTransactionId = initialTxLog.id;
        logData.status = initialTxLog.status; // Update logData status from what was logged

        // Step 2: Simulate Payment Gateway / UPI / Wallet interaction
        // TODO: Replace with actual Payment Gateway SDK calls (e.g., Razorpay, Cashfree)
        if (paymentMethod === 'wallet') {
            paymentResult = await payViaWalletInternal(userId, `recharge_${type}_${identifier}`, amount, rechargeName, 'Recharge');
        } else if (paymentMethod === 'upi') {
            if (!sourceAccountUpiId || !pin) throw new Error('Source UPI ID and PIN required for UPI payment.');
            paymentResult = await processUpiPaymentInternal(userId, billerId || identifier, amount, pin, sourceAccountUpiId, rechargeName, 'Recharge');
            if (paymentResult.usedWalletFallback) { // If UPI failed and fell back to wallet
                logData.paymentMethodUsed = 'Wallet';
                logData.description += ' (Paid via Wallet Fallback)';
                await scheduleRecovery(userId, amount, billerId || identifier, sourceAccountUpiId);
            }
        } else if (paymentMethod === 'card') {
            if (!cardToken || !cvv) throw new Error('Card token and CVV required for Card payment.');
            paymentResult = await processCardPaymentInternal(userId, cardToken, amount, cvv, rechargeName);
            logData.paymentMethodUsed = 'Card';
        } else {
            throw new Error('Invalid payment method specified.');
        }

        // Update main payment transaction log with actual payment outcome
        await updateDoc(doc(db, 'transactions', paymentTransactionId), {
            status: paymentResult.success ? 'PaymentCompleted_ProviderPending' : 'Failed', // Custom intermediate status
            failureReason: !paymentResult.success ? paymentResult.message : null,
            pspTransactionId: paymentResult.pspTransactionId || null,
            paymentMethodUsed: logData.paymentMethodUsed, // Ensure this is updated if fallback happened
            description: logData.description + (!paymentResult.success ? ` - Payment Error: ${paymentResult.message}` : ''),
            updatedAt: serverTimestamp()
        });
        sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(await getDoc(doc(db, 'transactions', paymentTransactionId))) });

        if (!paymentResult.success) {
            throw new Error(paymentResult.message || 'Payment processing failed.');
        }
        paymentSuccess = true;
        console.log(`[Recharge Ctrl] Payment successful. Payment Tx ID: ${paymentTransactionId}. Proceeding to recharge provider.`);

        // Step 3: Call Recharge Provider API
        rechargeExecutionResult = await rechargeProviderService.executeRecharge({
             type, identifier, amount, billerId, planId, transactionId: paymentTransactionId
        });

        const originalTxRef = doc(db, 'transactions', paymentTransactionId); // Re-fetch for current description
        const currentTxDataSnap = await getDoc(originalTxRef);
        const currentDescription = currentTxDataSnap.data()?.description || logData.description;

        if (['Completed', 'Pending', 'Processing Activation'].includes(rechargeExecutionResult.status)) {
            finalStatus = rechargeExecutionResult.status;
            await updateDoc(originalTxRef, {
                 status: finalStatus,
                 description: `${currentDescription} - Operator Status: ${finalStatus}${rechargeExecutionResult.operatorMessage ? ` (${rechargeExecutionResult.operatorMessage})` : ''}`,
                 operatorReferenceId: rechargeExecutionResult.operatorReferenceId || null,
                 updatedAt: serverTimestamp()
            });
        } else { // Recharge execution failed after payment
            finalStatus = 'Failed';
            failureReason = rechargeExecutionResult.message || 'Recharge failed at provider.';
            console.error(`[Recharge Ctrl] CRITICAL: Payment successful (Tx: ${paymentTransactionId}) but recharge execution failed. Reason: ${failureReason}.`);
            await updateDoc(originalTxRef, {
                 status: 'Failed',
                 description: `${currentDescription} - Execution Failed: ${failureReason}`,
                 failureReason: failureReason,
                 operatorReferenceId: rechargeExecutionResult.operatorReferenceId || null,
                 updatedAt: serverTimestamp()
            });
            // TODO: Implement Real Refund Logic based on paymentMethodUsed
            // This would call the Payment Gateway's refund API.
            console.warn(`[Recharge Ctrl] REFUND NEEDED for Tx ${paymentTransactionId} (Amount: ${amount}, Method: ${logData.paymentMethodUsed}). Simulating logging a refund reversal if it was wallet.`);
            if (logData.paymentMethodUsed === 'Wallet') {
                 await payViaWalletInternal(userId, `REFUND_${paymentTransactionId}`, -amount, `Refund: Failed ${type} Recharge for ${rechargeName}`, 'Refund');
                 rechargeExecutionResult.message = failureReason + " Wallet refund initiated.";
            } else {
                 rechargeExecutionResult.message = failureReason + " Manual refund process required for non-wallet payment.";
            }
            throw new Error(rechargeExecutionResult.message);
        }
        
        const finalTxDoc = await getDoc(originalTxRef);
        const finalTxData = convertFirestoreDocToTransaction(finalTxDoc);
        sendToUser(userId, { type: 'transaction_update', payload: finalTxData });
        logTransactionToBlockchain(paymentTransactionId, finalTxData).catch(err => console.error("[Recharge Ctrl] Blockchain log failed:", err));
        res.status(200).json({ ...finalTxData, message: rechargeExecutionResult.message || "Recharge processed."});

    } catch (error) {
        console.error(`[Recharge Ctrl] ${type} processing error for user ${userId}:`, error.message);
        const finalErrorMessage = error.message || failureReason;

        if (paymentTransactionId) { // If an initial transaction was logged
             try {
                 const txDocRef = doc(db, 'transactions', paymentTransactionId);
                 const txSnap = await getDoc(txDocRef);
                 if(txSnap.exists() && txSnap.data().status !== 'Failed') {
                     await updateDoc(txDocRef, { status: 'Failed', failureReason: finalErrorMessage, updatedAt: serverTimestamp() });
                     sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(await getDoc(txDocRef)) });
                 }
             } catch(updateError) {
                  console.error(`[Recharge Ctrl] Failed to update main transaction ${paymentTransactionId} to Failed:`, updateError);
             }
            res.status(400).json({ ...convertFirestoreDocToTransaction(await getDoc(doc(db, 'transactions', paymentTransactionId))), message: finalErrorMessage });
        } else { // If payment failed before even logging initial transaction
            // Attempt to log a single 'Failed' transaction now
            logData.status = 'Failed';
            logData.failureReason = finalErrorMessage;
            try {
                const failedTx = await addTransaction(logData);
                sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(await getDoc(doc(db, 'transactions', failedTx.id))) });
                res.status(400).json({ ...convertFirestoreDocToTransaction(await getDoc(doc(db, 'transactions', failedTx.id))), message: finalErrorMessage });
            } catch (loggingError) {
                console.error(`[Recharge Ctrl] CRITICAL: Failed to log even the failed transaction:`, loggingError);
                res.status(500).json({ status: 'Failed', message: "Critical error during transaction processing and logging.", id: null });
            }
        }
    }
};

exports.scheduleRecharge = async (req, res, next) => {
    const userId = req.user.uid;
    const { type, identifier, amount, frequency, startDate, billerId, planId } = req.body;
    // Validation by router
    try {
        const startDateTime = new Date(startDate);
        if (isNaN(startDateTime.getTime()) || startDateTime < new Date()) {
            return res.status(400).json({ message: 'Invalid start date. Must be in the future.' });
        }

        // TODO: Securely store/reference payment method for scheduled execution
        // For example, a UPI mandate ID or a tokenized card reference.
        // This part is crucial for real implementation.
        const paymentMethodReference = "MANDATE_ID_OR_CARD_TOKEN_PLACEHOLDER";

        const scheduleData = {
            userId, type, identifier, amount: Number(amount), frequency,
            nextRunDate: Timestamp.fromDate(startDateTime),
            billerId: billerId || null, planId: planId || null, isActive: true,
            paymentMethodReference, // Store how this will be paid
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
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
    // Validation by router
    try {
        const scheduleDocRef = db.collection('scheduledRecharges').doc(scheduleId);
        const scheduleDoc = await scheduleDocRef.get();
        if (!scheduleDoc.exists() || scheduleDoc.data().userId !== userId) {
            return res.status(404).json({ message: 'Schedule not found or permission denied.' });
        }
        if (scheduleDoc.data().isActive === false) {
            return res.status(400).json({ message: 'Schedule is already cancelled.' });
        }
        // TODO: If a real mandate exists with a PSP, it might need to be cancelled/paused there too.
        await scheduleDocRef.update({ isActive: false, updatedAt: serverTimestamp() });
        res.status(200).json({ success: true, message: 'Scheduled recharge cancelled.' });
    } catch (error) {
        next(error);
    }
};

exports.checkActivationStatus = async (req, res, next) => {
    const { transactionId } = req.params;
    // Validation by router
    try {
        const txDocRef = doc(db, 'transactions', transactionId);
        const txDoc = await txDocRef.get();
        if (!txDoc.exists()) return res.status(404).json({ message: 'Transaction not found.' });
        
        const status = await rechargeProviderService.getActivationStatus(transactionId, txDoc.data().operatorReferenceId);
        
        // Optionally update transaction status in Firestore if provider gives a more final status
        if (txDoc.data().status !== status && ['Completed', 'Failed', 'Cancelled'].includes(status)) {
            await updateDoc(txDocRef, { status: status, updatedAt: serverTimestamp() });
            sendToUser(txDoc.data().userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(await getDoc(txDocRef)) });
        }
        res.status(200).json({ status });
    } catch (error) {
        next(error);
    }
};

exports.cancelRecharge = async (req, res, next) => {
    const userId = req.user.uid;
    const { transactionId } = req.params;
    // Validation by router
    try {
        const txDocRef = doc(db, 'transactions', transactionId);
        const txDoc = await txDocRef.get();
        if (!txDoc.exists() || txDoc.data().userId !== userId) {
            return res.status(404).json({ message: 'Transaction not found or permission denied.' });
        }
        const txData = convertFirestoreDocToTransaction(txDoc);
        if (!txData || txData.type !== 'Recharge') return res.status(400).json({ message: 'Only recharge transactions can be cancelled.' });
        if (['Failed', 'Cancelled', 'Completed'].includes(txData.status)) return res.status(400).json({ message: `Cannot cancel a transaction with status: ${txData.status}.` });
        
        // TODO: Check cancellation window (e.g., 5-30 mins for pending/processing) - provider specific
        // const transactionDate = new Date(txData.date);
        // const CANCELLATION_WINDOW_MINUTES = 5; 
        // if (differenceInMinutes(new Date(), transactionDate) > CANCELLATION_WINDOW_MINUTES) {
        //    return res.status(400).json({ message: `Cancellation window has passed.` });
        // }

        const result = await rechargeProviderService.cancelRecharge(transactionId, txData.operatorReferenceId);
        if (result.success) {
            await updateDoc(txDocRef, { status: 'Cancelled', description: `${txData.description} (Cancelled by User)`, updatedAt: serverTimestamp() });
            sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(await getDoc(txDocRef)) });
            // TODO: If cancellation implies refund, initiate refund via Payment Gateway
            res.status(200).json({ success: true, message: result.message || "Recharge cancelled. Refund will be processed if applicable." });
        } else {
            res.status(400).json({ success: false, message: result.message || "Cancellation failed at operator level." });
        }
    } catch (error) {
        next(error);
    }
};

// --- Conceptual Backend Worker Logic for Scheduled Recharges ---
// This would NOT be an HTTP endpoint. It's logic for a separate worker process.
// For demonstration, it's included as a conceptual function here.
async function _executeScheduledRechargeJob_WORKER_LOGIC() {
    console.log("[Worker] Checking for due scheduled recharges...");
    const now = Timestamp.now();
    const q = query(
        db.collection('scheduledRecharges'),
        where('isActive', '==', true),
        where('nextRunDate', '<=', now),
        orderBy('nextRunDate'),
        limit(10) // Process in batches
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        console.log("[Worker] No scheduled recharges due.");
        return;
    }
    console.log(`[Worker] Found ${snapshot.docs.length} recharges to process.`);

    for (const docSnap of snapshot.docs) {
        const schedule = { id: docSnap.id, ...docSnap.data() };
        console.log(`[Worker] Processing schedule ${schedule.id} for user ${schedule.userId}`);
        const scheduleDocRef = doc(db, 'scheduledRecharges', schedule.id);
        try {
            // TODO: Securely retrieve/use schedule.paymentMethodReference for payment
            // This is a critical security point. For example, use a pre-authorized UPI mandate ID.
            // For this simulation, we'll assume payment method is 'wallet' or use default UPI
            const paymentDetails = {
                type: schedule.type, identifier: schedule.identifier, amount: schedule.amount,
                billerId: schedule.billerId, planId: schedule.planId,
                paymentMethod: 'wallet', // SIMPLIFICATION: Assume wallet or handle stored reference
                userId: schedule.userId, // Pass userId for processRecharge context
                // Do NOT pass PINs or sensitive data here.
            };
            
            // Mock a call to a modified processRecharge or a dedicated internal function
            // that handles payment and provider interaction for scheduled tasks.
            // The real processRecharge needs user context (req.user.uid)
            // For a worker, you might need an internal version or a way to act on behalf of user.
            // For this simulation, let's conceptualize calling an internal function:
            // const rechargeResult = await _internalProcessRechargeForWorker(paymentDetails);
            
            // Simplified mock result for now for the worker part:
            const mockRechargeResult = Math.random() > 0.1 ? { status: 'Completed', id: `WORKERTX_${Date.now()}` } : { status: 'Failed', id: `WORKERTX_FAIL_${Date.now()}`, message: 'Simulated worker failure' };


            let nextRunDate = null;
            if (schedule.frequency === 'monthly') {
                const currentNextRun = schedule.nextRunDate.toDate();
                nextRunDate = Timestamp.fromDate(new Date(currentNextRun.setMonth(currentNextRun.getMonth() + 1)));
            } else if (schedule.frequency === 'weekly') {
                 const currentNextRun = schedule.nextRunDate.toDate();
                nextRunDate = Timestamp.fromDate(new Date(currentNextRun.setDate(currentNextRun.getDate() + 7)));
            }
            
            await updateDoc(scheduleDocRef, {
                lastRunStatus: mockRechargeResult.status,
                lastRunTransactionId: mockRechargeResult.id,
                lastRunDate: serverTimestamp(),
                nextRunDate: nextRunDate, // Set to null if not recurring or if error stops it
                updatedAt: serverTimestamp(),
                // Optionally deactivate if it was a one-time schedule or permanent failure
                // isActive: nextRunDate ? true : false,
            });
            console.log(`[Worker] Processed schedule ${schedule.id}. Status: ${mockRechargeResult.status}. Next run: ${nextRunDate ? nextRunDate.toDate() : 'N/A'}`);
            // TODO: Send notification to user schedule.userId about success/failure
        } catch (error) {
            console.error(`[Worker] Error processing schedule ${schedule.id}:`, error);
            await updateDoc(scheduleDocRef, {
                lastRunStatus: `Failed: ${error.message}`,
                lastRunDate: serverTimestamp(),
                updatedAt: serverTimestamp(),
                 // isActive: false, // Optionally deactivate on persistent error
            });
        }
    }
}
// Example: Call this function periodically if running as a cron job (e.g., every 5 minutes)
// if (process.env.RUN_RECHARGE_WORKER === 'true') { setInterval(_executeScheduledRechargeJob_WORKER_LOGIC, 5 * 60 * 1000); }


function capitalize(s) {
  if (typeof s !== 'string' || s.length === 0) return '';
  return s.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
