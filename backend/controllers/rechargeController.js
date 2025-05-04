
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger');
const { getWalletBalance, payViaWallet } = require('./walletController'); // For potential wallet usage
const { scheduleRecovery } = require('../services/recoveryService'); // For fallback recovery

// Placeholder for actual Biller/Plan Aggregator Service
const rechargeProviderService = require('../services/rechargeProviderService');
const { checkKYCAndBridgeStatus } = require('../services/userService');

// Get Billers (cached or fetched from provider)
exports.getBillers = async (req, res, next) => {
    const { type } = req.query; // e.g., Mobile, DTH, Electricity
    if (!type || typeof type !== 'string') {
        return res.status(400).json({ message: 'Biller type is required.' });
    }
    try {
        // Fetch from a dedicated service that might cache results
        const billers = await rechargeProviderService.fetchBillers(type);
        res.status(200).json(billers);
    } catch (error) {
        next(error);
    }
};

// Get Recharge Plans (fetched from provider)
exports.getRechargePlans = async (req, res, next) => {
     const { billerId, type, identifier } = req.query; // identifier might be needed for circle-specific plans
     if (!billerId || typeof billerId !== 'string' || !type || typeof type !== 'string') {
         return res.status(400).json({ message: 'Biller ID and type are required.' });
     }
     try {
         const plans = await rechargeProviderService.fetchPlans(billerId, type, identifier);
         res.status(200).json(plans);
     } catch (error) {
         next(error);
     }
 };

// Process Recharge
exports.processRecharge = async (req, res, next) => {
    const userId = req.user.uid;
    const { type, identifier, amount, billerId, planId, paymentMethod = 'wallet' } = req.body; // Assume wallet default, add sourceAccountUpiId if 'upi'

    if (!type || !identifier || !amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: 'Type, identifier, and valid amount are required.' });
    }
    // BillerId might be optional for some types if auto-detected
    if ((type === 'mobile' || type === 'dth' || type === 'fastag') && !billerId) {
         return res.status(400).json({ message: 'Biller ID (Operator) is required for this recharge type.' });
    }

    let paymentSuccess = false;
    let paymentResult = {}; // Store payment details
    let finalStatus = 'Failed';
    let failureReason = 'Payment or recharge processing failed.';
    let logData = { // Prepare data for Firestore logging
        type: 'Recharge',
        name: billerId || capitalize(type), // Use billerId or type
        description: `${capitalize(type)} recharge for ${identifier}`,
        amount: -amount,
        status: 'Failed',
        userId,
        billerId,
        upiId: identifier, // Store identifier here or in a dedicated field
        planId,
    };

    try {
        // --- Step 1: Payment Processing ---
        if (paymentMethod === 'wallet') {
            const walletResult = await payViaWallet(userId, billerId || identifier, amount, `Recharge: ${type}`);
            if (!walletResult.success) throw new Error(walletResult.message || 'Wallet payment failed.');
            paymentSuccess = true;
            paymentResult = walletResult;
            logData.description += ' (via Wallet)';
        } else if (paymentMethod === 'upi') {
             const { sourceAccountUpiId, pin } = req.body;
             if (!sourceAccountUpiId || !pin) throw new Error('Source UPI ID and PIN required for UPI payment.');
             // This needs the full processUpiPayment logic from upiController, including fallback
             // For simplicity, let's assume a direct call or refactor UPI payment logic
             // to a reusable service function.
             // const upiResult = await processUpiPaymentInternal(userId, billerId || identifier, amount, pin, sourceAccountUpiId, `Recharge: ${type}`);
             // if (!upiResult.success && !upiResult.usedWalletFallback) throw new Error(upiResult.message || 'UPI payment failed.');
             // paymentSuccess = upiResult.success || upiResult.usedWalletFallback;
             // paymentResult = upiResult;
             // if(upiResult.usedWalletFallback) logData.description += ' (via Wallet Fallback)';
             // else logData.description += ' (via UPI)';
             throw new Error("UPI payment for recharge not fully implemented in this controller yet."); // Placeholder
        } else {
            throw new Error('Invalid payment method specified.');
        }

        // --- Step 2: Recharge Execution (if payment was successful) ---
        if (paymentSuccess) {
            console.log("Payment successful, proceeding with recharge API call...");
            const rechargeResult = await rechargeProviderService.executeRecharge({
                type, identifier, amount, billerId, planId, transactionId: paymentResult.transactionId || paymentResult.walletTransactionId
            });

            if (rechargeResult.status === 'Completed' || rechargeResult.status === 'Pending' || rechargeResult.status === 'Processing Activation') {
                finalStatus = rechargeResult.status;
                failureReason = ''; // Clear failure reason
                logData.status = finalStatus;
                logData.description = rechargeResult.operatorMessage || logData.description.replace(' (via Wallet)', ''); // Use operator message if available
                paymentResult.message = rechargeResult.message || 'Recharge successful/pending.'; // Update payment result message
            } else {
                // Recharge failed after successful payment -> Requires Refund/Reversal
                finalStatus = 'Failed';
                failureReason = rechargeResult.message || 'Recharge failed after payment deduction.';
                logData.status = 'Failed';
                logData.description += ` - Recharge Failed: ${failureReason}`;
                console.error(`CRITICAL: Payment successful but recharge failed for user ${userId}, amount ${amount}, txID ${paymentResult.transactionId || paymentResult.walletTransactionId}. Reason: ${failureReason}. Initiating refund simulation.`);
                // TODO: Trigger refund process back to the original payment source.
                paymentResult.message = failureReason + " Refund initiated."; // Update message
            }
        } else {
             // Payment itself failed, handled in the catch block below
             throw new Error(paymentResult.message || "Payment failed before recharge attempt.");
        }

        // --- Step 3: Logging ---
        const loggedTx = await addTransaction(logData);
        paymentResult.transactionId = loggedTx.id; // Use Firestore ID

        // Blockchain log (optional)
        logTransactionToBlockchain(loggedTx.id, { userId, type: logData.type, amount, date: new Date(), recipient: logData.name })
             .catch(err => console.error("Blockchain log failed:", err));

        res.status(200).json({ status: finalStatus, message: paymentResult.message, transactionId: loggedTx.id });

    } catch (error) {
        console.error(`Recharge processing failed for user ${userId}:`, error.message);
        logData.description = `Recharge Failed - ${error.message}`;
        logData.status = 'Failed';
        // Attempt to log the failed transaction
        try {
            const failedTx = await addTransaction(logData);
            paymentResult.transactionId = failedTx.id;
        } catch (logError) {
            console.error("Failed to log failed recharge transaction:", logError);
        }
        // Return failure response
        res.status(400).json({ status: 'Failed', message: error.message || failureReason, transactionId: paymentResult.transactionId });
    }
};

exports.scheduleRecharge = async (req, res, next) => {
     const userId = req.user.uid;
     const { identifier, amount, frequency, startDate, billerId, planId, type } = req.body;

     if (!identifier || !amount || !frequency || !startDate || !type) {
         return res.status(400).json({ message: 'Missing required fields for scheduling.' });
     }
     if (amount <= 0) return res.status(400).json({ message: 'Invalid amount.' });
     if (!['monthly', 'weekly', 'daily'].includes(frequency)) return res.status(400).json({ message: 'Invalid frequency.' });

     try {
         const startDateTime = new Date(startDate);
         if (isNaN(startDateTime.getTime()) || startDateTime < new Date()) {
             return res.status(400).json({ message: 'Invalid start date.' });
         }

         const scheduleData = {
             userId,
             type, // Store the type (mobile, dth etc.)
             identifier,
             amount,
             frequency,
             nextRunDate: admin.firestore.Timestamp.fromDate(startDateTime),
             billerId: billerId || null,
             planId: planId || null,
             isActive: true,
             createdAt: admin.firestore.FieldValue.serverTimestamp(),
             updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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

         await scheduleDocRef.update({
             isActive: false,
             updatedAt: admin.firestore.FieldValue.serverTimestamp()
         });
         res.status(200).json({ success: true, message: 'Scheduled recharge cancelled.' });
     } catch (error) {
         next(error);
     }
 };

exports.checkActivationStatus = async (req, res, next) => {
    const { transactionId } = req.params;
    if (!transactionId) return res.status(400).json({ message: 'Transaction ID required.' });

    try {
        const status = await rechargeProviderService.getActivationStatus(transactionId);
        res.status(200).json({ status });
    } catch (error) {
         // Check Firestore as fallback or primary source if provider check fails
        try {
            const txDoc = await db.collection('transactions').doc(transactionId).get();
            if(txDoc.exists()) {
                res.status(200).json({ status: txDoc.data().status });
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

    if (!transactionId) return res.status(400).json({ message: 'Transaction ID required.' });

    try {
        // Fetch transaction to check ownership and status
        const txDocRef = db.collection('transactions').doc(transactionId);
        const txDoc = await txDocRef.get();

        if (!txDoc.exists() || txDoc.data().userId !== userId) {
            return res.status(404).json({ message: 'Transaction not found or permission denied.' });
        }

        const txData = txDoc.data();
        if (txData.type !== 'Recharge') {
             return res.status(400).json({ message: 'Only recharge transactions can be cancelled.' });
        }
        if (txData.status === 'Cancelled' || txData.status === 'Failed') {
            return res.status(400).json({ message: `Cannot cancel a transaction with status: ${txData.status}.` });
        }

        // Check cancellation window (e.g., 30 mins)
        const transactionDate = txData.date.toDate();
        const now = new Date();
        const minutesPassed = (now.getTime() - transactionDate.getTime()) / 60000;
        const CANCELLATION_WINDOW_MINUTES = 30;
        if (minutesPassed > CANCELLATION_WINDOW_MINUTES) {
             return res.status(400).json({ message: `Cancellation window (${CANCELLATION_WINDOW_MINUTES} minutes) has passed.` });
        }


        // Call provider service to attempt cancellation
        const result = await rechargeProviderService.cancelRecharge(transactionId);

        if (result.success) {
            // Update Firestore status
            await txDocRef.update({
                status: 'Cancelled',
                description: `${txData.description} (Cancelled by User)`,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(), // Assuming you have updatedAt
            });
            res.status(200).json({ success: true, message: result.message || "Recharge cancelled. Refund will be processed if applicable." });
            // TODO: Trigger refund process if needed
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
