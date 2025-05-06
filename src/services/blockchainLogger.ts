/**
 * @fileOverview Service for interacting with the (simulated) blockchain logging service.
 * This runs client-side and interacts with the backend API, not directly with the blockchain.
 */
import { apiClient } from '@/lib/apiClient';

// Interfaces matching backend expectations or return values (if any)
interface BlockchainTransactionInfo {
    loggedData: any;
    blockchainTimestamp: string;
    blockNumber: number;
}

/**
 * Fetches transaction details previously logged on the blockchain via the backend API.
 *
 * @param transactionId The primary transaction ID (e.g., Firestore ID).
 * @returns A promise resolving to the blockchain details or null if not found.
 */
export async function getBlockchainTransactionInfo(transactionId: string): Promise<BlockchainTransactionInfo | null> {
    console.log(`[Client Service] Fetching blockchain info via API for tx: ${transactionId}`);
    try {
        const info = await apiClient<BlockchainTransactionInfo>(`/blockchain/tx/${transactionId}`);
        return info;
    } catch (error: any) {
        // Handle 404 specifically if API client throws structured errors
        if (error.message?.includes('404')) {
            console.log(`[Client Service] Blockchain info not found for tx ${transactionId}`);
            return null;
        }
        console.error("Error fetching blockchain transaction info via API:", error);
        // Optionally re-throw or return null based on desired UI behavior
        return null;
    }
}

/**
 * Verifies a transaction's validity on the blockchain via the backend API.
 * @param transactionId The primary transaction ID to verify.
 * @returns A promise resolving to true if valid, false otherwise.
 */
export async function verifyBlockchainTransaction(transactionId: string): Promise<boolean> {
    console.log(`[Client Service] Verifying blockchain tx via API: ${transactionId}`);
    try {
        const result = await apiClient<{ isValid: boolean }>(`/blockchain/verify/${transactionId}`);
        return result.isValid;
    } catch (error) {
        console.error("Error verifying blockchain transaction via API:", error);
        return false; // Assume invalid on error
    }
}

// Client-side does NOT log directly to blockchain. This is handled by the backend.
// export async function logTransaction(transactionId: string, data: any): Promise<string | null> { ... }

