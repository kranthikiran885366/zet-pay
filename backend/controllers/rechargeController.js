
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
const smsNotificationService = require('../services/smsNotificationService'); // Added SMS service
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
        // Conceptual: In a real app, this might also query user's saved contacts or common recharges
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
    // Refined paymentResult structure to align with real gateway responses potentially
    let paymentResult = { 
        success: false, 
        transactionId: null, // This will be OUR system's transaction ID
        message: 'Payment processing failed initially.', 
        usedWalletFallback: false, 
        pspTransactionId: null, // ID from actual PSP/Gateway
        errorCode: null, 
        mightBeDebited: false,
        paymentMethodUsed: paymentMethod // Store the method attempted/used
    };
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
        // This allows tracking even if payment gateway interaction fails mid-way.
        const initialTxLog = await addTransaction(logData);
        paymentTransactionId = initialTxLog.id;
        logData.status = initialTxLog.status; // Update logData status from what was logged

        // Step 2: Process Payment via selected method
        // In a REAL app, this section would involve:
        // 1. Calling your paymentGatewayService.js (which wraps Razorpay, Stripe, etc.)
        // 2. The paymentGatewayService would handle:
        //    - Creating an order/intent with the PG.
        //    - Returning necessary details to client for SDK interaction (e.g., order_id for Razorpay Checkout, client_secret for Stripe).
        //    - Client-side, user completes payment via PG's UI (enters OTP, PIN, card details).
        //    - PG sends a webhook to your backend to confirm payment status.
        //    - Only after webhook confirmation of successful payment, proceed to Step 3 (Recharge Provider).
        // For this simulation, we use internal mock payment functions directly.
        if (paymentMethod === 'wallet') {
            paymentResult = await payViaWalletInternal(userId, `recharge_${type}_${identifier}`, amount, rechargeName, 'Recharge');
        } else if (paymentMethod === 'upi') {
            if (!sourceAccountUpiId || !pin) throw new Error('Source UPI ID and PIN required for UPI payment.');
            // `processUpiPaymentInternal` simulates direct UPI call and potential fallback.
            // A real PG integration for UPI would be different (e.g., generating QR or push to UPI app).
            paymentResult = await processUpiPaymentInternal(userId, billerId || identifier, amount, pin, sourceAccountUpiId, rechargeName, 'Recharge');
            if (paymentResult.usedWalletFallback) { // If UPI failed and fell back to wallet
                logData.paymentMethodUsed = 'Wallet';
                logData.description += ' (Paid via Wallet Fallback)';
                await scheduleRecovery(userId, amount, billerId || identifier, sourceAccountUpiId);
            }
        } else if (paymentMethod === 'card') {
            if (!cardToken || !cvv) throw new Error('Card token and CVV required for Card payment.');
            // `processCardPaymentInternal` simulates direct card charge (mocked).
            // Real PG would handle 3DS, tokenization.
            paymentResult = await processCardPaymentInternal(userId, cardToken, amount, cvv, rechargeName);
            logData.paymentMethodUsed = 'Card';
        } else {
            throw new Error('Invalid payment method specified.');
        }

        // Update our main payment transaction log with the actual outcome from the "payment step"
        await updateDoc(doc(db, 'transactions', paymentTransactionId), {
            status: paymentResult.success ? 'PaymentCompleted_ProviderPending' : 'Failed', // Custom intermediate status
            failureReason: !paymentResult.success ? paymentResult.message : null,
            pspTransactionId: paymentResult.pspTransactionId || null, // Log actual PSP ID if returned
            paymentMethodUsed: paymentResult.paymentMethodUsed || logData.paymentMethodUsed,
            description: logData.description + (!paymentResult.success ? ` - Payment Error: ${paymentResult.message}` : ''),
            updatedAt: serverTimestamp()
        });
        // Send immediate update after payment attempt
        sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(await getDoc(doc(db, 'transactions', paymentTransactionId))) });

        if (!paymentResult.success) {
            // If payment itself failed, no need to proceed to recharge provider
            throw new Error(paymentResult.message || 'Payment processing failed.');
        }
        paymentSuccess = true;
        console.log(`[Recharge Ctrl] Payment successful. Payment Tx ID: ${paymentTransactionId}. Proceeding to recharge provider.`);

        // Step 3: Call Recharge Provider API (e.g., PaySprint, BBPS)
        // `rechargeProviderService.executeRecharge` now conceptually tries a real API.
        rechargeExecutionResult = await rechargeProviderService.executeRecharge({
             type, identifier, amount, billerId, planId, transactionId: paymentTransactionId // Pass OUR transaction ID as client_ref_id
        });

        const originalTxRef = doc(db, 'transactions', paymentTransactionId); // Re-fetch for current description
        const currentTxDataSnap = await getDoc(originalTxRef);
        const currentDescription = currentTxDataSnap.data()?.description || logData.description;

        if (['Completed', 'Pending', 'Processing Activation'].includes(rechargeExecutionResult.status)) {
            finalStatus = rechargeExecutionResult.status;
            await updateDoc(originalTxRef, {
                 status: finalStatus,
                 description: `${currentDescription} - Operator Status: ${finalStatus}${rechargeExecutionResult.operatorMessage ? ` (${rechargeExecutionResult.operatorMessage})` : ''}`,
                 operatorReferenceId: rechargeExecutionResult.operatorReferenceId || null, // Log operator's txn ID
                 updatedAt: serverTimestamp()
            });

            // Send SMS Notification on successful recharge
            if (finalStatus === 'Completed' && type === 'mobile') { // Only for mobile recharge success
                try {
                    // Construct a user-friendly message
                    const smsMessage = `Your ${selectedBillerName || 'mobile'} recharge of Rs.${amount} for ${identifier} is successful. Transaction ID: ${paymentTransactionId}. Thank you for using Zet Pay!`;
                    // The `identifier` for mobile recharge is the phone number.
                    // Ensure it's in E.164 format if Twilio requires (e.g., +91XXXXXXXXXX)
                    // For now, assuming identifier is a valid local number that Twilio can handle with a default country code.
                    const formattedPhoneNumber = identifier.startsWith('+') ? identifier : `+91${identifier}`; // Basic E.164 assumption
                    
                    await smsNotificationService.sendTransactionalSms(formattedPhoneNumber, smsMessage);
                    console.log(`[Recharge Ctrl] SMS notification sent for successful mobile recharge to ${formattedPhoneNumber}.`);
                } catch (smsError) {
                    console.error(`[Recharge Ctrl] Failed to send SMS notification for Tx ${paymentTransactionId}:`, smsError);
                    // Do not fail the whole recharge process if SMS fails.
                }
            }

        } else { // Recharge execution failed after payment
            finalStatus = 'Failed';
            failureReason = rechargeExecutionResult.message || 'Recharge failed at provider.';
            console.error(`[Recharge Ctrl] CRITICAL: Payment successful (Tx: ${paymentTransactionId}) but recharge execution failed. Reason: ${failureReason}.`);
            await updateDoc(originalTxRef, {
                 status: 'Failed', // Mark transaction as failed
                 description: `${currentDescription} - Execution Failed: ${failureReason}`,
                 failureReason: failureReason,
                 operatorReferenceId: rechargeExecutionResult.operatorReferenceId || null,
                 updatedAt: serverTimestamp()
            });
            // TODO: Implement Real Refund Logic based on paymentMethodUsed
            // This would call the Payment Gateway's refund API.
            console.warn(`[Recharge Ctrl] REFUND NEEDED for Tx ${paymentTransactionId} (Amount: ${amount}, Method: ${paymentResult.paymentMethodUsed}). Simulating logging a refund reversal if it was wallet.`);
            if (paymentResult.paymentMethodUsed === 'Wallet') { // If paid via wallet or wallet fallback
                 await payViaWalletInternal(userId, `REFUND_${paymentTransactionId}`, -amount, `Refund: Failed ${type} Recharge for ${rechargeName}`, 'Refund');
                 rechargeExecutionResult.message = failureReason + " Wallet refund initiated.";
            } else {
                 rechargeExecutionResult.message = failureReason + " Manual refund process required for non-wallet payment.";
            }
            // This error will be caught by the main catch block and sent to client
            throw new Error(rechargeExecutionResult.message);
        }
        
        // Final update to client and blockchain log
        const finalTxDoc = await getDoc(originalTxRef);
        const finalTxData = convertFirestoreDocToTransaction(finalTxDoc);
        sendToUser(userId, { type: 'transaction_update', payload: finalTxData });
        // Log to blockchain (conceptual)
        logTransactionToBlockchain(paymentTransactionId, finalTxData).catch(err => console.error("[Recharge Ctrl] Blockchain log failed:", err));
        res.status(200).json({ ...finalTxData, message: rechargeExecutionResult.message || "Recharge processed."});

    } catch (error) {
        console.error(`[Recharge Ctrl] ${type} processing error for user ${userId}:`, error.message);
        const finalErrorMessage = error.message || failureReason;

        if (paymentTransactionId) { // If an initial transaction was logged
             try {
                 const txDocRef = doc(db, 'transactions', paymentTransactionId);
                 const txSnap = await getDoc(txDocRef);
                 // Only update if status is not already 'Failed' to avoid overwriting specific failure reasons
                 if(txSnap.exists() && txSnap.data().status !== 'Failed') {
                     await updateDoc(txDocRef, { 
                        status: 'Failed', 
                        failureReason: finalErrorMessage, 
                        description: `${txSnap.data().description || logData.description} - Overall Error: ${finalErrorMessage}`,
                        updatedAt: serverTimestamp() 
                    });
                     sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(await getDoc(txDocRef)) });
                 } else if (txSnap.exists()) {
                     // If already failed, just send current state
                     sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(txSnap) });
                 }
             } catch(updateError) {
                  console.error(`[Recharge Ctrl] Failed to update main transaction ${paymentTransactionId} to Failed:`, updateError);
             }
            const currentFailedTx = await getDoc(doc(db, 'transactions', paymentTransactionId));
            res.status(400).json({ ...(currentFailedTx.exists() ? convertFirestoreDocToTransaction(currentFailedTx) : { id: paymentTransactionId, status: 'Failed' }), message: finalErrorMessage });
        } else { // If payment failed before even logging initial transaction (should be rare with new flow)
            // Attempt to log a single 'Failed' transaction now
            logData.status = 'Failed';
            logData.failureReason = finalErrorMessage;
            try {
                const failedTx = await addTransaction(logData);
                paymentTransactionId = failedTx.id; // Assign the ID of the newly logged failed transaction
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
        const paymentMethodReference = "MANDATE_ID_OR_CARD_TOKEN_PLACEHOLDER"; // This would come from user selection during setup

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
        
        // This now conceptually calls a real provider API
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
        
        // TODO: Implement REAL cancellation window logic (e.g., 5-30 mins for pending/processing) - provider specific
        // For now, we rely on the provider service to reject if not cancellable.

        const result = await rechargeProviderService.cancelRecharge(transactionId, txData.operatorReferenceId);
        if (result.success) {
            await updateDoc(txDocRef, { status: 'Cancelled', description: `${txData.description} (Cancelled by User)`, updatedAt: serverTimestamp() });
            sendToUser(userId, { type: 'transaction_update', payload: convertFirestoreDocToTransaction(await getDoc(txDocRef)) });
            // TODO: If cancellation implies refund, initiate refund via Payment Gateway
            // For simulation: if original payment was wallet, refund to wallet.
            if (txData.paymentMethodUsed === 'Wallet') {
                await payViaWalletInternal(userId, `REFUND_CANCEL_${transactionId}`, -Math.abs(txData.amount), `Refund for Cancelled Recharge: ${txData.name}`, 'Refund');
            }
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
    console.log("[Worker - Recharge] Checking for due scheduled recharges...");
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
        // console.log("[Worker - Recharge] No scheduled recharges due.");
        return;
    }
    console.log(`[Worker - Recharge] Found ${snapshot.docs.length} recharges to process.`);

    for (const docSnap of snapshot.docs) {
        const schedule = { id: docSnap.id, ...docSnap.data() };
        console.log(`[Worker - Recharge] Processing schedule ${schedule.id} for user ${schedule.userId}`);
        const scheduleDocRef = doc(db, 'scheduledRecharges', schedule.id);
        
        // Simulate "acting as the user" or using a secure, non-interactive payment method reference
        // This is a CRITICAL part for a real system.
        // It would involve using the `schedule.paymentMethodReference` (e.g., a UPI mandate URN or tokenized card)
        // to perform the payment without further user interaction.
        const mockUserContext = { user: { uid: schedule.userId } }; // Simulate Express request context for processRecharge
        const mockReqBody = {
            type: schedule.type, identifier: schedule.identifier, amount: schedule.amount,
            billerId: schedule.billerId, planId: schedule.planId,
            // CRITICAL: Do NOT pass PIN. Use stored payment method reference.
            // For simulation, we might default to 'wallet' or assume UPI mandate.
            paymentMethod: 'wallet', // Placeholder for actual stored preference/mandate type
            // sourceAccountUpiId: 'upi_mandate_id_from_schedule.paymentMethodReference',
        };

        let rechargeResult = { status: 'Failed', id: null, message: 'Worker processing error' };
        let errorOccurred = false;

        try {
            // Call a version of processRecharge or an internal service designed for worker execution
            // This conceptual call would need to be adapted. The existing processRecharge expects `req, res, next`.
            // For now, let's directly conceptualize the core logic:
            // 1. Payment based on schedule.paymentMethodReference
            // 2. Provider call rechargeProviderService.executeRecharge
            // 3. Log transaction via addTransaction
            // 4. Send WebSocket update via sendToUser

            console.log(`[Worker - Recharge] SIMULATING execution of recharge for schedule ${schedule.id}. Real Payment/Recharge Provider calls would happen here.`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing
            const simSuccess = Math.random() > 0.1; // 90% success for simulation
            if (simSuccess) {
                rechargeResult = { status: 'Completed', id: `WORKERTX_${Date.now()}`, message: 'Scheduled recharge successful.' };
                // Simulate logging and WS update that processRecharge would do
                await addTransaction({
                    userId: schedule.userId, type: 'Recharge', name: `${capitalize(schedule.type)} (Scheduled)`,
                    description: `Scheduled for ${schedule.identifier}`, amount: -schedule.amount, status: 'Completed',
                    billerId: schedule.billerId, planId: schedule.planId, paymentMethodUsed: 'Scheduled (Wallet/Mandate)',
                    originalTransactionId: `SCHED_${schedule.id}`
                });
                 sendToUser(schedule.userId, { type: 'transaction_update', payload: { id: rechargeResult.id, status: 'Completed', name: 'Scheduled Recharge', amount: -schedule.amount, date: new Date().toISOString()} });
            } else {
                throw new Error("Simulated operator failure for scheduled recharge.");
            }

            let nextRunDate = null;
            if (schedule.frequency === 'monthly') {
                const currentNextRun = schedule.nextRunDate.toDate();
                nextRunDate = Timestamp.fromDate(new Date(currentNextRun.setMonth(currentNextRun.getMonth() + 1)));
            } else if (schedule.frequency === 'weekly') {
                 const currentNextRun = schedule.nextRunDate.toDate();
                nextRunDate = Timestamp.fromDate(new Date(currentNextRun.setDate(currentNextRun.getDate() + 7)));
            }
            
            await updateDoc(scheduleDocRef, {
                lastRunStatus: rechargeResult.status,
                lastRunTransactionId: rechargeResult.id,
                lastRunDate: serverTimestamp(),
                nextRunDate: nextRunDate,
                updatedAt: serverTimestamp(),
                // isActive: nextRunDate ? true : false, // Deactivate if one-time or error maxed out
            });
            console.log(`[Worker - Recharge] Processed schedule ${schedule.id}. Status: ${rechargeResult.status}. Next run: ${nextRunDate ? nextRunDate.toDate() : 'N/A'}`);
            // TODO: Send notification to user schedule.userId about success/failure
        } catch (error) {
            console.error(`[Worker - Recharge] Error processing schedule ${schedule.id}:`, error);
            errorOccurred = true;
            rechargeResult.message = error.message;
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
  return s.split('-').map(word => word.charAt(0).toUpperCase