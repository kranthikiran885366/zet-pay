/**
 * @fileOverview Centralized BACKEND service for logging transactions to Firestore and Blockchain.
 */

import { admin, db } from '../config/firebaseAdmin'; // Use configured admin instance
import blockchainLogger from './blockchainLogger'; // Import the backend blockchain service using relative path
import { sendToUser } from '@/lib/websocket'; // Correct path to import WebSocket sender from frontend lib
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
            avatarSeed: rest.avatarSeed || (rest.name || `tx_${Date.now()}`).toLowerCase().replace(/\s+/g, ''),
            billerId: rest.billerId ?? null,
            upiId: rest.upiId ?? null,
            loanId: rest.loanId ?? null,
            ticketId: rest.ticketId ?? null,
            refundEta: rest.refundEta ?? null,
            blockchainHash: rest.blockchainHash ?? null,
            paymentMethodUsed: rest.paymentMethodUsed ?? null,
            originalTransactionId: rest.originalTransactionId ?? null,
            operatorReferenceId: (rest as any).operatorReferenceId ?? null,
            billerReferenceId: (rest as any).billerReferenceId ?? null,
            planId: (rest as any).planId ?? null,
            identifier: (rest as any).identifier ?? null,
            withdrawalRequestId: (rest as any).withdrawalRequestId ?? null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        Object.keys(dataToSave).forEach(key => {
            if (dataToSave[key as keyof typeof dataToSave] === undefined) {
                 delete dataToSave[key as keyof typeof dataToSave];
            }
        });


        const docRef = await transactionsColRef.add(dataToSave);
        console.log("[Backend Logger] Transaction logged to Firestore with ID:", docRef.id);

        const newDocSnap = await docRef.get();
        const savedData = newDocSnap.data();

        if (!savedData || !savedData.date) {
            console.error("[Backend Logger] Failed to retrieve saved transaction data or timestamp for ID:", docRef.id);
            throw new Error("Failed to retrieve saved transaction data.");
        }

        const finalTransaction: Transaction = {
            id: docRef.id,
            ...savedData,
            date: (savedData.date as Timestamp).toDate(),
            createdAt: savedData.createdAt ? (savedData.createdAt as Timestamp).toDate() : undefined,
            updatedAt: savedData.updatedAt ? (savedData.updatedAt as Timestamp).toDate() : undefined,
        } as Transaction;


        if (typeof sendToUser === 'function') {
            const wsPayload = {
                ...finalTransaction,
                date: finalTransaction.date.toISOString(),
                createdAt: finalTransaction.createdAt?.toISOString(),
                updatedAt: finalTransaction.updatedAt?.toISOString(),
            };
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

        // Ensure data passed to blockchainLogger matches its expected structure
        const blockchainPayload = {
            userId: finalTransaction.userId,
            type: finalTransaction.type,
            amount: finalTransaction.amount,
            date: finalTransaction.date.toISOString(), // Blockchain logger expects ISO string
            recipient: finalTransaction.upiId || finalTransaction.billerId || undefined,
            name: finalTransaction.name,
            description: finalTransaction.description,
            status: finalTransaction.status,
            originalId: finalTransaction.id,
        };

        if (blockchainLogger && typeof blockchainLogger.logTransaction === 'function') {
            blockchainLogger.logTransaction(finalTransaction.id, blockchainPayload)
                .then(hash => {
                    if (hash) {
                        docRef.update({ blockchainHash: hash, updatedAt: FieldValue.serverTimestamp() }).catch(err => console.error("[Backend Logger] Failed to update tx with blockchain hash:", err));
                    }
                })
                .catch(err => console.error("[Backend Logger] Blockchain logging failed:", err));
        } else {
            console.error("[Backend Logger] blockchainLogger or its logTransaction method is not available.");
        }

        return finalTransaction;

    } catch (error: any) {
        console.error(`[Backend Logger] Error logging transaction for user ${userId}:`, error);
        throw new Error(error.message || "Could not log transaction.");
    }
}


// This function is not typically called from client-side services directly.
// It's part of the backend's internal transaction logging flow.
export async function logTransactionToBlockchain(transactionId: string, data: any): Promise<string | null> {
    const { userId, amount, type, date, name, description, status, id } = data;
    const isoDate = date instanceof Date ? date.toISOString() : (typeof date === 'string' ? date : new Date().toISOString());
    const blockchainPayload = { userId, amount, type, date: isoDate, name, description, status, originalId: id };

    if (blockchainLogger && typeof blockchainLogger.logTransaction === 'function') {
        return blockchainLogger.logTransaction(transactionId, blockchainPayload);
    } else {
        console.error("[Backend Logger] Blockchain logger or logTransaction method not available for explicit call.");
        return null;
    }
}
