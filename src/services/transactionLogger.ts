/**
 * @fileOverview Centralized client-side service for logging transactions to Firestore.
 * This file should **only** be used for logging client-side generated events
 * if absolutely necessary. Prefer logging via backend API calls within the
 * relevant service (e.g., `processUpiPayment` backend logs the transaction).
 */

import { db, auth } from '@/lib/firebase'; // Use client-side SDK
import { collection, addDoc, serverTimestamp, Timestamp, getDoc, doc, updateDoc } from 'firebase/firestore';
import type { Transaction } from './types'; // Import shared Transaction type
// Removed blockchainLogger import as it's backend-only
// Removed sendToUser import as client cannot reliably push to WS

/**
 * Adds a new transaction record to Firestore from the client-side.
 * **WARNING:** Use with caution. Prefer backend logging for financial transactions.
 * This might be suitable for non-critical logs initiated purely on the client.
 *
 * @param transactionData Transaction details (userId will be inferred if possible).
 * @returns A promise resolving to the full transaction object including Firestore ID and resolved timestamp.
 * @throws Error if userId is missing or logging fails.
 */
export async function addTransaction(transactionData: Partial<Omit<Transaction, 'id' | 'date' | 'userId'>>): Promise<Transaction> {
    const currentUser = auth.currentUser;
    const userId = currentUser?.uid;

    if (!userId) {
        console.error("[Client Logger] User not logged in. Cannot log transaction.");
        throw new Error("User not logged in. Cannot log transaction.");
    }

    console.warn(`[Client Logger] Logging transaction from client-side for user ${userId}:`, transactionData.type);

    try {
        const transactionsColRef = collection(db, 'transactions');
        const dataToSave = {
            ...transactionData,
            userId: userId, // Add the current user's ID
            date: serverTimestamp(), // Use Firestore server timestamp
            // Generate avatarSeed if not provided
            avatarSeed: transactionData.avatarSeed || (transactionData.name || `client_tx_${Date.now()}`).toLowerCase().replace(/\s+/g, ''),
            // Set default nulls for optional fields if not provided
            billerId: transactionData.billerId ?? null,
            upiId: transactionData.upiId ?? null,
            loanId: transactionData.loanId ?? null,
            ticketId: transactionData.ticketId ?? null,
            refundEta: transactionData.refundEta ?? null,
            blockchainHash: transactionData.blockchainHash ?? null,
            paymentMethodUsed: transactionData.paymentMethodUsed ?? null,
            originalTransactionId: transactionData.originalTransactionId ?? null,
        };

        // Remove keys with undefined values before saving
         Object.keys(dataToSave).forEach(key => {
            if (dataToSave[key as keyof typeof dataToSave] === undefined) {
                 delete dataToSave[key as keyof typeof dataToSave];
            }
        });


        const docRef = await addDoc(transactionsColRef, dataToSave);
        console.log("[Client Logger] Transaction logged to Firestore with ID:", docRef.id);

        // Fetch the newly created doc to get the server timestamp resolved
        const newDocSnap = await getDoc(docRef);
        const savedData = newDocSnap.data();

         if (!savedData || !savedData.date) { // Check if date field exists after fetch
             throw new Error("Failed to retrieve saved transaction data or timestamp.");
         }

        // Convert Firestore Timestamp to JS Date for return value
        const finalTransaction: Transaction = {
            id: docRef.id,
            ...savedData,
            date: (savedData.date as Timestamp).toDate(), // Convert timestamp
        } as Transaction; // Assert type

        // Cannot reliably trigger WebSocket updates from client

        // Cannot trigger blockchain logging from client securely
        // logTransactionToBlockchain(finalTransaction.id, finalTransaction)...

        return finalTransaction; // Return the JS Date version

    } catch (error: any) {
        console.error(`[Client Logger] Error logging transaction for user ${userId}:`, error);
        throw new Error(error.message || "Could not log transaction.");
    }
}

/**
 * @deprecated Blockchain logging should only happen on the backend.
 */
export async function logTransactionToBlockchain(transactionId: string, data: Transaction): Promise<string | null> {
    console.error("logTransactionToBlockchain cannot be called from the client-side.");
    return null;
}

