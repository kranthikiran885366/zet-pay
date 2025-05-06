/**
 * @fileOverview Centralized CLIENT-SIDE service for logging transactions (or interacting with backend logger).
 * NOTE: Actual transaction logging should primarily happen on the backend for security and reliability.
 * This client-side service might be used for triggering backend logging or handling UI updates related to transactions.
 */

import { db, auth } from '@/lib/firebase'; // Use client-side firebase
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
// import blockchainLogger from './blockchainLogger'; // Client-side probably shouldn't interact directly with blockchain logger service
import type { Transaction } from './types'; // Import shared Transaction type

/**
 * Placeholder function - Client-side should likely trigger backend actions
 * that then log transactions, rather than logging directly from the client.
 * Direct Firestore writes from the client for financial transactions are insecure.
 *
 * If used, this would be for non-critical, client-side only logging or
 * potentially sending a request to a secure backend endpoint to log.
 *
 * @param {Partial<Omit<Transaction, 'id' | 'date'>>} transactionData Transaction details.
 * @returns {Promise<string>} A promise resolving to the Firestore document ID (if logged client-side).
 */
export async function addTransaction(transactionData: Partial<Omit<Transaction, 'id' | 'date'>>): Promise<string> {
    const userId = auth.currentUser?.uid;
    if (!userId) {
        console.error("[Client Logger] User not logged in, cannot log transaction.");
        throw new Error("User not authenticated.");
    }

    console.warn(`[Client Logger] Attempting client-side transaction log for user ${userId}. Type: ${transactionData.type}. THIS IS GENERALLY INSECURE for financial data.`);

    try {
        const transactionsColRef = collection(db, 'transactions'); // Use client-side db
        const dataToSave = {
            ...transactionData,
            userId: userId,
            date: serverTimestamp(), // Use Firestore server timestamp
            // Add other necessary fields, ensure consistency with backend logger
             avatarSeed: transactionData.avatarSeed || transactionData.name?.toLowerCase().replace(/\s+/g, '') || `cl_${Date.now()}`,
             createdAt: serverTimestamp(),
             updatedAt: serverTimestamp(),
        };

        // Remove undefined keys before saving
        Object.keys(dataToSave).forEach(key => {
            if (dataToSave[key as keyof typeof dataToSave] === undefined) {
                delete dataToSave[key as keyof typeof dataToSave];
            }
        });


        const docRef = await addDoc(transactionsColRef, dataToSave);
        console.log("[Client Logger] Transaction logged client-side with ID:", docRef.id);

        // Blockchain logging should happen on the backend AFTER the backend logs the transaction.
        // Calling it here is not appropriate.
        // logTransactionToBlockchain(docRef.id, { id: docRef.id, ...dataToSave, date: new Date() } as Transaction) ...

        return docRef.id; // Return Firestore ID

    } catch (error) {
        console.error(`[Client Logger] Error logging transaction client-side for user ${userId}:`, error);
        throw new Error("Could not log transaction (client-side).");
    }
}


// Client-side should NOT directly call blockchain logging. Remove this function.
// export async function logTransactionToBlockchain(transactionId: string, data: Transaction): Promise<string | null> { ... }

