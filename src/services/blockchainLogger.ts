/**
 * @fileOverview BACKEND service for blockchain interaction (SIMULATED).
 */

import axios from 'axios'; // Example: Using axios if calling an external service

const BLOCKCHAIN_API_ENDPOINT = process.env.BLOCKCHAIN_API_ENDPOINT || 'http://localhost:5001/log'; // Example logging service endpoint

interface BlockchainLogData {
    userId: string;
    type: string;
    amount: number;
    date: string; // ISO String
    recipient?: string;
    name?: string;
    description?: string;
    status?: string;
    originalId?: string; // Original Firestore transaction ID
    // Add other relevant fields to log
}

interface BlockchainTransactionInfo {
    loggedData: any; // The actual data retrieved from the blockchain
    blockchainTimestamp: string; // Timestamp from the block
    blockNumber: number;
    // Add other relevant blockchain metadata
}

/**
 * Logs transaction data to the blockchain (SIMULATED).
 *
 * @param transactionId The unique ID of the transaction from our system.
 * @param data The data object to be logged.
 * @returns A promise that resolves with the blockchain transaction hash (or null if simulation/failure).
 */
export async function logTransaction(transactionId: string, data: BlockchainLogData): Promise<string | null> {
    console.log(`[Blockchain SIM] Logging transaction ${transactionId} with data:`, data);
    // In a real implementation:
    // 1. Connect to the blockchain node/service.
    // 2. Prepare the transaction data according to the smart contract ABI.
    // 3. Send the transaction (e.g., contract.methods.logTransaction(...).send({ from: ... })).
    // 4. Handle potential errors (gas fees, network issues, contract errors).
    // 5. Return the transaction hash upon success.

    try {
        // Simulate API call to a separate logging service or directly interact
        // const response = await axios.post(BLOCKCHAIN_API_ENDPOINT, {
        //     primary_id: transactionId,
        //     payload: data,
        //     timestamp: new Date().toISOString(),
        // });
        await new Promise(resolve => setTimeout(resolve, 150)); // Simulate short delay

        const mockTxHash = `0x${[...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        console.log(`[Blockchain SIM] Transaction ${transactionId} logged successfully. Hash: ${mockTxHash}`);
        return mockTxHash; // Return a mock hash
    } catch (error) {
        // Check if error is an Axios error and log details if so
        if (axios.isAxiosError(error)) {
             console.error(`[Blockchain SIM] Axios error logging transaction ${transactionId}:`, error.response?.data || error.message);
        } else if (error instanceof Error){
             console.error(`[Blockchain SIM] Generic error logging transaction ${transactionId}:`, error.message);
        } else {
            console.error(`[Blockchain SIM] Unknown error logging transaction ${transactionId}:`, error);
        }
        // Decide if this failure should be critical or just logged
        return null;
    }
}

/**
 * Retrieves transaction details from the blockchain (SIMULATED).
 *
 * @param transactionId The ID used when logging the transaction.
 * @returns A promise resolving to the logged data or null if not found.
 */
export async function getTransactionInfo(transactionId: string): Promise<BlockchainTransactionInfo | null> {
    console.log(`[Blockchain SIM] Fetching info for transaction ${transactionId}`);
    // In a real implementation:
    // 1. Query the blockchain or a caching layer using the transactionId or blockchain hash.
    // 2. Retrieve and decode the stored data.

    await new Promise(resolve => setTimeout(resolve, 100));
    // Simulate finding data based on ID pattern
    if (transactionId.startsWith('TXN') || transactionId.startsWith('CW_') || transactionId.startsWith('REC_') || transactionId.includes('_')) { // Added broader check
        return {
            loggedData: { /* Mock data based on ID */ userId: 'user123', type: 'Sent', amount: -100 },
            blockchainTimestamp: new Date().toISOString(),
            blockNumber: Math.floor(Math.random() * 1000000),
        };
    }
    return null; // Simulate not found
}

/**
 * Verifies a transaction on the blockchain (SIMULATED).
 * @param transactionId The ID of the transaction to verify.
 * @returns A promise resolving to true if valid, false otherwise.
 */
export async function verifyTransaction(transactionId: string): Promise<boolean> {
     console.log(`[Blockchain SIM] Verifying transaction ${transactionId}`);
     // Simulate verification
     await new Promise(resolve => setTimeout(resolve, 50));
     // Simulate validity based on known prefixes or pattern
     return (transactionId.startsWith('TXN') || transactionId.startsWith('CW_') || transactionId.startsWith('REC_') || transactionId.includes('_')) && Math.random() > 0.1; // 90% chance valid simulation
}

// Export as default or named exports based on usage
export default {
    logTransaction,
    getTransactionInfo,
    verifyTransaction,
};
