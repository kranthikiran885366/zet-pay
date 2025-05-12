/**
 * @fileOverview Service functions for managing the Zet Pay Wallet via the backend API.
 */
import { apiClient } from '@/lib/apiClient';
import { auth } from '@/lib/firebase'; // Keep for client-side user checks if needed
import type { Transaction, WalletTransactionResult } from './types'; // Use shared types

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
    if (!currentUserId && !userId) { // If userId is not passed and no user is logged in
        console.warn("[Wallet Service Client] No user ID provided and no user logged in. Returning 0 balance.");
        return 0; // Or throw error depending on desired behavior for unauthenticated users
    }
    console.log(`[Wallet Service Client] Fetching wallet balance via API for user: ${currentUserId || 'current'}`);

    try {
        // Backend infers user from token if userId is not explicitly part of the path/query
        const response = await apiClient<{ balance: number }>('/wallet/balance');
        return response.balance;
    } catch (error) {
        console.error("[Wallet Service Client] Error fetching wallet balance via API:", error);
        throw error; // Re-throw for UI to handle
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
     if (!currentUserId && !userId) {
        return { success: false, message: "User not authenticated for top-up." };
     }
     console.log(`[Wallet Service Client] Attempting wallet top-up via API for user ${currentUserId} with ₹${amount} from ${fundingSourceInfo}`);

     if (amount <= 0) {
        return { success: false, message: "Invalid top-up amount." };
     }

     try {
        // Backend infers user from token
        const result = await apiClient<WalletTransactionResult>('/wallet/topup', {
            method: 'POST',
            body: JSON.stringify({ amount, fundingSourceInfo }),
        });
        console.log("[Wallet Service Client] Wallet top-up API response:", result);
        return result; // Backend returns full WalletTransactionResult including newBalance and transactionId
     } catch (error: any) {
        console.error("[Wallet Service Client] Error topping up wallet via API:", error);
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
     if (!currentUserId && !userId) { // Check again, as auth.currentUser might be null if called too early
        return { success: false, message: "User not authenticated for payment." };
     }
     console.log(`[Wallet Service Client] Attempting wallet payment via API for user ${currentUserId} of ₹${amount} to ${recipientIdentifier}`);

    if (amount <= 0 || !recipientIdentifier) {
        return { success: false, message: "Invalid parameters for wallet payment." };
    }

     try {
        // Backend infers user from token
        const result = await apiClient<WalletTransactionResult>('/wallet/pay', {
            method: 'POST',
            body: JSON.stringify({ recipientIdentifier, amount, note: note || undefined }),
        });
        console.log("[Wallet Service Client] Wallet payment API response:", result);
        return result; // Backend returns full WalletTransactionResult
     } catch (error: any) {
        console.error("[Wallet Service Client] Error processing wallet payment via API:", error);
         return { success: false, message: error.message || "Failed to process wallet payment." };
     }
}

/**
 * INTERNAL USE ONLY (by other client-side services if absolutely necessary for optimistic updates).
 * This function DOES NOT make backend calls for payment or logging.
 * The actual payment logic and logging should be handled by the backend API called via `payViaWallet`.
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
    // This function is now a thin wrapper around the actual API call.
    // It's kept for compatibility if other client services were calling it,
    // but its "internal" nature is now shifted to the backend.
    console.warn("[Wallet Service Client - payViaWalletInternal] Redirecting to API call. This function should ideally not be used for direct client-side payment simulation anymore.");
    
    // Delegate to the API-calling version
    return payViaWallet(userId, identifier, amount, note);
}

