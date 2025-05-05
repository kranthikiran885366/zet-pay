/**
 * @fileOverview Centralized BACKEND service for logging transactions to Firestore and Blockchain.
 */

import admin from 'firebase-admin'; // Use admin SDK
const db = admin.firestore();
import blockchainLogger from './blockchainLogger'; // Correct import path for backend service
import { sendToUser } from '../lib/websocket'; // Corrected path for backend WS sender
import type { Transaction } from './types'; // Import shared Transaction type (adjust path if needed)
import { Timestamp, FieldValue, Firestore } from 'firebase-admin/firestore'; // Use Admin SDK Timestamp and FieldValue

/**
 * Adds a new transaction record to Firestore and logs it to the blockchain (backend context).
 * Sends real-time notification via WebSocket upon successful logging.
 *
 * @param transactionData Transaction details (userId MUST be provided by the controller).
 * @returns A promise resolving to the full transaction object including Firestore ID and resolved timestamp.
 * @throws Error if userId is missing or logging fails.
 */
export async function addTransaction(transactionData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string }): Promise<Transaction> {
    const { userId, ...rest } = transactionData;
    if (!userId) throw new Error("User ID is required to log transaction.");

    console.log(`[Backend Logger] Logging transaction for user ${userId}:`, rest.type);

    try {
        const transactionsColRef = db.collection('transactions');
        const dataToSave = {
            ...rest,
            userId: userId,
            date: FieldValue.serverTimestamp(), // Use Firestore server timestamp
            // Generate avatarSeed if not provided
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
            operatorReferenceId: (rest as any).operatorReferenceId ?? null, // Add operatorReferenceId if present
            billerReferenceId: (rest as any).billerReferenceId ?? null, // Add billerReferenceId if present
            planId: (rest as any).planId ?? null, // Add planId if present
            identifier: (rest as any).identifier ?? null, // Add identifier if present
        };

        // Remove keys with undefined values before saving (Firestore doesn't like undefined)
        Object.keys(dataToSave).forEach(key => {
            if (dataToSave[key as keyof typeof dataToSave] === undefined) {
                 delete dataToSave[key as keyof typeof dataToSave]; // Delete key if value is undefined
            }
        });


        const docRef = await transactionsColRef.add(dataToSave);
        console.log("[Backend Logger] Transaction logged to Firestore with ID:", docRef.id);

        // Fetch the newly created doc to get the server timestamp resolved
        const newDocSnap = await docRef.get();
        const savedData = newDocSnap.data();

        if (!savedData || !savedData.date) { // Check if date field exists after fetch
            throw new Error("Failed to retrieve saved transaction data or timestamp.");
        }

        // Convert Firestore Timestamp to JS Date for return value and WebSocket payload
        const finalTransaction: Transaction = {
            id: docRef.id,
            ...savedData,
            date: (savedData.date as Timestamp).toDate(), // Convert timestamp
            // Ensure other potential Timestamp fields are converted if necessary
             createdAt: savedData.createdAt ? (savedData.createdAt as Timestamp).toDate() : undefined,
             updatedAt: savedData.updatedAt ? (savedData.updatedAt as Timestamp).toDate() : undefined,
        } as Transaction; // Assert type


        // Send real-time update via WebSocket (backend function)
        console.log(`[Backend Logger] Sending WS update for tx ${finalTransaction.id} to user ${userId}`);
        // Ensure payload date is serializable (ISO string) for WebSocket
        const wsPayload = { ...finalTransaction, date: finalTransaction.date.toISOString() };
        const sent = sendToUser(userId, {
            type: 'transaction_update',
            payload: wsPayload, // Send ISO string date
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

    } catch (error: any) {
        console.error(`[Backend Logger] Error logging transaction for user ${userId}:`, error);
        // Let the controller handle the overall error
        throw new Error(error.message || "Could not log transaction.");
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

