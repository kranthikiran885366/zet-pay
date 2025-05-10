/**
 * @fileOverview Service functions for scheduling and processing wallet recovery deductions using Firestore.
 * Intended for BACKEND execution (e.g., via a scheduled Cloud Function).
 */
import admin from 'firebase-admin'; // Use Node.js Admin SDK
const db = admin.firestore();
import { Timestamp, FieldValue } from 'firebase-admin/firestore'; // Import Timestamp from Admin SDK
import { getLinkedAccounts } from './upi'; // Import Node.js version of the service
// Import internal wallet payment function (payViaWalletInternal from wallet.ts)
// and its result type.
import { payViaWalletInternal, WalletTransactionResult } from './wallet';
const upiProviderService = require('./upiProviderService'); // For initiating debit
import type { BankAccount } from './types'; // Import shared type
import { addTransaction, logTransactionToBlockchain } from './transactionLogger'; // For logging transactions if needed

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
        console.error("[Recovery Service] Invalid parameters for scheduling recovery.");
        return false;
    }
    console.log(`[Recovery Service] Scheduling recovery of ₹${amount} for user ${userId}`);

    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 1, 0);

    const recoveryData: Omit<RecoveryTask, 'id' | 'createdAt' | 'updatedAt' | 'recoveryTransactionId' | 'walletCreditTransactionId'> = {
        userId: userId,
        amount: amount,
        originalRecipientUpiId: originalRecipientUpiId,
        recoveryStatus: 'Scheduled',
        scheduledTime: Timestamp.fromDate(nextMidnight),
        bankUpiId: recoverySourceUpiId
    };

    try {
        const recoveryColRef = db.collection('recoveryTasks');
        const docRef = await recoveryColRef.add({
            ...recoveryData,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        console.log("[Recovery Service] Recovery task scheduled with ID:", docRef.id);
        return true;
    } catch (error) {
        console.error("[Recovery Service] Error scheduling recovery task:", error);
        return false;
    }
}

/**
 * Processes pending recovery tasks. Intended for BACKEND execution (e.g., scheduled Cloud Function).
 * Finds scheduled tasks past their execution time and attempts recovery.
 */
export async function processPendingRecoveries(): Promise<void> {
    console.log("[Recovery Service] Processing pending recovery tasks...");
    const now = Timestamp.now();
    const recoveryColRef = db.collection('recoveryTasks');
    const q = recoveryColRef
        .where('recoveryStatus', '==', 'Scheduled')
        .where('scheduledTime', '<=', now)
        .orderBy('scheduledTime')
        .limit(10);

    try {
        const querySnapshot = await q.get();
        console.log(`[Recovery Service] Found ${querySnapshot.docs.length} pending recovery tasks.`);

        if (querySnapshot.empty) {
            return;
        }

        const batch = db.batch();
        const recoveryPromises: Promise<void>[] = [];

        for (const taskDoc of querySnapshot.docs) {
            const task = { id: taskDoc.id, ...taskDoc.data() } as RecoveryTask;
            const taskRef = db.collection('recoveryTasks').doc(task.id!);
            console.log(`[Recovery Service] Marking task ${task.id} as 'Processing' for user ${task.userId}, amount ₹${task.amount}`);
            batch.update(taskRef, { recoveryStatus: 'Processing', updatedAt: FieldValue.serverTimestamp() });
            recoveryPromises.push(attemptRecoveryForTask(task));
        }
        await batch.commit();
        console.log("[Recovery Service] Marked tasks as 'Processing'. Starting recovery attempts...");
        await Promise.allSettled(recoveryPromises);
        console.log("[Recovery Service] Finished processing batch of recovery attempts.");
    } catch (error) {
        console.error("[Recovery Service] Error fetching/batch-updating pending recovery tasks:", error);
    }
}

/**
 * Attempts the actual recovery for a single task. Intended for BACKEND.
 * Debits bank, credits wallet, updates task status in Firestore.
 */
async function attemptRecoveryForTask(task: RecoveryTask): Promise<void> {
    console.log(`[Recovery Service] Attempting recovery for task ${task.id}...`);
    let recoverySuccess = false;
    let failureMessage = 'Unknown recovery error';
    let debitTxId: string | undefined;
    let creditResult: WalletTransactionResult | undefined; // Store result from payViaWalletInternal
    let finalBankUpiId = task.bankUpiId;

    try {
        if (!finalBankUpiId) {
            const userAccounts = await getLinkedAccounts(task.userId);
            const defaultAccount = userAccounts.find((acc: BankAccount) => acc.isDefault);
            if (!defaultAccount && userAccounts.length > 0) {
                 finalBankUpiId = userAccounts[0].upiId;
                 console.log(`[Recovery Service] No default account, using first linked: ${finalBankUpiId} for task ${task.id}`);
            } else if (defaultAccount) {
                 finalBankUpiId = defaultAccount.upiId;
                 console.log(`[Recovery Service] Using default account ${finalBankUpiId} for task ${task.id}`);
            } else {
                throw new Error("No linked bank account found for recovery.");
            }
        }
        if (!finalBankUpiId) throw new Error("Could not determine bank account for recovery.");

        const debitResult = await upiProviderService.initiateDebit(finalBankUpiId, task.amount, `ZetPayWalletRecovery_${task.id}`);
        if (!debitResult.success) {
            throw new Error(debitResult.message || 'Bank debit failed during recovery.');
        }
        debitTxId = debitResult.transactionId;
        console.log(`[Recovery Service] Debit successful for task ${task.id}. Tx ID: ${debitTxId}`);

        console.log(`[Recovery Service] Crediting ₹${task.amount} back to user ${task.userId}'s wallet for task ${task.id}...`);
        // Use payViaWalletInternal with negative amount to trigger credit
        creditResult = await payViaWalletInternal(task.userId, 'WALLET_RECOVERY_CREDIT', -task.amount, `Recovery Credit from ${finalBankUpiId}`);
        if (!creditResult.success) {
            failureMessage = `Wallet credit failed after successful bank debit (Msg: ${creditResult.message}). Manual intervention required. Debit Tx: ${debitTxId}`;
            throw new Error(failureMessage);
        }
        console.log(`[Recovery Service] Wallet credit successful for task ${task.id}. Tx ID: ${creditResult.transactionId}`);
        recoverySuccess = true;
    } catch (recoveryError: any) {
        console.error(`[Recovery Service] Recovery failed for task ${task.id}:`, recoveryError.message);
        failureMessage = recoveryError.message || failureMessage;
        recoverySuccess = false;
    }

    try {
        const taskRef = db.collection('recoveryTasks').doc(task.id!);
        await taskRef.update({
            recoveryStatus: recoverySuccess ? 'Completed' : 'Failed',
            failureReason: recoverySuccess ? null : failureMessage,
            updatedAt: FieldValue.serverTimestamp(),
            bankUpiId: finalBankUpiId,
            recoveryTransactionId: debitTxId || null,
            walletCreditTransactionId: creditResult?.transactionId || null,
        });
        console.log(`[Recovery Service] Updated status for recovery task ${task.id} to ${recoverySuccess ? 'Completed' : 'Failed'}.`);
    } catch (updateError) {
        console.error(`[Recovery Service] FATAL: Failed to update final status for recovery task ${task.id}:`, updateError);
    }
}

// This export seems unnecessary if only processPendingRecoveries is called externally
// module.exports = {
//     scheduleRecovery,
//     processPendingRecoveries,
// };
