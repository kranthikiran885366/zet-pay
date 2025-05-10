/**
 * @fileOverview Centralized service for logging transactions via the backend API.
 * THIS FILE IS INTENDED FOR CLIENT-SIDE USAGE.
 * It will call backend APIs which in turn use the backend/services/transactionLogger.ts
 */

import { apiClient } from '@/lib/apiClient'; // For calling backend APIs
import blockchainLogger from '@/services/blockchainLogger'; // Import the blockchain service using alias
import { sendToUser } from '@/lib/websocket'; // Correct path to import WebSocket sender from frontend lib
import type { Transaction } from './types'; // Import shared Transaction type

/**
 * Adds a new transaction record by calling the backend API.
 * The backend API will handle Firestore logging and, if configured, blockchain logging.
 *
 * @param {Partial<Omit<Transaction, 'id' | 'date' | 'userId'>>} transactionData - Transaction details.
 *        The `userId` will be inferred by the backend from the authenticated user's token.
 * @returns {Promise<Transaction>} A promise resolving to the full transaction object returned by the backend
 *          (which includes the server-generated ID and date).
 */
export async function addTransaction(
    transactionData: Partial<Omit<Transaction, 'id' | 'date' | 'userId'>>
): Promise<Transaction> {
    console.log(`[Client Service Logger] Requesting backend to log transaction. Type: ${transactionData.type}`);

    try {
        const newTransactionFromBackend = await apiClient<Transaction>('/transactions', {
            method: 'POST',
            body: JSON.stringify(transactionData),
        });

        console.log("[Client Service Logger] Transaction logged via backend, ID:", newTransactionFromBackend.id);

        return {
            ...newTransactionFromBackend,
            date: new Date(newTransactionFromBackend.date),
            createdAt: newTransactionFromBackend.createdAt ? new Date(newTransactionFromBackend.createdAt) : undefined,
            updatedAt: newTransactionFromBackend.updatedAt ? new Date(newTransactionFromBackend.updatedAt) : undefined,
            avatarSeed: newTransactionFromBackend.avatarSeed || newTransactionFromBackend.name?.toLowerCase().replace(/\s+/g, '') || newTransactionFromBackend.id,
        };

    } catch (error: any) {
        console.error(`[Client Service Logger] Error logging transaction via backend:`, error);
        throw new Error(error.message || "Could not log transaction via backend.");
    }
}

/**
 * Fetches transaction details from the blockchain via the backend API.
 * This function remains as a client-side interface to a backend service.
 *
 * @param transactionId The unique ID of the transaction from our system.
 * @returns {Promise<any | null>} A promise resolving to the blockchain details or null.
 */
export async function getBlockchainTransactionInfoClient(transactionId: string): Promise<any | null> {
    console.log(`[Client Service Logger] Fetching blockchain info for tx: ${transactionId} via backend API.`);
    try {
        const info = await apiClient<any>(`/blockchain/tx/${transactionId}`);
        return info;
    } catch (error: any) {
        console.error("Error fetching blockchain transaction info via backend API:", error);
        return null;
    }
}

// logTransactionToBlockchain is a backend function, client calls it indirectly via addTransaction if configured.
// No direct client-side function to log TO blockchain.