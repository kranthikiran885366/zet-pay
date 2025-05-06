// backend/services/transactionLogger.js

const { admin, db } = require('../config/firebaseAdmin'); // Use configured admin instance
const blockchainLogger = require('./blockchainLogger'); // Import the backend blockchain service
const { sendToUser } = require('../server'); // Import WebSocket sender from server.js
const { Timestamp } = require('firebase-admin/firestore'); // Use Admin SDK Timestamp


/**
 * Adds a new transaction record to Firestore and logs it to the blockchain.
 * Called by various backend controllers AFTER payment/action is processed.
 *
 * @param {Partial<Omit<import('./types').Transaction, 'id' | 'date'>> & { userId: string }} transactionData Transaction details (userId is required).
 * @returns {Promise<import('./types').Transaction>} A promise resolving to the full transaction object including Firestore ID and resolved timestamp.
 */
async function addTransaction(transactionData) {
    const { userId, ...rest } = transactionData;
    if (!userId) throw new Error("User ID is required to log transaction.");

    console.log(`[Backend Logger] Logging transaction for user ${userId}:`, rest.type);

    try {
        const transactionsColRef = db.collection('transactions'); // Use Admin SDK
        const dataToSave = {
            ...rest,
            userId: userId,
            date: Timestamp.now(), // Use Admin SDK Timestamp for server time
            // Generate avatarSeed if not provided (backend fallback)
            avatarSeed: rest.avatarSeed || (rest.name || `tx_${Date.now()}`).toLowerCase().replace(/\s+/g, ''),
            // Ensure optional fields are explicitly set to null if not provided
            billerId: rest.billerId ?? null,
            upiId: rest.upiId ?? null,
            loanId: rest.loanId ?? null,
            ticketId: rest.ticketId ?? null,
            refundEta: rest.refundEta ?? null,
            blockchainHash: rest.blockchainHash ?? null, // Will be updated after logging
            paymentMethodUsed: rest.paymentMethodUsed ?? null,
            originalTransactionId: rest.originalTransactionId ?? null,
            // Add other potential fields from various controllers
            operatorReferenceId: rest.operatorReferenceId ?? null,
             billerReferenceId: rest.billerReferenceId ?? null,
             planId: rest.planId ?? null,
             identifier: rest.identifier ?? null,
             withdrawalRequestId: rest.withdrawalRequestId ?? null, // For cash withdrawal links
             createdAt: rest.createdAt instanceof Date ? Timestamp.fromDate(rest.createdAt) : rest.createdAt ?? Timestamp.now(), // Handle potential Date object or default
             updatedAt: rest.updatedAt instanceof Date ? Timestamp.fromDate(rest.updatedAt) : rest.updatedAt ?? Timestamp.now(), // Handle potential Date object or default
        };

        // Remove keys with undefined values before saving
         Object.keys(dataToSave).forEach(key => {
             if (dataToSave[key] === undefined) {
                  delete dataToSave[key]; // Remove undefined keys
             }
         });


        const docRef = await transactionsColRef.add(dataToSave);
        console.log("[Backend Logger] Transaction logged to Firestore with ID:", docRef.id);

        // Fetch the newly created doc to get the server timestamp resolved (it's already a Timestamp object here)
        const newDocSnap = await docRef.get();
        const savedData = newDocSnap.data();

        if (!savedData) {
            throw new Error("Failed to retrieve saved transaction data.");
        }

        // Convert Firestore Timestamp to JS Date for return value and logging
        const finalTransaction = {
            id: docRef.id,
            ...savedData,
            date: savedData.date.toDate(), // Convert timestamp to Date for consistency in return/WS
            // Convert other timestamps if needed
             createdAt: savedData.createdAt instanceof Timestamp ? savedData.createdAt.toDate() : undefined,
             updatedAt: savedData.updatedAt instanceof Timestamp ? savedData.updatedAt.toDate() : undefined,
        };

        // Send real-time update via WebSocket AFTER successful Firestore save
        // Ensure payload uses ISO string for dates for JSON serialization
        const wsPayload = {
            ...finalTransaction,
            date: finalTransaction.date.toISOString(),
            createdAt: finalTransaction.createdAt?.toISOString(),
            updatedAt: finalTransaction.updatedAt?.toISOString(),
        };
        const sent = sendToUser(userId, {
            type: 'transaction_update',
            payload: wsPayload, // Send ISO string dates
        });
        if (!sent) {
            console.warn(`[Backend Logger] WebSocket not connected for user ${userId}. Transaction update not sent in real-time.`);
        }


        // Log to blockchain asynchronously (don't block response)
        logTransactionToBlockchain(finalTransaction.id, finalTransaction)
            .then(hash => {
                if (hash) {
                    // Optionally update the Firestore doc with the hash
                    docRef.update({ blockchainHash: hash }).catch(err => console.error("[Backend Logger] Failed to update tx with blockchain hash:", err));
                }
            })
            .catch(err => console.error("[Backend Logger] Blockchain logging failed:", err)); // Catch errors from the async call

        return finalTransaction; // Return the JS Date version

    } catch (error) {
        console.error(`[Backend Logger] Error logging transaction for user ${userId}:`, error);
        // Decide how to handle logging errors in the backend (e.g., log to monitoring service)
        throw new Error("Could not log transaction."); // Let controller handle the overall error
    }
}


/**
 * Logs transaction details to the blockchain via the blockchainLogger service.
 * Separated for clarity and potential independent use.
 *
 * @param {string} transactionId The unique ID of the transaction from our system.
 * @param {import('./types').Transaction} data The full transaction data object.
 * @returns {Promise<string | null>} A promise resolving to the blockchain transaction hash or null.
 */
async function logTransactionToBlockchain(transactionId, data) {
    // Exclude sensitive or unnecessary data before sending to blockchain logger if needed
    const { userId, amount, type, date, name, description, status, id } = data; // Select relevant fields
    // Ensure date is ISO string for consistent logging format
    const isoDate = date instanceof Date ? date.toISOString() : new Date().toISOString();
    const blockchainPayload = { userId, amount, type, date: isoDate, name, description, status, originalId: id };

    // Call the actual blockchain logging service function
    return blockchainLogger.logTransaction(transactionId, blockchainPayload);
}


module.exports = {
    addTransaction,
    logTransactionToBlockchain,
};

