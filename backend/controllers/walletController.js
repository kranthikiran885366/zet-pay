
const admin = require('firebase-admin');
const db = admin.firestore();
const { addTransaction, logTransactionToBlockchain } = require('../services/transactionLogger'); // Use centralized logger

// Helper to ensure wallet exists, create if not
async function ensureWalletExists(userId) {
    const walletDocRef = db.collection('wallets').doc(userId);
    const walletDocSnap = await walletDocRef.get();
    if (!walletDocSnap.exists) {
        console.log(`Wallet for user ${userId} not found, creating...`);
        await walletDocRef.set({
            userId: userId,
            balance: 0,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
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
    const { amount, fundingSourceInfo } = req.body; // fundingSourceInfo might be Bank UPI ID, Card Token ID etc.

    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: 'Invalid top-up amount.' });
    }
    if (!fundingSourceInfo) {
        return res.status(400).json({ message: 'Funding source information is required.' });
    }

    try {
        // 1. Simulate payment processing from funding source
        console.log(`Simulating debit of ₹${amount} from ${fundingSourceInfo} for wallet top-up (User: ${userId})...`);
        // TODO: Replace with actual payment gateway/UPI debit call
        await new Promise(resolve => setTimeout(resolve, 1500));
        const paymentSuccess = true; // Assume success for demo

        if (!paymentSuccess) {
            throw new Error('Failed to debit funding source.');
        }

        // 2. Atomically update wallet balance in Firestore
        const walletDocRef = db.collection('wallets').doc(userId);
        let newBalance = 0;

        await db.runTransaction(async (transaction) => {
            const walletDoc = await transaction.get(walletDocRef);
            let currentBalance = 0;
            if (!walletDoc.exists) {
                // Create wallet during transaction if it was somehow missed
                console.warn(`Wallet for user ${userId} not found during top-up transaction, creating...`);
            } else {
                currentBalance = walletDoc.data().balance || 0;
            }
            newBalance = Number(currentBalance) + amount; // Calculate new balance

            // Use set with merge: true or update
             if (walletDoc.exists()) {
                transaction.update(walletDocRef, {
                    balance: newBalance,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                });
             } else {
                 transaction.set(walletDocRef, {
                    userId: userId,
                    balance: newBalance,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                 });
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

        // Blockchain log (optional)
        logTransactionToBlockchain(loggedTx.id, { userId, type: logData.type, amount, date: new Date() })
             .catch(err => console.error("Blockchain log failed:", err));


        res.status(200).json({ success: true, newBalance, message: 'Wallet topped up successfully.' });

    } catch (error) {
        next(error);
    }
};

// Export helper for internal use (e.g., by other controllers/services)
module.exports.getWalletBalanceInternal = ensureWalletExists;
module.exports.payViaWalletInternal = async (userId, recipientId, amount, note) => {
     // Simplified internal payment logic - assumes sufficient balance checking done externally if needed
     // USE WITH CAUTION - ideally call the main controller logic if possible
    const walletDocRef = db.collection('wallets').doc(userId);
    try {
        await db.runTransaction(async (transaction) => {
             const walletDoc = await transaction.get(walletDocRef);
             if (!walletDoc.exists()) throw new Error("Wallet not found.");
             const currentBalance = walletDoc.data().balance || 0;
             if (currentBalance < amount) throw new Error("Insufficient wallet balance.");
             const newBalance = currentBalance - amount;
             transaction.update(walletDocRef, {
                 balance: newBalance,
                 lastUpdated: admin.firestore.FieldValue.serverTimestamp()
             });
         });
         // Log internal payment
         const logData = {
             type: 'Sent',
             name: recipientId, // Use identifier
             description: `Paid via Wallet ${note ? `- ${note}` : ''}`,
             amount: -amount,
             status: 'Completed',
             userId: userId,
             upiId: recipientId.includes('@') ? recipientId : undefined,
         };
         const loggedTx = await addTransaction(logData);
          // Log to blockchain (optional, non-blocking)
         logTransactionToBlockchain(loggedTx.id, { userId, type: logData.type, amount, date: new Date(), recipient: recipientId })
              .catch(err => console.error("Blockchain log failed:", err));

         return { success: true, transactionId: loggedTx.id, message: 'Internal wallet payment successful' };
    } catch (error) {
         console.error(`Internal wallet payment failed for ${userId} to ${recipientId}:`, error);
         // Log failed internal payment
         const failLogData = {
             type: 'Failed',
             name: recipientId,
             description: `Wallet Payment Failed - ${error.message}`,
             amount: -amount,
             status: 'Failed',
             userId: userId,
             upiId: recipientId.includes('@') ? recipientId : undefined,
         };
          let loggedTxId;
          try {
             const failedTx = await addTransaction(failLogData);
             loggedTxId = failedTx.id;
          } catch (logError) {
              console.error("Failed to log failed internal wallet transaction:", logError);
          }
         return { success: false, transactionId: loggedTxId, message: error.message || 'Internal wallet payment failed.' };
    }
};
