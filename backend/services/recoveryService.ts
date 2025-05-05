

const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('./transactionLogger'); // Use centralized logger
// Import a hypothetical UPI Provider Service for debiting
const upiProviderService = require('./upiProviderService'); // Ensure this service has initiateDebit
// Import wallet controller for internal crediting
const { payViaWalletInternal } = require('../controllers/walletController'); // Import payViaWalletInternal
const { getLinkedAccounts } = require('./upi'); // To get user's accounts

// Import Firestore types and functions correctly
const { collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp, writeBatch, doc, runTransaction, limit, orderBy, updateDoc } = require('firebase/firestore');

// Import date-fns if needed (or use native Date methods)
const { addDays } = require('date-fns'); // Assuming date-fns is installed

interface RecoveryTask {
    id?: string; // Firestore document ID
    userId: string;
    amount: number;
    originalRecipientUpiId: string;
    recoveryStatus: 'Scheduled' | 'Processing' | 'Completed' | 'Failed';
    scheduledTime: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    failureReason?: string;
    bankUpiId?: string; // The bank account used/attempted for recovery
    recoveryTransactionId?: string; // ID of the successful debit transaction
    walletCreditTransactionId?: string; // ID of the successful wallet credit transaction
}

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
async function scheduleRecovery(userId: string, amount: number, originalRecipientUpiId: string, recoverySourceUpiId?: string): Promise<boolean> {
    if (!userId || amount <= 0) {
        console.error("Invalid parameters for scheduling recovery.");
        return false;
    }
    console.log(`Scheduling recovery of ₹${amount} for user ${userId}`);

    // Calculate next midnight for scheduling
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 1, 0); // Set to 00:00:01 of the next day

    const recoveryData: Omit<RecoveryTask, 'id' | 'createdAt' | 'updatedAt' | 'recoveryTransactionId' | 'walletCreditTransactionId'> = {
        userId: userId,
        amount: amount,
        originalRecipientUpiId: originalRecipientUpiId,
        recoveryStatus: 'Scheduled',
        scheduledTime: Timestamp.fromDate(nextMidnight),
        bankUpiId: recoverySourceUpiId // Store intended source if provided
    };

    try {
        const recoveryColRef = collection(db, 'recoveryTasks');
        // Add timestamps automatically upon creation
        const docRef = await addDoc(recoveryColRef, {
            ...recoveryData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        console.log("Recovery task scheduled with ID:", docRef.id);
        return true;
    } catch (error) {
        console.error("Error scheduling recovery task:", error);
        return false;
    }
}

/**
 * Processes pending recovery tasks. Intended for BACKEND execution (e.g., scheduled Cloud Function).
 * Finds scheduled tasks past their execution time and attempts recovery.
 */
async function processPendingRecoveries(): Promise<void> {
    console.log("Processing pending recovery tasks...");
    const now = Timestamp.now();
    const recoveryColRef = collection(db, 'recoveryTasks');
    const q = query(recoveryColRef,
        where('recoveryStatus', '==', 'Scheduled'),
        where('scheduledTime', '<=', now),
        orderBy('scheduledTime'), // Process older ones first
        limit(10) // Process in batches
    );

    try {
        const querySnapshot = await getDocs(q);
        console.log(`Found ${querySnapshot.docs.length} pending recovery tasks.`);

        if (querySnapshot.empty) {
            return;
        }

        const batch = writeBatch(db);

        // Collect promises for asynchronous recovery attempts
        const recoveryPromises = [];

        for (const taskDoc of querySnapshot.docs) {
            const task = { id: taskDoc.id, ...taskDoc.data() } as RecoveryTask;
            const taskRef = doc(db, 'recoveryTasks', task.id!);

            console.log(`Marking task ${task.id} as 'Processing' for user ${task.userId}, amount ₹${task.amount}`);
            batch.update(taskRef, { recoveryStatus: 'Processing', updatedAt: serverTimestamp() });

            // Push the async recovery attempt promise to the array
            recoveryPromises.push(attemptRecoveryForTask(task));
        }

        // Commit the status updates ('Processing') first
        await batch.commit();
        console.log("Marked tasks as 'Processing'. Starting recovery attempts...");

        // Wait for all recovery attempts to complete (or fail)
        await Promise.allSettled(recoveryPromises);
        console.log("Finished processing batch of recovery attempts.");

    } catch (error) {
        console.error("Error fetching/batch-updating pending recovery tasks:", error);
    }
}

/**
 * Attempts the actual recovery for a single task. Intended for BACKEND.
 * Debits bank, credits wallet, updates task status in Firestore.
 */
async function attemptRecoveryForTask(task: RecoveryTask): Promise<void> {
    console.log(`Attempting recovery for task ${task.id}...`);
    let recoverySuccess = false;
    let failureMessage = 'Unknown recovery error';
    let debitTxId: string | undefined;
    let creditTxId: string | undefined;
    let finalBankUpiId = task.bankUpiId; // Store the UPI ID used

    try {
        // 1. Determine Recovery Source Account
        if (!finalBankUpiId) {
            const userAccounts = await getLinkedAccounts(); // Fetch user's accounts (ensure this works backend)
            const defaultAccount = userAccounts.find(acc => acc.isDefault);
            if (!defaultAccount) throw new Error("No default bank account found for recovery.");
            finalBankUpiId = defaultAccount.upiId;
            console.log(`Using default account ${finalBankUpiId} for recovery task ${task.id}`);
        }

        // 2. Debit from User's Bank Account using the service
        const debitResult = await upiProviderService.initiateDebit(finalBankUpiId, task.amount, `ZetPayWalletRecovery_${task.id}`);
        if (!debitResult.success) {
            throw new Error(debitResult.message || 'Bank debit failed during recovery.');
        }
        debitTxId = debitResult.transactionId;
        console.log(`[Recovery] Debit successful for task ${task.id}. Tx ID: ${debitTxId}`);


        // 3. Credit to User's Zet Pay Wallet (using internal function from walletController)
        console.log(`[Recovery] Crediting ₹${task.amount} back to user ${task.userId}'s wallet for task ${task.id}...`);
         // Use payViaWalletInternal with negative amount to simulate credit/top-up via internal logic
        const creditResult = await payViaWalletInternal(task.userId, 'WALLET_RECOVERY_CREDIT', -task.amount, `Recovery Credit from ${finalBankUpiId}`);
        if (!creditResult.success) {
            // CRITICAL: Debit succeeded, but wallet credit failed. Needs manual intervention/alerting.
            failureMessage = `Wallet credit failed after successful bank debit (Msg: ${creditResult.message}). Manual intervention required. Debit Tx: ${debitTxId}`;
            throw new Error(failureMessage);
        }
        creditTxId = creditResult.transactionId;
        console.log(`[Recovery] Wallet credit successful for task ${task.id}. Tx ID: ${creditTxId}`);

        // 4. Mark Recovery as Successful
        recoverySuccess = true;

    } catch (recoveryError: any) {
        console.error(`Recovery failed for task ${task.id}:`, recoveryError.message);
        failureMessage = recoveryError.message || failureMessage;
        recoverySuccess = false;
        // TODO: Implement alerting for critical failures (debit success, credit fail)
    }

    // 5. Update Task Status in Firestore
    try {
        const taskRef = doc(db, 'recoveryTasks', task.id!);
        await updateDoc(taskRef, {
            recoveryStatus: recoverySuccess ? 'Completed' : 'Failed',
            failureReason: recoverySuccess ? null : failureMessage,
            updatedAt: serverTimestamp(),
            bankUpiId: finalBankUpiId, // Record the final account used/attempted
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
    processPendingRecoveries, // Keep export if triggered externally by scheduler
    // attemptRecoveryForTask is internal, not exported directly
};

// Helper functions (if date-fns not available backend)
// function addDays(date: Date, days: number): Date {
//   const result = new Date(date);
//   result.setDate(result.getDate() + days);
//   return result;
// }

// Example of formatting if needed without date-fns
// function format(date: Date, formatString: string): string {
//     if (formatString === 'PP') return date.toLocaleDateString('en-CA'); // YYYY-MM-DD
//     return date.toISOString();
// }
        