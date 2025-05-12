// backend/services/transactionLogger.js

const { admin, db } = require('../config/firebaseAdmin'); // Use configured admin instance
const blockchainLogger = require('../services/blockchainLogger'); // Import the backend blockchain service
const { sendToUser } = require('../server'); // Import WebSocket sender from server.js
const { Timestamp } = require('firebase-admin/firestore'); // Use Admin SDK Timestamp


/**
 * Adds a new transaction record to Firestore and logs it to the blockchain.
 * Called by various backend controllers AFTER payment/action is processed.
 *
 * @param {Partial<Omit<import('./types').Transaction, 'id' | 'date'>> & { userId: string, stealthScan?: boolean }} transactionData Transaction details (userId is required). Added stealthScan.
 * @returns {Promise<import('./types').Transaction>} A promise resolving to the full transaction object including Firestore ID and resolved timestamp.
 */
async function addTransaction(transactionData) {
    const { userId, stealthScan, ...rest } = transactionData; // Destructure stealthScan
    if (!userId) throw new Error("User ID is required to log transaction.");

    console.log(`[Backend Logger] Logging transaction for user ${userId}:`, rest.type);

    try {
        const transactionsColRef = db.collection('transactions');
        const dataToSave = {
            ...rest,
            userId: userId,
            date: Timestamp.now(), 
            avatarSeed: rest.avatarSeed || (rest.name || `tx_${Date.now()}`).toLowerCase().replace(/\s+/g, ''),
            billerId: rest.billerId ?? null,
            upiId: rest.upiId ?? null,
            loanId: rest.loanId ?? null,
            ticketId: rest.ticketId ?? null,
            refundEta: rest.refundEta ?? null,
            blockchainHash: rest.blockchainHash ?? null, 
            paymentMethodUsed: rest.paymentMethodUsed ?? null,
            originalTransactionId: rest.originalTransactionId ?? null,
            operatorReferenceId: rest.operatorReferenceId ?? null,
            billerReferenceId: rest.billerReferenceId ?? null,
            planId: rest.planId ?? null,
            identifier: rest.identifier ?? null,
            withdrawalRequestId: rest.withdrawalRequestId ?? null,
            createdAt: rest.createdAt instanceof Date ? Timestamp.fromDate(rest.createdAt) : rest.createdAt ?? Timestamp.now(),
            updatedAt: rest.updatedAt instanceof Date ? Timestamp.fromDate(rest.updatedAt) : rest.updatedAt ?? Timestamp.now(),
            stealthScan: stealthScan || false, // Store stealthScan flag
        };

         Object.keys(dataToSave).forEach(key => {
             if (dataToSave[key] === undefined) {
                  delete dataToSave[key]; 
             }
         });


        const docRef = await transactionsColRef.add(dataToSave);
        console.log("[Backend Logger] Transaction logged to Firestore with ID:", docRef.id);

        const newDocSnap = await docRef.get();
        const savedData = newDocSnap.data();

        if (!savedData) {
            throw new Error("Failed to retrieve saved transaction data.");
        }

        const finalTransaction = {
            id: docRef.id,
            ...savedData,
            date: savedData.date.toDate(), 
            createdAt: savedData.createdAt instanceof Timestamp ? savedData.createdAt.toDate() : undefined,
            updatedAt: savedData.updatedAt instanceof Timestamp ? savedData.updatedAt.toDate() : undefined,
        };

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


        logTransactionToBlockchain(finalTransaction.id, finalTransaction)
            .then(hash => {
                if (hash) {
                    docRef.update({ blockchainHash: hash }).catch(err => console.error("[Backend Logger] Failed to update tx with blockchain hash:", err));
                }
            })
            .catch(err => console.error("[Backend Logger] Blockchain logging failed:", err)); 

        return finalTransaction; 

    } catch (error) {
        console.error(`[Backend Logger] Error logging transaction for user ${userId}:`, error);
        throw new Error("Could not log transaction."); 
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
    const { userId, amount, type, date, name, description, status, id, ticketId } = data; 
    const isoDate = date instanceof Date ? date.toISOString() : new Date().toISOString();
    const blockchainPayload = { userId, amount, type, date: isoDate, name, description, status, originalId: id, ticketId }; 

    return blockchainLogger.logTransaction(transactionId, blockchainPayload);
}


module.exports = {
    addTransaction,
    logTransactionToBlockchain,
};
