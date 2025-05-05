
// backend/services/transactionLogger.js

const admin = require('firebase-admin');
const db = admin.firestore();
const blockchainLogger = require('./blockchainLogger'); // Import the blockchain service
const { sendToUser } = require('../server'); // Import WebSocket sender

// Use shared type definition
import type { Transaction } from './types';

/**
 * Adds a new transaction record to Firestore and optionally logs it to the blockchain.
 * Automatically adds server timestamp.
 * Generates avatarSeed if not provided.
 * Sends real-time notification via WebSocket.
 *
 * @param transactionData Transaction details (userId is required).
 * @returns A promise resolving to the full transaction object including Firestore ID and resolved timestamp.
 */
async function addTransaction(transactionData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string }): Promise<Transaction> {
    const { userId, name, ...rest } = transactionData;
    if (!userId) throw new Error("User ID is required to log transaction.");

    console.log(`Logging transaction for user ${userId}:`, rest);

    try {
        const transactionsColRef = collection(db, 'transactions');
        const dataToSave: any = { // Use any temporarily or refine based on Firestore types
            ...rest,
            userId: userId,
            name: name || 'Unknown Transaction',
            date: serverTimestamp(), // Use server timestamp
            avatarSeed: rest.avatarSeed || (name || `tx_${Date.now()}`).toLowerCase().replace(/\s+/g, ''),
            // Explicitly handle potentially undefined fields
             billerId: rest.billerId || null,
             upiId: rest.upiId || null,
             loanId: rest.loanId || null,
             ticketId: rest.ticketId || null,
             refundEta: rest.refundEta || null,
             blockchainHash: rest.blockchainHash || null,
             paymentMethodUsed: rest.paymentMethodUsed || null,
             originalTransactionId: rest.originalTransactionId || null,
        };

        // Remove keys with null or undefined values before saving
        Object.keys(dataToSave).forEach(key => (dataToSave[key] === undefined || dataToSave[key] === null) && delete dataToSave[key]);


        const docRef = await addDoc(transactionsColRef, dataToSave);
        console.log("Transaction logged to Firestore with ID:", docRef.id);

        // Fetch the newly created doc to get the server timestamp resolved
        const newDocSnap = await docRef.get();
        const savedData = newDocSnap.data();

        if (!savedData) {
            throw new Error("Failed to retrieve saved transaction data.");
        }

        // Convert Firestore Timestamp to JS Date
        const finalTransaction: Transaction = {
            id: docRef.id,
            ...(savedData as Omit<Transaction, 'id' | 'date'>), // Cast excluding id and date
            date: (savedData.date as admin.firestore.Timestamp).toDate(), // Convert timestamp
        };

         // Send real-time update via WebSocket
        sendToUser(userId, {
            type: 'transaction_update',
            payload: finalTransaction, // Send the complete transaction data
        });


        // Optional: Log to blockchain asynchronously (don't block response)
        logTransactionToBlockchain(finalTransaction.id, finalTransaction)
            .then(hash => {
                if (hash) {
                    // Optionally update the Firestore doc with the hash
                    updateDoc(docRef, { blockchainHash: hash }).catch(err => console.error("Failed to update tx with blockchain hash:", err));
                }
            })
            .catch(err => console.error("Blockchain logging failed:", err)); // Catch errors from the async call

        return finalTransaction; // Return the JS Date version

    } catch (error) {
        console.error(`Error logging transaction for user ${userId}:`, error);
        throw new Error("Could not log transaction.");
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
async function logTransactionToBlockchain(transactionId: string, data: Transaction): Promise<string | null> {
    // Exclude sensitive or unnecessary data before sending to blockchain logger if needed
    const { userId, amount, type, date, name, description, status, id } = data; // Select relevant fields
    const blockchainPayload = { userId, amount, type, date: date.toISOString(), name, description, status, originalId: id };

    return blockchainLogger.logTransaction(transactionId, blockchainPayload);
}


module.exports = {
    addTransaction,
    logTransactionToBlockchain,
};

// Ensure imports for Firestore types are correct if using stricter typing
const { collection, addDoc, doc, updateDoc, serverTimestamp } = require('firebase/firestore');
        