/**
 * @fileOverview Service functions for managing the Zet Pay Wallet via the backend API.
 */
import { apiClient } from '@/lib/apiClient';
import { auth } from '@/lib/firebase'; // Keep for client-side user checks if needed
import { addTransaction } from '@/services/transactionLogger'; // Use centralized logger (client-side path alias)
import type { Transaction, WalletTransactionResult } from './types'; // Use shared types

// Define the expected result structure from the backend API (Already in types.ts)
// export interface WalletTransactionResult { ... }
export type { WalletTransactionResult }; // Re-export


/**
 * Asynchronously retrieves the current user's Zet Pay Wallet balance from the backend API.
 *
 * @param userId Optional: Pass userId explicitly if needed, otherwise inferred from auth token by backend.
 * @returns A promise that resolves to the wallet balance number.
 * @throws Error if the API call fails.
 */
export async function getWalletBalance(userId?: string): Promise<number> {
    const currentUserId = userId || auth.currentUser?.uid; // Get ID for logging if needed
    console.log(`Fetching wallet balance via API for user: ${currentUserId || 'current'}`);

    try {
        // Backend infers user from the token
        const response = await apiClient<{ balance: number }>('/wallet/balance');
        return response.balance;
    } catch (error) {
        console.error("Error fetching wallet balance via API:", error);
        throw error; // Re-throw error caught by apiClient
    }
}

/**
 * Asynchronously adds funds to the Zet Pay Wallet via the backend API.
 * The backend handles debiting the funding source and updating the wallet balance.
 *
 * @param userId Optional: The ID of the user. Backend typically infers from token.
 * @param amount The amount to add.
 * @param fundingSourceInfo Information about the funding source (e.g., Bank UPI ID, Card Token ID).
 * @returns A promise resolving to an object indicating success and potentially the new balance and transaction ID.
 */
export async function topUpWallet(userId: string | undefined, amount: number, fundingSourceInfo: string): Promise<WalletTransactionResult> {
     const currentUserId = userId || auth.currentUser?.uid;
     console.log(`Attempting wallet top-up via API for user ${currentUserId} with ₹${amount} from ${fundingSourceInfo}`);

     if (amount <= 0) {
        return { success: false, message: "Invalid top-up amount." };
     }

     try {
        // Backend infers user from token
        // Use the correct expected response type from the backend endpoint
        const result = await apiClient<WalletTransactionResult>('/wallet/topup', {
            method: 'POST',
            body: JSON.stringify({ amount, fundingSourceInfo }),
        });
        console.log("Wallet top-up API response:", result);
        return result; // Return the structured result
     } catch (error: any) {
        console.error("Error topping up wallet via API:", error);
        return { success: false, message: error.message || "Failed to process top-up." };
     }
}


/**
 * Asynchronously processes a payment directly from the Zet Pay Wallet via the backend API.
 * Backend handles balance check, deduction, fund transfer simulation/initiation, and transaction logging.
 *
 * @param userId Optional: The ID of the user making the payment. Backend infers from token.
 * @param recipientIdentifier Recipient's UPI ID, mobile number, etc.
 * @param amount The amount to pay.
 * @param note Optional payment note.
 * @returns A promise resolving to a WalletTransactionResult.
 */
export async function payViaWallet(
    userId: string | undefined,
    recipientIdentifier: string,
    amount: number,
    note?: string
): Promise<WalletTransactionResult> {
     const currentUserId = userId || auth.currentUser?.uid;
     console.log(`Attempting wallet payment via API for user ${currentUserId} of ₹${amount} to ${recipientIdentifier}`);

    if (amount <= 0 || !recipientIdentifier) {
        return { success: false, message: "Invalid parameters for wallet payment." };
    }

     try {
        // Backend infers user from token
        // Use the backend payViaWalletController which calls payViaWalletInternal
        const result = await apiClient<WalletTransactionResult>('/wallet/pay', {
            method: 'POST',
            body: JSON.stringify({ recipientIdentifier, amount, note: note || undefined }),
        });
        console.log("Wallet payment API response:", result);
        return result;
     } catch (error: any) {
        console.error("Error processing wallet payment via API:", error);
         return { success: false, message: error.message || "Failed to process wallet payment." };
     }
}

// Keep the internal function for potential use by other client-side services
// if they need direct interaction without API call (though generally API is preferred).
/**
 * Internal client-side function for direct wallet debit/credit simulation or local state update.
 * Handles balance check, atomic update (if interacting directly with Firestore), transaction logging, and WebSocket updates.
 * Use this function internally within the frontend if needed, but prefer API calls for actual backend operations.
 * IMPORTANT: Negative amount signifies a CREDIT to the wallet (like a top-up/refund).
 *
 * @param userId The ID of the user whose wallet is affected.
 * @param identifier An identifier for the transaction (e.g., recipient UPI, biller ID, 'WALLET_RECOVERY').
 * @param amount The amount (positive for debit, negative for credit).
 * @param note A descriptive note for the transaction log.
 * @returns A promise resolving to a WalletTransactionResult.
 */
export async function payViaWalletInternal(
    userId: string,
    identifier: string,
    amount: number,
    note?: string
): Promise<WalletTransactionResult> {
    console.warn("payViaWalletInternal called on client-side. Prefer using API via payViaWallet.");
    // This function remains largely the same but uses client-side addTransaction
    const isCredit = amount < 0;
    const absoluteAmount = Math.abs(amount);
    const operationType = isCredit ? 'credit' : 'debit';
    let loggedTxId: string | undefined;
    let newBalance = 0; // Placeholder

    try {
        // Simulate balance check client-side (less secure, backend should re-verify)
        const currentBalance = await getWalletBalance(userId);
        if (!isCredit && currentBalance < absoluteAmount) {
             throw new Error(`Insufficient wallet balance. Available: ₹${currentBalance.toFixed(2)}`);
         }
         newBalance = isCredit ? currentBalance + absoluteAmount : currentBalance - absoluteAmount; // Simulate balance update

        // Log successful transaction using client-side logger
         const logData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = {
             type: isCredit ? 'Received' : 'Sent',
             name: identifier,
             description: `${isCredit ? 'Credited via Wallet' : 'Paid via Wallet'} ${note ? `- ${note}` : ''}`,
             amount: amount,
             status: 'Completed',
             userId: userId,
             upiId: identifier.includes('@') ? identifier : undefined,
             paymentMethodUsed: 'Wallet',
         };
         const loggedTx = await addTransaction(logData); // Use client-side logger
         loggedTxId = loggedTx.id;

         // Note: Client-side cannot reliably send balance updates via WebSocket; backend should do this.
         // sendBalanceUpdate(userId, newBalance); // This would fail

        console.log(`[Client Sim] Internal wallet ${operationType} successful for ${userId}. Tx ID: ${loggedTxId}`);
        return { success: true, transactionId: loggedTxId, newBalance, message: `Wallet ${operationType} successful (Client Sim)` };

    } catch (error: any) {
         console.error(`[Client Sim] Internal wallet ${operationType} failed for ${userId}:`, error);
         // Log failed attempt only if it was a debit attempt
         let failedTxId: string | undefined;
         if (!isCredit) {
              const failLogData: Partial<Omit<Transaction, 'id' | 'date'>> & { userId: string } = {
                 type: 'Failed',
                 name: identifier,
                 description: `Wallet Payment Failed - ${error.message}`,
                 amount: amount,
                 status: 'Failed',
                 userId: userId,
                 upiId: identifier.includes('@') ? identifier : undefined,
                 paymentMethodUsed: 'Wallet',
             };
             try {
                 const failedTx = await addTransaction(failLogData);
                 failedTxId = failedTx.id;
                 // sendToUser(userId, { type: 'transaction_update', payload: failedTx }); // Cannot send WS from client reliably
             } catch (logError) {
                 console.error("[Client Sim] Failed to log failed internal wallet transaction:", logError);
             }
         }
         return { success: false, transactionId: failedTxId, message: error.message || `Internal wallet ${operationType} failed.` };
    }
}

