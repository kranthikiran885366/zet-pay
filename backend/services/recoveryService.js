
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('./transactionLogger'); // Use centralized logger
// Import a hypothetical UPI Provider Service for debiting
const upiProviderService = require('./upiProviderService');
// Import wallet controller for internal crediting
const walletController = require('../controllers/walletController');

/**
 * Schedules a recovery task in Firestore to deduct funds from the user's bank account
 * and credit them back to the Zet Pay wallet after a UPI limit fallback.
 *
 * @param userId The ID of the user.
 * @param amount The amount to recover.
 * @param originalRecipientUpiId UPI ID of the original payment recipient (for logging/reference).
 * @param recoverySourceUpiId Optional: Specific bank UPI ID to recover from (if not provided, will attempt default).
 * @returns A promise that resolves to true if scheduling was successful, false otherwise.
 */
async function scheduleRecovery(userId, amount, originalRecipientUpiId, recoverySourceUpiId) {
    if (!userId || amount <= 0) {
        console.error("Invalid parameters for scheduling recovery.");
        return false;
    }
    console.log(`Scheduling recovery of ₹${amount} for user ${userId} from ${recoverySourceUpiId || 'default account'}`);

    // Calculate next midnight for scheduling
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 1, 0); // Set to 00:00:01 of the next day

    const recoveryData = {
        userId: userId,
        amount: amount,
        originalRecipientUpiId: originalRecipientUpiId,
        recoveryStatus: 'Scheduled',
        scheduledTime: admin.firestore.Timestamp.fromDate(nextMidnight),
        bankUpiId: recoverySourceUpiId || null, // Store intended source if provided
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
        const recoveryColRef = db.collection('recoveryTasks');
        const docRef = await addDoc(recoveryColRef, recoveryData);
        console.log("Recovery task scheduled with ID:", docRef.id);
        return true;
    } catch (error) {
        console.error("Error scheduling recovery task:", error);
        return false;
    }
}

/**
 * Processes a single recovery task (intended for backend execution).
 * Attempts to debit bank, credit wallet, and update task status.
 */
async function attemptRecoveryForTask(task) {
    console.log(`Processing recovery task ${task.id} for user ${task.userId}, amount ₹${task.amount}`);
    let recoverySuccess = false;
    let failureMessage = 'Unknown recovery error';
    let debitTxId;
    let creditTxId;
    let recoverySourceUpiId = task.bankUpiId; // Start with the scheduled ID, if any

    try {
        // 1. Determine Recovery Source Account if not specified in task
        if (!recoverySourceUpiId) {
            const accountsColRef = db.collection('users').doc(task.userId).collection('linkedAccounts');
            const q = query(accountsColRef, where('isDefault', '==', true), limit(1));
            const defaultAccountSnap = await getDocs(q);
            if (defaultAccountSnap.empty) {
                // If no default, try any account (logic might need refinement)
                 const anyAccountSnap = await getDocs(query(accountsColRef, limit(1)));
                 if (anyAccountSnap.empty) throw new Error("No linked bank account found for recovery.");
                 recoverySourceUpiId = anyAccountSnap.docs[0].data().upiId;
                 console.log(`No default account found, using first linked account: ${recoverySourceUpiId}`);
            } else {
                 recoverySourceUpiId = defaultAccountSnap.docs[0].data().upiId;
                 console.log(`Using default account for recovery: ${recoverySourceUpiId}`);
            }
        }

        // 2. Debit from User's Bank Account (CRITICAL - Requires secure, non-interactive method)
        console.log(`[Recovery Sim] Attempting debit of ₹${task.amount} from ${recoverySourceUpiId} for task ${task.id}...`);
        // Replace with actual secure debit mechanism (e.g., mandate, PSP API)
        // const debitResult = await upiProviderService.initiateDebit(recoverySourceUpiId, task.amount, `WalletRecovery_${task.id}`);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate debit delay
        const debitSuccess = Math.random() > 0.1; // 90% success simulation
        if (!debitSuccess) throw new Error('Bank debit failed during recovery.');
        debitTxId = `REC_DEBIT_${Date.now()}`;
        console.log(`[Recovery Sim] Debit successful for task ${task.id}.`);

        // 3. Credit to User's Zet Pay Wallet (using internal function)
        console.log(`Crediting ₹${task.amount} back to user ${task.userId}'s wallet for task ${task.id}...`);
        const creditResult = await walletController.payViaWalletInternal(task.userId, 'WALLET_RECOVERY', -task.amount, `Recovery Credit from ${recoverySourceUpiId}`); // Use negative amount for credit simulation
        if (!creditResult.success) {
            failureMessage = `Wallet credit failed after successful bank debit (Msg: ${creditResult.message}). Manual intervention required.`;
            throw new Error(failureMessage);
        }
        creditTxId = creditResult.transactionId;
        console.log(`[Recovery Sim] Wallet credit successful for task ${task.id}.`);

        // 4. Mark Recovery as Successful
        recoverySuccess = true;

    } catch (recoveryError) {
        console.error(`Recovery failed for task ${task.id}:`, recoveryError.message);
        failureMessage = recoveryError.message || failureMessage;
        recoverySuccess = false;
        // TODO: Implement alerting for critical failures (debit success, credit fail)
    }

    // 5. Update Task Status in Firestore
    try {
        const taskRef = db.collection('recoveryTasks').doc(task.id);
        await taskRef.update({
            recoveryStatus: recoverySuccess ? 'Completed' : 'Failed',
            failureReason: recoverySuccess ? null : failureMessage,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            bankUpiId: recoverySourceUpiId, // Record the final account used/attempted
            recoveryTransactionId: debitTxId || null,
            walletCreditTransactionId: creditTxId || null,
        });
        console.log(`Updated status for recovery task ${task.id} to ${recoverySuccess ? 'Completed' : 'Failed'}.`);
    } catch (updateError) {
        console.error(`FATAL: Failed to update final status for recovery task ${task.id}:`, updateError);
        // Log this critical error for monitoring
    }
}


module.exports = {
    scheduleRecovery,
    processPendingRecoveries, // Keep export if triggered externally
    // attemptRecoveryForTask is internal, not exported directly
};
