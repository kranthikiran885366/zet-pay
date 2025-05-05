
import type { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { doc, getDoc, setDoc, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';
import { addTransaction } from '../services/transactionLogger'; // Import backend logger
import { sendToUser } from '../server'; // Import backend WebSocket sender
import type { Transaction } from '../services/types'; // Import shared types

const db = admin.firestore();

/**
 * Sends a real-time balance update to the user via WebSocket.
 * @param userId The ID of the user.
 * @param newBalance The updated balance.
 */
function sendBalanceUpdate(userId: string, newBalance: number) {
    if (userId && typeof newBalance === 'number') {
        console.log(`[WS Backend] Sending balance update to user ${userId}: ${newBalance}`);
        sendToUser(userId, {
            type: 'balance_update',
            payload: { balance: newBalance }
        });
    }
}

// Helper to ensure wallet exists, create if not
async function ensureWalletExists(userId: string): Promise<number> {
    const walletDocRef = db.collection('wallets').doc(userId);
    const walletDocSnap = await walletDocRef.get();
    if (!walletDocSnap.exists) {
        console.log(`Wallet for user ${userId} not found, creating...`);
        await walletDocRef.set({
            userId: userId,
            balance: 0,
            lastUpdated: serverTimestamp()
        });
        return 0; // Return initial balance
    }
    return walletDocSnap.data()?.balance || 0;
}

export const getWalletBalance = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.uid; // Get user ID from authenticated request
    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }
    try {
        const balance = await ensureWalletExists(userId);
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
        // 1. Simulate payment processing from funding source (Replace with actual PG/PSP logic)
        console.log(`[Backend] Simulating debit of ₹${amount} from ${fundingSourceInfo} for wallet top-up (User: ${userId})...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        const paymentSuccess = true; // Assume success for demo

        if (!paymentSuccess) {
            throw new Error('Failed to debit funding source.');
        }

        // 2. Atomically update wallet balance
        await db.runTransaction(async (transaction) => {
            const walletDoc = await transaction.get(walletDocRef);
            let currentBalance = 0;
            if (!walletDoc.exists) {
                console.warn(`[Backend] Wallet for user ${userId} not found during top-up, creating...`);
            } else {
                currentBalance = walletDoc.data()?.balance || 0;
            }
            newBalance = Number(currentBalance) + amount;

            const updateData = {
                userId: userId, // Ensure userId is set if creating
                balance: newBalance,
                lastUpdated: serverTimestamp()
            };

            if (!walletDoc.exists) {
                transaction.set(walletDocRef, updateData);
            } else {
                transaction.update(walletDocRef, updateData);
            }
        });

        // 3. Log successful top-up transaction using backend logger
        const logData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = {
             type: 'Wallet Top-up',
             name: 'Wallet Top-up',
             description: `Added from ${fundingSourceInfo}`,
             amount: amount, // Positive amount
             status: 'Completed',
             userId: userId,
             paymentMethodUsed: 'Wallet', // Indicate payment method
         };
        const loggedTx = await addTransaction(logData); // Use backend logger
        loggedTxId = loggedTx.id;

        // 4. Send real-time balance update via WebSocket (backend function)
        sendBalanceUpdate(userId, newBalance);

        // 5. Blockchain log (optional, handled by addTransaction if configured)
        // logTransactionToBlockchain(loggedTx.id, { userId, type: logData.type, amount, date: new Date() }) ...

        res.status(200).json({ success: true, newBalance, message: 'Wallet topped up successfully.', transactionId: loggedTxId });

    } catch (error) {
        console.error("[Backend] Error in topUpWallet:", error);
        next(error);
    }
};

// Internal function for direct wallet operations (e.g., fallback, recovery)
// Note: This assumes the calling service handles necessary checks (balance, etc.)
export async function payViaWalletInternal(userId: string, recipientId: string, amount: number, note: string): Promise<WalletTransactionResult> {
    const walletDocRef = db.collection('wallets').doc(userId);
    let newBalance = 0;
    let transactionId: string | undefined;
    const isCredit = amount < 0;
    const absoluteAmount = Math.abs(amount);

    try {
        await db.runTransaction(async (transaction) => {
            const walletDoc = await transaction.get(walletDocRef);
            let currentBalance = 0;
            if (!walletDoc.exists) {
                if (!isCredit) throw new Error("Wallet not found.");
                console.warn(`[Backend] Wallet for user ${userId} not found, creating for credit...`);
            } else {
                currentBalance = walletDoc.data()?.balance || 0;
            }

            if (!isCredit && currentBalance < absoluteAmount) {
                throw new Error("Insufficient wallet balance.");
            }
            newBalance = isCredit ? currentBalance + absoluteAmount : currentBalance - absoluteAmount;

            const updateData = {
                userId: userId, // Ensure userId is set if creating
                balance: newBalance,
                lastUpdated: serverTimestamp()
            };

            if (!walletDoc.exists) {
                transaction.set(walletDocRef, updateData);
            } else {
                transaction.update(walletDocRef, updateData);
            }
        });

        // Log successful transaction
        const logData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = {
             type: isCredit ? 'Received' : 'Sent',
             name: recipientId,
             description: `${isCredit ? 'Credited via Wallet' : 'Paid via Wallet'} ${note ? `- ${note}` : ''}`,
             amount: amount,
             status: 'Completed',
             userId: userId,
             upiId: recipientId.includes('@') ? recipientId : undefined,
             paymentMethodUsed: 'Wallet',
         };
        const loggedTx = await addTransaction(logData);
        transactionId = loggedTx.id;

        // Send real-time balance update
        sendBalanceUpdate(userId, newBalance);

        console.log(`[Backend] Internal wallet ${isCredit ? 'credit' : 'payment'} successful for ${userId}. Tx ID: ${transactionId}`);
        return { success: true, transactionId, newBalance, message: `Internal wallet ${isCredit ? 'credit' : 'payment'} successful` };

    } catch (error: any) {
         console.error(`[Backend] Internal wallet ${isCredit ? 'credit' : 'payment'} failed for ${userId}:`, error);
         // Log failed attempt
         const failLogData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = {
             type: 'Failed',
             name: recipientId,
             description: `Wallet ${isCredit ? 'Credit' : 'Payment'} Failed - ${error.message}`,
             amount: amount,
             status: 'Failed',
             userId: userId,
             upiId: recipientId.includes('@') ? recipientId : undefined,
             paymentMethodUsed: 'Wallet',
         };
          let failedTxId: string | undefined;
          try {
             const failedTx = await addTransaction(failLogData);
             failedTxId = failedTx.id;
          } catch (logError) {
              console.error("Failed to log failed internal wallet transaction:", logError);
          }
         return { success: false, transactionId: failedTxId, message: error.message || `Internal wallet ${isCredit ? 'credit' : 'payment'} failed.` };
    }
}

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
        // Use the internal function for the actual payment logic
        const result = await payViaWalletInternal(userId, recipientIdentifier, amount, note);
        if (result.success) {
            res.status(200).json(result);
        } else {
             // Determine appropriate status code based on error message
             const statusCode = result.message?.toLowerCase().includes('insufficient') ? 400 : 500;
             res.status(statusCode).json(result);
        }
    } catch (error) {
        next(error); // Pass other unexpected errors to the error handler
    }
};

// Define WalletTransactionResult interface if not already in a shared types file
export interface WalletTransactionResult {
    success: boolean;
    transactionId?: string;
    newBalance?: number;
    message?: string;
}

    