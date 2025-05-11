
import type { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { doc, getDoc, setDoc, runTransaction, serverTimestamp, Timestamp, FieldValue, updateDoc } from 'firebase-admin/firestore'; // Correct imports
import { addTransaction, logTransactionToBlockchain } from '../services/transactionLogger.ts'; // Import backend logger
import { sendToUser } from '../server'; // Import backend WebSocket sender
import type { Transaction, WalletTransactionResult } from '../services/types'; // Import shared types
// Correctly import service functions from the backend wallet service file
import { 
    getWalletBalance as getWalletBalanceService, 
    ensureWalletExistsInternal as ensureWalletExistsInternalService,
    payViaWalletInternal as payViaWalletInternalService // This is the core logic function
} from '../services/wallet.ts';

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
            console.error("[Wallet Controller - Backend] sendToUser function is not available. Cannot send balance update.");
        }
    }
}


export const getWalletBalance = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.uid;
    if (!userId) {
        // This should ideally be caught by authMiddleware, but double-check
        res.status(401);
        return next(new Error("User not authenticated."));
    }
    try {
        const balance = await getWalletBalanceService(userId); // Use service from services/wallet.ts
        res.status(200).json({ balance: Number(balance) });
    } catch (error) {
        next(error);
    }
};

export const topUpWallet = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.uid;
    if (!userId) {
        res.status(401);
        return next(new Error("User not authenticated."));
    }
    const { amount, fundingSourceInfo } = req.body;

    if (typeof amount !== 'number' || amount <= 0) {
        res.status(400);
        return next(new Error('Invalid top-up amount.'));
    }
    if (!fundingSourceInfo) {
        res.status(400);
        return next(new Error('Funding source information is required.'));
    }

    let newBalance = 0;
    const walletDocRef = db.collection('wallets').doc(userId);
    let loggedTxId: string | undefined;

    try {
        console.log(`[Wallet Ctrl - Backend] Simulating debit of ₹${amount} from ${fundingSourceInfo} for wallet top-up (User: ${userId})...`);
        // In a real scenario, this would involve a payment gateway call and webhook confirmation
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate payment delay
        const paymentSuccess = true; // Assume success for demo

        if (!paymentSuccess) {
            throw new Error('Failed to debit funding source.');
        }

        // Use a Firestore transaction to update balance atomically
        await db.runTransaction(async (transaction) => {
            // ensureWalletExistsInternalService needs to be adapted to use FieldValue for serverTimestamp
            const currentBalance = await ensureWalletExistsInternalService(userId, transaction); // Use service
            newBalance = Number(currentBalance) + amount;
            const updateData = {
                balance: newBalance,
                lastUpdated: FieldValue.serverTimestamp() // Firestore server timestamp
            };
            transaction.update(walletDocRef, updateData);
        });

        // Log successful top-up transaction using the backend logger service
        const logData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = {
             type: 'Wallet Top-up',
             name: 'Wallet Top-up',
             description: `Added from ${fundingSourceInfo}`,
             amount: amount, // Positive amount for wallet credit
             status: 'Completed',
             userId: userId,
             paymentMethodUsed: 'Wallet', // Or reflect actual funding source type
         };
        const loggedTx = await addTransaction(logData); // Backend logger
        loggedTxId = loggedTx.id;

        sendBalanceUpdate(userId, newBalance); // Send WS update

        await logTransactionToBlockchain(loggedTx.id, loggedTx);

        res.status(200).json({ success: true, newBalance, message: 'Wallet topped up successfully.', transactionId: loggedTxId });

    } catch (error) {
        console.error("[Wallet Ctrl - Backend] Error in topUpWallet:", error);
        // Log a failed transaction if debit simulation passed but Firestore update failed
        if (loggedTxId === undefined) { // Only log if not already logged by payment step
             try {
                 await addTransaction({
                     userId,
                     type: 'Failed',
                     name: 'Wallet Top-up Attempt',
                     description: `Top-up from ${fundingSourceInfo} - Error: ${(error as Error).message}`,
                     amount: amount,
                     status: 'Failed',
                 });
             } catch (logErr) {
                 console.error("[Wallet Ctrl - Backend] CRITICAL: Failed to log failed top-up attempt:", logErr);
             }
        }
        next(error);
    }
};


// Controller function for the /wallet/pay endpoint
// This is the public API endpoint. It uses the payViaWalletInternalService.
export const payViaWalletController = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.uid;
    if (!userId) {
        res.status(401);
        return next(new Error("User not authenticated."));
    }
    const { recipientIdentifier, amount, note } = req.body;

    if (typeof amount !== 'number' || amount <= 0 || !recipientIdentifier) {
        res.status(400);
        return next(new Error('Invalid parameters for wallet payment.'));
    }

    try {
        // Use the internal service function for the actual payment logic
        // This service function handles balance checks, deduction, logging, and WS updates.
        const result = await payViaWalletInternalService(userId, recipientIdentifier, amount, note); // Pass positive amount for DEBIT

        if (result.success) {
            res.status(200).json(result); // result includes { success, transactionId, newBalance, message }
        } else {
             // Determine status code based on message, or default to 400 for client errors, 500 for server
             const statusCode = result.message?.toLowerCase().includes('insufficient') ? 400 : 500;
             res.status(statusCode);
             // Pass error to errorMiddleware
             return next(new Error(result.message || "Wallet payment failed."));
        }
    } catch (error) {
        next(error);
    }
};

// The payViaWalletInternal function, which contains the core logic including Firestore transactions
// and logging, should reside in `backend/services/wallet.ts` and be imported here
// by `payViaWalletInternalService`.
// This controller (`payViaWalletController`) acts as the API route handler.
