// backend/services/wallet.js

const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('./transactionLogger'); // Use backend logger service
const { sendToUser } = require('../server'); // Import WebSocket sender

// Import Firestore functions correctly
const { doc, getDoc, setDoc, runTransaction, serverTimestamp, Timestamp, updateDoc } = require('firebase/firestore'); // Added Timestamp and updateDoc

/**
 * Sends a real-time balance update to the user via WebSocket.
 * @param {string} userId The ID of the user.
 * @param {number} newBalance The updated balance.
 */
function sendBalanceUpdate(userId, newBalance) {
    if (userId && typeof newBalance === 'number') {
        sendToUser(userId, {
            type: 'balance_update',
            payload: { balance: newBalance }
        });
    }
}

/**
 * Fetches the current wallet balance for a user. Creates the wallet if it doesn't exist.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<number>} - A promise that resolves to the wallet balance.
 */
async function getWalletBalance(userId) {
    if (!userId) throw new Error("User ID required to get wallet balance.");
    const walletDocRef = doc(db, 'wallets', userId);
    const walletDocSnap = await getDoc(walletDocRef);
    if (!walletDocSnap.exists()) {
        console.log(`Wallet for user ${userId} not found, creating...`);
        await setDoc(walletDocRef, {
            userId: userId,
            balance: 0,
            lastUpdated: serverTimestamp()
        });
        return 0;
    }
    return walletDocSnap.data().balance || 0;
}
module.exports.getWalletBalance = getWalletBalance; // Export for direct use

/**
 * Helper to ensure wallet exists, create if not. Internal use.
 * @param {string} userId - The ID of the user.
 * @param {FirebaseFirestore.Transaction} [transaction] - Optional Firestore transaction.
 * @returns {Promise<number>} - A promise that resolves to the current balance (or 0 if created).
 */
async function ensureWalletExistsInternal(userId, transaction = null) {
    const walletDocRef = doc(db, 'wallets', userId);
    const walletDocSnap = transaction ? await transaction.get(walletDocRef) : await getDoc(walletDocRef);
    let currentBalance = 0;

    if (!walletDocSnap.exists()) {
        console.log(`Wallet for user ${userId} not found, creating...`);
        const initialData = {
            userId: userId,
            balance: 0,
            lastUpdated: serverTimestamp()
        };
        if (transaction) {
            transaction.set(walletDocRef, initialData);
        } else {
            await setDoc(walletDocRef, initialData);
        }
    } else {
        currentBalance = walletDocSnap.data().balance || 0;
    }
    return Number(currentBalance);
}
module.exports.ensureWalletExistsInternal = ensureWalletExistsInternal;


/**
 * Internal function to perform wallet debit/credit. Handles logging and WS updates.
 * Used by other services like UPI fallback, recovery, rewards, etc.
 * IMPORTANT: Negative amount signifies a CREDIT to the wallet (like a top-up/refund).
 * Positive amount signifies a DEBIT from the wallet (like a payment).
 * @param {string} userId The user ID.
 * @param {string} referenceId Identifier for the transaction (e.g., recipient UPI, biller ID, 'RECOVERY_CREDIT').
 * @param {number} amount Amount (positive for debit, negative for credit).
 * @param {string} note Transaction description/note.
 * @param {string} [transactionType='Sent'] The type for the transaction log ('Sent', 'Received', 'Wallet Top-up', 'Refund', etc.).
 * @returns {Promise<{success: boolean, transactionId?: string, newBalance?: number, message?: string}>} Result object.
 */
async function payViaWalletInternal(userId, referenceId, amount, note, transactionType = null) {
    if (!userId || !referenceId || typeof amount !== 'number') {
        console.error("payViaWalletInternal: Invalid parameters", { userId, referenceId, amount });
        return { success: false, message: "Invalid parameters for internal wallet operation." };
    }

    const walletDocRef = doc(db, 'wallets', userId);
    let newBalance = 0;
    let loggedTxId; // To store logged transaction ID
    const isCredit = amount < 0; // Check if it's a credit operation
    const absoluteAmount = Math.abs(amount);
    const operationType = isCredit ? 'credit' : 'debit';
    // Determine log type based on operation, allow override
    const finalLogType = transactionType || (isCredit ? 'Received' : 'Sent');

    console.log(`[Wallet Service - Internal] Attempting wallet ${operationType} for user ${userId}, amount ${amount}, ref ${referenceId}`);

    try {
        await runTransaction(db, async (transaction) => {
             // Ensure wallet exists and get current balance within transaction
             const currentBalance = await ensureWalletExistsInternal(userId, transaction);

             if (!isCredit && currentBalance < absoluteAmount) {
                 throw new Error(`Insufficient wallet balance. Available: ₹${currentBalance.toFixed(2)}`);
             }

             // Calculate new balance
             newBalance = isCredit ? currentBalance + absoluteAmount : currentBalance - absoluteAmount;

             const updateData = {
                 balance: newBalance,
                 lastUpdated: serverTimestamp()
             };
             transaction.update(walletDocRef, updateData); // Use update as ensureWalletExistsInternal guarantees existence
         });

         // Log successful transaction AFTER Firestore transaction commits
         const logData = {
             type: finalLogType,
             name: referenceId, // Use reference ID as name (e.g., recipient UPI, biller ID)
             description: `${note || `Wallet ${operationType}`}`, // Combine note and operation type
             amount: amount, // Store the original amount (positive for debit, negative for credit)
             status: 'Completed',
             userId: userId,
             upiId: referenceId.includes('@') ? referenceId : undefined,
             paymentMethodUsed: 'Wallet',
             // Optionally add referenceId to a specific field if needed: e.g., externalReference: referenceId
         };
         const loggedTx = await addTransaction(logData); // Use backend logger
         loggedTxId = loggedTx.id;

         // Send real-time balance update via WebSocket
         sendBalanceUpdate(userId, newBalance);

          // Log to blockchain (optional, non-blocking) - use absolute amount?
         // Ensure data passed matches expected structure for blockchain logger
         logTransactionToBlockchain(loggedTxId, {
             ...logData,
             id: loggedTxId,
             date: new Date() // Use current date for blockchain log
         })
             .catch(err => console.error("[Wallet Service] Blockchain log failed:", err));

         console.log(`[Wallet Service - Internal] Wallet ${operationType} successful for ${userId}. Tx ID: ${loggedTxId}`);
         return { success: true, transactionId: loggedTxId, newBalance, message: `Wallet ${operationType} successful` };

    } catch (error) {
         console.error(`[Wallet Service - Internal] Wallet ${operationType} failed for ${userId} to ${referenceId}:`, error);
         // Log failed attempt only if it was a DEBIT
         let failedTxId;
         if (!isCredit) {
             const failLogData = {
                 type: 'Failed',
                 name: referenceId,
                 description: `Wallet Payment Failed - ${error.message}`,
                 amount: amount, // Store the original positive amount
                 status: 'Failed',
                 userId: userId,
                 upiId: referenceId.includes('@') ? referenceId : undefined,
                 paymentMethodUsed: 'Wallet',
             };
             try {
                 const failedTx = await addTransaction(failLogData);
                 failedTxId = failedTx.id;
                 sendToUser(userId, { type: 'transaction_update', payload: failedTx }); // Send WS update for failure
             } catch (logError) {
                  console.error("[Wallet Service] Failed to log failed internal wallet debit:", logError);
             }
         }
         return { success: false, transactionId: failedTxId, message: error.message || `Internal wallet ${operationType} failed.` };
    }
};
module.exports.payViaWalletInternal = payViaWalletInternal; // Export for internal use

