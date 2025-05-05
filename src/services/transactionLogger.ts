/**
 * @fileOverview Client-side service for adding transactions via the backend API.
 * This file should NOT contain direct database or blockchain logic.
 */

import { apiClient } from '@/lib/apiClient';
import type { Transaction } from './types'; // Use shared types

/**
 * Sends transaction data to the backend API to be logged.
 *
 * @param transactionData Transaction details (userId will be inferred by backend from token).
 * @returns A promise resolving to the full transaction object returned by the backend.
 * @throws Error if the API call fails.
 */
export async function addTransaction(transactionData: Partial<Omit<Transaction, 'id' | 'date' | 'userId'>>): Promise<Transaction> {
    console.log(`[Client Service] Sending transaction to backend API:`, transactionData.type);

    try {
        // The backend API endpoint '/transactions' handles logging to Firestore & Blockchain
        const resultTransaction = await apiClient<Transaction>('/transactions', { // Use the specific backend endpoint
            method: 'POST',
            body: JSON.stringify(transactionData),
        });
        console.log("[Client Service] Backend API response (Transaction):", resultTransaction);

        // Convert date string from API response to Date object
        return {
            ...resultTransaction,
            date: new Date(resultTransaction.date),
            // Ensure avatarSeed exists client-side if needed for immediate UI updates
            avatarSeed: resultTransaction.avatarSeed || resultTransaction.name?.toLowerCase().replace(/\s+/g, '') || resultTransaction.id,
        };
    } catch (error: any) {
         console.error("[Client Service] Error sending transaction to backend API:", error);
         // Throw the error so the UI component can handle it (e.g., show toast)
         throw error;
    }
}
