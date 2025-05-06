/**
 * @fileOverview Centralized BACKEND service for logging transactions to Firestore and Blockchain.
 */

import { admin, db } from '../config/firebaseAdmin'; // Use configured admin instance
import blockchainLogger from './blockchainLogger'; // Import the backend blockchain service using relative path
import { sendToUser } from '../server'; // Import WebSocket sender from server.js
import type { Transaction } from './types'; // Import shared Transaction type (adjust path if needed)
import { Timestamp, FieldValue } from 'firebase-admin/firestore'; // Use Admin SDK Timestamp and FieldValue


/**
 * Adds a new transaction record to Firestore and logs it to the blockchain.
 * Called by various backend controllers AFTER payment/action is processed.
 *
 * @param {Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string }} transactionData Transaction details (userId is required).
 * @returns {Promise<Transaction>} A promise resolving to the full transaction object including Firestore ID and resolved timestamp.
 */
export async function addTransaction(transactionData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string }): Promise<Transaction> {
    const { userId, ...rest } = transactionData;
    if (!userId) {
        console.error("[Backend Logger] User ID is missing, cannot log transaction.");
        throw new Error("User ID is required to log transaction.");
    }

    console.log(`[Backend Logger] Logging transaction for user ${userId}. Type: ${rest.type}, Status: ${rest.status}`);

    try {
        const transactionsColRef = db.collection('transactions');
        const dataToSave = {
            ...rest,
            userId: userId,
            date: FieldValue.serverTimestamp(), // Use Firestore server timestamp for creation/update
            // Generate avatarSeed if not provided (backend fallback)
            avatarSeed: rest.avatarSeed || (rest.name || `tx_${Date.now()}`).toLowerCase().replace(/\s+/g, ''),
            // Ensure optional fields are explicitly set to null if not provided or undefined
            billerId: rest.billerId ?? null,
            upiId: rest.upiId ?? null,
            loanId: rest.loanId ?? null,
            ticketId: rest.ticketId ?? null,
            refundEta: rest.refundEta ?? null,
            blockchainHash: rest.blockchainHash ?? null, // Will be updated after logging if successful
            paymentMethodUsed: rest.paymentMethodUsed ?? null,
            originalTransactionId: rest.originalTransactionId ?? null,
            operatorReferenceId: (rest as any).operatorReferenceId ?? null,
            billerReferenceId: (rest as any).billerReferenceId ?? null,
            planId: (rest as any).planId ?? null,
            identifier: (rest as any).identifier ?? null,
            withdrawalRequestId: (rest as any).withdrawalRequestId ?? null,
            createdAt: rest.createdAt instanceof Date ? Timestamp.fromDate(rest.createdAt) : FieldValue.serverTimestamp(), // Ensure createdAt is set on initial log
            updatedAt: FieldValue.serverTimestamp(), // Always set updatedAt
        };

        // Remove keys with undefined values before saving (Firestore doesn't like undefined)
        Object.keys(dataToSave).forEach(key => {
            if (dataToSave[key as keyof typeof dataToSave] === undefined) {
                 delete dataToSave[key as keyof typeof dataToSave];
            }
        });


        const docRef = await transactionsColRef.add(dataToSave);
        console.log("[Backend Logger] Transaction logged to Firestore with ID:", docRef.id);

        // Fetch the newly created doc to get the server timestamp resolved
        const newDocSnap = await docRef.get();
        const savedData = newDocSnap.data();

        if (!savedData || !savedData.date) { // date field must exist after save
            console.error("[Backend Logger] Failed to retrieve saved transaction data or timestamp for ID:", docRef.id);
            throw new Error("Failed to retrieve saved transaction data.");
        }

        // Convert Firestore Timestamp to JS Date for return value and logging
        const finalTransaction: Transaction = {
            id: docRef.id,
            ...savedData,
            date: (savedData.date as Timestamp).toDate(), // Convert timestamp to Date
            // Convert other timestamps if needed
            createdAt: savedData.createdAt ? (savedData.createdAt as Timestamp).toDate() : undefined,
            updatedAt: savedData.updatedAt ? (savedData.updatedAt as Timestamp).toDate() : undefined,
        } as Transaction; // Assert type


        // Send real-time update via WebSocket AFTER successful Firestore save
        // Ensure payload uses ISO string for dates for JSON serialization
        const wsPayload = {
            ...finalTransaction,
            date: finalTransaction.date.toISOString(),
            createdAt: finalTransaction.createdAt?.toISOString(),
            updatedAt: finalTransaction.updatedAt?.toISOString(),
        };
        // Ensure sendToUser exists and is callable before using it
        if (typeof sendToUser === 'function') {
            const sent = sendToUser(userId, {
                type: 'transaction_update',
                payload: wsPayload,
            });
            if (!sent) {
                console.warn(`[Backend Logger] WebSocket not connected for user ${userId}. Transaction update not sent in real-time.`);
            }
        } else {
             console.error("[Backend Logger] sendToUser function is not available. Cannot send WebSocket update.");
        }

        // Log to blockchain asynchronously (don't block response)
        // Pass necessary fields to the blockchain logging function
        const blockchainPayload = {
            userId: finalTransaction.userId,
            type: finalTransaction.type,
            amount: finalTransaction.amount,
            date: finalTransaction.date.toISOString(),
            recipient: finalTransaction.upiId || finalTransaction.billerId || undefined,
            name: finalTransaction.name,
            description: finalTransaction.description,
            status: finalTransaction.status,
            originalId: finalTransaction.id, // Pass Firestore ID to blockchain log
        };

        blockchainLogger.logTransaction(finalTransaction.id, blockchainPayload)
            .then(hash => {
                if (hash) {
                    // Optionally update the Firestore doc with the hash
                    docRef.update({ blockchainHash: hash, updatedAt: FieldValue.serverTimestamp() }).catch(err => console.error("[Backend Logger] Failed to update tx with blockchain hash:", err));
                }
            })
            .catch(err => console.error("[Backend Logger] Blockchain logging failed:", err)); // Catch errors from the async call

        return finalTransaction; // Return the JS Date version

    } catch (error: any) {
        console.error(`[Backend Logger] Error logging transaction for user ${userId}:`, error);
        throw new Error(error.message || "Could not log transaction."); // Let controller handle the overall error
    }
}


/**
 * Logs transaction details to the blockchain via the blockchainLogger service.
 * Separated for clarity and potential independent use.
 *
 * @param {string} transactionId The unique ID of the transaction from our system.
 * @param {Transaction} data The full transaction data object.
 * @returns {Promise<string | null>} A promise resolving to the blockchain transaction hash or null.
 */
export async function logTransactionToBlockchain(transactionId: string, data: Transaction): Promise<string | null> {
    // Exclude sensitive or unnecessary data before sending to blockchain logger if needed
    const { userId, amount, type, date, name, description, status, id } = data; // Select relevant fields
    // Ensure date is ISO string for consistent logging format
    const isoDate = date instanceof Date ? date.toISOString() : (typeof date === 'string' ? date : new Date().toISOString());
    const blockchainPayload = { userId, amount, type, date: isoDate, name, description, status, originalId: id };

    // Call the actual blockchain logging service function
    // Assuming blockchainLogger has a logTransaction method
    if (blockchainLogger && typeof blockchainLogger.logTransaction === 'function') {
        return blockchainLogger.logTransaction(transactionId, blockchainPayload);
    } else {
        console.error("[Backend Logger] blockchainLogger or blockchainLogger.logTransaction is not available.");
        return null;
    }
}


// module.exports = {
//     addTransaction,
//     logTransactionToBlockchain,
// };

