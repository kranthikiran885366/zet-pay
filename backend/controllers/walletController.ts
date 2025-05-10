
import type { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { doc, getDoc, setDoc, runTransaction, serverTimestamp, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { addTransaction, logTransactionToBlockchain } from '../services/transactionLogger'; // Import backend logger
import { sendToUser } from '../server'; // Import backend WebSocket sender
import type { Transaction } from '../services/types'; // Import shared types
import { getWalletBalance as getWalletBalanceService, ensureWalletExistsInternal as ensureWalletExistsInternalService, payViaWalletInternal as payViaWalletInternalService } from '../services/wallet'; // Import service functions

const db = admin.firestore();

// Helper to send balance update, kept local as it uses sendToUser from server.js
function sendBalanceUpdate(userId: string, newBalance: number) {
    if (userId && typeof newBalance === 'number') {
        console.log(`[WS Backend - Wallet Ctrl] Sending balance update to user ${userId}: ${newBalance}`);
        if (typeof sendToUser === 'function') {
            sendToUser(userId, {
                type: 'balance_update',
                payload: { balance: newBalance }
            });
        } else {
            console.error("[Wallet Controller] sendToUser function is not available. Cannot send balance update.");
        }
    }
}


export const getWalletBalance = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.uid;
    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }
    try {
        const balance = await getWalletBalanceService(userId); // Use service
        res.status(200).json({ balance: Number(balance) });
    } catch (error) {
        next(error);
    }
};

export const topUpWallet = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.uid;
    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }
    const { amount, fundingSourceInfo } = req.body;

    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: 'Invalid top-up amount.' });
    }
    if (!fundingSourceInfo) {
        return res.status(400).json({ message: 'Funding source information is required.' });
    }

    let newBalance = 0;
    const walletDocRef = db.collection('wallets').doc(userId);
    let loggedTxId: string | undefined;

    try {
        console.log(`[Wallet Ctrl] Simulating debit of ₹${amount} from ${fundingSourceInfo} for wallet top-up (User: ${userId})...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        const paymentSuccess = true;

        if (!paymentSuccess) {
            throw new Error('Failed to debit funding source.');
        }

        await db.runTransaction(async (transaction) => {
            let currentBalance = await ensureWalletExistsInternalService(userId, transaction); // Use service
            newBalance = Number(currentBalance) + amount;
            const updateData = {
                balance: newBalance,
                lastUpdated: FieldValue.serverTimestamp()
            };
            transaction.update(walletDocRef, updateData); // Wallet ensured to exist by service
        });

        const logData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = {
             type: 'Wallet Top-up',
             name: 'Wallet Top-up',
             description: `Added from ${fundingSourceInfo}`,
             amount: amount,
             status: 'Completed',
             userId: userId,
             paymentMethodUsed: 'Wallet', // Or reflect actual funding source type
         };
        const loggedTx = await addTransaction(logData);
        loggedTxId = loggedTx.id;

        sendBalanceUpdate(userId, newBalance); // Send WS update

        // Assuming loggedTx contains the full transaction object with a Date object for `date`
        await logTransactionToBlockchain(loggedTx.id, loggedTx); // Use the full Transaction object

        res.status(200).json({ success: true, newBalance, message: 'Wallet topped up successfully.', transactionId: loggedTxId });

    } catch (error) {
        console.error("[Wallet Ctrl] Error in topUpWallet:", error);
        next(error);
    }
};


// Controller function for the /wallet/pay endpoint
export const payViaWalletController = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.uid;
    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }
    const { recipientIdentifier, amount, note } = req.body;

    if (typeof amount !== 'number' || amount <= 0 || !recipientIdentifier) {
        return res.status(400).json({ message: 'Invalid parameters for wallet payment.' });
    }

    try {
        // Use the internal function from the service for the actual payment logic
        const result = await payViaWalletInternalService(userId, recipientIdentifier, amount, note);
        if (result.success) {
            res.status(200).json(result);
        } else {
             const statusCode = result.message?.toLowerCase().includes('insufficient') ? 400 : 500;
             res.status(statusCode).json(result);
        }
    } catch (error) {
        next(error);
    }
};

// This function is now in services/wallet.ts, keep export if needed by other controllers directly (though unlikely)
// export { payViaWalletInternal };

// Re-export the type for consistency if controllers import it
export type { WalletTransactionResult };
