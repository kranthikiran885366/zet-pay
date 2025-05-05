

/**
 * @fileOverview Service functions for scheduling and processing wallet recovery deductions using Firestore.
 */
import { db, auth } from '@/lib/firebase';
import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    getDocs,
    Timestamp,
    writeBatch, // Use writeBatch for atomic updates
    doc,
    runTransaction,
    limit,
    orderBy, // Import orderBy
    updateDoc
} from 'firebase/firestore';
import { getLinkedAccounts, BankAccount } from './upi'; // To get user's default bank account
import { topUpWallet } from './wallet'; // To credit back to the wallet
import { addTransaction, logTransactionToBlockchain } from '@/services/transactionLogger'; // To log recovery transaction

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
export async function scheduleRecovery(userId: string, amount: number, originalRecipientUpiId: string, recoverySourceUpiId?: string): Promise<boolean> {
    if (!userId || amount <= 0) {
        console.error("Invalid parameters for scheduling recovery.");
        return false;
    }
    console.log(`Scheduling recovery of ₹${amount} for user ${userId}`);

    // Calculate next midnight for scheduling
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 1, 0); // Set to 00:00:01 of the next day (slight buffer after midnight)

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
 * Processes pending recovery tasks. Intended for BACKEND execution.
 * Finds scheduled tasks past their execution time and attempts recovery.
 */
export async function processPendingRecoveries(): Promise<void> {
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

        for (const taskDoc of querySnapshot.docs) {
            const task = { id: taskDoc.id, ...taskDoc.data() } as RecoveryTask;
            const taskRef = doc(db, 'recoveryTasks', task.id!);

            console.log(`Processing task ${task.id} for user ${task.userId}, amount ₹${task.amount}`);
            batch.update(taskRef, { recoveryStatus: 'Processing', updatedAt: serverTimestamp() });

            // Simulate processing attempt in a separate async function to allow batch commit quickly
            // This avoids holding the batch open for potentially long-running payment attempts.
            // In a real backend, this might push the task to a different queue or trigger another function.
            attemptRecoveryForTask(task);
        }

        // Commit the status updates ('Processing')
        await batch.commit();
        console.log("Marked tasks as 'Processing'. Actual recovery attempts running asynchronously.");

    } catch (error) {
        console.error("Error fetching/batch-updating pending recovery tasks:", error);
    }
}

/**
 * Attempts the actual recovery for a single task. Intended for BACKEND.
 * Debits bank, credits wallet, updates task status in Firestore.
 */
async function attemptRecoveryForTask(task: RecoveryTask): Promise<void> {
    let recoverySuccess = false;
    let failureMessage = 'Unknown recovery error';
    let debitTxId: string | undefined;
    let creditTxId: string | undefined;
    let recoverySourceUpiId = task.bankUpiId; // Start with the potentially specified ID

    try {
        // 1. Determine Recovery Source Account if not already set
        if (!recoverySourceUpiId) {
            const userAccounts = await getLinkedAccounts(); // Fetch user's accounts
            const defaultAccount = userAccounts.find(acc => acc.isDefault);
            if (!defaultAccount) throw new Error("No default bank account found for recovery.");
            recoverySourceUpiId = defaultAccount.upiId;
        }

        // 2. Debit from User's Bank Account
        // CRITICAL: In a real backend, this needs a secure, non-interactive way
        // to debit, likely via a pre-approved mandate or specific PSP integration.
        // SIMULATING SUCCESSFUL DEBIT FOR NOW.
        console.log(`Simulating debit of ₹${task.amount} from ${recoverySourceUpiId} for task ${task.id}...`);
        debitTxId = `REC_DEBIT_${Date.now()}`;
        // const debitResult = await someSecureDebitMechanism(recoverySourceUpiId, task.amount, `Recovery for Tx ${task.originalTransactionId}`);
        // if (!debitResult.success) throw new Error(debitResult.message || 'Bank debit failed');
        await new Promise(resolve => setTimeout(resolve, 1000));


        // 3. Credit to User's Zet Pay Wallet
        console.log(`Crediting ₹${task.amount} back to user ${task.userId}'s wallet for task ${task.id}...`);
        const creditResult = await topUpWallet(task.userId, task.amount, `Recovery from ${recoverySourceUpiId}`);
        if (!creditResult.success) {
            // CRITICAL: Debit succeeded, but wallet credit failed. Needs manual intervention/alerting.
            failureMessage = 'Wallet credit failed after successful bank debit. Manual intervention required.';
            throw new Error(failureMessage);
        }
        creditTxId = creditResult.transactionId; // Assume topUpWallet returns the transactionId

        // 4. Mark Recovery as Successful
        recoverySuccess = true;
        console.log(`Recovery task ${task.id} completed successfully.`);

    } catch (recoveryError: any) {
        console.error(`Recovery failed for task ${task.id}:`, recoveryError.message);
        failureMessage = recoveryError.message || failureMessage;
        recoverySuccess = false;
        // TODO: Implement alerting/retry mechanism for critical failures (e.g., debit success, credit fail)
    }

    // 5. Update Task Status in Firestore
    try {
        const taskRef = doc(db, 'recoveryTasks', task.id!);
        await updateDoc(taskRef, {
            recoveryStatus: recoverySuccess ? 'Completed' : 'Failed',
            failureReason: recoverySuccess ? null : failureMessage,
            updatedAt: serverTimestamp(),
            bankUpiId: recoverySourceUpiId, // Record the account used/attempted
            recoveryTransactionId: debitTxId, // Record debit ID if available
            walletCreditTransactionId: creditTxId // Record credit ID if available
        });
    } catch (updateError) {
        console.error(`FATAL: Failed to update final status for recovery task ${task.id}:`, updateError);
        // Log this critical error for monitoring
    }
}
