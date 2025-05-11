
import admin from 'firebase-admin'; // Use admin SDK
const db = admin.firestore();
import { addTransaction, logTransactionToBlockchain } from './transactionLogger'; // Use backend logger service
import { sendToUser } from '../server'; // Import WebSocket sender from backend server.js
import { doc, getDoc, setDoc, runTransaction, serverTimestamp, Timestamp, updateDoc, FieldValue } from 'firebase-admin/firestore'; // Import admin SDK functions and types
import type { Transaction } from './types'; // Use shared types

// Define WalletTransactionResult interface if not already in a shared types file
export interface WalletTransactionResult {
    success: boolean;
    transactionId?: string; // The ID of the transaction record created by the backend
    newBalance?: number; // Optionally returned by the backend after update
    message?: string;
}

/**
 * Sends a real-time balance update to the user via WebSocket.
 * @param {string} userId The ID of the user.
 * @param {number} newBalance The updated balance.
 */
function sendBalanceUpdate(userId: string, newBalance: number) {
    if (userId && typeof newBalance === 'number') {
        if (typeof sendToUser === 'function') {
            console.log(`[WS Backend - Wallet Service] Sending balance update to user ${userId}: ${newBalance}`);
            sendToUser(userId, {
                type: 'balance_update',
                payload: { balance: newBalance }
            });
        } else {
            console.error("[Wallet Service] sendToUser function is not available from server.js. Cannot send balance update.");
        }
    }
}

/**
 * Fetches the current wallet balance for a user from Firestore. Creates the wallet if it doesn't exist.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<number>} - A promise that resolves to the wallet balance.
 */
export async function getWalletBalance(userId: string): Promise<number> {
    if (!userId) throw new Error("User ID required to get wallet balance.");
    const walletDocRef = db.collection('wallets').doc(userId);
    try {
        const walletDocSnap = await walletDocRef.get();
        if (!walletDocSnap.exists) {
            console.log(`[Wallet Service - Backend] Wallet for user ${userId} not found, creating...`);
            await walletDocRef.set({
                userId: userId,
                balance: 0,
                lastUpdated: FieldValue.serverTimestamp() // Firestore server timestamp
            });
            return 0;
        }
        return walletDocSnap.data()?.balance || 0;
    } catch (error) {
        console.error(`[Wallet Service - Backend] Error fetching wallet balance for ${userId}:`, error);
        throw new Error("Could not fetch wallet balance.");
    }
}

/**
 * Helper to ensure wallet exists, create if not. Internal use.
 * @param {string} userId - The ID of the user.
 * @param {FirebaseFirestore.Transaction} [transaction] - Optional Firestore transaction.
 * @returns {Promise<number>} - A promise that resolves to the current balance (or 0 if created).
 */
export async function ensureWalletExistsInternal(userId: string, transaction?: FirebaseFirestore.Transaction): Promise<number> {
    const walletDocRef = db.collection('wallets').doc(userId);
    let walletDocSnap;
    if (transaction) {
        walletDocSnap = await transaction.get(walletDocRef);
    } else {
        walletDocSnap = await walletDocRef.get();
    }

    let currentBalance = 0;

    if (!walletDocSnap.exists) {
        console.log(`[Wallet Service - Backend] Wallet for user ${userId} not found, creating within transaction...`);
        const initialData = {
            userId: userId,
            balance: 0,
            lastUpdated: FieldValue.serverTimestamp() // Firestore server timestamp
        };
        if (transaction) {
            transaction.set(walletDocRef, initialData);
        } else {
            await walletDocRef.set(initialData);
        }
    } else {
        currentBalance = walletDocSnap.data()?.balance || 0;
    }
    return Number(currentBalance);
}


/**
 * Internal function to perform wallet debit/credit. Handles logging and WS updates.
 * Used by other services like UPI fallback, recovery, rewards, etc.
 * IMPORTANT: Negative amount signifies a CREDIT to the wallet (like a top-up/refund).
 * Positive amount signifies a DEBIT from the wallet (like a payment).
 * @param {string} userId The user ID.
 * @param {string} referenceId Identifier for the transaction (e.g., recipient UPI, biller ID, 'RECOVERY_CREDIT').
 * @param {number} amount Amount (positive for debit, negative for credit).
 * @param {string} note Transaction description/note.
 * @param {string} [transactionType=null] The type for the transaction log ('Sent', 'Received', 'Wallet Top-up', 'Refund', etc.).
 * @returns {Promise<WalletTransactionResult>} Result object.
 */
export async function payViaWalletInternal(
    userId: string,
    referenceId: string,
    amount: number,
    note?: string,
    transactionType: Transaction['type'] | null = null
): Promise<WalletTransactionResult> {
    if (!userId || !referenceId || typeof amount !== 'number') {
        console.error("[Wallet Service - Internal] Invalid parameters", { userId, referenceId, amount });
        return { success: false, message: "Invalid parameters for internal wallet operation." };
    }

    const walletDocRef = db.collection('wallets').doc(userId);
    let newBalance = 0;
    let loggedTxId: string | undefined;
    const isCredit = amount < 0;
    const absoluteAmount = Math.abs(amount);
    const operationType = isCredit ? 'credit' : 'debit';
    const finalLogType = transactionType || (isCredit ? 'Received' : 'Sent');

    console.log(`[Wallet Service - Backend] Attempting wallet ${operationType} for user ${userId}, amount ${amount}, ref ${referenceId}`);

    try {
        await db.runTransaction(async (transaction) => {
             const currentBalance = await ensureWalletExistsInternal(userId, transaction);
             if (!isCredit && currentBalance < absoluteAmount) {
                 throw new Error(`Insufficient wallet balance. Available: ₹${currentBalance.toFixed(2)}`);
             }
             newBalance = isCredit ? currentBalance + absoluteAmount : currentBalance - absoluteAmount;
             const updateData = {
                 balance: newBalance,
                 lastUpdated: FieldValue.serverTimestamp() // Firestore server timestamp
             };
             transaction.update(walletDocRef, updateData);
         });

         const logData: Partial<Omit<Transaction, 'id' | 'date'>> & {userId: string} = { // Type assertion for logData
             type: finalLogType,
             name: referenceId,
             description: `${note || `Wallet ${operationType}`}`,
             amount: amount,
             status: 'Completed',
             userId: userId,
             upiId: referenceId.includes('@') ? referenceId : undefined,
             billerId: !referenceId.includes('@') && referenceId !== 'WALLET_RECOVERY_CREDIT' && referenceId !== 'ZETPAY_ECOMMERCE' ? referenceId : undefined, // More specific billerId
             paymentMethodUsed: 'Wallet',
         };
        const loggedTx = await addTransaction(logData); // This is the backend logger now
        loggedTxId = loggedTx.id;

        sendBalanceUpdate(userId, newBalance);

        // Ensure the loggedTx (which is a full Transaction object from backend logger) is passed
        await logTransactionToBlockchain(loggedTxId, loggedTx);

         console.log(`[Wallet Service - Backend] Wallet ${operationType} successful for ${userId}. Tx ID: ${loggedTxId}`);
         return { success: true, transactionId: loggedTxId, newBalance, message: `Wallet ${operationType} successful` };

    } catch (error: any) {
         console.error(`[Wallet Service - Backend] Wallet ${operationType} failed for user ${userId}:`, error);
         let failedTxId: string | undefined;
         if (!isCredit) { // Only log failed debits, not failed credits generally
             const failLogData: Partial<Omit<Transaction, 'id'|'date'>> & {userId: string} = {
                 type: 'Failed',
                 name: referenceId,
                 description: `Wallet Payment Failed - ${error.message}`,
                 amount: amount,
                 status: 'Failed',
                 userId: userId,
                 upiId: referenceId.includes('@') ? referenceId : undefined,
                 paymentMethodUsed: 'Wallet',
             };
             try {
                 const failedTx = await addTransaction(failLogData);
                 failedTxId = failedTx.id;
                 // No need to call sendToUser for failed transaction from here, addTransaction does it
             } catch (logError) {
                  console.error("[Wallet Service - Backend] Failed to log failed internal wallet debit:", logError);
             }
         }
         return { success: false, transactionId: failedTxId, message: error.message || `Internal wallet ${operationType} failed.` };
    }
}
