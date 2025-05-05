/**
 * @fileOverview Centralized service for logging transactions to Firestore and Blockchain.
 * NOTE: This client-side logger primarily focuses on adding the transaction via API.
 * Blockchain logging is handled by the backend.
 */

import { db, auth } from '@/lib/firebase'; // Import Firebase instances
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDoc, Timestamp } from 'firebase/firestore';
import { sendToUser } from '@/lib/websocket'; // Import WebSocket sender
// REMOVED: Direct import of backend blockchain logger
// import blockchainLogger from '@/services/blockchainLogger'; // Import the blockchain service using alias
import type { Transaction } from './types'; // Import shared Transaction type
import { apiClient } from '@/lib/apiClient'; // Import API client

/**
 * Adds a new transaction record via the backend API.
 * The backend handles saving to Firestore and logging to the blockchain.
 * Sends real-time notification via WebSocket if the backend doesn't handle it (TBC).
 *
 * @param transactionData Transaction details (userId is inferred by backend).
 * @returns A promise resolving to the full transaction object returned by the backend API.
 */
export async function addTransaction(transactionData: Partial<Omit<Transaction, 'id' | 'date' | 'userId'>>): Promise<Transaction> {
    const currentUserId = auth.currentUser?.uid; // Get ID for logging/context if needed client-side
    console.log(`Calling API to add transaction for user ${currentUserId}:`, transactionData.type);

    try {
        // Assume backend endpoint '/transactions' handles creation
        const resultTransaction = await apiClient<Transaction>('/transactions', {
            method: 'POST',
            body: JSON.stringify({
                ...transactionData, // Send the provided data
                 // Generate avatarSeed client-side if not provided, backend can override/ignore
                 avatarSeed: transactionData.avatarSeed || (transactionData.name || `tx_${Date.now()}`).toLowerCase().replace(/\s+/g, ''),
            }),
        });

        console.log("Transaction logged via API with ID:", resultTransaction.id);

        // Convert date string from API response to Date object
        const finalTransaction: Transaction = {
            ...resultTransaction,
            date: new Date(resultTransaction.date),
             // Ensure avatar seed client-side if needed immediately after logging
            avatarSeed: resultTransaction.avatarSeed || (resultTransaction.name || `tx_${Date.now()}`).toLowerCase().replace(/\s+/g, ''),
        };

        // Optional: Send WebSocket update from client *if* backend doesn't guarantee it.
        // Usually, the backend should send the update after successful DB write.
        // const sent = sendToUser(userId, { type: 'transaction_update', payload: finalTransaction });
        // if (!sent) {
        //     console.warn(`Client-side WS update skipped for tx ${finalTransaction.id}.`);
        // }

        // Blockchain logging is now handled by the backend within the POST /api/transactions endpoint

        return finalTransaction;

    } catch (error: any) {
        console.error(`Error adding transaction via API:`, error);
        // Re-throw the error for the calling component to handle
        throw new Error(error.message || "Could not log transaction via API.");
    }
}

// REMOVED: Client-side blockchain logging function
// export async function logTransactionToBlockchain(...) { ... }
