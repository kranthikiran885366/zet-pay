
/**
 * @fileOverview Service functions for scheduling and processing wallet recovery deductions.
 */
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp, writeBatch, doc } from 'firebase/firestore';
import { processUpiPayment } from './upi'; // To debit from the bank account
import { topUpWallet } from './wallet'; // To credit back to the wallet

interface RecoveryTask {
    id?: string; // Firestore document ID
    userId: string;
    amount: number;
    originalRecipientUpiId: string; // The recipient of the original fallback payment
    recoveryStatus: 'Scheduled' | 'Processing' | 'Completed' | 'Failed';
    scheduledTime: Timestamp; // Timestamp for when recovery should ideally happen (e.g., next midnight)
    createdAt: Timestamp;
    updatedAt: Timestamp;
    failureReason?: string;
    bankUpiId?: string; // The bank account to recover from (optional, could use default)
}

/**
 * Schedules a recovery task to deduct funds from the user's bank account
 * and credit them back to the Zet Pay wallet after a UPI limit fallback.
 *
 * @param userId The ID of the user.
 * @param amount The amount to recover.
 * @param originalRecipientUpiId UPI ID of the original payment recipient (for logging/reference).
 * @param bankUpiId Optional: Specific bank UPI ID to recover from (defaults to user's primary).
 * @returns A promise that resolves to true if scheduling was successful, false otherwise.
 */
export async function scheduleRecovery(userId: string, amount: number, originalRecipientUpiId: string, bankUpiId?: string): Promise<boolean> {
    if (!userId || amount <= 0) {
        console.error("Invalid parameters for scheduling recovery.");
        return false;
    }
    console.log(`Scheduling recovery of ₹${amount} for user ${userId}`);

    // Calculate next midnight for scheduling
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 1, 0); // Set to 00:00:01 of the next day

    const recoveryData: Omit<RecoveryTask, 'id'> = {
        userId: userId,
        amount: amount,
        originalRecipientUpiId: originalRecipientUpiId,
        recoveryStatus: 'Scheduled',
        scheduledTime: Timestamp.fromDate(nextMidnight),
        createdAt: serverTimestamp() as Timestamp, // Cast needed for addDoc
        updatedAt: serverTimestamp() as Timestamp,
        bankUpiId: bankUpiId // Store the intended recovery source if specified
    };

    try {
        const recoveryColRef = collection(db, 'recoveryTasks');
        const docRef = await addDoc(recoveryColRef, recoveryData);
        console.log("Recovery task scheduled with ID:", docRef.id);
        return true;
    } catch (error) {
        console.error("Error scheduling recovery task:", error);
        return false;
    }
}

/**
 * Processes pending recovery tasks. This function would typically be run by a
 * scheduled backend process (e.g., Cloud Function triggered daily).
 * It finds scheduled tasks past their execution time and attempts recovery.
 */
export async function processPendingRecoveries(): Promise<void> {
    console.log("Processing pending recovery tasks...");
    const now = Timestamp.now();
    const recoveryColRef = collection(db, 'recoveryTasks');
    const q = query(recoveryColRef,
        where('recoveryStatus', '==', 'Scheduled'),
        where('scheduledTime', '<=', now)
    );

    try {
        const querySnapshot = await getDocs(q);
        console.log(`Found ${querySnapshot.docs.length} pending recovery tasks.`);

        if (querySnapshot.empty) {
            return;
        }

        // Use a batch for potential multiple updates
        const batch = writeBatch(db);

        for (const taskDoc of querySnapshot.docs) {
            const task = { id: taskDoc.id, ...taskDoc.data() } as RecoveryTask;
            const taskRef = doc(db, 'recoveryTasks', task.id!);

            console.log(`Processing task ${task.id} for user ${task.userId}, amount ₹${task.amount}`);

            // Mark task as processing
            batch.update(taskRef, { recoveryStatus: 'Processing', updatedAt: serverTimestamp() });

            // TODO: Get user's default or specified bankUpiId securely
            const recoverySourceUpiId = task.bankUpiId || 'user_default_upi@bank'; // Placeholder - fetch actual default
            const recoveryRecipientUpiId = 'zetpay-recovery@zetpay'; // A dedicated internal UPI ID for ZetPay

            try {
                 // 1. Debit from User's Bank Account (requires user PIN in a real scenario, or pre-approved mandate)
                 // For backend processing, this might need a different mechanism or a pre-auth.
                 // Simulating direct debit success for now.
                console.log(`Simulating debit of ₹${task.amount} from ${recoverySourceUpiId}...`);
                // const debitResult = await processUpiPayment(recoveryRecipientUpiId, task.amount, 'BACKEND_PIN_OR_MANDATE', `ZetPay Wallet Recovery ${task.id}`);
                // if (!debitResult.success) { throw new Error(debitResult.message || 'Bank debit failed'); }
                await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate debit

                 // 2. Credit to User's Zet Pay Wallet
                console.log(`Crediting ₹${task.amount} back to user ${task.userId}'s wallet...`);
                const creditSuccess = await topUpWallet(task.userId, task.amount, 'Bank Recovery');
                if (!creditSuccess) {
                    // CRITICAL: Debit happened but wallet credit failed. Needs manual intervention/retry logic.
                    throw new Error('Wallet credit failed after successful bank debit.');
                }

                // Mark task as completed
                batch.update(taskRef, { recoveryStatus: 'Completed', updatedAt: serverTimestamp() });
                console.log(`Recovery task ${task.id} completed successfully.`);

            } catch (recoveryError: any) {
                console.error(`Recovery failed for task ${task.id}:`, recoveryError.message);
                // Mark task as failed
                 batch.update(taskRef, {
                     recoveryStatus: 'Failed',
                     failureReason: recoveryError.message || 'Unknown recovery error',
                     updatedAt: serverTimestamp()
                 });
            }
        }

        // Commit all updates in the batch
        await batch.commit();
        console.log("Finished processing batch of recovery tasks.");

    } catch (error) {
        console.error("Error fetching pending recovery tasks:", error);
    }
}
