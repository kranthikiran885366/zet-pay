
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger'); // Use centralized logger
const { sendToUser } = require('../server'); // Import WebSocket sender

/**
 * Sends a real-time balance update to the user via WebSocket.
 * @param userId The ID of the user.
 * @param newBalance The updated balance.
 */
function sendBalanceUpdate(userId, newBalance) {
    if (userId && typeof newBalance === 'number') {
        sendToUser(userId, {
            type: 'balance_update',
            payload: { balance: newBalance }
        });
    }
}

// Helper to ensure wallet exists, create if not
async function ensureWalletExists(userId) {
    const walletDocRef = doc(db, 'wallets', userId); // Correct usage of doc
    const walletDocSnap = await getDoc(walletDocRef);
    if (!walletDocSnap.exists()) {
        console.log(`Wallet for user ${userId} not found, creating...`);
        await setDoc(walletDocRef, { // Correct usage of setDoc
            userId: userId,
            balance: 0,
            lastUpdated: serverTimestamp()
        });
        return 0; // Return initial balance
    }
    return walletDocSnap.data().balance || 0;
}

exports.getWalletBalance = async (req, res, next) => {
    const userId = req.user.uid;
    try {
        const balance = await ensureWalletExists(userId);
        res.status(200).json({ balance: Number(balance) }); // Ensure it's a number
    } catch (error) {
        next(error);
    }
};

exports.topUpWallet = async (req, res, next) => {
    const userId = req.user.uid;
    const { amount, fundingSourceInfo } = req.body;

    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: 'Invalid top-up amount.' });
    }
    if (!fundingSourceInfo) {
        return res.status(400).json({ message: 'Funding source information is required.' });
    }

    let newBalance = 0; // Define newBalance outside transaction scope
    const walletDocRef = doc(db, 'wallets', userId); // Define doc ref once

    try {
        // 1. Simulate payment processing from funding source
        console.log(`Simulating debit of ₹${amount} from ${fundingSourceInfo} for wallet top-up (User: ${userId})...`);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate payment delay
        const paymentSuccess = true; // Assume success for demo

        if (!paymentSuccess) {
            throw new Error('Failed to debit funding source.');
        }

        // 2. Atomically update wallet balance in Firestore using a transaction
        await runTransaction(db, async (transaction) => {
            const walletDoc = await transaction.get(walletDocRef);
            let currentBalance = 0;
            if (!walletDoc.exists) {
                console.warn(`Wallet for user ${userId} not found during top-up transaction, creating...`);
                // Initialize balance to 0 before adding amount
            } else {
                currentBalance = walletDoc.data().balance || 0;
            }
            newBalance = Number(currentBalance) + amount; // Calculate new balance

            const updateData = {
                 balance: newBalance,
                 lastUpdated: serverTimestamp()
            };

             // Use set with merge: true if creating, or update if exists
             if (!walletDoc.exists()) {
                  transaction.set(walletDocRef, { userId: userId, ...updateData });
             } else {
                  transaction.update(walletDocRef, updateData);
             }
        });

        // 3. Log successful top-up transaction
        const logData = {
             type: 'Wallet Top-up',
             name: 'Wallet Top-up',
             description: `Added from ${fundingSourceInfo}`,
             amount: amount, // Positive amount
             status: 'Completed',
             userId: userId,
         };
        const loggedTx = await addTransaction(logData);

        // 4. Send real-time balance update
        sendBalanceUpdate(userId, newBalance);

        // Blockchain log (optional)
        logTransactionToBlockchain(loggedTx.id, { userId, type: logData.type, amount, date: new Date() })
             .catch(err => console.error("Blockchain log failed:", err));

        res.status(200).json({ success: true, newBalance, message: 'Wallet topped up successfully.', transactionId: loggedTx.id });

    } catch (error) {
        console.error("Error in topUpWallet:", error);
        next(error);
    }
};

// Export helper for internal use (e.g., by other controllers/services for fallback/recovery)
// This function now handles logging and real-time updates internally
module.exports.payViaWalletInternal = async (userId, recipientId, amount, note) => {
    const walletDocRef = doc(db, 'wallets', userId);
    let newBalance = 0;
    let transactionId; // To store logged transaction ID

    try {
        await runTransaction(db, async (transaction) => {
             const walletDoc = await transaction.get(walletDocRef);
             if (!walletDoc.exists()) throw new Error("Wallet not found.");
             const currentBalance = walletDoc.data().balance || 0;
             if (currentBalance < amount) throw new Error("Insufficient wallet balance.");
             newBalance = currentBalance - amount;
             transaction.update(walletDocRef, {
                 balance: newBalance,
                 lastUpdated: serverTimestamp()
             });
         });

         // Log successful internal payment
         const logData = {
             type: 'Sent',
             name: recipientId, // Use identifier
             description: `Paid via Wallet ${note ? `- ${note}` : ''}`,
             amount: -amount,
             status: 'Completed',
             userId: userId,
             upiId: recipientId.includes('@') ? recipientId : undefined,
             paymentMethodUsed: 'Wallet', // Indicate payment method
         };
         const loggedTx = await addTransaction(logData);
         transactionId = loggedTx.id;

         // Send real-time balance update
         sendBalanceUpdate(userId, newBalance);

          // Log to blockchain (optional, non-blocking)
         logTransactionToBlockchain(loggedTx.id, { userId, type: logData.type, amount, date: new Date(), recipient: recipientId })
              .catch(err => console.error("Blockchain log failed:", err));

         return { success: true, transactionId, newBalance, message: 'Internal wallet payment successful' };

    } catch (error) {
         console.error(`Internal wallet payment failed for ${userId} to ${recipientId}:`, error);
         // Log failed internal payment attempt
         const failLogData = {
             type: 'Failed',
             name: recipientId,
             description: `Wallet Payment Failed - ${error.message}`,
             amount: -amount,
             status: 'Failed',
             userId: userId,
             upiId: recipientId.includes('@') ? recipientId : undefined,
             paymentMethodUsed: 'Wallet',
         };
          let loggedTxId;
          try {
             const failedTx = await addTransaction(failLogData);
             loggedTxId = failedTx.id;
          } catch (logError) {
              console.error("Failed to log failed internal wallet transaction:", logError);
          }
         // Send error update via WebSocket? Could be noisy.
         // sendToUser(userId, { type: 'payment_failed', payload: { recipientId, amount, reason: error.message } });
         return { success: false, transactionId: loggedTxId, message: error.message || 'Internal wallet payment failed.' };
    }
};

// Correct import of Firestore functions
const { doc, getDoc, setDoc, runTransaction, serverTimestamp, collection, query, where, orderBy, limit, getDocs, addDoc, updateDoc, deleteDoc, Timestamp, writeBatch } = require('firebase/firestore');
        