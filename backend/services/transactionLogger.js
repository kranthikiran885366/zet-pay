
// backend/services/transactionLogger.js

const admin = require('firebase-admin');
const db = admin.firestore();
const blockchainLogger = require('./blockchainLogger'); // Import the backend blockchain service
// Correctly require the exported functions from server.js
const { sendToUser } = require('../server');

// Use shared type definition (relative path might differ based on setup)
// Adjust the path if your 'types.ts' is elsewhere or use require if not using TS directly here
// For simplicity, assuming types are primarily for frontend/shared context, we might skip strict TS typing here
// import type { Transaction } from './types';

/**
 * Adds a new transaction record to Firestore and logs it to the blockchain.
 * Called by various backend controllers AFTER payment/action is processed.
 *
 * @param transactionData Transaction details (userId is required).
 * @returns A promise resolving to the full transaction object including Firestore ID and resolved timestamp.
 */
async function addTransaction(transactionData /*: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } */) {
    const { userId, ...rest } = transactionData;
    if (!userId) throw new Error("User ID is required to log transaction.");

    console.log(`[Backend Logger] Logging transaction for user ${userId}:`, rest.type);

    try {
        const transactionsColRef = db.collection('transactions'); // Use Admin SDK
        const dataToSave = {
            ...rest,
            userId: userId,
            date: admin.firestore.FieldValue.serverTimestamp(), // Use server timestamp
            // Generate avatarSeed if not provided (backend fallback)
            avatarSeed: rest.avatarSeed || (rest.name || `tx_${Date.now()}`).toLowerCase().replace(/\s+/g, ''),
            // Set default nulls for optional fields if not provided
            billerId: rest.billerId || null,
            upiId: rest.upiId || null,
            loanId: rest.loanId || null,
            ticketId: rest.ticketId || null,
            refundEta: rest.refundEta || null,
            blockchainHash: rest.blockchainHash || null, // Will be updated after logging
            paymentMethodUsed: rest.paymentMethodUsed || null,
            originalTransactionId: rest.originalTransactionId || null,
        };

        // Remove keys with null or undefined values before saving
         Object.keys(dataToSave).forEach(key => {
             if (dataToSave[key] === undefined) {
                 dataToSave[key] = null; // Set undefined to null for Firestore
             }
         });


        const docRef = await transactionsColRef.add(dataToSave);
        console.log("[Backend Logger] Transaction logged to Firestore with ID:", docRef.id);

        // Fetch the newly created doc to get the server timestamp resolved
        const newDocSnap = await docRef.get();
        const savedData = newDocSnap.data();

        if (!savedData) {
            throw new Error("Failed to retrieve saved transaction data.");
        }

        // Convert Firestore Timestamp to JS Date for return value and logging
        const finalTransaction = {
            id: docRef.id,
            ...savedData,
            date: savedData.date.toDate(), // Convert timestamp
        };

        // Send real-time update via WebSocket AFTER successful Firestore save
        const sent = sendToUser(userId, {
            type: 'transaction_update',
            payload: finalTransaction, // Send the complete transaction data (JS Date format)
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
 * @param transactionId The unique ID of the transaction from our system.
 * @param data The full transaction data object.
 * @returns A promise resolving to the blockchain transaction hash or null.
 */
async function logTransactionToBlockchain(transactionId, data) {
    // Exclude sensitive or unnecessary data before sending to blockchain logger if needed
    const { userId, amount, type, date, name, description, status, id } = data; // Select relevant fields
    // Ensure date is ISO string for consistent logging format
    const isoDate = date instanceof Date ? date.toISOString() : new Date().toISOString();
    const blockchainPayload = { userId, amount, type, date: isoDate, name, description, status, originalId: id };

    return blockchainLogger.logTransaction(transactionId, blockchainPayload);
}


module.exports = {
    addTransaction,
    logTransactionToBlockchain,
};

// Ensure imports for Firestore types are correct if using stricter typing
// const { collection, addDoc, doc, updateDoc, serverTimestamp, getDoc, Timestamp } = require('firebase/firestore');

