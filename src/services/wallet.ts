/**
 * @fileOverview Service functions for managing the Zet Pay Wallet via the backend API.
 */
import { apiClient } from '@/lib/apiClient';
import { auth } from '@/lib/firebase'; // Keep for client-side user checks if needed
// Removed import: import { addTransaction, logTransactionToBlockchain } from '@/services/transactionLogger';
import type { WalletTransactionResult } from './types'; // Use shared types

// Re-export types if needed by components
export type { WalletTransactionResult };


/**
 * Asynchronously retrieves the current user's Zet Pay Wallet balance from the backend API.
 *
 * @param userId Optional: Pass userId explicitly if needed, otherwise inferred from auth token by backend.
 * @returns A promise that resolves to the wallet balance number.
 * @throws Error if the API call fails.
 */
export async function getWalletBalance(userId?: string): Promise<number> {
    const currentUserId = userId || auth.currentUser?.uid;
    console.log(`Fetching wallet balance via API for user: ${currentUserId || 'current'}`);

    try {
        const response = await apiClient<{ balance: number }>('/wallet/balance');
        return response.balance;
    } catch (error) {
        console.error("Error fetching wallet balance via API:", error);
        throw error;
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
        const result = await apiClient<WalletTransactionResult>('/wallet/topup', {
            method: 'POST',
            body: JSON.stringify({ amount, fundingSourceInfo }),
        });
        console.log("Wallet top-up API response:", result);
        return result;
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
    userId: string | undefined, // This is for client-side check, backend infers user
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

/**
 * Internal client-side function for direct wallet debit/credit simulation or local state update.
 * Handles balance check, atomic update (if interacting directly with Firestore), transaction logging, and WebSocket updates.
 * Use this function internally within the frontend if needed, but prefer API calls for actual backend operations.
 * IMPORTANT: Negative amount signifies a CREDIT to the wallet (like a top-up/refund).
 * **WARNING**: This function does NOT interact with the backend logger. Use `payViaWallet` for actual payments.
 *
 * @param userId The ID of the user whose wallet is affected.
 * @param identifier An identifier for the transaction (e.g., recipient UPI, biller ID, 'WALLET_RECOVERY').
 * @param amount The amount (positive for debit, negative for credit).
 * @param note A descriptive note for the transaction log.
 * @returns A promise resolving to a WalletTransactionResult (Transaction ID will be undefined or local).
 */
export async function payViaWalletInternal(
    userId: string,
    identifier: string,
    amount: number,
    note?: string
): Promise<WalletTransactionResult> {
    console.warn("payViaWalletInternal called on client-side. No transaction logging will occur. Prefer using API via payViaWallet.");
    const isCredit = amount < 0;
    const absoluteAmount = Math.abs(amount);
    const operationType = isCredit ? 'credit' : 'debit';
    let newBalance = 0;

    try {
        const currentBalance = await getWalletBalance(userId); // This now calls the API
        if (!isCredit && currentBalance < absoluteAmount) {
             throw new Error(`Insufficient wallet balance. Available: ₹${currentBalance.toFixed(2)}`);
         }
         newBalance = isCredit ? currentBalance + absoluteAmount : currentBalance - absoluteAmount;

        // No actual transaction logging or backend update happens here.
        // This is purely a client-side simulation for UI updates IF NEEDED.
        // The real balance update and logging should happen via backend API calls.

        console.log(`[Client Sim] Internal wallet ${operationType} successful simulation for ${userId}. New simulated balance: ₹${newBalance.toFixed(2)}`);
        return { success: true, transactionId: `local-sim-${Date.now()}`, newBalance, message: `Wallet ${operationType} successful (Client Sim)` };

    } catch (error: any) {
         console.error(`[Client Sim] Internal wallet ${operationType} simulation failed for ${userId}:`, error);
         return { success: false, transactionId: undefined, message: error.message || `Internal wallet ${operationType} failed (Client Sim).` };
    }
}