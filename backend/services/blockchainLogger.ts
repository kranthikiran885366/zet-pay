
/**
 * @fileOverview BACKEND service for blockchain interaction (SIMULATED).
 */

import axios from 'axios'; // Example: Using axios if calling an external service

const BLOCKCHAIN_API_ENDPOINT = process.env.BLOCKCHAIN_API_ENDPOINT || 'http://localhost:5001/log'; // Example logging service endpoint

interface BlockchainLogData {
    userId: string;
    type: string; // e.g., 'Recharge', 'Sent', 'Bill Payment'
    amount: number; // Can be positive or negative
    date: string; // ISO String timestamp of the original transaction
    recipient?: string; // e.g., Mobile number, UPI ID, Biller ID
    name?: string; // e.g., Payee name, Biller name
    description?: string;
    status?: string; // e.g., 'Completed', 'Failed', 'Pending'
    originalId?: string; // Original Firestore transaction ID
    ticketId?: string; // Optional, like a booking reference
    // Add other relevant fields to log, e.g., operatorReferenceId for recharges
    operatorReferenceId?: string;
}

interface BlockchainTransactionInfo {
    loggedData: any; // The actual data retrieved from the blockchain
    blockchainTimestamp: string; // Timestamp from the block
    blockNumber: number;
    // Add other relevant blockchain metadata
}

/**
 * Logs transaction data to the blockchain (SIMULATED).
 * This function is called by the backend transaction logger.
 *
 * @param transactionId The unique ID of the transaction from our system (usually Firestore ID).
 * @param data The data object to be logged. This should be a summary, not all PII.
 *             Key details to hash: transactionId, userId, amount, type, timestamp, recipientIdentifier, status.
 * @returns A promise that resolves with the blockchain transaction hash (or null if simulation/failure).
 */
export async function logTransaction(transactionId: string, data: BlockchainLogData): Promise<string | null> {
    // For real logging, hash sensitive parts or only log a reference hash.
    // Example of data to potentially hash and log:
    const dataToHash = {
        original_system_id: transactionId,
        user_ref: data.userId.substring(0, 8), // Partial user ID for privacy
        type: data.type,
        amount_abs: Math.abs(data.amount), // Log absolute amount for consistency on chain
        currency: "INR", // Assuming INR
        status: data.status,
        timestamp_orig: data.date, // Original transaction timestamp
        // Optionally include a hash of more detailed, sensitive parts if needed for off-chain verification
        // details_hash: crypto.createHash('sha256').update(JSON.stringify({ recipient: data.recipient, name: data.name })).digest('hex'),
    };

    console.log(`[Blockchain Logger SIM] Logging transaction ID: ${transactionId}. Data to hash/log (conceptually):`, dataToHash);
    // In a real implementation:
    // 1. Connect to the blockchain node/service (e.g., Hyperledger Fabric Gateway, Web3 provider for Ethereum/Polygon).
    // 2. Prepare the transaction data according to the smart contract ABI (e.g., a hash of `dataToHash`).
    // 3. Submit the transaction to the smart contract (e.g., contract.submitTransaction('logTransaction', transactionId, hashedDataString)).
    // 4. Handle potential errors (connection issues, contract errors, endorsement failures, gas fees).
    // 5. Return the blockchain transaction hash/ID upon success.

    try {
        // Simulate interaction, maybe call a mock logging service if BLOCKCHAIN_API_ENDPOINT is set
        if (BLOCKCHAIN_API_ENDPOINT !== 'http://localhost:5001/log' && process.env.NODE_ENV !== 'test') {
            // const response = await axios.post(BLOCKCHAIN_API_ENDPOINT, {
            //     primary_id: transactionId,
            //     payload: dataToHash, // Send the conceptual data/hash
            //     timestamp: new Date().toISOString(),
            // });
            // console.log("[Blockchain Logger SIM] Response from external logger:", response.data);
        }
        await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 100)); // Simulate network/processing delay

        const mockTxHash = `0xSIM_${[...Array(60)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        console.log(`[Blockchain Logger SIM] Transaction ${transactionId} logged successfully. Mock Hash: ${mockTxHash}`);
        return mockTxHash;
    } catch (error) {
        if (axios.isAxiosError(error)) {
             console.error(`[Blockchain Logger SIM] Axios error logging transaction ${transactionId}:`, error.response?.data || error.message);
        } else if (error instanceof Error){
             console.error(`[Blockchain Logger SIM] Generic error logging transaction ${transactionId}:`, error.message);
        } else {
            console.error(`[Blockchain Logger SIM] Unknown error logging transaction ${transactionId}:`, error);
        }
        return null;
    }
}

/**
 * Retrieves transaction details from the blockchain via the backend API (SIMULATED).
 *
 * @param transactionId The ID used when logging the transaction (usually Firestore ID).
 * @returns A promise resolving to the logged data or null if not found.
 */
export async function getTransactionInfo(transactionId: string): Promise<BlockchainTransactionInfo | null> {
    console.log(`[Blockchain Logger SIM] Fetching info for transaction ${transactionId}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    if (transactionId.startsWith('TXN_') || transactionId.includes('_') || transactionId.length > 15) {
        return {
            loggedData: { original_system_id: transactionId, user_ref: 'mockUser', type: 'MockType', amount_abs: 123.45, status: 'Completed' },
            blockchainTimestamp: new Date(Date.now() - Math.random() * 100000000).toISOString(),
            blockNumber: Math.floor(Math.random() * 1000000),
        };
    }
    return null;
}

/**
 * Verifies a transaction on the blockchain (SIMULATED).
 * @param transactionId The ID of the transaction to verify.
 * @returns A promise resolving to true if valid, false otherwise.
 */
export async function verifyTransaction(transactionId: string): Promise<boolean> {
     console.log(`[Blockchain Logger SIM] Verifying transaction ${transactionId}`);
     await new Promise(resolve => setTimeout(resolve, 50));
     return (transactionId.includes('_') || transactionId.length > 15) && Math.random() > 0.1;
}

export default {
    logTransaction,
    getTransactionInfo,
    verifyTransaction,
};

</description>
    <content><![CDATA[

